import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * DB-free contracts for the bounded slow-request store:
 * recording, cap enforcement, redaction, admin-only read access and the
 * empty-state response. No live database, provider or queue is involved.
 */

const h = vi.hoisted(() => ({
  currentUser: null as { sub: string; role?: string } | null,
  accessKeys: [] as string[],
}));

vi.mock('../src/shared/middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!h.currentUser) return res.status(401).json({ error: 'Missing authorization' });
    req.user = h.currentUser;
    return next();
  },
}));
vi.mock('../src/shared/middleware/roles', () => ({
  requireAccess: (key: string) => (_req: any, res: any, next: any) => {
    h.accessKeys.push(key);
    const role = h.currentUser?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    return next();
  },
}));
// admin.ts imports the Prisma façade transitively; keep the module graph DB-free.
vi.mock('../src/prisma/db', () => ({
  ts: (value?: any) => (typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString()),
  newId: () => 'test-id',
}));
vi.mock('../src/db', () => ({ default: {}, db: {} }));
vi.mock('../src/shared/services/audit', () => ({ logAudit: vi.fn(async () => null) }));

import adminRouter from '../src/shared/routes/admin';
import {
  SLOW_REQUEST_STORE_CAP,
  clearSlowRequests,
  listSlowRequests,
  recordSlowRequest,
  redactRequestPath,
} from '../src/shared/services/monitoring/performanceStore';

const app = express();
app.use(express.json());
app.use('/v1/admin', adminRouter({} as any));

describe('slow-request store', () => {
  beforeEach(() => clearSlowRequests());

  it('records sanitized scalar samples and lists them newest-first', () => {
    recordSlowRequest({ method: 'get', url: '/v1/projects?page=2', status: 200, durationMs: 1234.6, thresholdMs: 1000 });
    recordSlowRequest({ method: 'POST', path: '/v1/leads', status: 503, durationMs: 2500, thresholdMs: 1000 });

    const snapshot = listSlowRequests();
    expect(snapshot.samples).toHaveLength(2);
    expect(snapshot.samples[0]).toMatchObject({
      method: 'POST', path: '/v1/leads', status: 503, durationMs: 2500, thresholdMs: 1000,
    });
    expect(snapshot.samples[1]).toMatchObject({ method: 'GET', path: '/v1/projects', durationMs: 1235 });
    expect(snapshot.samples[0].id).not.toBe(snapshot.samples[1].id);
    // Returned objects are copies: a consumer cannot mutate the store.
    snapshot.samples[0].path = '/tampered';
    expect(listSlowRequests().samples[0].path).toBe('/v1/leads');
  });

  it('enforces the hard cap and accounts for evicted samples', () => {
    for (let i = 0; i < SLOW_REQUEST_STORE_CAP + 10; i += 1) {
      recordSlowRequest({ method: 'GET', path: `/v1/probe/${i}`, status: 200, durationMs: 1000 + i });
    }
    const snapshot = listSlowRequests(SLOW_REQUEST_STORE_CAP);
    expect(snapshot.samples).toHaveLength(SLOW_REQUEST_STORE_CAP);
    expect(snapshot.totalRecorded).toBe(SLOW_REQUEST_STORE_CAP + 10);
    expect(snapshot.dropped).toBe(10);
    // The ten oldest samples were evicted; the snapshot is newest-first.
    expect(snapshot.samples[0].durationMs).toBe(1000 + SLOW_REQUEST_STORE_CAP + 9);
    expect(snapshot.samples.at(-1)?.durationMs).toBe(1010);
    expect(snapshot.samples.some((sample) => sample.path === '/v1/probe/0')).toBe(false);
    expect(snapshot.samples.some((sample) => sample.path === '/v1/probe/10')).toBe(true);
  });

  it('never retains query strings, bodies, headers or token-like values', () => {
    const sample = recordSlowRequest({
      method: 'post',
      url: '/v1/auth/login/eyJhbGciOiJIUzI1NiJ9?token=QUERY_SECRET&email=user@example.com',
      status: 500,
      durationMs: 1500,
      thresholdMs: 1000,
      headers: { authorization: 'Bearer HEADER_SECRET', cookie: 'refreshToken=COOKIE_SECRET' },
      body: { password: 'BODY_SECRET', email: 'user@example.com' },
      query: { token: 'QUERY_SECRET' },
    });

    expect(sample.path).toBe('/v1/auth/login/[redacted]');
    const serialized = JSON.stringify(listSlowRequests());
    for (const secret of ['QUERY_SECRET', 'COOKIE_SECRET', 'BODY_SECRET', 'HEADER_SECRET', 'user@example.com', 'eyJhbGciOi']) {
      expect(serialized).not.toContain(secret);
    }
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('password');
  });

  it('redacts paths before they reach either sink', () => {
    expect(redactRequestPath('/v1/projects?page=2&token=abc')).toBe('/v1/projects');
    expect(redactRequestPath('/v1/projects#fragment')).toBe('/v1/projects');
    expect(redactRequestPath('/v1/contact/alice@example.com')).toBe('/v1/contact/[redacted]');
    expect(redactRequestPath('/v1/leads/%2B254712345678')).toBe('/v1/leads/[redacted]');
    expect(redactRequestPath('/v1/auth/reset/eyJhbGciOiJIUzI1NiJ9')).toBe('/v1/auth/reset/[redacted]');
    expect(redactRequestPath('/v1/hook/key=abc/id')).toBe('/v1/hook/key=[redacted]/id');
    expect(redactRequestPath('')).toBe('/');
    // Idempotent: re-redacting an already-safe path changes nothing.
    const safe = redactRequestPath('/v1/contact/alice@example.com?token=x');
    expect(redactRequestPath(safe)).toBe(safe);
  });
});

describe('GET /v1/admin/performance/slow-requests', () => {
  beforeEach(() => {
    clearSlowRequests();
    h.currentUser = null;
    h.accessKeys.length = 0;
  });

  it('returns an empty-state snapshot to an ADMIN', async () => {
    h.currentUser = { sub: 'admin-1', role: 'ADMIN' };
    const response = await request(app).get('/v1/admin/performance/slow-requests');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      samples: [],
      cap: SLOW_REQUEST_STORE_CAP,
      totalRecorded: 0,
      dropped: 0,
    });
    expect(h.accessKeys).toContain('administration.audit');
  });

  it('returns recorded samples with a bounded limit to a SUPER_ADMIN', async () => {
    recordSlowRequest({ method: 'GET', path: '/v1/projects', status: 200, durationMs: 1200 });
    recordSlowRequest({ method: 'GET', path: '/v1/leads', status: 200, durationMs: 2100 });
    h.currentUser = { sub: 'root-1', role: 'SUPER_ADMIN' };

    const all = await request(app).get('/v1/admin/performance/slow-requests?limit=10');
    expect(all.status).toBe(200);
    expect(all.body.samples.map((sample: any) => sample.durationMs)).toEqual([2100, 1200]);

    const one = await request(app).get('/v1/admin/performance/slow-requests?limit=1');
    expect(one.body.samples).toHaveLength(1);
    expect(one.body.totalRecorded).toBe(2);
  });

  it('rejects anonymous and non-admin callers', async () => {
    const anonymous = await request(app).get('/v1/admin/performance/slow-requests');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.samples).toBeUndefined();

    h.currentUser = { sub: 'staff-1', role: 'STAFF' };
    const staff = await request(app).get('/v1/admin/performance/slow-requests');
    expect(staff.status).toBe(403);
    expect(staff.body.samples).toBeUndefined();
  });

  it('is read-only: no mutation endpoint is exposed', async () => {
    h.currentUser = { sub: 'admin-1', role: 'ADMIN' };
    const response = await request(app)
      .post('/v1/admin/performance/slow-requests')
      .send({ samples: [] });
    expect(response.status).toBe(404);
    expect(listSlowRequests().totalRecorded).toBe(0);
  });
});
