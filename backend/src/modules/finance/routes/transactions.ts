import { Router } from 'express';
import type { Db } from '../../../db';
import { tsMs } from '../../../prisma/db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { normalizeProvider } from '../services/capabilityMatrix';
import { transactionsToCsv } from '../services/reports';
import { selectPaymentRail } from '../services/providers';
import { actor, allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const EXPORT_ROLES = ['ADMIN', 'SUPER_ADMIN'];

function filterRows(rows: any[], req: any): any[] {
  const provider = req.query.provider ? normalizeProvider(req.query.provider) : null;
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;
  const type = req.query.type ? String(req.query.type).toUpperCase() : null;
  const accountRef = req.query.accountRef ? String(req.query.accountRef) : null;
  const customerRef = req.query.customerRef ? String(req.query.customerRef) : null;
  const search = req.query.search ? String(req.query.search).toLowerCase() : null;
  const startMs = req.query.periodStart ? tsMs(req.query.periodStart) : null;
  const endMs = req.query.periodEnd ? tsMs(req.query.periodEnd) : null;

  return rows.filter((row) => {
    if (provider && normalizeProvider(row.provider) !== provider) return false;
    if (status && String(row.status || '').toUpperCase() !== status) return false;
    if (type && String(row.transactionType || '').toUpperCase() !== type) return false;
    if (accountRef && String(row.accountRef || '') !== accountRef) return false;
    if (customerRef && String(row.customerRef || '') !== customerRef) return false;
    const occurred = tsMs(row.occurredAt);
    if (startMs && occurred < startMs) return false;
    if (endMs && occurred > endMs) return false;
    if (search) {
      const haystack = [row.externalRef, row.sourceId, row.accountRef, row.customerRef, row.id]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export default function financeTransactionsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/transactions/export', '/export'], requireAccess('finance.transactions.export', EXPORT_ROLES), route(async (req: AuthRequest, res) => {
    const rows = filterRows(await allRows(prisma.orm.public.FinanceTransaction.orderBy((t: any) => t.occurredAt.desc()).all()), req.query);
    await logAudit({
      ...actor(req), action: 'finance.transactions.export', entity: 'FinanceTransaction',
      meta: { count: rows.length, filters: { ...req.query } },
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="finance-transactions.csv"');
    return res.send(transactionsToCsv(rows));
  }));

  router.get(['/transactions', '/'], requireAccess('finance.transactions.view', VIEW_ROLES), route(async (req: AuthRequest, res) => {
    const rows = filterRows(await allRows(prisma.orm.public.FinanceTransaction.orderBy((t: any) => t.occurredAt.desc()).all()), req.query);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    let defaultRail: Record<string, unknown> | null = null;
    try {
      const selection = await selectPaymentRail(prisma, {
        currency: String(req.query.currency || 'KES'),
        country: String(req.query.country || ''),
        channel: String(req.query.channel || ''),
        action: 'reconciliation',
      });
      defaultRail = {
        provider: selection.provider,
        region: selection.region,
        settlementCurrency: selection.settlementCurrency,
        reason: selection.reason,
      };
    } catch (err: any) {
      defaultRail = { provider: null, reason: String(err?.message || 'Rail unavailable') };
    }
    return res.json({
      transactions: rows.slice(offset, offset + limit),
      total: rows.length,
      limit,
      offset,
      defaultRail,
    });
  }));

  return router;
}
