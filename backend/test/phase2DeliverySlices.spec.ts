import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Phase 2 project-delivery slices (DB-free).
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
  ProjectTemplate: [],
  EmployeeCapacity: [],
  ProjectChangeRequest: [],
  ProjectRisk: [],
  ProjectRetrospective: [],
  ProjectSignOff: [],
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

const ADMIN = 'delivery_admin';
const VIEWER = 'delivery_viewer';
const DENIED = 'delivery_denied';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = (await import('supertest')).default;
  signAccessToken = (await import('../src/modules/identity/utils/token')).signAccessToken;
  clearEffectiveCache = (await import('../src/modules/identity/services/effectivePermissions')).clearEffectiveCache;
  const { default: deliveryRouter } = await import('../src/modules/projects/routes/delivery-slices');
  app = express();
  app.use(express.json());
  app.use('/v1/slices', deliveryRouter());
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
  grant(VIEWER, 'projects.view');
  grant(DENIED, 'projects.view', 'DENY');
  for (const id of [ADMIN, VIEWER, DENIED]) {
    store.Employee.push({ id, firstName: id, lastName: 'User', email: `${id}@example.test` });
  }
});

const TEMPLATE = '/v1/slices/project-templates';
const validTemplate = {
  key: 'web-redesign',
  name: 'Web redesign',
  estimateHours: 40,
  rateAmount: '1250.50',
};

describe('Phase 2 project-delivery slices', () => {
  it('rejects unauthenticated access and permission failures', async () => {
    expect((await request(app).get(TEMPLATE)).status).toBe(401);
    expect((await request(app).post(TEMPLATE).send(validTemplate)).status).toBe(401);
    expect((await request(app).get(TEMPLATE).set(authed(DENIED, 'STAFF'))).status).toBe(403);
    expect((await request(app).post(TEMPLATE).set(authed(VIEWER, 'STAFF')).send(validTemplate)).status).toBe(403);
  });

  it('creates and lists project templates with canonical money text', async () => {
    const created = await request(app)
      .post(TEMPLATE)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send(validTemplate);
    expect(created.status).toBe(201);
    expect(created.body.stage).toBe('draft');
    expect(created.body.rateAmount).toBe('1250.50');
    expect(created.body.publicReference).toMatch(/^PT-/);

    const list = await request(app).get(TEMPLATE).set(authed(VIEWER, 'STAFF'));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].key).toBe('web-redesign');
    expect(store.AuditLog.some((e) => e.action === 'projecttemplate.create')).toBe(true);
  });

  it('creates and lists the other five delivery resources', async () => {
    const cases = [
      ['employee-capacity', { employeeId: 'emp_1', periodStart: '2026-12-01', periodEnd: '2026-12-31' }, 'open', 'EmployeeCapacity'],
      ['change-requests', { clientProjectId: 'cp_1', title: 'Add reporting', costImpact: '250.75' }, 'pending', 'ProjectChangeRequest'],
      ['risks', { clientProjectId: 'cp_1', title: 'Vendor delay' }, 'open', 'ProjectRisk'],
      ['retrospectives', { clientProjectId: 'cp_1' }, 'draft', 'ProjectRetrospective'],
      ['sign-offs', { clientProjectId: 'cp_1', title: 'Final sign-off' }, 'pending', 'ProjectSignOff'],
    ] as const;
    for (const [path, payload, status, model] of cases) {
      const created = await request(app)
        .post(`/v1/slices/${path}`)
        .set(authed(ADMIN, 'SUPER_ADMIN'))
        .send(payload);
      expect(created.status).toBe(201);
      expect(created.body.status).toBe(status);
      const list = await request(app).get(`/v1/slices/${path}`).set(authed(VIEWER, 'STAFF'));
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(store[model]).toHaveLength(1);
    }
    expect(store.ProjectChangeRequest[0].costImpact).toBe('250.75');
  });

  it('rejects invalid payloads without writing a row', async () => {
    const invalid = await request(app)
      .post(TEMPLATE)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ key: 'x', name: '', estimateHours: -1 });
    expect(invalid.status).toBe(400);
    expect(store.ProjectTemplate).toHaveLength(0);

    const risk = await request(app)
      .post('/v1/slices/risks')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ clientProjectId: 'cp_1', title: 'Bad likelihood', likelihood: 9 });
    expect(risk.status).toBe(400);
    expect(store.ProjectRisk).toHaveLength(0);
  });
});
