import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { generateReconciliationReport, resolveReconciliationItem } from '../services/reconciliation';
import { actor, allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];
const MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const runSchema = z.object({
  provider: z.string().min(1),
  financeAccountId: z.string().optional().nullable(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
});

const resolveSchema = z.object({
  note: z.string().optional().nullable(),
  resolution: z.enum(['MANUAL', 'REFUNDED', 'ADJUSTED', 'IGNORED', 'ESCALATED']).default('MANUAL'),
});

export default function financeReconciliationRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/reconciliation/runs', '/runs', '/'], requireAccess('finance.reconciliation.view', VIEW_ROLES), route(async (_req, res) => {
    const runs = await allRows(prisma.orm.public.ReconciliationRun.orderBy((r: any) => r.createdAt.desc()).limit(100).all());
    return res.json({ runs });
  }));

  router.get(['/reconciliation/runs/:id/items', '/runs/:id/items', '/:id/items'], requireAccess('finance.reconciliation.view', VIEW_ROLES), route(async (req, res) => {
    const run = await prisma.orm.public.ReconciliationRun.where({ id: req.params.id } as any).first();
    if (!run) return res.status(404).json({ error: 'Reconciliation run not found' });
    const items = await allRows(prisma.orm.public.ReconciliationItem.where({ runId: run.id } as any).orderBy((i: any) => i.createdAt.desc()).all());
    return res.json({ run, items });
  }));

  router.get(['/reconciliation/runs/:id', '/runs/:id'], requireAccess('finance.reconciliation.view', VIEW_ROLES), route(async (req, res) => {
    const run = await prisma.orm.public.ReconciliationRun.where({ id: req.params.id } as any).first();
    if (!run) return res.status(404).json({ error: 'Reconciliation run not found' });
    return res.json({ run });
  }));

  router.post(['/reconciliation/runs', '/runs', '/'], requireAccess('finance.reconciliation.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = runSchema.parse(req.body);
    const report = await generateReconciliationReport(prisma, {
      provider: body.provider,
      financeAccountId: body.financeAccountId ?? null,
      periodStart: body.periodStart ?? null,
      periodEnd: body.periodEnd ?? null,
      actorId: actor(req).actorId,
    });
    await logAudit({
      ...actor(req), action: 'finance.reconciliation.run', entity: 'ReconciliationRun', entityId: report.run.id,
      meta: { provider: body.provider, summary: report.summary },
    });
    return res.status(201).json(report);
  }));

  router.post(['/reconciliation/items/:id/resolve', '/items/:id/resolve', '/:id/resolve'], requireAccess('finance.reconciliation.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = resolveSchema.parse(req.body ?? {});
    const item = await resolveReconciliationItem(prisma, req.params.id, {
      actorId: actor(req).actorId,
      note: body.note ?? null,
      resolution: body.resolution,
    });
    if (!item) return res.status(404).json({ error: 'Reconciliation item not found' });
    await logAudit({
      ...actor(req), action: 'finance.reconciliation.resolve', entity: 'ReconciliationItem', entityId: item.id,
      meta: { resolution: body.resolution, runId: item.runId },
    });
    return res.json({ item });
  }));

  return router;
}
