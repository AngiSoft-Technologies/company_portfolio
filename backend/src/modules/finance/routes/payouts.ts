import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { fromMoney, toMoney } from '../../billing/utils/money';
import { normalizeProvider } from '../services/capabilityMatrix';
import { resolveFinanceAccount, postLedgerEntry } from '../services/ledger';
import { payout as executePayout, selectPaymentRail } from '../services/providers';
import { actor, allRows, errorStatus, objectOf, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];
const MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const payoutSchema = z.object({
  provider: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().min(3).default('KES'),
  channel: z.string().min(1),
  phoneNumber: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  networkCode: z.string().optional().nullable(),
  receiver: z.string().optional().nullable(),
  reference: z.string().optional(),
  country: z.string().optional(),
  financeAccountId: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

function flowFor(channel: string): 'B2C' | 'B2B' {
  return /b2b|bank|sacco|paybill|business/i.test(String(channel || '')) ? 'B2B' : 'B2C';
}

function providerRef(result: any): string {
  return String(
    result?.providerReference
    || result?.conversationId
    || result?.originatorConversationId
    || result?.batchId
    || result?.payoutBatchId
    || result?.reference
    || '',
  );
}

export default function financePayoutsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/payouts'], requireAccess('finance.payouts.view', VIEW_ROLES), route(async (_req, res) => {
    const [payouts, approvals] = await Promise.all([
      allRows(prisma.orm.public.Payout.orderBy((p: any) => p.createdAt.desc()).limit(200).all()),
      allRows(prisma.orm.public.PayoutApproval.orderBy((a: any) => a.createdAt.desc()).limit(200).all()),
    ]);
    return res.json({ payouts, approvals });
  }));

  router.post(['/', '/payouts'], requireAccess('finance.payouts.create', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = payoutSchema.parse(req.body);
    const reference = body.reference || `PO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    // A caller may hint a rail, but it must not override the routing policy:
    // international/non-KES payouts default to PayPal, EA payouts to local rails.
    const providerHint = body.provider ? normalizeProvider(body.provider) : undefined;
    const existing = await prisma.orm.public.Payout.where({ reference } as any).first();
    if (existing) return res.status(200).json({ payout: existing, reused: true });

    // Validate rail/capability before storing an intent we cannot execute.
    const selection = await selectPaymentRail(prisma, {
      currency: body.currency,
      country: body.country,
      channel: body.channel,
      amount: body.amount,
      providerHint,
      action: flowFor(body.channel) === 'B2B' ? 'payout_b2b' : 'payout_b2c',
    });
    const provider = selection.provider;
    const requestedCurrency = body.currency.toUpperCase();
    const requestedCountry = body.country ? body.country.toUpperCase() : (requestedCurrency === 'KES' ? 'KE' : null);

    const payout = await prisma.orm.public.Payout.create({
      id: newId(),
      provider,
      reference,
      amount: toMoney(body.amount),
      currency: body.currency.toUpperCase(),
      channel: body.channel,
      phoneNumber: body.phoneNumber ?? null,
      accountNumber: body.accountNumber ?? null,
      networkCode: body.networkCode ?? null,
      status: 'PENDING_APPROVAL',
      metadata: {
        ...(body.metadata || {}),
        requestedBy: actor(req).actorId,
        financeAccountId: body.financeAccountId ?? null,
        receiver: body.receiver ?? null,
        // Persist the routing context so approval reuses the same rail.
        country: requestedCountry,
        requestedCurrency,
        originalCurrency: requestedCurrency,
        originalAmount: body.amount,
        settlementCurrency: selection.settlementCurrency,
        routingPolicy: selection.metadata.routingPolicy,
        providerHint: providerHint ?? null,
      } as any,
      createdAt: ts(),
      updatedAt: ts(),
    } as any);
    const approval = await prisma.orm.public.PayoutApproval.create({
      id: newId(),
      payoutId: payout.id,
      requestedById: actor(req).actorId,
      approvedById: null,
      status: 'PENDING',
      decisionNote: null,
      decidedAt: null,
      createdAt: ts(),
    } as any);
    await logAudit({
      ...actor(req), action: 'finance.payout.request', entity: 'Payout', entityId: payout.id,
      meta: { amount: body.amount, currency: body.currency, provider, reference },
    });
    return res.status(201).json({ payout, approval });
  }));

  router.post(['/payouts/:id/approve', '/:id/approve'], requireAccess('finance.payouts.approve', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const payout: any = await prisma.orm.public.Payout.where({ id: req.params.id } as any).first();
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    if (payout.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Only pending approval payouts can be approved' });

    const approvals = await allRows(prisma.orm.public.PayoutApproval.where({ payoutId: payout.id } as any).orderBy((a: any) => a.createdAt.desc()).all());
    const approval = approvals[0];
    if (approval && String(approval.status).toUpperCase() !== 'PENDING') {
      return res.status(400).json({ error: 'Payout approval has already been decided' });
    }

    const flow = flowFor(payout.channel);
    // Reuse the persisted routing context — an approver must not be able to
    // change the rail by supplying a different country in the approval body.
    const selection = await selectPaymentRail(prisma, {
      currency: String(payout.metadata?.requestedCurrency || payout.currency),
      country: String(payout.metadata?.country || ''),
      channel: payout.channel,
      amount: fromMoney(payout.amount),
      providerHint: normalizeProvider(payout.provider),
      action: flow === 'B2B' ? 'payout_b2b' : 'payout_b2c',
    });

    let result: any;
    try {
      result = await executePayout(selection.provider, flow, {
        provider: selection.provider,
        reference: payout.reference,
        amount: fromMoney(payout.amount),
        // PayPal settles in the rail's currency; the invoice currency/amount
        // remain in metadata (including for KES-denominated invoices).
        currency: selection.settlementCurrency,
        phone: payout.phoneNumber || undefined,
        receiver: payout.metadata?.receiver || payout.phoneNumber || undefined,
        recipientType: payout.metadata?.recipientType || 'EMAIL',
        channel: selection.channel || payout.channel,
        channelId: selection.channelId,
        networkCode: payout.networkCode || selection.networkCode,
        accountNumber: payout.accountNumber || undefined,
        shortcode: payout.accountNumber || undefined,
        description: payout.metadata?.description || 'AngiSoft payout',
        metadata: {
          ...objectOf(payout.metadata),
          approvalId: approval?.id,
          approvedBy: actor(req).actorId,
          originalCurrency: payout.currency,
          originalAmount: fromMoney(payout.amount),
          settlementCurrency: selection.settlementCurrency,
          routingPolicy: selection.metadata.routingPolicy,
        },
      });
    } catch (err: any) {
      const updatedApproval = approval
        ? await prisma.orm.public.PayoutApproval.where({ id: approval.id }).update({
          status: 'REJECTED', approvedById: actor(req).actorId, decisionNote: 'Provider execution failed',
          decidedAt: ts(),
        } as any)
        : null;
      await prisma.orm.public.Payout.where({ id: payout.id }).update({
        status: 'FAILED', updatedAt: ts(),
        metadata: { ...objectOf(payout.metadata), providerError: String(err?.message || '').slice(0, 300) } as any,
      } as any);
      await logAudit({
        ...actor(req), action: 'finance.payout.execution_failed', entity: 'Payout', entityId: payout.id,
        meta: { reason: String(err?.message || '').slice(0, 300), provider: selection.provider },
      });
      return res.status(errorStatus(err)).json({ error: String(err?.message || 'Payout execution failed').slice(0, 500) });
    }

    const externalRef = providerRef(result) || payout.reference;
    const updatedRow = await prisma.orm.public.Payout.where({ id: payout.id }).update({
      status: String(result?.status || 'PENDING').toUpperCase() === 'COMPLETED' ? 'SUCCEEDED' : 'PENDING',
      providerReference: externalRef,
      updatedAt: ts(),
      metadata: { ...objectOf(payout.metadata), approvedBy: actor(req).actorId, approvedAt: ts(), providerResult: result } as any,
    } as any);
    const updated = updatedRow ?? payout;
    const decidedApproval = approval
      ? await prisma.orm.public.PayoutApproval.where({ id: approval.id }).update({
        status: 'APPROVED', approvedById: actor(req).actorId, decisionNote: 'Approved and submitted to provider', decidedAt: ts(),
      } as any)
      : await prisma.orm.public.PayoutApproval.create({
        id: newId(), payoutId: payout.id, requestedById: payout.metadata?.requestedBy ?? null,
        approvedById: actor(req).actorId, status: 'APPROVED', decisionNote: 'Approved and submitted to provider', decidedAt: ts(), createdAt: ts(),
      } as any);
    const decidedApprovalId = decidedApproval?.id ?? approval?.id ?? newId();

    const { event } = await recordProviderEvent(prisma, {
      provider: selection.provider,
      domain: 'FINANCE',
      externalEventId: `payout-approve:${payout.id}`,
      eventType: 'payout.approved',
      signatureValid: true,
      payload: { payoutId: payout.id, approvalId: decidedApprovalId, externalRef, actorId: actor(req).actorId },
      status: 'PROCESSED',
    });

    let ledger: any = null;
    let ledgerError: string | null = null;
    try {
      const account = payout.metadata?.financeAccountId
        ? await prisma.orm.public.FinanceAccount.where({ id: String(payout.metadata.financeAccountId) } as any).first().catch(() => null)
        : await resolveFinanceAccount(prisma, selection.provider, externalRef);
      ledger = await postLedgerEntry(prisma, {
        provider: selection.provider,
        externalRef,
        entryType: 'PAYOUT',
        direction: 'OUT',
        amount: fromMoney(payout.amount),
        currency: selection.settlementCurrency,
        status: updated.status,
        financeAccountId: account?.id ?? null,
        sourceType: 'PAYOUT',
        sourceId: payout.id,
        providerEventId: event.id,
        metadata: {
          payoutId: payout.id,
          reference: payout.reference,
          approvalId: decidedApprovalId,
          originalCurrency: payout.currency,
        },
      });
    } catch (err: any) {
      // Money has already moved; the exception is recorded by postLedgerEntry.
      ledgerError = String(err?.message || 'Ledger posting failed').slice(0, 300);
      console.error('Payout ledger posting failed', ledgerError);
    }

    await logAudit({
      ...actor(req), action: 'finance.payout.approve', entity: 'Payout', entityId: payout.id,
      meta: { status: updated.status, provider: selection.provider, externalRef, ledgerError },
    });
    return res.json({ payout: updated, approval: decidedApproval, ledger, ledgerError });
  }));

  router.post(['/payouts/:id/reject', '/:id/reject'], requireAccess('finance.payouts.approve', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const payout = await prisma.orm.public.Payout.where({ id: req.params.id } as any).first();
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    const updated = await prisma.orm.public.Payout.where({ id: payout.id }).update({
      status: 'REJECTED', updatedAt: ts(),
      metadata: { ...objectOf(payout.metadata), rejectedBy: actor(req).actorId, rejectedAt: ts(), reason: req.body?.reason || null } as any,
    } as any);
    const approvals = await allRows(prisma.orm.public.PayoutApproval.where({ payoutId: payout.id } as any).all());
    const pending = approvals.find((item) => String(item.status).toUpperCase() === 'PENDING');
    const approval = pending
      ? await prisma.orm.public.PayoutApproval.where({ id: pending.id }).update({
        status: 'REJECTED', approvedById: actor(req).actorId, decisionNote: req.body?.reason || 'Rejected', decidedAt: ts(),
      } as any)
      : null;
    await logAudit({
      ...actor(req), action: 'finance.payout.reject', entity: 'Payout', entityId: payout.id,
      meta: { reason: req.body?.reason || null },
    });
    return res.json({ payout: updated, approval });
  }));

  return router;
}
