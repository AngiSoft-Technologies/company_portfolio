import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const runSchema = z.object({
  provider: z.string().min(1),
  financeAccountId: z.string().optional().nullable(),
  periodStart: z.string().datetime().optional().nullable(),
  periodEnd: z.string().datetime().optional().nullable(),
});

export default function financeReconciliationRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/runs', requireAccess('finance.reconciliation.view', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (_req, res) => {
    const runs = await prisma.orm.public.ReconciliationRun.orderBy((r: any) => r.createdAt.desc()).limit(50).all().catch(() => []);
    res.json({ runs });
  });

  router.post('/runs', requireAccess('finance.reconciliation.manage', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
    const body = runSchema.parse(req.body);
    const run = await prisma.orm.public.ReconciliationRun.create({
      id: newId(), provider: body.provider, financeAccountId: body.financeAccountId ?? null,
      status: 'RUNNING', periodStart: body.periodStart ?? null, periodEnd: body.periodEnd ?? null,
      createdById: req.user?.sub ?? null, createdAt: ts(),
    } as any);
    try {
      const payments = await prisma.orm.public.Payment.where({ provider: body.provider as any } as any).all().catch(() => []);
      const ledger = await prisma.orm.public.LedgerEntry.where({ provider: body.provider } as any).all().catch(() => []);
      const succeeded = payments.filter((p: any) => p.status === 'SUCCEEDED');
      const ledgerSucceeded = ledger.filter((l: any) => l.status === 'SUCCEEDED');
      const summary = {
        paymentsTotal: payments.length,
        paymentsSucceeded: succeeded.length,
        ledgerTotal: ledger.length,
        ledgerSucceeded: ledgerSucceeded.length,
        amountPayments: succeeded.reduce((a: number, p: any) => a + Number(p.amount || 0), 0),
        amountLedger: ledgerSucceeded.reduce((a: number, l: any) => a + Number(l.amount || 0), 0),
        unmatchedPayments: Math.max(0, succeeded.length - ledgerSucceeded.length),
        generatedAt: ts(),
      };
      const done = await prisma.orm.public.ReconciliationRun.where({ id: run.id }).update({ status: 'COMPLETED', summary: summary as any, completedAt: ts() } as any);
      await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.reconciliation.run', entity: 'ReconciliationRun', entityId: run.id, meta: { provider: body.provider, summary } });
      res.status(201).json({ run: done });
    } catch (e: any) {
      const failed = await prisma.orm.public.ReconciliationRun.where({ id: run.id }).update({ status: 'FAILED', error: e.message || 'Reconciliation failed', completedAt: ts() } as any).catch(() => run);
      res.status(500).json({ error: e.message || 'Reconciliation failed', run: failed });
    }
  });

  return router;
}
