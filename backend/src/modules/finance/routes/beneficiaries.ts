import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { actor, allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const beneficiarySchema = z.object({
  name: z.string().min(1),
  channel: z.enum(['MOBILE', 'BANK', 'SACCO', 'PAYPAL', 'WALLET', 'OTHER']),
  phoneNumber: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  bankCode: z.string().optional().nullable(),
  networkCode: z.string().optional().nullable(),
  currency: z.string().min(3).default('KES'),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export default function financeBeneficiariesRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/beneficiaries'], requireAccess('finance.payouts.view', VIEW_ROLES), route(async (req, res) => {
    const filters: Record<string, unknown> = {};
    if (req.query.channel) filters.channel = String(req.query.channel).toUpperCase();
    if (req.query.isActive !== undefined) filters.isActive = String(req.query.isActive) === 'true';
    const rows = await allRows(prisma.orm.public.Beneficiary.where(filters as any).orderBy((b: any) => b.createdAt.desc()).all());
    return res.json({ beneficiaries: rows });
  }));

  router.get(['/beneficiaries/:id', '/:id'], requireAccess('finance.payouts.view', VIEW_ROLES), route(async (req, res) => {
    const beneficiary = await prisma.orm.public.Beneficiary.where({ id: req.params.id } as any).first();
    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
    return res.json({ beneficiary });
  }));

  router.post(['/', '/beneficiaries'], requireAccess('finance.payouts.create', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = beneficiarySchema.parse(req.body);
    const beneficiary = await prisma.orm.public.Beneficiary.create({
      id: newId(),
      name: body.name,
      channel: body.channel,
      phoneNumber: body.phoneNumber ?? null,
      accountNumber: body.accountNumber ?? null,
      bankCode: body.bankCode ?? null,
      networkCode: body.networkCode ?? null,
      currency: body.currency.toUpperCase(),
      isActive: body.isActive,
      metadata: (body.metadata ?? null) as any,
      createdById: actor(req).actorId,
      createdAt: ts(),
      updatedAt: ts(),
    } as any);
    await logAudit({
      ...actor(req), action: 'finance.beneficiary.create', entity: 'Beneficiary', entityId: beneficiary.id,
      meta: { channel: beneficiary.channel, currency: beneficiary.currency },
    });
    return res.status(201).json({ beneficiary });
  }));

  router.patch(['/beneficiaries/:id', '/:id'], requireAccess('finance.payouts.create', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = beneficiarySchema.partial().parse(req.body);
    const existing = await prisma.orm.public.Beneficiary.where({ id: req.params.id } as any).first();
    if (!existing) return res.status(404).json({ error: 'Beneficiary not found' });
    const beneficiary = await prisma.orm.public.Beneficiary.where({ id: existing.id }).update({
      ...('name' in body ? { name: body.name } : {}),
      ...('channel' in body ? { channel: body.channel } : {}),
      ...('phoneNumber' in body ? { phoneNumber: body.phoneNumber ?? null } : {}),
      ...('accountNumber' in body ? { accountNumber: body.accountNumber ?? null } : {}),
      ...('bankCode' in body ? { bankCode: body.bankCode ?? null } : {}),
      ...('networkCode' in body ? { networkCode: body.networkCode ?? null } : {}),
      ...('currency' in body ? { currency: String(body.currency).toUpperCase() } : {}),
      ...('isActive' in body ? { isActive: body.isActive } : {}),
      ...('metadata' in body ? { metadata: (body.metadata ?? null) as any } : {}),
      updatedAt: ts(),
    } as any) ?? existing;
    await logAudit({
      ...actor(req), action: 'finance.beneficiary.update', entity: 'Beneficiary', entityId: beneficiary.id,
      meta: { isActive: beneficiary.isActive },
    });
    return res.json({ beneficiary });
  }));

  router.delete(['/beneficiaries/:id', '/:id'], requireAccess('finance.payouts.create', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.Beneficiary.where({ id: req.params.id } as any).first();
    if (!existing) return res.status(404).json({ error: 'Beneficiary not found' });
    await prisma.orm.public.Beneficiary.where({ id: existing.id }).delete();
    await logAudit({
      ...actor(req), action: 'finance.beneficiary.delete', entity: 'Beneficiary', entityId: existing.id,
      meta: { channel: existing.channel },
    });
    return res.json({ deleted: true });
  }));

  return router;
}
