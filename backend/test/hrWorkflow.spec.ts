import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Full ERP/HR closeout specs (recruiting, contracts, orders).
 *
 * DB-free: the Prisma 8 contract façade is mocked with the same shape used by
 * `attendance.spec.ts` / `auth.spec.ts`. Covers the pure stage machines plus
 * live router permission gates and legal/illegal transitions.
 */

const store: Record<string, any[]> = {
  Employee: [],
  EmployeePermission: [],
  EmployeeRoleAssignment: [],
  Position: [],
  ProductTeamMember: [],
  ProjectEmployee: [],
  ServiceTeamMember: [],
  TestimonialReviewAssignment: [],
  Booking: [],
  ContactEnquiry: [],
  BlogPost: [],
  AuditLog: [],
  JobRequisition: [],
  Candidate: [],
  Offer: [],
  Contract: [],
  SalesOrder: [],
  SalesOrderLineItem: [],
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

// These are loaded in beforeAll, after the hoisted vi.mock factories can see
// the in-memory store above. Static imports here would evaluate the mocked
// modules before `store`/`ormFacade` are initialized.
let signAccessToken: typeof import('../src/modules/identity/utils/token')['signAccessToken'];
let clearEffectiveCache: typeof import('../src/modules/identity/services/effectivePermissions')['clearEffectiveCache'];
let machines: typeof import('../src/modules/hr/services/stageMachines');

const ADMIN = 'hr_admin';
const VIEWER = 'hr_viewer';
const RECRUITER = 'hr_recruiter';
const SALES = 'hr_sales';
const DENIED = 'hr_denied';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = (await import('supertest')).default;
  signAccessToken = (await import('../src/modules/identity/utils/token')).signAccessToken;
  clearEffectiveCache = (await import('../src/modules/identity/services/effectivePermissions')).clearEffectiveCache;
  machines = await import('../src/modules/hr/services/stageMachines');
  const { default: hrRouter } = await import('../src/modules/hr');
  app = express();
  app.use(express.json());
  app.use('/v1/hr', hrRouter());
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
  grant(VIEWER, 'opportunities.view');
  grant(RECRUITER, 'staff.view');
  grant(RECRUITER, 'staff.invite');
  grant(RECRUITER, 'staff.update');
  grant(SALES, 'opportunities.view');
  grant(SALES, 'opportunities.create');
  grant(SALES, 'opportunities.update');
  grant(SALES, 'opportunities.delete');
  grant(SALES, 'invoices.issue');
  grant(SALES, 'invoices.update');
  grant(DENIED, 'staff.view', 'DENY');

  for (const id of [ADMIN, VIEWER, RECRUITER, SALES, DENIED]) {
    store.Employee.push({ id, firstName: id, lastName: 'User', email: `${id}@example.test` });
  }
});

describe('HR/ERP stage machines (pure)', () => {
  it('allows only the legal requisition steps', () => {
    expect(machines.isLegalTransition(machines.REQUISITION_MACHINE, 'draft', 'open')).toBe(true);
    expect(machines.isLegalTransition(machines.REQUISITION_MACHINE, 'open', 'on_hold')).toBe(true);
    expect(machines.isLegalTransition(machines.REQUISITION_MACHINE, 'on_hold', 'open')).toBe(true);
    expect(machines.isLegalTransition(machines.REQUISITION_MACHINE, 'draft', 'closed')).toBe(false);
    expect(machines.isLegalTransition(machines.REQUISITION_MACHINE, 'closed', 'open')).toBe(false);
  });

  it('rejects skipping candidate interview and re-opening terminal stages', () => {
    expect(machines.isLegalTransition(machines.CANDIDATE_MACHINE, 'new', 'screening')).toBe(true);
    expect(machines.isLegalTransition(machines.CANDIDATE_MACHINE, 'screening', 'interview')).toBe(true);
    expect(machines.isLegalTransition(machines.CANDIDATE_MACHINE, 'interview', 'offer')).toBe(true);
    expect(machines.isLegalTransition(machines.CANDIDATE_MACHINE, 'new', 'offer')).toBe(false);
    expect(machines.isLegalTransition(machines.CANDIDATE_MACHINE, 'hired', 'interview')).toBe(false);
    expect(machines.isLegalTransition(machines.CANDIDATE_MACHINE, 'rejected', 'new')).toBe(false);
  });

  it('requires offer acceptance before contracting', () => {
    expect(machines.isLegalTransition(machines.OFFER_MACHINE, 'draft', 'sent')).toBe(true);
    expect(machines.isLegalTransition(machines.OFFER_MACHINE, 'sent', 'accepted')).toBe(true);
    expect(machines.isLegalTransition(machines.OFFER_MACHINE, 'accepted', 'contracted')).toBe(true);
    expect(machines.isLegalTransition(machines.OFFER_MACHINE, 'draft', 'accepted')).toBe(false);
    expect(machines.isLegalTransition(machines.OFFER_MACHINE, 'sent', 'contracted')).toBe(false);
  });

  it('keeps contract signing and order fulfilment in sequence', () => {
    expect(machines.isLegalTransition(machines.CONTRACT_MACHINE, 'draft', 'approved')).toBe(true);
    expect(machines.isLegalTransition(machines.CONTRACT_MACHINE, 'approved', 'sent')).toBe(true);
    expect(machines.isLegalTransition(machines.CONTRACT_MACHINE, 'sent', 'signed')).toBe(true);
    expect(machines.isLegalTransition(machines.CONTRACT_MACHINE, 'signed', 'active')).toBe(true);
    expect(machines.isLegalTransition(machines.CONTRACT_MACHINE, 'draft', 'active')).toBe(false);
    expect(machines.isLegalTransition(machines.CONTRACT_MACHINE, 'active', 'cancelled')).toBe(false);

    expect(machines.isLegalTransition(machines.ORDER_MACHINE, 'draft', 'confirmed')).toBe(true);
    expect(machines.isLegalTransition(machines.ORDER_MACHINE, 'confirmed', 'processing')).toBe(true);
    expect(machines.isLegalTransition(machines.ORDER_MACHINE, 'processing', 'fulfilled')).toBe(true);
    expect(machines.isLegalTransition(machines.ORDER_MACHINE, 'fulfilled', 'invoiced')).toBe(true);
    expect(machines.isLegalTransition(machines.ORDER_MACHINE, 'invoiced', 'paid')).toBe(true);
    expect(machines.isLegalTransition(machines.ORDER_MACHINE, 'draft', 'fulfilled')).toBe(false);
    expect(machines.isLegalTransition(machines.ORDER_MACHINE, 'fulfilled', 'cancelled')).toBe(false);
  });
});

describe('HR/ERP router gates', () => {
  it('rejects unauthenticated access', async () => {
    expect((await request(app).get('/v1/hr/recruiting/requisitions')).status).toBe(401);
    expect((await request(app).post('/v1/hr/contracts').send({})).status).toBe(401);
    expect((await request(app).get('/v1/hr/orders')).status).toBe(401);
  });

  it('lets viewers list but not create requisitions', async () => {
    const list = await request(app)
      .get('/v1/hr/recruiting/requisitions')
      .set(authed(VIEWER, 'STAFF'));
    expect(list.status).toBe(200);

    const denied = await request(app)
      .post('/v1/hr/recruiting/requisitions')
      .set(authed(VIEWER, 'STAFF'))
      .send({ title: 'Frontend Engineer' });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/v1/hr/recruiting/requisitions')
      .set(authed(RECRUITER, 'STAFF'))
      .send({ title: 'Frontend Engineer', department: 'Engineering', openings: 2 });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.publicReference).toMatch(/^JR-/);
  });

  it('honours explicit DENY even for list access', async () => {
    const res = await request(app)
      .get('/v1/hr/recruiting/candidates')
      .set(authed(DENIED, 'STAFF'));
    expect(res.status).toBe(403);
  });

  it('applies valid and invalid candidate transitions with permission gates', async () => {
    const created = await request(app)
      .post('/v1/hr/recruiting/candidates')
      .set(authed(RECRUITER, 'STAFF'))
      .send({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' });
    expect(created.status).toBe(201);
    expect(created.body.stage).toBe('new');

    const skipped = await request(app)
      .post(`/v1/hr/recruiting/candidates/${created.body.id}/transition`)
      .set(authed(RECRUITER, 'STAFF'))
      .send({ to: 'hired' });
    expect(skipped.status).toBe(409);

    const viewerDenied = await request(app)
      .post(`/v1/hr/recruiting/candidates/${created.body.id}/transition`)
      .set(authed(VIEWER, 'STAFF'))
      .send({ to: 'screening' });
    expect(viewerDenied.status).toBe(403);

    const advanced = await request(app)
      .post(`/v1/hr/recruiting/candidates/${created.body.id}/transition`)
      .set(authed(RECRUITER, 'STAFF'))
      .send({ to: 'screening', note: 'Good portfolio' });
    expect(advanced.status).toBe(200);
    expect(advanced.body.stage).toBe('screening');
    expect(store.AuditLog.some((e) => e.action === 'candidate.transition.screening')).toBe(true);
  });

  it('requires a higher permission to approve contracts and blocks stage skips', async () => {
    const created = await request(app)
      .post('/v1/hr/contracts')
      .set(authed(RECRUITER, 'STAFF'))
      .send({ title: 'Employment contract', employeeId: 'emp_1', valueAmount: '120000.50' });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.valueAmount).toBe('120000.50');

    const skipped = await request(app)
      .post(`/v1/hr/contracts/${created.body.id}/transition`)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ to: 'active' });
    expect(skipped.status).toBe(409);

    const insufficient = await request(app)
      .post(`/v1/hr/contracts/${created.body.id}/transition`)
      .set(authed(RECRUITER, 'STAFF'))
      .send({ to: 'approved' });
    expect(insufficient.status).toBe(403);

    const approved = await request(app)
      .post(`/v1/hr/contracts/${created.body.id}/transition`)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ to: 'approved' });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('approved');
    expect(approved.body.approvedById).toBe(ADMIN);
  });

  it('guards orders, enforces stage order and rolls up line-item totals', async () => {
    const list = await request(app).get('/v1/hr/orders').set(authed(VIEWER, 'STAFF'));
    expect(list.status).toBe(200);

    const denied = await request(app)
      .post('/v1/hr/orders')
      .set(authed(VIEWER, 'STAFF'))
      .send({ title: 'Website redesign' });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/v1/hr/orders')
      .set(authed(SALES, 'STAFF'))
      .send({ title: 'Website redesign', clientId: 'client_1', tax: '1600' });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.number).toMatch(/^SO-/);

    const skipped = await request(app)
      .post(`/v1/hr/orders/${created.body.id}/transition`)
      .set(authed(SALES, 'STAFF'))
      .send({ to: 'fulfilled' });
    expect(skipped.status).toBe(409);

    const item = await request(app)
      .post(`/v1/hr/orders/${created.body.id}/items`)
      .set(authed(SALES, 'STAFF'))
      .send({ description: 'Discovery workshop', quantity: 2, unitPrice: '40000' });
    expect(item.status).toBe(201);
    expect(item.body.lineTotal).toBe('80000.00');

    const withTotals = await request(app)
      .get(`/v1/hr/orders/${created.body.id}`)
      .set(authed(SALES, 'STAFF'));
    expect(withTotals.body.subtotal).toBe('80000.00');
    expect(withTotals.body.total).toBe('81600.00');

    for (const to of ['confirmed', 'processing', 'fulfilled', 'invoiced', 'paid']) {
      const step = await request(app)
        .post(`/v1/hr/orders/${created.body.id}/transition`)
        .set(authed(SALES, 'STAFF'))
        .send({ to });
      expect(step.status).toBe(200);
      expect(step.body.status).toBe(to);
    }
    expect(store.AuditLog.some((e) => e.action === 'salesorder.transition.invoiced')).toBe(true);

    const itemDenied = await request(app)
      .post(`/v1/hr/orders/${created.body.id}/items`)
      .set(authed(VIEWER, 'STAFF'))
      .send({ description: 'Should fail', quantity: 1, unitPrice: '1' });
    expect(itemDenied.status).toBe(403);
  });
});
