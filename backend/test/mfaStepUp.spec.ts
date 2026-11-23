import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * DB-free contracts for step-up MFA on high-risk finance/communications
 * actions. No Neon/Redis/provider calls: the Prisma contract is an in-memory
 * queryable and every external service is a spy.
 */

const h = vi.hoisted(() => {
  const store: Record<string, any[]> = {
    Payout: [], PayoutApproval: [], ProviderEvent: [], LedgerEntry: [], FinanceAccount: [],
  };
  let idCounter = 0;

  function queryable(model: string) {
    const rows = () => store[model] ?? (store[model] = []);
    const matches = (row: any, crit: any) =>
      Object.entries(crit || {}).every(([key, value]) => row?.[key] === value);
    const chain = (crit: any): any => {
      const filtered = () => rows().filter((row) => matches(row, crit));
      return {
        where: (next: any) => chain({ ...(crit || {}), ...(next || {}) }),
        orderBy: () => chain(crit),
        limit: () => chain(crit),
        first: async () => filtered()[0] ?? null,
        all: async () => filtered(),
        create: async (data: any) => {
          const row = { id: data?.id ?? `mock_${++idCounter}`, ...data };
          rows().push(row);
          return row;
        },
        update: async (data: any) => {
          const hit = filtered()[0];
          if (hit) Object.assign(hit, data);
          return hit ?? null;
        },
      };
    };
    return chain(undefined);
  }

  const publics: Record<string, unknown> = {};
  for (const model of Object.keys(store)) publics[model] = queryable(model);

  return {
    store,
    db: { orm: { public: publics } },
    user: { sub: 'EMP-1', role: 'SUPER_ADMIN' } as any,
    allowPermission: true,
    payout: vi.fn(async () => ({ status: 'COMPLETED', providerReference: 'EXT-1' })),
    selectPaymentRail: vi.fn(async () => ({
      provider: 'MPESA', channel: 'MPESA', settlementCurrency: 'KES',
      metadata: { routingPolicy: 'test-policy' },
    })),
    recordProviderEvent: vi.fn(async () => ({ event: { id: 'EVT-1' }, deduped: false })),
    logAudit: vi.fn(async () => undefined),
    postLedgerEntry: vi.fn(async () => ({ id: 'LEDGER-1' })),
    resolveFinanceAccount: vi.fn(async () => ({ id: 'ACC-1' })),
    normalizeProvider: vi.fn((value: string) => String(value || '').toUpperCase()),
  };
});

vi.mock('../src/db', () => ({ default: h.db }));
vi.mock('../src/prisma/db', () => ({
  newId: () => `mock_${Math.random().toString(36).slice(2)}`,
  ts: (value?: any) => (typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString()),
  tsMs: (value: any) => new Date(value).getTime(),
}));
vi.mock('../src/shared/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = h.user;
    next();
  },
}));
vi.mock('../src/shared/middleware/roles', () => ({
  requireAccess: () => (req: any, res: any, next: () => void) => {
    if (!h.allowPermission) return res.status(403).json({ error: 'Not authorized' });
    req.permissionChecked = true;
    return next();
  },
  isRole: () => true,
}));
vi.mock('../src/shared/services/audit', () => ({ logAudit: h.logAudit }));
vi.mock('../src/shared/services/providerEvents', () => ({ recordProviderEvent: h.recordProviderEvent }));
vi.mock('../src/modules/finance/services/providers', () => ({
  payout: h.payout,
  selectPaymentRail: h.selectPaymentRail,
}));
vi.mock('../src/modules/finance/services/ledger', () => ({
  postLedgerEntry: h.postLedgerEntry,
  resolveFinanceAccount: h.resolveFinanceAccount,
}));
vi.mock('../src/modules/finance/services/capabilityMatrix', () => ({
  normalizeProvider: h.normalizeProvider,
}));

import financePayoutsRouter from '../src/modules/finance/routes/payouts';
import {
  MFA_STEP_UP_CODE,
  MFA_STEP_UP_HEADER,
  issueMfaStepUpClaim,
  requireRecentMfa,
  requireRecentMfaForSecretRotation,
  signMfaStepUpClaim,
  verifyMfaStepUpClaim,
} from '../src/shared/middleware/mfaStepUp';

const app = express();
app.use(express.json());
app.use('/v1/admin/finance', financePayoutsRouter(h.db as any));

const claimHeader = MFA_STEP_UP_HEADER;
const validClaim = () => issueMfaStepUpClaim({ sub: 'EMP-1', method: 'TOTP' }).claim;

function expiredClaim(): string {
  const now = Math.floor(Date.now() / 1000);
  return signMfaStepUpClaim({
    v: 1, purpose: 'mfa-step-up', sub: 'EMP-1', method: 'TOTP',
    iat: now - 200, exp: now - 10, jti: 'expired-test-jti',
  });
}

function routeSource(relative: string): string {
  return readFileSync(join(__dirname, '..', 'src', 'modules', ...relative.split('/')), 'utf8');
}

/** Locate a route declaration and the guards immediately following it. */
function routeSnippet(relative: string, declaration: string): string {
  const source = routeSource(relative);
  const index = source.indexOf(declaration);
  expect(index, `${declaration} missing from ${relative}`).toBeGreaterThanOrEqual(0);
  return source.slice(index, index + 500);
}

describe('MFA step-up claim primitives', () => {
  beforeEach(() => {
    process.env.MFA_HMAC_SECRET = 'test-mfa-step-up-secret';
  });

  it('issues a subject-bound claim with a five-minute lifetime', () => {
    const issued = issueMfaStepUpClaim({ sub: 'EMP-1', method: 'BACKUP' });
    const verification = verifyMfaStepUpClaim(issued.claim, 'EMP-1');
    expect(verification.ok).toBe(true);
    if (verification.ok) {
      expect(verification.payload.sub).toBe('EMP-1');
      expect(verification.payload.method).toBe('BACKUP');
      expect(verification.payload.exp - verification.payload.iat).toBe(300);
    }
  });

  it('rejects a tampered claim without echoing it', () => {
    const claim = validClaim();
    const tampered = `${claim.slice(0, -2)}AA`;
    const result = verifyMfaStepUpClaim(tampered, 'EMP-1');
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(claim);
  });

  it('rejects a claim with the wrong purpose', () => {
    const token = signMfaStepUpClaim({
      v: 1, purpose: 'login' as any, sub: 'EMP-1', method: 'TOTP',
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, jti: 'wrong-purpose',
    });
    expect(verifyMfaStepUpClaim(token, 'EMP-1').ok).toBe(false);
  });

  it('fails closed when no HMAC secret is configured', () => {
    const claim = validClaim();
    const saved = process.env.MFA_HMAC_SECRET;
    const savedJwt = process.env.JWT_SECRET;
    delete process.env.MFA_HMAC_SECRET;
    delete process.env.JWT_SECRET;
    expect(verifyMfaStepUpClaim(claim, 'EMP-1').ok).toBe(false);
    process.env.MFA_HMAC_SECRET = saved;
    if (savedJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = savedJwt;
  });
});

describe('payout approval route requires a fresh MFA claim', () => {
  beforeEach(() => {
    process.env.MFA_HMAC_SECRET = 'test-mfa-step-up-secret';
    h.allowPermission = true;
    h.user = { sub: 'EMP-1', role: 'SUPER_ADMIN' };
    for (const model of Object.keys(h.store)) h.store[model].length = 0;
    vi.clearAllMocks();
    h.store.Payout.push({
      id: 'PO-1', provider: 'MPESA', reference: 'REF-1', amount: '100.00', currency: 'KES',
      channel: 'MPESA', status: 'PENDING_APPROVAL', metadata: {},
    });
  });

  const approve = () => request(app).post('/v1/admin/finance/payouts/PO-1/approve').send({});

  it('blocks a caller with no claim', async () => {
    const res = await approve();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(MFA_STEP_UP_CODE);
    expect(h.payout).not.toHaveBeenCalled();
  });

  it('allows a caller with a valid claim', async () => {
    const res = await approve().set(claimHeader, validClaim());
    expect(res.status).toBe(200);
    expect(h.payout).toHaveBeenCalledTimes(1);
    expect(res.body.payout.status).toBe('SUCCEEDED');
  });

  it('blocks an expired claim', async () => {
    const res = await approve().set(claimHeader, expiredClaim());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(MFA_STEP_UP_CODE);
    expect(h.payout).not.toHaveBeenCalled();
  });

  it('blocks a claim issued to a different subject', async () => {
    const other = issueMfaStepUpClaim({ sub: 'EMP-2', method: 'TOTP' }).claim;
    const res = await approve().set(claimHeader, other);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(MFA_STEP_UP_CODE);
    expect(h.payout).not.toHaveBeenCalled();
  });

  it('still enforces the existing permission gate when the claim is valid', async () => {
    h.allowPermission = false;
    const res = await approve().set(claimHeader, validClaim());
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Not authorized');
    expect(res.body.code).toBeUndefined();
    expect(h.payout).not.toHaveBeenCalled();
  });
});

describe('secret-rotation step-up is scoped to secret payloads', () => {
  const connectionApp = express();
  connectionApp.use(express.json());
  connectionApp.use((req: any, _res, next) => { req.user = h.user; next(); });
  connectionApp.patch(
    '/connections/:id',
    (_req, res, next) => (h.allowPermission ? next() : res.status(403).json({ error: 'Not authorized' })),
    requireRecentMfaForSecretRotation,
    (_req, res) => res.json({ ok: true }),
  );

  beforeEach(() => {
    process.env.MFA_HMAC_SECRET = 'test-mfa-step-up-secret';
    h.allowPermission = true;
    h.user = { sub: 'EMP-1', role: 'SUPER_ADMIN' };
  });

  it('does not require a claim for a metadata-only edit', async () => {
    const res = await request(connectionApp).patch('/connections/CONN-1').send({ name: 'Renamed' });
    expect(res.status).toBe(200);
  });

  it('requires a claim when a secret is rotated', async () => {
    const res = await request(connectionApp).patch('/connections/CONN-1').send({ secret: 'new-provider-secret' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(MFA_STEP_UP_CODE);
  });

  it('allows secret rotation with a valid claim', async () => {
    const res = await request(connectionApp)
      .patch('/connections/CONN-1')
      .set(claimHeader, validClaim())
      .send({ secret: 'new-provider-secret' });
    expect(res.status).toBe(200);
  });

  it('never lets a claim replace the permission gate', async () => {
    h.allowPermission = false;
    const res = await request(connectionApp)
      .patch('/connections/CONN-1')
      .set(claimHeader, validClaim())
      .send({ secret: 'new-provider-secret' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Not authorized');
  });
});

describe('high-risk routes are wired after the permission gate', () => {
  const guardCases: Array<[string, string, string]> = [
    ['finance/routes/payouts.ts', "router.post(['/payouts/:id/approve'", 'requireRecentMfa'],
    ['finance/routes/refunds.ts', "router.post(['/', '/refunds']", 'requireRecentMfa'],
    ['finance/routes/connections.ts', "router.post(['/', '/connections']", 'requireRecentMfaForSecretRotation'],
    ['finance/routes/connections.ts', "router.patch(['/connections/:id', '/:id']", 'requireRecentMfaForSecretRotation'],
    ['communications/routes/connections.ts', "router.post('/', requireAccess('communications.accounts.manage'", 'requireRecentMfaForSecretRotation'],
    ['communications/routes/connections.ts', "router.patch('/:id', requireAccess('communications.accounts.manage'", 'requireRecentMfaForSecretRotation'],
    ['communications/routes/grants.ts', "router.post('/', requireAccess('communications.grants.manage'", 'requireRecentMfa'],
    ['communications/routes/grants.ts', "router.patch('/:id', requireAccess('communications.grants.manage'", 'requireRecentMfa'],
  ];

  it.each(guardCases)('%s: %s stacks step-up after requireAccess', (file, declaration, guard) => {
    const snippet = routeSnippet(file, declaration);
    expect(routeSource(file)).toContain('router.use(requireAuth)');
    expect(snippet).toMatch(/requireAccess\(/);
    const accessIndex = snippet.indexOf('requireAccess(');
    const stepUpIndex = snippet.indexOf(guard);
    expect(stepUpIndex, `${guard} missing on ${declaration}`).toBeGreaterThan(-1);
    expect(stepUpIndex).toBeGreaterThan(accessIndex);
  });

  it('issues the claim only from the authenticated MFA router', () => {
    const source = routeSource('identity/routes/mfa.ts');
    expect(source).toContain("router.post('/step-up/start', requireAuth");
    expect(source).toContain("router.post('/step-up/verify', requireAuth");
    expect(source).toContain('issueMfaStepUpClaim(');
    expect(source).toContain('mfa.step_up_issued');
  });

  it('exposes the step-up middleware solely through the shared middleware layer', () => {
    expect(typeof requireRecentMfa).toBe('function');
    expect(MFA_STEP_UP_HEADER).toBe('x-mfa-step-up');
  });
});
