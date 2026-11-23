import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, type AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { toMoney } from '../../billing/utils/money';
import { actor, allRows, route } from './helpers';

const VIEW_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const MANAGE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const accountSchema = z.object({
  connectionId: z.string().min(1),
  provider: z.string().min(1),
  accountType: z.enum(['COLLECTION', 'WALLET', 'BANK', 'PAYOUT', 'GATEWAY']),
  name: z.string().min(1),
  externalId: z.string().nullable().optional(),
  currency: z.string().min(3).default('KES'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  capabilities: z.record(z.string(), z.any()).nullable().optional(),
  config: z.record(z.string(), z.any()).nullable().optional(),
  balance: z.number().nullable().optional(),
});

export default function financeAccountsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/accounts'], requireAccess('finance.accounts.view', VIEW_ROLES), route(async (req, res) => {
    const filters: Record<string, unknown> = {};
    if (req.query.provider) filters.provider = String(req.query.provider).toUpperCase();
    if (req.query.status) filters.status = String(req.query.status).toUpperCase();
    if (req.query.connectionId) filters.connectionId = String(req.query.connectionId);
    const rows = await allRows(prisma.orm.public.FinanceAccount.where(filters as any).orderBy((a: any) => a.createdAt.desc()).all());
    res.json({ accounts: rows });
  }));

  router.get(['/accounts/:id', '/:id'], requireAccess('finance.accounts.view', VIEW_ROLES), route(async (req, res) => {
    const account = await prisma.orm.public.FinanceAccount.where({ id: req.params.id } as any).first();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    return res.json({ account });
  }));

  router.post(['/', '/accounts'], requireAccess('finance.accounts.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = accountSchema.parse(req.body);
    const account = await prisma.orm.public.FinanceAccount.create({
      id: newId(),
      connectionId: body.connectionId,
      provider: body.provider.toUpperCase(),
      accountType: body.accountType,
      name: body.name,
      externalId: body.externalId ?? null,
      currency: body.currency.toUpperCase(),
      status: body.status,
      capabilities: (body.capabilities ?? null) as any,
      config: (body.config ?? null) as any,
      balance: body.balance === undefined || body.balance === null ? null : toMoney(body.balance),
      createdById: actor(req).actorId,
      createdAt: ts(),
      updatedAt: ts(),
    } as any);
    await logAudit({
      ...actor(req), action: 'finance.account.create', entity: 'FinanceAccount', entityId: account.id,
      meta: { provider: account.provider, accountType: account.accountType },
    });
    return res.status(201).json({ account });
  }));

  router.patch(['/accounts/:id', '/:id'], requireAccess('finance.accounts.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const body = accountSchema.partial().parse(req.body);
    const existing = await prisma.orm.public.FinanceAccount.where({ id: req.params.id } as any).first();
    if (!existing) return res.status(404).json({ error: 'Account not found' });
    const account = await prisma.orm.public.FinanceAccount.where({ id: existing.id }).update({
      ...('connectionId' in body ? { connectionId: body.connectionId } : {}),
      ...('provider' in body ? { provider: String(body.provider).toUpperCase() } : {}),
      ...('accountType' in body ? { accountType: body.accountType } : {}),
      ...('name' in body ? { name: body.name } : {}),
      ...('externalId' in body ? { externalId: body.externalId ?? null } : {}),
      ...('currency' in body ? { currency: String(body.currency).toUpperCase() } : {}),
      ...('status' in body ? { status: body.status } : {}),
      ...('capabilities' in body ? { capabilities: (body.capabilities ?? null) as any } : {}),
      ...('config' in body ? { config: (body.config ?? null) as any } : {}),
      ...('balance' in body ? { balance: body.balance === undefined || body.balance === null ? null : toMoney(body.balance) } : {}),
      updatedAt: ts(),
    } as any) ?? existing;
    await logAudit({
      ...actor(req), action: 'finance.account.update', entity: 'FinanceAccount', entityId: account.id,
      meta: { status: account.status },
    });
    return res.json({ account });
  }));

  router.delete(['/accounts/:id', '/:id'], requireAccess('finance.accounts.manage', MANAGE_ROLES), route(async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.FinanceAccount.where({ id: req.params.id } as any).first();
    if (!existing) return res.status(404).json({ error: 'Account not found' });
    await prisma.orm.public.FinanceAccount.where({ id: existing.id }).delete();
    await logAudit({
      ...actor(req), action: 'finance.account.delete', entity: 'FinanceAccount', entityId: existing.id,
      meta: { provider: existing.provider },
    });
    return res.json({ deleted: true });
  }));

  return router;
}
