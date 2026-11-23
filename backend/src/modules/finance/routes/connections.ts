import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRecentMfaForSecretRotation } from '../../../shared/middleware/mfaStepUp';
import { requireAccess } from '../../../shared/middleware/roles';
import { encryptSecret, hasEncryptionKey } from '../../../shared/services/secrets';
import { logAudit } from '../../../shared/services/audit';
import financeOverviewRouter from './overview';
import financeTransactionsRouter from './transactions';
import financeAccountsRouter from './accounts';
import financeAuditRouter from './audit';
import financeBeneficiariesRouter from './beneficiaries';
import financeCapabilitiesRouter from './capabilities';
import financeDisputesRouter from './disputes';
import financeReconciliationRouter from './reconciliation';
import financeRefundsRouter from './refunds';
import financeReportsRouter from './reports';
import financeSettlementsRouter from './settlements';

const upsertSchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['DRAFT','CONNECTED','DEGRADED','DISCONNECTED','ERROR']).optional(),
  environment: z.enum(['LIVE','SANDBOX']).optional(),
  externalAccountId: z.string().optional().nullable(),
  capabilities: z.record(z.string(), z.any()).optional(),
  config: z.record(z.string(), z.any()).optional(),
  secret: z.string().optional(),
  secretKind: z.enum(['OAUTH_REFRESH','API_KEY','API_SECRET','WEBHOOK_SECRET','ACCESS_TOKEN','OTHER']).optional(),
});

export default function financeConnectionsRouter(prisma: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get(['/', '/connections'], requireAccess('finance.connections.view', ['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (_req, res) => {
    const connections = await (prisma.orm.public.ProviderConnection
      .where({ domain: 'FINANCE' } as any)
      .orderBy((c: any) => c.createdAt.desc())
      .include('secrets', (s: any) => s.select('id', 'kind', 'keyVersion', 'rotatedAt', 'createdAt'))
      .include('financeAccounts')
      .all() as unknown as Promise<any[]>).catch(() => [] as any);
    res.json({ connections: connections.map((c: any) => ({ ...c, secrets: (c.secrets || []).map((s: any) => ({ ...s, masked: '••••' })) })) });
  });

  router.post(['/', '/connections'], requireAccess('finance.connections.manage', ['ADMIN', 'SUPER_ADMIN']), requireRecentMfaForSecretRotation, async (req: AuthRequest, res) => {
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

  router.patch(['/connections/:id', '/:id'], requireAccess('finance.connections.manage', ['ADMIN', 'SUPER_ADMIN']), requireRecentMfaForSecretRotation, async (req: AuthRequest, res) => {
    const body = upsertSchema.partial().parse(req.body);
    const existing = await prisma.orm.public.ProviderConnection.where({ id: req.params.id, domain: 'FINANCE' } as any).first();
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
    await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.connection.update', entity: 'ProviderConnection', entityId: existing.id, meta: { provider: (connection as any)?.provider ?? existing.provider, status: (connection as any)?.status ?? existing.status } });
    res.json({ connection });
  });

  router.delete(['/connections/:id', '/:id'], requireAccess('finance.connections.manage', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    const existing = await prisma.orm.public.ProviderConnection.where({ id: req.params.id, domain: 'FINANCE' } as any).first();
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.orm.public.ProviderConnection.where({ id: existing.id }).delete();
    await logAudit({
      actorId: req.user?.sub, actorRole: req.user?.role as any, action: 'finance.connection.delete',
      entity: 'ProviderConnection', entityId: existing.id, meta: { provider: existing.provider },
    });
    res.json({ deleted: true });
  });

  // Backwards compatibility with the Phase 7A mount point: delegate to the
  // Phase 7B/C implementations instead of returning legacy shapes. This also
  // makes every Finance Hub surface available under the single
  // `/v1/admin/finance` mount until the central router registers them directly.
  router.use('/transactions', financeTransactionsRouter(prisma));
  router.use('/overview', financeOverviewRouter(prisma));
  router.use('/accounts', financeAccountsRouter(prisma));
  router.use('/reconciliation', financeReconciliationRouter(prisma));
  router.use('/beneficiaries', financeBeneficiariesRouter(prisma));
  router.use('/refunds', financeRefundsRouter(prisma));
  router.use('/disputes', financeDisputesRouter(prisma));
  router.use('/settlements', financeSettlementsRouter(prisma));
  router.use('/reports', financeReportsRouter(prisma));
  router.use('/audit', financeAuditRouter(prisma));
  router.use('/capabilities', financeCapabilitiesRouter(prisma));

  return router;
}
