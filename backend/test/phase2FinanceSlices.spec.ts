import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Phase 2 finance accounting slices (DB-free).
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
  CreditNote: [],
  TaxRate: [],
  ArApEntry: [],
  CommissionEntry: [],
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

const ADMIN = 'finance_admin';
const VIEWER = 'finance_viewer';
const DENIED = 'finance_denied';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = (await import('supertest')).default;
  signAccessToken = (await import('../src/modules/identity/utils/token')).signAccessToken;
  clearEffectiveCache = (await import('../src/modules/identity/services/effectivePermissions')).clearEffectiveCache;
  const { default: financeAccountingRouter } = await import('../src/modules/finance/routes/accounting-slices');
  app = express();
  app.use(express.json());
  app.use('/v1/slices', financeAccountingRouter());
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
  grant(VIEWER, 'invoices.view');
  grant(DENIED, 'invoices.view', 'DENY');
  for (const id of [ADMIN, VIEWER, DENIED]) {
    store.Employee.push({ id, firstName: id, lastName: 'User', email: `${id}@example.test` });
  }
});

const CREDIT_NOTE = '/v1/slices/credit-notes';
const validCreditNote = {
  invoiceId: 'inv_1',
  reason: 'Overpayment on invoice',
  amount: '1500.25',
  tax: '150.00',
  total: '1650.25',
};

describe('Phase 2 finance accounting slices', () => {
  it('rejects unauthenticated access and permission failures', async () => {
    expect((await request(app).get(CREDIT_NOTE)).status).toBe(401);
    expect((await request(app).post(CREDIT_NOTE).send(validCreditNote)).status).toBe(401);
    expect((await request(app).get(CREDIT_NOTE).set(authed(DENIED, 'STAFF'))).status).toBe(403);
    expect((await request(app).post(CREDIT_NOTE).set(authed(VIEWER, 'STAFF')).send(validCreditNote)).status).toBe(403);
  });

  it('creates and lists credit notes with canonical decimal text', async () => {
    const created = await request(app)
      .post(CREDIT_NOTE)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send(validCreditNote);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.amount).toBe('1500.25');
    expect(created.body.total).toBe('1650.25');
    expect(created.body.publicReference).toMatch(/^CN-/);
    expect(created.body.number).toMatch(/^CN-/);

    const list = await request(app).get(CREDIT_NOTE).set(authed(VIEWER, 'STAFF'));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(store.AuditLog.some((e) => e.action === 'creditnote.create')).toBe(true);
  });

  it('creates tax rates, AR/AP entries and commission entries', async () => {
    const tax = await request(app)
      .post('/v1/slices/tax-rates')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ key: 'vat-16', name: 'VAT 16%', rate: '16.00', scope: 'invoice' });
    expect(tax.status).toBe(201);
    expect(tax.body.rate).toBe('16.00');

    const arap = await request(app)
      .post('/v1/slices/ar-ap-entries')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ direction: 'receivable', description: 'Invoice posting', amount: '900.10' });
    expect(arap.status).toBe(201);
    expect(arap.body.status).toBe('open');
    expect(arap.body.amount).toBe('900.10');

    const commission = await request(app)
      .post('/v1/slices/commission-entries')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ employeeId: 'emp_1', basisAmount: '8000.00', rate: '5.00', amount: '400.00' });
    expect(commission.status).toBe(201);
    expect(commission.body.rate).toBe('5.00');
    expect(commission.body.publicReference).toMatch(/^COM-/);

    for (const [path, model] of [
      ['tax-rates', 'TaxRate'],
      ['ar-ap-entries', 'ArApEntry'],
      ['commission-entries', 'CommissionEntry'],
    ] as const) {
      const list = await request(app).get(`/v1/slices/${path}`).set(authed(VIEWER, 'STAFF'));
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(store[model]).toHaveLength(1);
    }
  });

  it('rejects invalid payloads without writing a row', async () => {
    const invalid = await request(app)
      .post(CREDIT_NOTE)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ invoiceId: 'inv_1', reason: '', amount: '10' });
    expect(invalid.status).toBe(400);
    expect(store.CreditNote).toHaveLength(0);

    const direction = await request(app)
      .post('/v1/slices/ar-ap-entries')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ direction: 'sideways', description: 'Nope' });
    expect(direction.status).toBe(400);
    expect(store.ArApEntry).toHaveLength(0);
  });
});
