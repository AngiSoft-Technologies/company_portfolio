import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';
import { getProviderCapabilities } from '../services/capabilities';
import { filterGrantedAccounts } from '../services/access';

const accountSchema = z.object({
  connectionId: z.string().min(1),
  channel: z.string().min(1),
  provider: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR', 'SUSPENDED']).optional(),
  config: z.record(z.string(), z.any()).optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR', 'SUSPENDED']).optional(),
  config: z.record(z.string(), z.any()).optional(),
  capabilities: z.record(z.string(), z.any()).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' });

export default function communicationsAccountsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('communications.accounts.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const accounts = await prisma.orm.public.CommunicationAccount
      .orderBy((a: any) => a.createdAt.desc())
      .include('connection', (c: any) => c.select('id', 'provider', 'name', 'status', 'environment', 'lastSyncAt', 'lastError'))
      .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    res.json({ accounts: await filterGrantedAccounts(prisma, req.user, accounts) });
  });

  router.post('/', requireAccess('communications.accounts.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = accountSchema.parse(req.body);
    const capabilities = getProviderCapabilities(body.provider);
    if (!capabilities.read && !capabilities.respond) {
      return res.status(400).json({ error: `Provider ${body.provider} is not supported for communication accounts` });
    }
    const connection = await prisma.orm.public.ProviderConnection.where({ id: body.connectionId } as any).first().catch(() => null) as any;
    if (!connection) return res.status(404).json({ error: 'Provider connection not found' });
    const account = await prisma.orm.public.CommunicationAccount.create({
      id: newId(), connectionId: connection.id, channel: body.channel, provider: body.provider,
      name: body.name, address: body.address ?? null, externalId: body.externalId ?? null,
      status: body.status ?? 'ACTIVE', capabilities: capabilities as any, config: (body.config ?? {}) as any,
      createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
    } as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.account.create', entity: 'CommunicationAccount', entityId: account.id,
      meta: { provider: body.provider, channel: body.channel },
    });
    res.status(201).json({ account });
  });

  router.patch('/:id', requireAccess('communications.accounts.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = patchSchema.parse(req.body);
    const existing = await prisma.orm.public.CommunicationAccount.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const patch: Record<string, unknown> = { updatedAt: ts() };
    for (const key of ['name', 'address', 'externalId', 'status', 'config', 'capabilities'] as const) {
      if (key in body) patch[key] = (body as any)[key] ?? null;
    }
    const account = await prisma.orm.public.CommunicationAccount.where({ id: existing.id }).update(patch as any);
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.account.update', entity: 'CommunicationAccount', entityId: existing.id,
      meta: { fields: Object.keys(patch) },
    });
    res.json({ account });
  });

  router.delete('/:id', requireAccess('communications.accounts.manage', ['SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.CommunicationAccount.where({ id: req.params.id } as any).first().catch(() => null) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const conversations = await prisma.orm.public.Conversation
      .where({ accountId: existing.id } as any).limit(1).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    if (conversations.length) return res.status(409).json({ error: 'Account still has conversations; deactivate it instead' });
    await prisma.orm.public.CommunicationAccount.where({ id: existing.id }).delete();
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any,
      action: 'communications.account.delete', entity: 'CommunicationAccount', entityId: existing.id,
      meta: { provider: existing.provider },
    });
    res.json({ ok: true });
  });

  return router;
}
