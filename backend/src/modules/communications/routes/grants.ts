import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts, tsMs } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { GRANT_SCOPES, grantExpired } from '../services/access';

const canonicalExpiry = z.string().refine((value) => Number.isFinite(Date.parse(value)), { message: 'expiresAt must be a valid date' });

const grantSchema = z.object({
  accountId: z.string().min(1),
  employeeId: z.string().min(1),
  scopes: z.array(z.enum(GRANT_SCOPES)).min(1, 'At least one canonical scope is required'),
  expiresAt: canonicalExpiry.optional().nullable(),
});

const patchSchema = z.object({
  scopes: z.array(z.enum(GRANT_SCOPES)).min(1).optional(),
  expiresAt: canonicalExpiry.optional().nullable(),
}).refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' });

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
      .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    res.json({ grants: grants.map((grant) => ({ ...grant, expired: grantExpired(grant) })) });
  });

  router.post('/', requireAccess('communications.grants.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = grantSchema.parse(req.body);
    if (body.expiresAt && tsMs(body.expiresAt) <= Date.now()) {
      return res.status(400).json({ error: 'expiresAt must be in the future' });
    }
    const existing = await prisma.orm.public.CommunicationGrant.where({ accountId: body.accountId, employeeId: body.employeeId } as any).first().catch(() => null) as any;
    const expiresAt = body.expiresAt ? ts(body.expiresAt) : null;
    const grant = existing
      ? await prisma.orm.public.CommunicationGrant.where({ id: existing.id }).update({
        scopes: body.scopes as any, expiresAt,
      } as any)
      : await prisma.orm.public.CommunicationGrant.create({
        id: newId(), accountId: body.accountId, employeeId: body.employeeId,
        scopes: body.scopes as any, expiresAt,
        createdById: req.user?.sub ?? null, createdAt: ts(),
      } as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.grant.upsert', entity: 'CommunicationGrant', entityId: (grant as any)?.id,
      meta: { accountId: body.accountId, employeeId: body.employeeId, scopes: body.scopes, expiresAt },
    });
    res.status(existing ? 200 : 201).json({ grant });
  });

  router.patch('/:id', requireAccess('communications.grants.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = patchSchema.parse(req.body);
    const existing = await prisma.orm.public.CommunicationGrant.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (grantExpired(existing)) return res.status(400).json({ error: 'Grant has expired; create a new grant' });
    if (body.expiresAt && tsMs(body.expiresAt) <= Date.now()) {
      return res.status(400).json({ error: 'expiresAt must be in the future' });
    }
    const patch: Record<string, unknown> = {};
    if (body.scopes) patch.scopes = body.scopes as any;
    if ('expiresAt' in body) patch.expiresAt = body.expiresAt ? ts(body.expiresAt) : null;
    const grant = await prisma.orm.public.CommunicationGrant.where({ id: existing.id }).update(patch as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.grant.update', entity: 'CommunicationGrant', entityId: existing.id,
      meta: patch as any,
    });
    res.json({ grant });
  });

  router.delete('/:id', requireAccess('communications.grants.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.CommunicationGrant.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.orm.public.CommunicationGrant.where({ id: existing.id }).delete();
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.grant.delete', entity: 'CommunicationGrant', entityId: existing.id,
      meta: { accountId: existing.accountId, employeeId: existing.employeeId },
    });
    res.json({ ok: true });
  });

  return router;
}
