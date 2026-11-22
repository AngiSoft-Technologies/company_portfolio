import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { generateReconciliationReport, resolveReconciliationItem } from '../services/reconciliation';
import { matchC2bConfirmations } from '../services/c2bMatching';
import { reviewPayHeroEvents, summarizePayHeroReview } from '../services/payheroReconciliation';
import { actor, allRows, objectOf, route } from './helpers';

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

const c2bReviewSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const payheroReviewSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  // `z.coerce.boolean()` treats "false" as true, so parse explicitly.
  includeOrphans: z.union([z.boolean(), z.string()])
    .transform((value) => value === true || value === 'true' || value === '1')
    .default(true),
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

  /**
   * READ-ONLY C2B review. Surfaces candidate invoice matches for Daraja C2B
   * confirmations recorded by the billing callbacks. It writes nothing, posts
   * nothing to the ledger and never settles a payment — suggestions only.
   */
  router.get(['/reconciliation/c2b/review', '/c2b/review'], requireAccess('finance.reconciliation.view', VIEW_ROLES), route(async (req, res) => {
    const { limit } = c2bReviewSchema.parse(req.query);
    const events = await allRows(
      prisma.orm.public.ProviderEvent
        .where({ provider: 'MPESA', eventType: 'DARAJA_C2B_CONFIRMATION' } as any)
        .orderBy((e: any) => e.createdAt.desc())
        .limit(limit)
        .all(),
    );

    // Pull only invoices whose number/publicReference could match a BillRefNumber.
    const refs = new Set<string>();
    for (const event of events) {
      const value = String(objectOf(objectOf(event).payload).matchValue ?? '').trim().toUpperCase();
      if (value) refs.add(value);
    }
    const refList = [...refs];
    const invoices: any[] = refList.length
      ? [
          ...await allRows(prisma.orm.public.Invoice.where((i: any) => i.number.in(refList)).all()),
          ...await allRows(prisma.orm.public.Invoice.where((i: any) => i.publicReference.in(refList)).all()),
        ]
      : [];

    // De-duplicate invoices that matched on both number and publicReference.
    const uniqueInvoices = [...new Map(invoices.map((i) => [i.id, i])).values()];
    const suggestions = matchC2bConfirmations(events, uniqueInvoices);
    const summary = suggestions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    await logAudit({
      ...actor(req), action: 'finance.reconciliation.c2b_review', entity: 'ProviderEvent',
      entityId: null,
      meta: { eventsReviewed: events.length, summary },
    });
    return res.json({ suggestions, summary, readOnly: true });
  }));

  /**
   * READ-ONLY PayHero review. Cross-checks PayHero ProviderEvents against the
   * normalized Payment rows produced by applyPaymentOutcome. It never calls
   * PayHero, writes nothing, posts nothing and never settles a payment —
   * suggestions only, for a human finance reviewer.
   */
  router.get(['/reconciliation/payhero/review', '/payhero/review'], requireAccess('finance.reconciliation.view', VIEW_ROLES), route(async (req, res) => {
    const { limit, includeOrphans } = payheroReviewSchema.parse(req.query);
    const [events, payments] = await Promise.all([
      allRows(
        prisma.orm.public.ProviderEvent
          .where({ provider: 'PAYHERO' } as any)
          .orderBy((e: any) => e.createdAt.desc())
          .limit(limit)
          .all(),
      ),
      allRows(
        prisma.orm.public.Payment
          .where({ provider: 'PAYHERO' } as any)
          .orderBy((p: any) => p.createdAt.desc())
          .limit(limit)
          .all(),
      ),
    ]);

    const suggestions = reviewPayHeroEvents(events, payments, includeOrphans);
    const summary = summarizePayHeroReview(suggestions);
    await logAudit({
      ...actor(req), action: 'finance.reconciliation.payhero_review', entity: 'ProviderEvent',
      entityId: null,
      meta: { eventsReviewed: events.length, paymentsReviewed: payments.length, summary },
    });
    return res.json({ suggestions, summary, readOnly: true });
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
