import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { encryptSecret, hasEncryptionKey } from '../../../shared/services/secrets';
import { logAudit } from '../../../shared/services/audit';

const upsertSchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['DRAFT','CONNECTED','DEGRADED','DISCONNECTED','ERROR']).optional(),
  environment: z.enum(['LIVE','SANDBOX']).optional(),
  externalAccountId: z.string().optional().nullable(),
  capabilities: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
  secret: z.string().optional(),
  secretKind: z.enum(['OAUTH_REFRESH','API_KEY','API_SECRET','WEBHOOK_SECRET','ACCESS_TOKEN','OTHER']).optional(),
});

export default function financeConnectionsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireAccess('finance.connections.view', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (_req, res) => {
    const connections = await prisma.orm.public.ProviderConnection
      .where({ domain: 'FINANCE' } as any)
      .orderBy((c: any) => c.createdAt.desc())
      .include('secrets', (s: any) => s.select('id', 'kind', 'keyVersion', 'rotatedAt', 'createdAt'))
      .include('financeAccounts')
      .all();
    res.json({ connections: connections.map((c: any) => ({ ...c, secrets: (c.secrets || []).map((s: any) => ({ ...s, masked: '••••' })) })) });
  });

  router.post('/', requireAccess('finance.connections.manage', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
    const body = upsertSchema.parse(req.body);
    const now = ts();
    const connection = await prisma.orm.public.ProviderConnection.create({
      id: newId(), domain: 'FINANCE', provider: body.provider, name: body.name,
      status: body.status ?? 'DRAFT', environment: body.environment ?? 'LIVE',
      externalAccountId: body.externalAccountId ?? null,
      capabilities: (body.capabilities ?? null) as any, config: (body.config ?? null) as any,
      createdById: req.user?.sub ?? null, createdAt: now, updatedAt: now,
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
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.connection.create', entity: 'ProviderConnection', entityId: connection.id, meta: { provider: connection.provider } });
    const full = await prisma.orm.public.ProviderConnection.where({ id: connection.id }).include('secrets', (s: any) => s.select('id','kind','keyVersion','rotatedAt','createdAt')).include('financeAccounts').first();
    res.status(201).json({ connection: full ?? connection });
  });

  router.patch('/:id', requireAccess('finance.connections.manage', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
    const body = upsertSchema.partial().parse(req.body);
    const existing = await prisma.orm.public.ProviderConnection.where({ id: req.params.id, domain: 'FINANCE' } as any).first();
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const connection = await prisma.orm.public.ProviderConnection.where({ id: existing.id }).update({
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
        id: newId(), connectionId: connection.id, kind: body.secretKind ?? 'API_KEY',
        ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, keyVersion: enc.keyVersion,
        rotatedAt: ts(), createdById: req.user?.sub ?? null, createdAt: ts(), updatedAt: ts(),
      } as any);
    }
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.connection.update', entity: 'ProviderConnection', entityId: connection.id, meta: { provider: connection.provider, status: connection.status } });
    res.json({ connection });
  });

  router.get('/transactions', requireAccess('finance.transactions.view', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const [ledgerEntries, payments, payouts] = await Promise.all([
      prisma.orm.public.LedgerEntry.orderBy((e: any) => e.occurredAt.desc()).limit(limit).all().catch(() => []),
      prisma.orm.public.Payment.orderBy((p: any) => p.createdAt.desc()).limit(limit).include('booking', (b: any) => b.select('id', 'publicReference')).all().catch(() => []),
      prisma.orm.public.Payout.orderBy((p: any) => p.createdAt.desc()).limit(limit).all().catch(() => []),
    ]);
    res.json({ ledgerEntries, payments, payouts });
  });

  router.get('/overview', requireAccess('finance.overview.view', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (_req, res) => {
    const [connections, payments, payouts, events] = await Promise.all([
      prisma.orm.public.ProviderConnection.where({ domain: 'FINANCE' } as any).all().catch(() => []),
      prisma.orm.public.Payment.select('status', 'amount', 'currency').all().catch(() => []),
      prisma.orm.public.Payout.select('status', 'amount', 'currency').all().catch(() => []),
      prisma.orm.public.ProviderEvent.where({ domain: 'FINANCE' } as any).orderBy((e: any) => e.createdAt.desc()).limit(10).all().catch(() => []),
    ]);
    const byStatus = (rows: any[]) => rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {} as Record<string, number>);
    res.json({
      connections: { total: connections.length, byStatus: byStatus(connections) },
      payments: { total: payments.length, byStatus: byStatus(payments) },
      payouts: { total: payouts.length, byStatus: byStatus(payouts) },
      recentEvents: events,
    });
  });

  return router;
}
