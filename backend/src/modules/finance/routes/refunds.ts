import { createHash } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireRecentMfa } from '../../../shared/middleware/mfaStepUp';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { fromMoney, toMoney } from '../../billing/utils/money';
import { normalizeProvider } from '../services/capabilityMatrix';
import { postLedgerEntry, resolveFinanceAccount } from '../services/ledger';
import { refund as executeRefund, selectPaymentRail } from '../services/providers';
import { actor, allRows, errorStatus, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const refundSchema = z.object({
  paymentId: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
  captureId: z.string().optional().nullable(),
  amount: z.number().positive().optional(),
  currency: z.string().min(3).optional(),
  reason: z.string().optional(),
  reference: z.string().optional(),
  country: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export default function financeRefundsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/refunds'], requireAccess('finance.payments.refund', VIEW_ROLES), route(async (req, res) => {
    const filters: Record<string, unknown> = {};
    if (req.query.provider) filters.provider = normalizeProvider(req.query.provider);
    if (req.query.status) filters.status = String(req.query.status).toUpperCase();
    if (req.query.paymentId) filters.paymentId = String(req.query.paymentId);
    const refunds = await allRows(prisma.orm.public.Refund.where(filters as any).orderBy((r: any) => r.createdAt.desc()).limit(200).all());
    return res.json({ refunds });
  }));

  router.post(['/', '/refunds'], requireAccess('finance.payments.refund', MANAGE_ROLES), requireRecentMfa, route(async (req: AuthRequest, res) => {
    const body = refundSchema.parse(req.body);
    const payment = body.paymentId || body.externalRef
      ? await prisma.orm.public.Payment
        .where(body.paymentId ? ({ id: body.paymentId } as any) : ({ providerId: body.externalRef } as any))
        .first()
        .catch(() => null)
      : null;
    const provider = normalizeProvider(body.provider || payment?.provider || '');
    if (!provider || provider === 'GENERIC') return res.status(400).json({ error: 'A provider is required for refunds' });
    const currency = String(body.currency || payment?.currency || (provider === 'PAYPAL' ? 'USD' : 'KES')).toUpperCase();
    const amount = body.amount !== undefined ? body.amount : fromMoney(payment?.amount ?? null);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'A positive refund amount is required' });
    // Stable, caller-independent reference: replaying the same refund produces
    // the same dedupe key instead of minting a second provider refund.
    const refundTarget = body.captureId || payment?.providerId || body.externalRef || '';
    const stableSeed = [provider, refundTarget, currency, amount].join('|');
    const reference = body.reference
      || `RF-${createHash('sha256').update(stableSeed).digest('hex').slice(0, 16).toUpperCase()}`;

    // Explicit rail policy: international refunds default to PayPal; East
    // Africa refunds use a configured local rail (currently PesaFlow).
    const selection = await selectPaymentRail(prisma, {
      currency,
      country: body.country,
      channel: String(body.metadata?.channel || ''),
      amount,
      providerHint: provider,
      action: 'refund',
      originalCurrency: payment?.currency || currency,
      originalAmount: payment?.amount ?? amount,
    });

    // Claim the refund before any provider call. A replayed request is a no-op
    // even when the upstream PayPal refund is still in flight.
    const { event: claimEvent, deduped } = await recordProviderEvent(prisma, {
      provider: selection.provider,
      domain: 'FINANCE',
      externalEventId: `refund-request:${reference}`,
      eventType: 'finance.request_marker',
      signatureValid: true,
      status: 'PROCESSED',
      payload: { reference, paymentId: payment?.id ?? null, captureId: refundTarget, amount, currency: selection.settlementCurrency },
    });
    if (deduped) {
      return res.status(200).json({ reused: true, reference, event: claimEvent });
    }

    let result: any;
    try {
      result = await executeRefund(selection.provider, {
        provider: selection.provider,
        reference,
        amount,
        currency: selection.settlementCurrency,
        captureId: body.captureId || (payment?.providerId || body.externalRef) || undefined,
        reason: body.reason,
        metadata: {
          ...(body.metadata || {}),
          originalCurrency: payment?.currency || currency,
          originalAmount: payment?.amount ?? amount,
          paymentId: payment?.id || null,
        },
      });
    } catch (err: any) {
      const failed = await prisma.orm.public.Refund.create({
        id: newId(),
        paymentId: payment?.id ?? null,
        provider: selection.provider,
        externalRef: body.captureId || body.externalRef || null,
        amount: toMoney(amount),
        currency: selection.settlementCurrency,
        reason: body.reason || null,
        status: 'FAILED',
        requestedById: actor(req).actorId,
        approvedById: null,
        metadata: { reference, error: String(err?.message || '').slice(0, 300) } as any,
        createdAt: ts(),
        updatedAt: ts(),
      } as any);
      await logAudit({
        ...actor(req), action: 'finance.refund.failed', entity: 'Refund', entityId: failed.id,
        meta: { provider: selection.provider, amount, currency },
      });
      return res.status(errorStatus(err)).json({ error: String(err?.message || 'Refund failed').slice(0, 500), refund: failed });
    }

    const externalRef = String(result?.id || result?.refundId || reference);
    const refund = await prisma.orm.public.Refund.create({
      id: newId(),
      paymentId: payment?.id ?? null,
      provider: selection.provider,
      externalRef,
      amount: toMoney(amount),
      currency: selection.settlementCurrency,
      reason: body.reason || null,
      status: String(result?.status || 'COMPLETED').toUpperCase() === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      requestedById: actor(req).actorId,
      approvedById: actor(req).actorId,
      metadata: {
        reference,
        originalCurrency: payment?.currency || currency,
        originalAmount: payment?.amount ?? amount,
        settlementCurrency: selection.settlementCurrency,
        providerResult: result,
      } as any,
      createdAt: ts(),
      updatedAt: ts(),
    } as any);

    const { event } = await recordProviderEvent(prisma, {
      provider: selection.provider,
      domain: 'FINANCE',
      externalEventId: `refund:${reference}`,
      eventType: 'refund.created',
      signatureValid: true,
      payload: { refundId: refund.id, paymentId: payment?.id ?? null, externalRef, amount },
      status: 'PROCESSED',
    });

    let ledger: any = null;
    try {
      const account = await resolveFinanceAccount(prisma, selection.provider, externalRef);
      ledger = await postLedgerEntry(prisma, {
        provider: selection.provider,
        externalRef,
        entryType: 'REFUND',
        direction: 'OUT',
        amount,
        currency: refund.currency,
        status: refund.status,
        financeAccountId: account?.id ?? null,
        sourceType: 'PAYMENT',
        sourceId: payment?.id ?? refund.id,
        providerEventId: event.id,
        metadata: { refundId: refund.id, paymentId: payment?.id ?? null, originalCurrency: payment?.currency || currency },
      });
    } catch (err: any) {
      console.error('Refund ledger posting failed', String(err?.message || err).slice(0, 300));
    }

    await logAudit({
      ...actor(req), action: 'finance.refund.create', entity: 'Refund', entityId: refund.id,
      meta: { provider: selection.provider, amount, currency: refund.currency, paymentId: payment?.id ?? null },
    });
    return res.status(201).json({ refund, ledger });
  }));

  return router;
}
