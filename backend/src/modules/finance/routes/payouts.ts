import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { recordProviderEvent } from '../../../shared/services/providerEvents';

const payoutSchema = z.object({
  provider: z.string().default('PAYHERO'),
  amount: z.number().positive(),
  currency: z.string().default('KES'),
  channel: z.string().min(1),
  phoneNumber: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  networkCode: z.string().optional().nullable(),
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export default function financePayoutsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('finance.payouts.view', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (_req, res) => {
    const payouts = await Promise.resolve(prisma.orm.public.Payout.orderBy((p: any) => p.createdAt.desc()).limit(100).all() as unknown as Promise<any[]>).catch(() => [] as any);
    res.json({ payouts });
  });

  router.post('/', requireAccess('finance.payouts.create', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = payoutSchema.parse(req.body);
    const reference = body.reference || `PO-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    const payout = await prisma.orm.public.Payout.create({
      id: newId(), provider: body.provider, reference, amount: body.amount as any, currency: body.currency,
      channel: body.channel, phoneNumber: body.phoneNumber ?? null, accountNumber: body.accountNumber ?? null,
      networkCode: body.networkCode ?? null, status: 'PENDING_APPROVAL', metadata: { ...(body.metadata || {}), requestedBy: req.user?.sub } as any,
      createdAt: ts(), updatedAt: ts(),
    } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.payout.request', entity: 'Payout', entityId: payout.id, meta: { amount: body.amount, currency: body.currency, provider: body.provider } });
    res.status(201).json({ payout });
  });

  router.post('/:id/approve', requireAccess('finance.payouts.approve', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const payout = await prisma.orm.public.Payout.where({ id: req.params.id } as any).first();
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    if ((payout as any).status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Only pending approval payouts can be approved' });
    const updated = await prisma.orm.public.Payout.where({ id: payout.id }).update({ status: 'APPROVED', updatedAt: ts(), metadata: { ...(((payout as any).metadata)||{}), approvedBy: req.user?.sub, approvedAt: ts() } as any } as any);
    await recordProviderEvent(prisma, { provider: String((payout as any).provider), domain: 'FINANCE', externalEventId: `payout-approve:${payout.id}`, eventType: 'payout.approved', signatureValid: true, payload: { payoutId: payout.id, actorId: req.user?.sub }, status: 'PROCESSED' }).catch(() => {});
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.payout.approve', entity: 'Payout', entityId: payout.id, meta: { status: 'APPROVED' } });
    res.json({ payout: updated });
  });

  router.post('/:id/reject', requireAccess('finance.payouts.approve', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const payout = await prisma.orm.public.Payout.where({ id: req.params.id } as any).first();
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    const updated = await prisma.orm.public.Payout.where({ id: payout.id }).update({ status: 'REJECTED', updatedAt: ts(), metadata: { ...(((payout as any).metadata)||{}), rejectedBy: req.user?.sub, rejectedAt: ts(), reason: (req.body as any)?.reason || null } as any } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.payout.reject', entity: 'Payout', entityId: payout.id, meta: { reason: (req.body as any)?.reason || null } });
    res.json({ payout: updated });
  });

  return router;
}
