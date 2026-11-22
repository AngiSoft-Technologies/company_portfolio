/**
 * Finance ProviderEvent processor.
 *
 * Safe to call repeatedly and safe on an already-recorded event: processed /
 * ignored events exit immediately, and all side effects use existing idempotent
 * helpers (applyPaymentOutcome by providerId, postLedgerEntry by dedupe key,
 * Refund lookup by provider + external ref).
 */

import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { registerProviderEventProcessor } from '../../../shared/services/providerEvents';
import { logAudit } from '../../../shared/services/audit';
import { applyPaymentOutcome } from '../../billing/services/payments';
import * as paypal from '../../billing/services/payments/paypalService';
import * as payhero from '../../billing/services/payments/payheroService';
import * as mpesa from '../../billing/services/payments/mpesaService';
import * as daraja from '../../billing/services/payments/darajaPayouts';
import { fromMoney, toMoney, type MoneyInput } from '../../billing/utils/money';
import { normalizeProvider } from './capabilityMatrix';
import { postLedgerEntry, resolveFinanceAccount } from './ledger';
import { sendMetaConversion } from '../../communications/services/metaConversions';

const PROCESSED = new Set(['PROCESSED', 'IGNORED']);

function objectOf(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function payloadOf(event: any): any {
  return event?.payload && typeof event.payload === 'object' ? event.payload : {};
}

function eventType(event: any): string {
  return String(event?.eventType || '').toUpperCase();
}

function successful(eventTypeValue: string, explicit?: unknown): boolean {
  if (explicit !== undefined) {
    if (typeof explicit === 'boolean') return explicit;
    const code = Number(explicit);
    if (Number.isFinite(code)) return code === 0;
    return ['success', 'completed', 'complete', 'paid', 'succeeded'].includes(String(explicit).toLowerCase());
  }
  return /COMPLETED|SUCCESS|PAID|RESULT_CODE_0/.test(eventTypeValue) && !/DENIED|FAILED|REVERSED/.test(eventTypeValue);
}

function amountOf(payload: any): MoneyInput {
  const value = payload?.amount?.value
    ?? payload?.amount
    ?? payload?.Amount
    ?? payload?.total
    ?? payload?.data?.amount
    ?? 0;
  return value as MoneyInput;
}

function currencyOf(payload: any): string {
  return String(
    payload?.currency
    || payload?.currency_code
    || payload?.amount?.currency_code
    || payload?.data?.currency
    || 'KES',
  ).toUpperCase();
}

function referenceOf(payload: any): string {
  return String(
    payload?.reference
    || payload?.externalReference
    || payload?.external_reference
    || payload?.invoice_id
    || payload?.custom_id
    || payload?.data?.reference
    || '',
  );
}

function providerIdOf(payload: any): string {
  return String(
    payload?.id
    || payload?.captureId
    || payload?.checkoutRequestId
    || payload?.CheckoutRequestID
    || payload?.providerId
    || payload?.provider_id
    || payload?.transactionId
    || payload?.resource?.id
    || payload?.data?.id
    || '',
  );
}

async function recordRefund(prisma: Db, event: any, provider: string, input: {
  externalRef: string; amount: MoneyInput; currency: string; paymentId?: string | null;
}) {
  const existing = await prisma.orm.public.Refund
    .where({ provider: provider as any, externalRef: input.externalRef } as any)
    .first()
    .catch(() => null);
  if (existing) return existing;
  const refund = await prisma.orm.public.Refund.create({
    id: newId(),
    paymentId: input.paymentId ?? null,
    provider,
    externalRef: input.externalRef,
    amount: toMoney(input.amount ?? 0),
    currency: input.currency,
    reason: 'Provider refund webhook',
    status: 'COMPLETED',
    requestedById: null,
    approvedById: null,
    metadata: { eventId: event.id, eventType: event.eventType } as any,
    createdAt: ts(),
    updatedAt: ts(),
  } as any);
  await postLedgerEntry(prisma, {
    provider,
    externalRef: input.externalRef,
    entryType: 'REFUND',
    direction: 'OUT',
    amount: input.amount ?? 0,
    currency: input.currency,
    status: 'COMPLETED',
    sourceType: 'PAYMENT',
    sourceId: input.paymentId ?? refund.id,
    providerEventId: event.id,
    metadata: { refundId: refund.id, eventId: event.id },
  });
  return refund;
}

async function handlePayPal(prisma: Db, event: any, payload: any) {
  const type = eventType(event);
  if (type.includes('REFUND')) {
    const resource = payload.resource || payload.data || {};
    const externalRef = String(resource.id || providerIdOf(payload));
    if (externalRef) {
      await recordRefund(prisma, event, 'PAYPAL', {
        externalRef,
        amount: amountOf(resource),
        currency: currencyOf(resource),
      });
    }
    return;
  }
  if (!/CAPTURE|ORDER|CHECKOUT/.test(type)) return;
  const resource = payload.resource || payload.data || {};
  const parsed = paypal.parseWebhookAmount(resource);
  const captureId = String(resource.id || providerIdOf(payload));
  const reference = referenceOf(resource) || paypal.orderIdFromCaptureEvent(resource);
  const providerId = captureId || reference || event.externalEventId || event.id;
  const status = successful(type, resource.status) ? 'SUCCEEDED' : /DENIED|FAILED/.test(type) ? 'FAILED' : 'PENDING';
  await applyPaymentOutcome(prisma, {
    provider: 'PAYPAL',
    providerId,
    amount: parsed.amount || amountOf(resource),
    currency: parsed.currency || currencyOf(resource),
    reference: reference || undefined,
    status,
    metadata: { ...payload, webhookEventId: event.id },
  });
}

async function handlePayHero(prisma: Db, event: any, payload: any) {
  const decoded = payhero.decodeCallback(payload);
  const status = decoded.success || decoded.resultCode === 0 ? 'SUCCEEDED' : 'FAILED';
  await applyPaymentOutcome(prisma, {
    provider: 'PAYHERO',
    providerId: decoded.checkoutRequestId || event.externalEventId || event.id,
    reference: decoded.externalReference || undefined,
    amount: decoded.amount,
    currency: 'KES',
    status,
    metadata: { ...objectOf(decoded.raw), webhookEventId: event.id },
  });
}

async function handleMpesa(prisma: Db, event: any, payload: any) {
  const callback = mpesa.decodeStkCallback(payload);
  if (!callback) return;
  const status = String(callback.resultCode) === '0' ? 'SUCCEEDED' : 'FAILED';
  await applyPaymentOutcome(prisma, {
    provider: 'MPESA',
    providerId: callback.checkoutRequestId || event.externalEventId || event.id,
    reference: callback.mpesaReceipt || undefined,
    amount: callback.amount || 0,
    currency: 'KES',
    status,
    metadata: { ...objectOf(callback.raw), webhookEventId: event.id },
  });
}

async function handleDarajaResult(prisma: Db, event: any, payload: any) {
  const decoded = daraja.decodeCallback(payload);
  if (!decoded) return;
  const ref = String(decoded.conversationId || decoded.originatorConversationId || '');
  const payout = ref
    ? await prisma.orm.public.Payout.where({ providerReference: ref } as any).first().catch(() => null)
    : null;
  if (payout) {
    await prisma.orm.public.Payout.where({ id: payout.id }).update({
      status: /success|complete/i.test(String(decoded.resultDesc)) ? 'SUCCEEDED' : 'FAILED',
      completedAt: ts(),
      updatedAt: ts(),
      metadata: { ...objectOf(payout.metadata), result: decoded } as any,
    } as any);
  }
  await postLedgerEntry(prisma, {
    provider: 'MPESA',
    externalRef: ref || decoded.transactionId || event.id,
    entryType: 'PAYOUT',
    direction: 'OUT',
    amount: decoded.amount ?? 0,
    currency: 'KES',
    status: payout?.status || (payout ? 'COMPLETED' : 'PENDING'),
    sourceType: 'PAYOUT',
    sourceId: payout?.id ?? null,
    providerEventId: event.id,
    metadata: { transactionId: decoded.transactionId, resultCode: decoded.resultCode },
  });
}

async function handleGenericLedger(prisma: Db, event: any, provider: string, payload: any) {
  const externalRef = providerIdOf(payload) || referenceOf(payload) || event.externalEventId || event.id;
  const amount = amountOf(payload);
  if (!amount) return;
  const type = eventType(event);
  const entryType = /refund/.test(type) ? 'REFUND' : /payout/.test(type) ? 'PAYOUT' : 'PAYMENT';
  const account = await resolveFinanceAccount(prisma, provider, externalRef);
  await postLedgerEntry(prisma, {
    provider,
    externalRef,
    entryType,
    direction: entryType === 'PAYMENT' ? 'IN' : 'OUT',
    amount,
    currency: currencyOf(payload),
    status: successful(type) ? 'SUCCEEDED' : 'PENDING',
    financeAccountId: account?.id ?? null,
    sourceType: 'PROVIDER_EVENT',
    sourceId: event.id,
    providerEventId: event.id,
    metadata: { eventType: event.eventType },
  });
}

/** Idempotently apply one recorded finance event to the normalized ledger. */
export async function processProviderEvent(prisma: Db, event: any): Promise<void> {
  if (!event?.id) return;
  if (event.domain && String(event.domain).toUpperCase() !== 'FINANCE') return;
  if (PROCESSED.has(String(event.status || '').toUpperCase())) return;

  // Never act on an unverified webhook in production.
  if (!event.signatureValid && process.env.NODE_ENV === 'production') {
    await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({
      status: 'IGNORED', error: 'Unverified provider event ignored in production',
    } as any).catch(() => undefined);
    return;
  }

  const provider = normalizeProvider(event.provider);
  const payload = payloadOf(event);
  try {
    if (provider === 'PAYPAL') await handlePayPal(prisma, event, payload);
    else if (provider === 'PAYHERO') await handlePayHero(prisma, event, payload);
    else if (provider === 'MPESA') {
      if (daraja.decodeCallback(payload)) await handleDarajaResult(prisma, event, payload);
      else await handleMpesa(prisma, event, payload);
    } else if (provider === 'PESAFLOW' || provider === 'GENERIC') {
      await handleGenericLedger(prisma, event, provider, payload);
    } else {
      // Unknown finance providers are recorded but never acted on.
      await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({
        status: 'IGNORED', error: `No finance processor for ${provider}`,
      } as any).catch(() => undefined);
      return;
    }

    // Server-side Purchase measurement. Fully opt-in and fail-open so a Meta
    // outage can never block ledger/post-payment processing.
    if (successful(eventType(event), payload?.success ?? payload?.ResultCode ?? payload?.resultCode)) {
      void sendMetaConversion(prisma, {
        eventName: 'Purchase',
        eventId: `finance:${event.id}`,
        email: payload?.email || payload?.payer?.email_address || payload?.customer?.email || null,
        phone: payload?.phone || payload?.customer?.phone || null,
        value: fromMoney(toMoney(amountOf(payload))),
        currency: currencyOf(payload),
        contentIds: referenceOf(payload) ? [referenceOf(payload)] : [],
        serviceEvent: true,
      }).catch(() => undefined);
    }

    await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({
      status: 'PROCESSED', processedAt: ts(), error: null,
    } as any).catch(() => undefined);
    await logAudit({
      action: 'finance.event.processed', entity: 'ProviderEvent', entityId: event.id,
      meta: { provider, eventType: event.eventType },
    });
  } catch (err: any) {
    await prisma.orm.public.ProviderEvent.where({ id: event.id }).update({
      status: 'FAILED', error: String(err?.message || err).slice(0, 1000),
    } as any).catch(() => undefined);
    throw err;
  }
}

for (const provider of ['PAYPAL', 'PAYHERO', 'MPESA', 'DARaja', 'DARaja_CALLBACK', 'PESAFLOW', 'GENERIC']) {
  registerProviderEventProcessor('FINANCE', provider, processProviderEvent);
}

export default processProviderEvent;
