import { createHash } from 'crypto';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { isRole, requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { generateReference, withScopeLock } from '../services/payments';
import { getMoneyType, moneyMovementSummary } from '../services/payments/moneyMovement';
import * as payhero from '../services/payments/payheroService';
import * as daraja from '../services/payments/darajaPayouts';
import * as paypalPayouts from '../services/payments/paypalPayouts';
import * as paypal from '../services/payments/paypalService';
import { settlementCurrency as paypalSettlementCurrency } from '../services/payments/paypalService';
import { toMoney } from '../utils/money';
import { postLedgerEntry, resolveFinanceAccount } from '../../finance/services/ledger';

/**
 * Money movement console (admin-only).
 *
 * A single surface for every outbound flow: Daraja B2C/B2B/reversal/status,
 * PayHero mobile/bank payouts and status, and PayPal Payouts/refunds. Every
 * payout is mirrored into the `Payout` table with a unique reference BEFORE
 * the provider call, so retries are no-ops; all actions are audited.
 */

const READ_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'DEVELOPER', 'MANAGER'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MARKETING'];
// Moving money through the Daraja initiator (B2C/B2B) or reversing a settled
// M-Pesa transaction needs a hard admin gate. `requireAccess` alone is not
// enough: it also accepts a granular `payments.reconcile` grant, and neither
// route has a separate approval step. Other providers keep WRITE_ROLES.
const DARAJA_WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// Daraja warns that continuous transaction-status polling can get the caller's
// IP blocked. This advisory per-transaction cooldown is deliberately local and
// ephemeral: it throttles UI re-clicks without changing provider state.
const MPESA_STATUS_COOLDOWN_MS = 30_000;
const mpesaStatusLastChecked = new Map<string, number>();

function statusCooldownRemaining(transactionId: string): number {
  const now = Date.now();
  if (mpesaStatusLastChecked.size > 1000) {
    for (const [key, at] of mpesaStatusLastChecked) {
      if (now - at >= MPESA_STATUS_COOLDOWN_MS) mpesaStatusLastChecked.delete(key);
    }
  }
  const last = mpesaStatusLastChecked.get(transactionId);
  return last === undefined ? 0 : Math.max(0, MPESA_STATUS_COOLDOWN_MS - (now - last));
}

/**
 * Explicit B2C/B2B dispatch allowlist. Adapter-only capabilities (Pochi,
 * standing orders, tax remittance) and any future catalogue entry must be
 * wired here deliberately: an unknown type must never fall through to the
 * PayPal payout branch just because it was accidentally marked available.
 */
const PAYOUT_DISPATCH: Record<string, 'MPESA_B2C' | 'MPESA_B2B' | 'PAYHERO_B2C_MOBILE' | 'PAYHERO_B2B_BANK' | 'PAYHERO_TOPUP' | 'PAYPAL_PAYOUT' | 'PAYPAL_B2B_PAYOUT'> = {
  MPESA_B2C: 'MPESA_B2C',
  MPESA_B2B: 'MPESA_B2B',
  PAYHERO_B2C_MOBILE: 'PAYHERO_B2C_MOBILE',
  PAYHERO_B2B_BANK: 'PAYHERO_B2B_BANK',
  PAYHERO_TOPUP: 'PAYHERO_TOPUP',
  PAYPAL_PAYOUT: 'PAYPAL_PAYOUT',
  PAYPAL_B2B_PAYOUT: 'PAYPAL_B2B_PAYOUT',
};

function errorStatus(err: any): number {
  if (err?.status && err.status >= 400 && err.status < 600) return err.status;
  return /not configured|missing|invalid|unsupported/i.test(String(err?.message || '')) ? 400 : 502;
}

export default function moneyMovementRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  /** Full transactional capability catalogue (C2B/B2C/B2B/refund/reversal/status). */
  router.get('/types', requireAccess('payments.view_all', READ_ROLES), (_req, res) => {
    res.json(moneyMovementSummary());
  });

  /** List locally mirrored payouts (all providers). */
  router.get('/payouts', requireAccess('payments.view_all', READ_ROLES), async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const rows = await prisma.orm.public.Payout
        .orderBy((p: any) => p.createdAt.desc())
        .limit(limit)
        .all();
      res.json({ payouts: rows });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Could not list payouts' });
    }
  });

  /** B2C / B2B payout dispatcher. */
  router.post('/payout', requireAccess('payments.reconcile', WRITE_ROLES), async (req: AuthRequest, res) => {
    const body = req.body || {};
    const type = String(body.type || '').toUpperCase();
    const definition = getMoneyType(type);
    if (!definition) {
      return res.status(getMoneyType(type, true) ? 503 : 400).json({ error: 'Unknown or unavailable payout type' });
    }
    if (!['B2C', 'B2B'].includes(definition.flow)) {
      return res.status(400).json({ error: `${type} is not a payout flow` });
    }
    const dispatch = PAYOUT_DISPATCH[type];
    if (!dispatch || dispatch !== type) {
      // No catalogue entry may reach a provider until it is explicitly wired.
      return res.status(400).json({ error: `${type} has no payout dispatcher` });
    }
    if (definition.provider === 'MPESA' && !isRole(req, DARAJA_WRITE_ROLES)) {
      return res.status(403).json({ error: 'Only administrators may initiate M-Pesa payouts' });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'A positive amount is required' });
    const reference = String(body.reference || '').trim() || generateReference('PO');

    try {
      // Phase 1: commit the local payout intent BEFORE any provider call. A
      // crash or timeout after money has moved must still leave an auditable
      // row; retries with the same reference return the existing row.
      const initialChannel = type === 'MPESA_B2C' || type === 'PAYHERO_B2C_MOBILE' || type === 'PAYHERO_TOPUP'
        ? 'mobile'
        : type === 'MPESA_B2B' || type === 'PAYHERO_B2B_BANK' ? 'b2b' : 'paypal';
      const initialCurrency = type === 'PAYPAL_PAYOUT' || type === 'PAYPAL_B2B_PAYOUT'
        ? paypalSettlementCurrency()
        : 'KES';
      const claim = await withScopeLock(prisma, `money:payout:${reference}`, async (tx) => {
        const existing = await tx.orm.public.Payout.where({ reference }).first();
        if (existing) return { existing: true, row: existing };
        const row = await tx.orm.public.Payout.create({
          id: newId(),
          updatedAt: ts(),
          provider: definition.provider,
          reference,
          amount: toMoney(amount),
          currency: initialCurrency,
          channel: initialChannel,
          status: 'PENDING' as any,
          metadata: JSON.parse(JSON.stringify({
            type, initiator: req.user?.sub || '', phase: 'INITIATED',
            originalCurrency: String(body.currency || initialCurrency).toUpperCase(),
            originalAmount: amount,
            settlementCurrency: initialCurrency,
          })),
        });
        return { existing: false, row };
      });

      if (claim.existing) {
        await logAudit({
          actorId: req.user?.sub, actorRole: String((req.user as any)?.role || ''),
          action: 'PAYOUT_DUPLICATE_IGNORED', entity: 'Payout', entityId: claim.row.id,
          meta: { type, reference, amount, provider: definition.provider },
        });
        return res.status(200).json({
          payoutId: claim.row.id,
          reference,
          providerReference: (claim.row as any).providerReference,
          status: (claim.row as any).status,
          reused: true,
        });
      }

      // Phase 2: call the provider outside the DB lock, using the same
      // reference as the provider-side idempotency key.
      let providerReference = '';
      let raw: any = null;
      let channel = initialChannel;
      let phoneNumber: string | null = null;
      let accountNumber: string | null = null;
      let networkCode: string | null = null;
      let currency = initialCurrency;
      let status = 'PENDING';

      try {
        if (type === 'MPESA_B2C') {
          const result = await daraja.b2cPayment({
            amount,
            phone: String(body.phone || ''),
            commandId: String(body.commandId || 'BusinessPayment') as any,
            remarks: String(body.remarks || 'AngiSoft payout'),
            originatorConversationId: reference,
          });
          providerReference = String((result as any).conversationId || (result as any).originatorConversationId || '');
          raw = result;
          phoneNumber = String(body.phone || '');
          status = String((result as any).status || 'PENDING');
        } else if (type === 'MPESA_B2B') {
          const result = await daraja.b2bPayment({
            amount,
            partyB: String(body.shortcode || getConfig('MPESA_SHORTCODE') || ''),
            commandId: String(body.commandId || 'BusinessToBusinessTransfer') as any,
            remarks: String(body.remarks || 'AngiSoft supplier payment'),
            originatorConversationId: reference,
          });
          providerReference = String((result as any).conversationId || (result as any).originatorConversationId || '');
          raw = result;
          accountNumber = String(body.shortcode || getConfig('MPESA_SHORTCODE') || '');
          channel = 'b2b';
          status = String((result as any).status || 'PENDING');
        } else if (type === 'PAYHERO_B2C_MOBILE') {
          networkCode = String(body.networkCode || getConfig('PAYHERO_MOBILE_NETWORK_CODE', 'safaricom'));
          const result = await payhero.withdraw({
            amount, reference, channel: 'mobile',
            phone: String(body.phone || ''),
            networkCode,
            description: String(body.remarks || 'AngiSoft payout'),
          });
          providerReference = String(result.providerReference || result.checkoutRequestId || '');
          raw = result;
          phoneNumber = String(body.phone || '');
          status = result.success ? 'PENDING' : 'FAILED';
        } else if (type === 'PAYHERO_B2B_BANK') {
          networkCode = String(body.networkCode || getConfig('PAYHERO_BANK_NETWORK_CODE') || '');
          const result = await payhero.withdraw({
            amount, reference, channel: 'bank',
            accountNumber: String(body.accountNumber || ''),
            networkCode,
            description: String(body.remarks || 'AngiSoft supplier payment'),
          });
          providerReference = String(result.providerReference || result.checkoutRequestId || '');
          raw = result;
          accountNumber = String(body.accountNumber || '');
          channel = 'bank';
          status = result.success ? 'PENDING' : 'FAILED';
        } else if (type === 'PAYHERO_TOPUP') {
          const result = await payhero.topUpServiceWallet({ amount, phone: String(body.phone || '') });
          providerReference = String(result.reference || result.checkoutRequestId || '');
          raw = result;
          phoneNumber = String(body.phone || '');
          channel = 'topup';
          status = result.success ? 'PENDING' : 'FAILED';
        } else if (dispatch === 'PAYPAL_PAYOUT' || dispatch === 'PAYPAL_B2B_PAYOUT') {
          // PayPal Payouts covers both B2C and B2B recipients.
          const result = await paypalPayouts.createPayout({
            reference,
            emailSubject: 'AngiSoft payment',
            items: [{
              amount,
              currency,
              receiver: String(body.receiver || ''),
              recipientType: String(body.recipientType || 'EMAIL'),
              note: String(body.remarks || 'AngiSoft payment'),
              senderItemId: `${reference}-1`,
            }],
          });
          providerReference = String((result as any).batchId || '');
          raw = result;
          channel = 'paypal';
          status = 'PENDING';
        } else {
          // Defensive: the allowlist above should make this unreachable.
          throw new Error(`${type} has no payout dispatcher`);
        }
      } catch (err: any) {
        // Keep the intent row for audit — mark it failed instead of losing it.
        try {
          await prisma.orm.public.Payout.where({ id: claim.row.id }).update({
            status: 'FAILED' as any,
            updatedAt: ts(),
            metadata: JSON.parse(JSON.stringify({
              type, initiator: req.user?.sub || '', phase: 'PROVIDER_FAILED', error: err?.message || 'Provider call failed',
            })),
          } as any);
        } catch { /* the intent row remains PENDING but is still auditable */ }
        throw err;
      }

      // Phase 3: persist the provider acknowledgement.
      await prisma.orm.public.Payout.where({ id: claim.row.id }).update({
        providerReference,
        amount: toMoney(amount),
        currency,
        channel,
        phoneNumber,
        accountNumber,
        networkCode,
        status: status as any,
        updatedAt: ts(),
        metadata: JSON.parse(JSON.stringify({
          type, initiator: req.user?.sub || '', phase: 'SUBMITTED', raw,
          originalCurrency: String(body.currency || initialCurrency).toUpperCase(),
          originalAmount: amount,
          settlementCurrency: initialCurrency,
        })),
      } as any);

      await logAudit({
        actorId: req.user?.sub, actorRole: String((req.user as any)?.role || ''),
        action: 'PAYOUT_INITIATED', entity: 'Payout', entityId: claim.row.id,
        meta: { type, reference, amount, provider: definition.provider },
      });

      // Phase 7: mirror the submitted payout into the normalized ledger. The
      // provider call already succeeded, so a ledger error is recorded as a
      // reconciliation exception rather than re-driving the provider.
      try {
        const account = await resolveFinanceAccount(prisma, definition.provider, providerReference || reference);
        await postLedgerEntry(prisma, {
          provider: definition.provider,
          externalRef: providerReference || reference,
          entryType: 'PAYOUT',
          direction: 'OUT',
          amount,
          currency,
          status,
          financeAccountId: account?.id ?? null,
          sourceType: 'PAYOUT',
          sourceId: claim.row.id,
          metadata: { type, reference, channel },
        });
      } catch (ledgerErr: any) {
        console.error('Payout ledger posting failed', ledgerErr?.message || ledgerErr);
      }

      res.status(201).json({
        payoutId: claim.row.id,
        reference,
        providerReference,
        status,
        reused: false,
      });
    } catch (err: any) {
      console.error('Payout failed:', err?.message);
      res.status(errorStatus(err)).json({ error: err?.message || 'Payout failed' });
    }
  });

  /** Refund a captured PayPal payment. Idempotent via `reference`. */
  router.post('/refund', requireAccess('payments.reconcile', WRITE_ROLES), async (req: AuthRequest, res) => {
    const captureId = String(req.body?.captureId || '').trim();
    if (!captureId) return res.status(400).json({ error: 'captureId is required' });
    if (req.body?.amount !== undefined && req.body?.amount !== null && req.body?.amount !== '') {
      const requested = Number(req.body.amount);
      if (!Number.isFinite(requested) || requested <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number when provided' });
      }
    }
    const definition = getMoneyType('PAYPAL_REFUND');
    if (!definition) return res.status(503).json({ error: 'PayPal refunds are not available' });
    let refundCurrency: string;
    try {
      refundCurrency = paypalSettlementCurrency(req.body?.currency);
    } catch (err: any) {
      return res.status(errorStatus(err)).json({ error: err?.message || 'Invalid PayPal settlement currency' });
    }
    // A replay without an explicit reference must still dedupe: derive it from
    // the refund target, amount and settlement currency instead of random data.
    const stableSeed = ['PAYPAL_REFUND', captureId, String(req.body?.amount ?? ''), refundCurrency].join('|');
    const reference = String(req.body?.reference || '').trim()
      || `RF-${createHash('sha256').update(stableSeed).digest('hex').slice(0, 16).toUpperCase()}`;

    try {
      const { event, deduped } = await recordProviderEvent(prisma, {
        provider: 'PAYPAL', domain: 'FINANCE',
        externalEventId: `refund:${reference}`,
        eventType: 'PAYPAL_REFUND_REQUESTED',
        signatureValid: true, status: 'RECEIVED',
        payload: { captureId, reference, amount: req.body?.amount },
      });
      if (deduped) {
        // The provider call is never replayed: PayPal idempotency alone is not
        // enough once a refund has already been accepted locally.
        const existing = await prisma.orm.public.Refund
          .where({ provider: 'PAYPAL' as any, externalRef: reference } as any)
          .first()
          .catch(() => null);
        return res.status(200).json({
          reused: true, reference, refundIdDb: existing?.id ?? null, event,
        });
      }
      const requestedAmount = req.body?.amount === undefined || req.body?.amount === null || req.body?.amount === ''
        ? undefined
        : Number(req.body.amount);
      const result = await paypalPayouts.refundCapture({
        captureId,
        reference,
        amount: requestedAmount,
        currency: refundCurrency,
      });
      const refundExternalRef = String((result as any)?.refundId || reference);
      // A full refund omits the request amount; the adapter returns the
      // provider's actual amount. Never persist a zero-value refund/ledger row
      // just because the caller did not ask for a partial amount.
      const providerAmount = Number((result as any)?.amount);
      const refundAmount = Number.isFinite(providerAmount) && providerAmount > 0
        ? providerAmount
        : Number(requestedAmount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        throw new Error('PayPal refund did not return a usable amount');
      }
      const existingRefund = await prisma.orm.public.Refund
        .where({ provider: 'PAYPAL' as any, externalRef: refundExternalRef } as any)
        .first()
        .catch(() => null);
      const refund = existingRefund || await prisma.orm.public.Refund.create({
        id: newId(),
        paymentId: null,
        provider: 'PAYPAL',
        externalRef: refundExternalRef,
        amount: toMoney(refundAmount),
        currency: refundCurrency,
        reason: String(req.body?.reason || 'Money movement refund'),
        status: String((result as any)?.status || 'COMPLETED').toUpperCase(),
        requestedById: req.user?.sub ?? null,
        approvedById: req.user?.sub ?? null,
        metadata: { reference, captureId, result } as any,
        createdAt: ts(),
        updatedAt: ts(),
      } as any);

      try {
        const account = await resolveFinanceAccount(prisma, 'PAYPAL', refundExternalRef);
        await postLedgerEntry(prisma, {
          provider: 'PAYPAL',
          externalRef: refundExternalRef,
          entryType: 'REFUND',
          direction: 'OUT',
          amount: refundAmount,
          currency: refundCurrency,
          status: String((result as any)?.status || 'COMPLETED').toUpperCase(),
          financeAccountId: account?.id ?? null,
          sourceType: 'PAYMENT',
          sourceId: refund.id,
          metadata: { refundId: refund.id, captureId, reference },
        });
      } catch (ledgerErr: any) {
        console.error('Refund ledger posting failed', ledgerErr?.message || ledgerErr);
      }

      await logAudit({
        actorId: req.user?.sub, actorRole: String((req.user as any)?.role || ''),
        action: 'PAYPAL_REFUND', entity: 'Refund', entityId: refund.id,
        meta: { reference, amount: refundAmount, captureId },
      });
      res.json({ refundId: (result as any).refundId, refundIdDb: refund.id, status: (result as any).status });
    } catch (err: any) {
      res.status(errorStatus(err)).json({ error: err?.message || 'Refund failed' });
    }
  });

  /** Reverse a completed M-Pesa transaction. */
  router.post('/reversal', requireAccess('payments.reconcile', WRITE_ROLES), async (req: AuthRequest, res) => {
    const definition = getMoneyType('MPESA_REVERSAL');
    if (!definition) return res.status(503).json({ error: 'M-Pesa reversals are not available' });
    if (!isRole(req, DARAJA_WRITE_ROLES)) {
      return res.status(403).json({ error: 'Only administrators may reverse M-Pesa transactions' });
    }
    const transactionId = String(req.body?.transactionId || '').trim();
    const amount = Number(req.body?.amount);
    if (!transactionId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'transactionId and a positive amount are required' });
    }
    // A reversal is irreversible money movement. Derive a stable reference from
    // the target + amount so a replay returns the original result instead of
    // submitting a second reversal to Safaricom.
    const stableSeed = ['MPESA_REVERSAL', transactionId, String(amount)].join('|');
    const reference = String(req.body?.reference || '').trim()
      || `RV-${createHash('sha256').update(stableSeed).digest('hex').slice(0, 16).toUpperCase()}`;
    const eventExternalId = `reversal:${reference}`;
    let providerAccepted = false;
    try {
      // Commit the local intent before calling Safaricom. The reference is also
      // the OriginatorConversationID, so the result callback can settle it.
      const claim = await withScopeLock(prisma, `money:reversal:${reference}`, async (tx) => {
        const existing = await tx.orm.public.Payout.where({ reference }).first();
        if (existing) return { row: existing, reused: true };
        const row = await tx.orm.public.Payout.create({
          id: newId(),
          provider: 'MPESA',
          reference,
          amount: toMoney(amount),
          currency: 'KES',
          channel: 'reversal',
          status: 'PENDING',
          metadata: {
            type: 'MPESA_REVERSAL', transactionId, phase: 'SUBMITTED',
            initiator: req.user?.sub || '',
          } as any,
          createdAt: ts(),
          updatedAt: ts(),
        } as any);
        return { row, reused: false };
      });

      const priorEvent = await prisma.orm.public.ProviderEvent
        .where({ provider: 'MPESA' as any, externalEventId: eventExternalId } as any)
        .first()
        .catch(() => null);
      if (priorEvent && String(priorEvent.status || '').toUpperCase() !== 'FAILED') {
        return res.status(200).json({
          reused: true, reference, payoutId: claim.row.id, event: priorEvent,
        });
      }

      const event = priorEvent
        ? await prisma.orm.public.ProviderEvent.where({ id: priorEvent.id } as any).update({
          status: 'RECEIVED', error: null, processedAt: null,
        } as any).catch(() => null)
        : (await recordProviderEvent(prisma, {
          provider: 'MPESA', domain: 'FINANCE',
          externalEventId: eventExternalId,
          eventType: 'MPESA_REVERSAL_REQUESTED',
          signatureValid: false,
          status: 'RECEIVED',
          payload: { transactionId, amount, reference },
        })).event;
      if (!event?.id) throw new Error('Could not record the reversal idempotency event');

      const result = await daraja.reverseTransaction({
        transactionId,
        amount,
        remarks: String(req.body?.remarks || 'AngiSoft reversal'),
        originatorConversationId: reference,
      });
      providerAccepted = true;

      await prisma.orm.public.Payout.where({ id: claim.row.id } as any).update({
        providerReference: String((result as any)?.conversationId || ''),
        status: 'PENDING',
        metadata: {
          type: 'MPESA_REVERSAL', transactionId, phase: 'AWAITING_CALLBACK',
          conversationId: (result as any)?.conversationId || null,
          initiator: req.user?.sub || '',
        } as any,
        updatedAt: ts(),
      } as any).catch(() => undefined);
      await prisma.orm.public.ProviderEvent.where({ id: event.id } as any).update({
        status: 'PROCESSED', processedAt: ts(), error: null,
      } as any).catch(() => undefined);

      const reversedPayment = await prisma.orm.public.Payment
        .where({ providerId: transactionId } as any)
        .first()
        .catch(() => null);
      try {
        const account = await resolveFinanceAccount(prisma, 'MPESA', reference);
        await postLedgerEntry(prisma, {
          provider: 'MPESA',
          externalRef: reference,
          entryType: 'REVERSAL',
          direction: 'OUT',
          amount,
          currency: 'KES',
          // Pending until the signed-in result callback settles the Payout.
          status: 'PENDING',
          financeAccountId: account?.id ?? null,
          sourceType: 'PAYMENT',
          sourceId: reversedPayment?.id ?? null,
          metadata: {
            transactionId, originatorConversationId: reference,
            conversationId: (result as any)?.conversationId || null,
          } as any,
        });
      } catch (ledgerErr: any) {
        console.error('Reversal ledger posting failed', ledgerErr?.message || ledgerErr);
        await logAudit({
          actorId: req.user?.sub, actorRole: String((req.user as any)?.role || ''),
          action: 'LEDGER_POST_FAILED', entity: 'Payout', entityId: claim.row.id,
          meta: { type: 'MPESA_REVERSAL', reference, error: String(ledgerErr?.message || ledgerErr).slice(0, 500) },
        }).catch(() => undefined);
      }

      await logAudit({
        actorId: req.user?.sub, actorRole: String((req.user as any)?.role || ''),
        action: 'MPESA_REVERSAL_INITIATED', entity: 'Payout', entityId: claim.row.id,
        meta: { amount, transactionId, reference, settlement: 'PENDING_CALLBACK' },
      });
      res.status(202).json({ result, reference, payoutId: claim.row.id, pending: true });
    } catch (err: any) {
      if (!providerAccepted) {
        await prisma.orm.public.Payout.where({ reference } as any).update({
          status: 'FAILED',
          metadata: { type: 'MPESA_REVERSAL', transactionId, phase: 'PROVIDER_FAILED' } as any,
          updatedAt: ts(),
        } as any).catch(() => undefined);
        await prisma.orm.public.ProviderEvent
          .where({ provider: 'MPESA' as any, externalEventId: eventExternalId } as any)
          .update({ status: 'FAILED', error: String(err?.message || err).slice(0, 1000) } as any)
          .catch(() => undefined);
      }
      res.status(errorStatus(err)).json({ error: err?.message || 'Reversal failed' });
    }
  });

  /** Live status lookup across all three providers. */
  router.get('/status/:type', requireAccess('payments.view_all', READ_ROLES), async (req, res) => {
    const type = String(req.params.type || '').toUpperCase();
    try {
      if (type === 'PAYHERO_STATUS') {
        const reference = String(req.query.reference || '');
        if (!reference) return res.status(400).json({ error: 'reference is required' });
        return res.json({ status: await payhero.getTransactionStatus(reference) });
      }
      if (type === 'PAYHERO_BALANCE') {
        const walletType = String(req.query.walletType || 'payment_wallet');
        if (!['service_wallet', 'payment_wallet'].includes(walletType)) {
          return res.status(400).json({ error: 'walletType must be service_wallet or payment_wallet' });
        }
        return res.json({ status: await payhero.getWallet(walletType as 'service_wallet' | 'payment_wallet') });
      }
      if (type === 'PAYPAL_REFUND_STATUS') {
        const refundId = String(req.query.refundId || req.query.reference || '');
        if (!refundId) return res.status(400).json({ error: 'refundId is required' });
        return res.json({ status: await paypalPayouts.getRefund(refundId) });
      }
      if (type === 'PAYPAL_ORDER_STATUS') {
        const orderId = String(req.query.orderId || req.query.reference || '');
        if (!orderId) return res.status(400).json({ error: 'orderId is required' });
        // Read-only lookup: never capture, refund or modify the order here.
        return res.json({ status: await paypal.getOrder(orderId) });
      }
      if (type === 'PAYPAL_CAPTURE_STATUS') {
        const captureId = String(req.query.captureId || req.query.reference || '');
        if (!captureId) return res.status(400).json({ error: 'captureId is required' });
        // Read-only lookup used to resolve a capture before issuing a refund.
        return res.json({ status: await paypal.getCapture(captureId) });
      }
      if (type === 'MPESA_STATUS') {
        const transactionId = String(req.query.transactionId || req.query.reference || '');
        if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });
        const remaining = statusCooldownRemaining(transactionId);
        if (remaining > 0) {
          return res.status(429).json({
            error: 'M-Pesa status was checked too recently',
            retryAfterSeconds: Math.ceil(remaining / 1000),
          });
        }
        mpesaStatusLastChecked.set(transactionId, Date.now());
        try {
          return res.json({ status: await daraja.queryTransactionStatus({ transactionId }) });
        } catch (err) {
          // Do not penalise a retry after an upstream/configuration failure.
          mpesaStatusLastChecked.delete(transactionId);
          throw err;
        }
      }
      if (type === 'MPESA_BALANCE') {
        if (!getMoneyType('MPESA_BALANCE')) return res.status(503).json({ error: 'M-Pesa balance is not available' });
        // No caller-supplied URLs or payload overrides. Parsed balances are
        // mirrored by the result callback as review-only ProviderEvents; this
        // read-only branch never posts a ledger entry.
        const result = await daraja.queryAccountBalance();
        return res.json({
          status: {
            responseCode: result.responseCode,
            responseDescription: result.responseDescription,
            conversationId: result.conversationId,
            originatorConversationId: result.originatorConversationId,
          },
          reviewOnly: true,
          autoSettlement: false,
        });
      }
      if (type === 'PAYPAL_PAYOUT_STATUS') {
        const batchId = String(req.query.batchId || req.query.reference || '');
        const itemId = String(req.query.itemId || '');
        if (!batchId) return res.status(400).json({ error: 'batchId is required' });
        return res.json({
          status: itemId
            ? await paypalPayouts.getPayoutItem(batchId, itemId)
            : await paypalPayouts.getPayout(batchId),
        });
      }
      return res.status(400).json({ error: 'Unsupported status type' });
    } catch (err: any) {
      res.status(errorStatus(err)).json({ error: err?.message || 'Status lookup failed' });
    }
  });

  return router;
}
