import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { toMoney } from '../../billing/utils/money';
import { normalizeProvider } from '../services/capabilityMatrix';
import { actor, allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const disputeSchema = z.object({
  paymentId: z.string().optional().nullable(),
  provider: z.string().optional(),
  externalRef: z.string().optional().nullable(),
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'SUBMITTED', 'RESOLVED', 'CLOSED', 'WON', 'LOST']).optional(),
  reason: z.string().optional().nullable(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  dueAt: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export default function financeDisputesRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/disputes'], requireAccess('finance.disputes.view', VIEW_ROLES), route(async (req, res) => {
    const filters: Record<string, unknown> = {};
    if (req.query.provider) filters.provider = normalizeProvider(req.query.provider);
    if (req.query.status) filters.status = String(req.query.status).toUpperCase();
    if (req.query.paymentId) filters.paymentId = String(req.query.paymentId);
    const disputes = await allRows(prisma.orm.public.Dispute.where(filters as any).orderBy((d: any) => d.createdAt.desc()).limit(200).all());
    return res.json({ disputes });
  }));

  router.patch(['/disputes/:id', '/:id'], requireAccess('finance.disputes.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = disputeSchema.partial().parse(req.body);
    const existing = await prisma.orm.public.Dispute.where({ id: req.params.id } as any).first();
    if (!existing) return res.status(404).json({ error: 'Dispute not found' });
    const dispute = await prisma.orm.public.Dispute.where({ id: existing.id }).update({
      ...('status' in body ? { status: body.status } : {}),
      ...('reason' in body ? { reason: body.reason ?? null } : {}),
      ...('amount' in body ? { amount: toMoney(body.amount ?? 0) } : {}),
      ...('currency' in body ? { currency: String(body.currency).toUpperCase() } : {}),
      ...('dueAt' in body ? { dueAt: body.dueAt ? ts(body.dueAt) : null } : {}),
      ...('metadata' in body ? { metadata: { ...((existing.metadata as object) || {}), ...(body.metadata || {}) } as any } : {}),
      updatedAt: ts(),
    } as any) ?? existing;
    await logAudit({
      ...actor(req), action: 'finance.dispute.update', entity: 'Dispute', entityId: dispute.id,
      meta: { status: dispute.status, reason: dispute.reason },
    });
    return res.json({ dispute });
  }));

  // Provider webhooks may create disputes; admin seeding is intentionally
  // capability-gated to providers that expose dispute data.
  router.post(['/', '/disputes'], requireAccess('finance.disputes.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = disputeSchema.parse(req.body);
    const provider = normalizeProvider(body.provider || 'PAYPAL');
    const dispute = await prisma.orm.public.Dispute.create({
      id: newId(),
      paymentId: body.paymentId ?? null,
      provider,
      externalRef: body.externalRef ?? null,
      status: body.status || 'OPEN',
      reason: body.reason ?? null,
      amount: toMoney(body.amount ?? 0),
      currency: String(body.currency || 'USD').toUpperCase(),
      dueAt: body.dueAt ? ts(body.dueAt) : null,
      metadata: (body.metadata ?? null) as any,
      createdAt: ts(),
      updatedAt: ts(),
    } as any);
    await logAudit({
      ...actor(req), action: 'finance.dispute.create', entity: 'Dispute', entityId: dispute.id,
      meta: { provider, status: dispute.status },
    });
    return res.status(201).json({ dispute });
  }));

  return router;
}
