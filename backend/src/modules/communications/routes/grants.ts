import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const grantSchema = z.object({
  accountId: z.string().min(1),
  employeeId: z.string().min(1),
  scopes: z.array(z.string().min(1)).default([]),
});

export default function communicationsGrantsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('communications.grants.manage', ['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const accountId = req.query.accountId ? String(req.query.accountId) : undefined;
    const grants = await prisma.orm.public.CommunicationGrant
      .where((g: any) => accountId ? g.accountId.eq(accountId) : g.id.isNotNull())
      .include('employee', (e: any) => e.select('id', 'firstName', 'lastName', 'email', 'role'))
      .include('account', (a: any) => a.select('id', 'name', 'channel', 'provider', 'address'))
      .orderBy((g: any) => g.createdAt.desc())
      .all();
    res.json({ grants });
  });

  router.post('/', requireAccess('communications.grants.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = grantSchema.parse(req.body);
    const existing = await prisma.orm.public.CommunicationGrant.where({ accountId: body.accountId, employeeId: body.employeeId } as any).first();
    const grant = existing
      ? await prisma.orm.public.CommunicationGrant.where({ id: existing.id }).update({ scopes: body.scopes as any } as any)
      : await prisma.orm.public.CommunicationGrant.create({ id: newId(), accountId: body.accountId, employeeId: body.employeeId, scopes: body.scopes as any, createdById: req.user?.sub ?? null, createdAt: ts() } as any);
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.grant.upsert', entity: 'CommunicationGrant', entityId: (grant as any)?.id, meta: { accountId: body.accountId, employeeId: body.employeeId, scopes: body.scopes } });
    res.status(existing ? 200 : 201).json({ grant });
  });

  router.delete('/:id', requireAccess('communications.grants.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.CommunicationGrant.where({ id: req.params.id } as any).first();
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.orm.public.CommunicationGrant.where({ id: existing.id }).delete();
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.grant.delete', entity: 'CommunicationGrant', entityId: existing.id, meta: { accountId: (existing as any).accountId, employeeId: (existing as any).employeeId } });
    res.json({ ok: true });
  });

  return router;
}
