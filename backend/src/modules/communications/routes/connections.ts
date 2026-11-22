import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { encryptSecret, maskSecret, hasEncryptionKey } from '../../../shared/services/secrets';
import { logAudit } from '../../../shared/services/audit';

const upsertSchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['DRAFT','CONNECTED','DEGRADED','DISCONNECTED','ERROR']).optional(),
  environment: z.enum(['LIVE','SANDBOX']).optional(),
  externalAccountId: z.string().optional().nullable(),
  capabilities: z.any().optional(),
  config: z.record(z.any()).optional(),
  secret: z.string().optional(),
  secretKind: z.enum(['OAUTH_REFRESH','API_KEY','API_SECRET','WEBHOOK_SECRET','ACCESS_TOKEN','OTHER']).optional(),
  account: z.object({
    channel: z.string().min(1),
    name: z.string().min(1),
    address: z.string().optional().nullable(),
    externalId: z.string().optional().nullable(),
    status: z.string().optional(),
  }).optional(),
});

export default function communicationsConnectionsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('communications.accounts.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (_req, res) => {
    const connections = await prisma.orm.public.ProviderConnection
      .where({ domain: 'COMMUNICATIONS' } as any)
      .orderBy((c: any) => c.createdAt.desc())
      .include('secrets', (s: any) => s.select('id', 'kind', 'keyVersion', 'rotatedAt', 'createdAt'))
      .include('communicationAccounts')
      .all();
    res.json({ connections: connections.map((c: any) => ({ ...c, secrets: (c.secrets || []).map((s: any) => ({ ...s, masked: '••••' })) })) });
  });

  router.post('/', requireAccess('communications.accounts.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = upsertSchema.parse(req.body);
    const now = ts();
    const connection = await prisma.orm.public.ProviderConnection.create({
      id: newId(),
      domain: 'COMMUNICATIONS',
      provider: body.provider,
      name: body.name,
      status: body.status ?? 'DRAFT',
      environment: body.environment ?? 'LIVE',
      externalAccountId: body.externalAccountId ?? null,
      capabilities: (body.capabilities ?? null) as any,
      config: (body.config ?? null) as any,
      createdById: req.user?.sub ?? null,
      createdAt: now,
      updatedAt: now,
    } as any);
    if (body.secret) {
      if (!hasEncryptionKey()) return res.status(400).json({ error: 'APP_ENCRYPTION_KEY is required to store secrets' });
      const enc = encryptSecret(body.secret);
      await prisma.orm.public.ProviderSecret.create({
        id: newId(), connectionId: connection.id, kind: body.secretKind ?? 'API_KEY',
        ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, keyVersion: enc.keyVersion,
        createdById: req.user?.sub ?? null, createdAt: now, updatedAt: now,
      } as any);
    }
    if (body.account) {
      await prisma.orm.public.CommunicationAccount.create({
        id: newId(), connectionId: connection.id, channel: body.account.channel, provider: body.provider,
        name: body.account.name, address: body.account.address ?? null, externalId: body.account.externalId ?? null,
        status: body.account.status ?? 'ACTIVE', capabilities: {} as any, config: {} as any,
        createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
      } as any);
    }
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.connection.create', entity: 'ProviderConnection', entityId: connection.id, meta: { provider: connection.provider } });
    const full = await prisma.orm.public.ProviderConnection.where({ id: connection.id }).include('secrets', (s: any) => s.select('id','kind','keyVersion','rotatedAt','createdAt')).include('communicationAccounts').first();
    res.status(201).json({ connection: full ?? connection });
  });

  router.patch('/:id', requireAccess('communications.accounts.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const body = upsertSchema.partial().parse(req.body);
    const existing = await prisma.orm.public.ProviderConnection.where({ id: req.params.id, domain: 'COMMUNICATIONS' } as any).first();
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const connection: any = await prisma.orm.public.ProviderConnection.where({ id: existing.id }).update({
      ...('provider' in body ? { provider: body.provider } : {}),
      ...('name' in body ? { name: body.name } : {}),
      ...('status' in body ? { status: body.status } : {}),
      ...('environment' in body ? { environment: body.environment } : {}),
      ...('externalAccountId' in body ? { externalAccountId: body.externalAccountId ?? null } : {}),
      ...('capabilities' in body ? { capabilities: body.capabilities as any } : {}),
      ...('config' in body ? { config: body.config as any } : {}),
      updatedAt: ts(),
    } as any);
    if (body.secret) {
      if (!hasEncryptionKey()) return res.status(400).json({ error: 'APP_ENCRYPTION_KEY is required to store secrets' });
      const enc = encryptSecret(body.secret);
      await prisma.orm.public.ProviderSecret.create({
        id: newId(), connectionId: existing.id, kind: body.secretKind ?? 'API_KEY',
        ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, keyVersion: enc.keyVersion,
        rotatedAt: ts(), createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
      } as any);
    }
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'communications.connection.update', entity: 'ProviderConnection', entityId: existing.id, meta: { provider: (connection as any)?.provider ?? existing.provider, status: (connection as any)?.status ?? existing.status } });
    res.json({ connection });
  });

  router.get('/events', requireAccess('communications.audit.view', ['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await prisma.orm.public.ProviderEvent
      .where({ domain: 'COMMUNICATIONS' } as any)
      .orderBy((e: any) => e.createdAt.desc())
      .limit(limit)
      .all();
    res.json({ events });
  });

  return router;
}
