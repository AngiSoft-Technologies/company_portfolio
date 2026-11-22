import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { fromMoney, toMoney, type MoneyInput } from '../../billing/utils/money';
import { normalizeProvider } from '../services/capabilityMatrix';
import { postLedgerEntry, resolveFinanceAccount } from '../services/ledger';
import { selectPaymentRail, settlements as fetchSettlements } from '../services/providers';
import { actor, allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const settlementSchema = z.object({
  provider: z.string().optional().default('PAYPAL'),
  financeAccountId: z.string().optional().nullable(),
  externalRef: z.string().optional().nullable(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
  currency: z.string().optional(),
  country: z.string().optional(),
});

function numberField(value: unknown): MoneyInput {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function financeSettlementsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/settlements'], requireAccess('finance.reconciliation.view', VIEW_ROLES), route(async (req, res) => {
    const filters: Record<string, unknown> = {};
    if (req.query.provider) filters.provider = normalizeProvider(req.query.provider);
    if (req.query.status) filters.status = String(req.query.status).toUpperCase();
    if (req.query.financeAccountId) filters.financeAccountId = String(req.query.financeAccountId);
    const settlements = await allRows(prisma.orm.public.Settlement.where(filters as any).orderBy((s: any) => s.createdAt.desc()).limit(200).all());
    return res.json({ settlements });
  }));

  router.post(['/', '/settlements'], requireAccess('finance.reconciliation.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = settlementSchema.parse(req.body);
    const selection = await selectPaymentRail(prisma, {
      currency: body.currency || (normalizeProvider(body.provider) === 'PAYPAL' ? 'USD' : 'KES'),
      country: body.country,
      action: 'settlement',
      providerHint: normalizeProvider(body.provider),
    });

    const providerRows = await fetchSettlements(selection.provider, {
      provider: selection.provider,
      reference: body.externalRef || '',
      periodStart: body.periodStart || undefined,
      periodEnd: body.periodEnd || undefined,
      financeAccountId: body.financeAccountId || undefined,
    });

    const created: any[] = [];
    for (const row of providerRows) {
      const gross = numberField(row.gross ?? row.amount ?? row.total ?? row.net);
      const fees = numberField(row.fees ?? row.fee ?? row.total_fees);
      const net = numberField(row.net ?? Math.max(fromMoney(toMoney(gross)) - fromMoney(toMoney(fees)), 0));
      const externalRef = String(row.id || row.settlementId || row.batchId || body.externalRef || '');
      const existing = externalRef
        ? await prisma.orm.public.Settlement.where({ provider: selection.provider, externalRef } as any).first().catch(() => null)
        : null;
      if (existing) {
        created.push(existing);
        continue;
      }
      const settlement = await prisma.orm.public.Settlement.create({
        id: newId(),
        provider: selection.provider,
        financeAccountId: body.financeAccountId ?? null,
        externalRef: externalRef || null,
        gross: toMoney(gross),
        fees: toMoney(fees),
        net: toMoney(net),
        currency: String(row.currency || selection.settlementCurrency).toUpperCase(),
        periodStart: body.periodStart ? ts(body.periodStart) : null,
        periodEnd: body.periodEnd ? ts(body.periodEnd) : null,
        status: String(row.status || 'COMPLETED').toUpperCase(),
        metadata: row as any,
        createdAt: ts(),
      } as any);

      const { event } = await recordProviderEvent(prisma, {
        provider: selection.provider,
        domain: 'FINANCE',
        externalEventId: `settlement:${externalRef || settlement.id}`,
        eventType: 'settlement.created',
        signatureValid: true,
        payload: { settlementId: settlement.id, externalRef, gross, fees, net },
        status: 'PROCESSED',
      });
      try {
        const account = await resolveFinanceAccount(prisma, selection.provider, externalRef);
        await postLedgerEntry(prisma, {
          provider: selection.provider,
          externalRef: externalRef || settlement.id,
          entryType: 'SETTLEMENT',
          direction: 'IN',
          amount: net,
          fee: fees,
          currency: settlement.currency,
          status: settlement.status,
          financeAccountId: body.financeAccountId ?? account?.id ?? null,
          sourceType: 'SETTLEMENT',
          sourceId: settlement.id,
          providerEventId: event.id,
          metadata: { settlementId: settlement.id, gross, fees },
        });
      } catch (err: any) {
        // postLedgerEntry records its own reconciliation exception.
        console.error('Settlement ledger posting failed', String(err?.message || err).slice(0, 300));
      }
      created.push(settlement);
    }

    await logAudit({
      ...actor(req), action: 'finance.settlement.sync', entity: 'Settlement',
      meta: { provider: selection.provider, count: created.length, periodStart: body.periodStart ?? null, periodEnd: body.periodEnd ?? null },
    });
    return res.status(201).json({ settlements: created, defaultRail: selection.provider });
  }));

  return router;
}
