import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Phase 2 HR performance/lifecycle slices (DB-free).
 *
 * The Prisma 8 contract façade is mocked with the same shape used by
 * `auth.spec.ts` / `hrWorkflow.spec.ts`: prisma.orm.public.<Model>.where(...).
 * Covers auth + permission gates, create/list happy paths and 400 validation.
 */

const store: Record<string, any[]> = {
  Employee: [],
  EmployeePermission: [],
  EmployeeRoleAssignment: [],
  Position: [],
  ProductTeamMember: [],
  ProjectEmployee: [],
  Booking: [],
  ContactEnquiry: [],
  BlogPost: [],
  ServiceTeamMember: [],
  TestimonialReviewAssignment: [],
  AuditLog: [],
  PerformanceReview: [],
  Goal: [],
  TrainingRecord: [],
  DirectoryPrivacySetting: [],
  Offboarding: [],
};

const matches = (row: any, crit: any) => {
  if (typeof crit === 'function') return true;
  return Object.entries(crit ?? {}).every(([k, v]) => row[k] === v);
};

function queryable(model: string) {
  const rows = () => store[model] ?? [];
  const filtered = (crit?: any) => rows().filter((r) => matches(r, crit));
  const chain = (crit?: any): any => ({
    where: (c: any) => chain(c ?? crit),
    select: () => chain(crit),
    include: () => chain(crit),
    orderBy: () => chain(crit),
    limit: () => chain(crit),
    offset: () => chain(crit),
    all: async () => filtered(crit),
    first: async () => filtered(crit)[0] ?? null,
    count: async () => filtered(crit).length,
    update: async (data: any) => {
      const hit = filtered(crit)[0];
      if (hit) Object.assign(hit, data);
      return hit ?? null;
    },
    delete: async () => {
      const hit = filtered(crit)[0];
      if (hit) store[model].splice(store[model].indexOf(hit), 1);
      return hit ?? null;
    },
  });
  return {
    ...chain(undefined),
    create: async (data: any) => {
      const row = { id: `gen_${rows().length + 1}`, createdAt: new Date().toISOString(), ...data };
      store[model].push(row);
      return row;
    },
  };
}

const ormFacade = () => {
  const publics: Record<string, unknown> = {};
  for (const model of Object.keys(store)) publics[model] = queryable(model);
  return { orm: { public: publics } };
};

vi.mock('../src/prisma/db', () => ({
  db: ormFacade(),
  default: ormFacade(),
  ts: (value?: any) => (typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString()),
  tsMs: (value: unknown) => (value ? new Date(String(value)).getTime() : 0),
  newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
  db: ormFacade(),
  default: ormFacade(),
  validateDatabaseConnection: async () => true,
  disconnectDatabase: async () => undefined,
}));

import type { Express } from 'express';

let signAccessToken: typeof import('../src/modules/identity/utils/token')['signAccessToken'];
let clearEffectiveCache: typeof import('../src/modules/identity/services/effectivePermissions')['clearEffectiveCache'];

const ADMIN = 'people_admin';
const VIEWER = 'people_viewer';
const DENIED = 'people_denied';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = (await import('supertest')).default;
  signAccessToken = (await import('../src/modules/identity/utils/token')).signAccessToken;
  clearEffectiveCache = (await import('../src/modules/identity/services/effectivePermissions')).clearEffectiveCache;
  const { default: hrPerformanceRouter } = await import('../src/modules/hr/routes/performance-slices');
  app = express();
  app.use(express.json());
  app.use('/v1/slices', hrPerformanceRouter());
  request = supertest;
});

const authed = (sub: string, role: string) => ({
  Authorization: `Bearer ${signAccessToken({ sub, role })}`,
});

const grant = (employeeId: string, permissionKey: string, effect: 'GRANT' | 'DENY' = 'GRANT') =>
  store.EmployeePermission.push({ employeeId, permissionKey, effect });

beforeEach(() => {
  clearEffectiveCache();
  for (const key of Object.keys(store)) store[key] = [];
  grant(ADMIN, '*');
  grant(VIEWER, 'staff.view');
  grant(DENIED, 'staff.view', 'DENY');
  for (const id of [ADMIN, VIEWER, DENIED]) {
    store.Employee.push({ id, firstName: id, lastName: 'User', email: `${id}@example.test` });
  }
});

const REVIEW = '/v1/slices/performance-reviews';
const validReview = {
  employeeId: 'emp_1',
  reviewerId: 'mgr_1',
  period: '2026-H2',
  rating: 4,
  summary: 'Strong delivery across projects',
};

describe('Phase 2 HR performance/lifecycle slices', () => {
  it('rejects unauthenticated access and permission failures', async () => {
    expect((await request(app).get(REVIEW)).status).toBe(401);
    expect((await request(app).post(REVIEW).send(validReview)).status).toBe(401);
    expect((await request(app).get(REVIEW).set(authed(DENIED, 'STAFF'))).status).toBe(403);
    expect((await request(app).post(REVIEW).set(authed(VIEWER, 'STAFF')).send(validReview)).status).toBe(403);
  });

  it('creates and lists performance reviews with public reference', async () => {
    const created = await request(app)
      .post(REVIEW)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send(validReview);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.rating).toBe(4);
    expect(created.body.publicReference).toMatch(/^PR-/);

    const list = await request(app).get(REVIEW).set(authed(VIEWER, 'STAFF'));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(store.AuditLog.some((e) => e.action === 'performancereview.create')).toBe(true);
  });

  it('creates goals, training records, directory privacy and offboarding', async () => {
    const goal = await request(app)
      .post('/v1/slices/goals')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ employeeId: 'emp_1', title: 'Ship reporting', targetAmount: '500.75' });
    expect(goal.status).toBe(201);
    expect(goal.body.targetAmount).toBe('500.75');

    const training = await request(app)
      .post('/v1/slices/training-records')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ employeeId: 'emp_1', title: 'Security basics', costAmount: '1200.00' });
    expect(training.status).toBe(201);
    expect(training.body.costAmount).toBe('1200.00');

    const privacy = await request(app)
      .post('/v1/slices/directory-privacy')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ employeeId: 'emp_1' });
    expect(privacy.status).toBe(201);
    expect(privacy.body.emailVisible).toBe(true);
    expect(privacy.body.phoneVisible).toBe(false);

    const offboarding = await request(app)
      .post('/v1/slices/offboarding')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ employeeId: 'emp_1', reason: 'Resignation' });
    expect(offboarding.status).toBe(201);
    expect(offboarding.body.publicReference).toMatch(/^OFF-/);

    for (const [path, model] of [
      ['goals', 'Goal'],
      ['training-records', 'TrainingRecord'],
      ['directory-privacy', 'DirectoryPrivacySetting'],
      ['offboarding', 'Offboarding'],
    ] as const) {
      const list = await request(app).get(`/v1/slices/${path}`).set(authed(VIEWER, 'STAFF'));
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(store[model]).toHaveLength(1);
    }
  });

  it('rejects invalid payloads without writing a row', async () => {
    const invalid = await request(app)
      .post(REVIEW)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ employeeId: '', period: '', rating: 9 });
    expect(invalid.status).toBe(400);
    expect(store.PerformanceReview).toHaveLength(0);

    const goal = await request(app)
      .post('/v1/slices/goals')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ employeeId: 'emp_1', title: 'Bad progress', progress: 150 });
    expect(goal.status).toBe(400);
    expect(store.Goal).toHaveLength(0);
  });
});
