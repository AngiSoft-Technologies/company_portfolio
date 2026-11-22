import { Router } from 'express';
import type { Db } from '../../../db';
import { requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { sumMoney } from '../../billing/utils/money';
import { listCapabilityMatrix } from '../services/capabilityMatrix';
import { selectPaymentRail } from '../services/providers';
import { allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];

export default function financeOverviewRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/overview'], requireAccess('finance.overview.view', VIEW_ROLES), route(async (req, res) => {
    const [connections, accounts, transactions, payouts, refunds, disputes, settlements, runs, events] = await Promise.all([
      allRows(prisma.orm.public.ProviderConnection.where({ domain: 'FINANCE' } as any).all()),
      allRows(prisma.orm.public.FinanceAccount.all()),
      allRows(prisma.orm.public.FinanceTransaction.all()),
      allRows(prisma.orm.public.Payout.all()),
      allRows(prisma.orm.public.Refund.all()),
      allRows(prisma.orm.public.Dispute.all()),
      allRows(prisma.orm.public.Settlement.all()),
      allRows(prisma.orm.public.ReconciliationRun.all()),
      allRows(prisma.orm.public.ProviderEvent.where({ domain: 'FINANCE' } as any).orderBy((e: any) => e.createdAt.desc()).limit(10).all()),
    ]);

    let defaultRail: Record<string, unknown> | null = null;
    try {
      const selection = await selectPaymentRail(prisma, {
        currency: String(req.query.currency || 'KES'),
        country: String(req.query.country || 'KE'),
        action: 'reconciliation',
      });
      defaultRail = { provider: selection.provider, region: selection.region, reason: selection.reason };
    } catch (err: any) {
      defaultRail = { provider: null, reason: String(err?.message || 'Rail unavailable') };
    }

    const byStatus = (rows: any[]) => rows.reduce((acc: Record<string, number>, row) => {
      const key = String(row.status || 'UNKNOWN');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      connections: { total: connections.length, byStatus: byStatus(connections) },
      accounts: { total: accounts.length, byStatus: byStatus(accounts) },
      transactions: {
        total: transactions.length,
        byStatus: byStatus(transactions),
        volume: sumMoney(transactions.map((row) => row.amount)),
      },
      payouts: {
        total: payouts.length,
        byStatus: byStatus(payouts),
        volume: sumMoney(payouts.map((row) => row.amount)),
      },
      refunds: { total: refunds.length, open: refunds.filter((r) => ['PENDING', 'PROCESSING'].includes(String(r.status))).length },
      disputes: { total: disputes.length, open: disputes.filter((d) => !['RESOLVED', 'CLOSED', 'WON', 'LOST'].includes(String(d.status))).length },
      settlements: { total: settlements.length, net: sumMoney(settlements.map((s) => s.net)) },
      reconciliation: { runs: runs.length, byStatus: byStatus(runs) },
      recentEvents: events,
      capabilities: listCapabilityMatrix().map((item) => ({
        provider: item.provider,
        available: item.available,
        configured: item.configured,
        legacy: item.legacy,
        defaultFor: item.defaultFor,
      })),
      defaultRail,
    });
  }));

  return router;
}
