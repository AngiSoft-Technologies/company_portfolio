import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Centralized assignment enforcement (`effectivePermissions.ts`) and the
 * review-queue route that consumes it. Mock shape follows `auth.spec.ts`:
 * `prisma.orm.public.<Model>.where(...).first()/all()/update()`.
 */
const h = vi.hoisted(() => ({
  logAudit: vi.fn(async (_args: any) => undefined),
  store: {
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
    Testimonial: [],
    AuditLog: [],
  } as Record<string, any[]>,
}));

function queryable(model: string) {
  const rows = () => h.store[model] ?? [];
  const makeChain = (crit: any): any => {
    const filtered = () => {
      const entries = Object.entries(crit ?? {});
      if (!entries.length) return rows();
      return rows().filter((row: any) => entries.every(([k, v]) => row[k] === v));
    };
    return {
      where: (c: any) => makeChain(
        crit != null && typeof crit === 'object' && c != null && typeof c === 'object'
          ? { ...crit, ...c }
          : c ?? crit,
      ),
      select: () => makeChain(crit),
      include: () => makeChain(crit),
      orderBy: () => makeChain(crit),
      limit: () => makeChain(crit),
      offset: () => makeChain(crit),
      all: async () => filtered(),
      first: async () => filtered()[0] ?? null,
      count: async () => filtered().length,
      aggregate: async () => ({ n: filtered().length }),
      create: async (data: any) => {
        const row = { id: `mock_${model}_${rows().length + 1}`, ...data };
        rows().push(row);
        return row;
      },
      update: async (data: any) => {
        const hit = filtered()[0];
        if (hit) Object.assign(hit, data);
        return hit ?? null;
      },
      delete: async () => {
        const hit = filtered()[0];
        if (hit) rows().splice(rows().indexOf(hit), 1);
        return hit ?? null;
      },
    };
  };
  return makeChain(undefined);
}

// Function declaration so hoisted `vi.mock` factories can safely call it.
function ormFacade() {
  const publics: Record<string, unknown> = {};
  for (const model of Object.keys(h.store)) publics[model] = queryable(model);
  return { orm: { public: publics }, transaction: async (fn: any) => fn(ormFacade()) };
}

vi.mock('../src/prisma/db', () => ({
  db: ormFacade(),
  default: ormFacade(),
  ts: (value?: any) => (typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString()),
  newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
  db: ormFacade(),
  default: ormFacade(),
  validateDatabaseConnection: async () => true,
  disconnectDatabase: async () => undefined,
}));

vi.mock('../src/shared/services/audit', () => ({ logAudit: h.logAudit }));

import type { Express } from 'express';
import request from 'supertest';
import { signAccessToken } from '../src/modules/identity/utils/token';
import {
  AssignmentError,
  checkAssigned,
  assertAssigned,
  clearEffectiveCache,
  getAssignedScope,
  getEffectivePermissions,
} from '../src/modules/identity/services/effectivePermissions';
import { PERMISSION_BY_KEY, isCanonicalKey } from '../src/modules/identity/services/permissionRegistry';

const store = h.store;
let app: Express;

beforeAll(async () => {
  const express = (await import('express')).default;
  const { default: testimonialsRouter } = await import('../src/modules/cms/routes/testimonials');
  app = express();
  app.use(express.json());
  app.use('/v1/testimonials', testimonialsRouter());
});

beforeEach(() => {
  for (const key of Object.keys(store)) store[key] = [];
  h.logAudit.mockClear();
  clearEffectiveCache();
});

const authHeader = (sub: string, role: string) => ({ Authorization: `Bearer ${signAccessToken({ sub, role })}` });
const ctx = (employeeId: string, systemRole = 'STAFF') => ({ employeeId, systemRole });

describe('assignment-scope permission catalogue', () => {
  it('registers both scoped keys as assignment-scoped permissions', () => {
    for (const key of ['services.update_assigned', 'reviews.moderate_assigned']) {
      expect(isCanonicalKey(key)).toBe(true);
      expect(PERMISSION_BY_KEY.get(key)?.scopeRequiresAssignment).toBe(true);
    }
  });
});

describe('effectivePermissions assignment grants', () => {
  it('grants scoped keys from the new join tables with an assigned scope', async () => {
    store.Employee.push({ id: 'emp_scoped', role: 'STAFF', positionId: null });
    store.ServiceTeamMember.push({ serviceId: 'svc_1', employeeId: 'emp_scoped' });
    store.TestimonialReviewAssignment.push({ testimonialId: 't_1', employeeId: 'emp_scoped' });

    const effective = await getEffectivePermissions(ctx('emp_scoped'));
    expect(effective.get('services.update_assigned')).toMatchObject({
      effect: 'GRANT',
      source: 'ASSIGNMENT',
      assignedScope: { type: 'service', id: 'svc_1' },
    });
    expect(effective.get('reviews.moderate_assigned')).toMatchObject({
      effect: 'GRANT',
      source: 'ASSIGNMENT',
      assignedScope: { type: 'review', id: 't_1' },
    });
    expect(await getAssignedScope(ctx('emp_scoped'), 'reviews.moderate_assigned')).toEqual([
      { type: 'review', id: 't_1' },
    ]);
  });

  it('does not grant scoped keys without an assignment row', async () => {
    store.Employee.push({ id: 'emp_empty', role: 'STAFF', positionId: null });
    const effective = await getEffectivePermissions(ctx('emp_empty'));
    expect(effective.has('services.update_assigned')).toBe(false);
    expect(effective.has('reviews.moderate_assigned')).toBe(false);
  });
});

describe('checkAssigned / assertAssigned', () => {
  it('requires both the effective key and the record-level assignment', async () => {
    store.Employee.push({ id: 'emp_both', role: 'STAFF', positionId: null });
    store.ServiceTeamMember.push({ serviceId: 'svc_1', employeeId: 'emp_both' });

    expect(await checkAssigned(ctx('emp_both'), 'services.update_assigned', { type: 'service', id: 'svc_1' }))
      .toEqual({ allowed: true });
    expect(await checkAssigned(ctx('emp_both'), 'services.update_assigned', { type: 'service', id: 'svc_2' }))
      .toEqual({ allowed: false, reason: 'NOT_ASSIGNED' });
    expect(await checkAssigned(ctx('emp_both'), 'services.archive', { type: 'service', id: 'svc_1' }))
      .toEqual({ allowed: false, reason: 'NO_PERMISSION' });
    await expect(assertAssigned(ctx('emp_both'), 'services.update_assigned', { type: 'service', id: 'svc_2' }))
      .rejects.toBeInstanceOf(AssignmentError);
  });

  it('an explicit DENY beats the assignment grant', async () => {
    store.Employee.push({ id: 'emp_deny', role: 'STAFF', positionId: null });
    store.ServiceTeamMember.push({ serviceId: 'svc_1', employeeId: 'emp_deny' });
    store.EmployeePermission.push({
      employeeId: 'emp_deny', permissionKey: 'services.update_assigned', effect: 'DENY',
    });

    expect(await checkAssigned(ctx('emp_deny'), 'services.update_assigned', { type: 'service', id: 'svc_1' }))
      .toEqual({ allowed: false, reason: 'NO_PERMISSION' });
  });

  it('accepts a preloaded owner FK while still requiring the permission key', async () => {
    const effectiveCtx = {
      ...ctx('emp_preloaded'),
      assignmentRows: { productTeamMemberIds: [{ productId: 'p_1' }] },
    };
    expect(await checkAssigned(effectiveCtx, 'products.update_assigned', {
      type: 'product', id: 'p_other', ownerIds: ['emp_preloaded'],
    })).toEqual({ allowed: true });
    expect(await checkAssigned(effectiveCtx, 'products.update_assigned', {
      type: 'product', id: 'p_other', ownerIds: ['someone_else'],
    })).toEqual({ allowed: false, reason: 'NOT_ASSIGNED' });
  });

  it('enforces review-queue membership for the scoped moderation key', async () => {
    store.Employee.push({ id: 'emp_reviewer', role: 'STAFF', positionId: null });
    store.TestimonialReviewAssignment.push({ testimonialId: 't_1', employeeId: 'emp_reviewer' });

    expect(await checkAssigned(ctx('emp_reviewer'), 'reviews.moderate_assigned', { type: 'review', id: 't_1' }))
      .toEqual({ allowed: true });
    expect(await checkAssigned(ctx('emp_reviewer'), 'reviews.moderate_assigned', { type: 'review', id: 't_2' }))
      .toEqual({ allowed: false, reason: 'NOT_ASSIGNED' });
  });
});

describe('testimonial moderation route with assigned reviewers', () => {
  beforeEach(() => {
    store.Testimonial.push(
      { id: 't_1', text: 'Assigned review', confirmed: false, rejected: false, featured: false },
      { id: 't_2', text: 'Unassigned review', confirmed: false, rejected: false, featured: false },
    );
  });

  it('lets an assigned reviewer moderate only their own testimonial', async () => {
    store.Employee.push({ id: 'emp_reviewer_route', role: 'STAFF', positionId: null });
    store.TestimonialReviewAssignment.push({ testimonialId: 't_1', employeeId: 'emp_reviewer_route' });
    const headers = authHeader('emp_reviewer_route', 'STAFF');

    const allowed = await request(app).patch('/v1/testimonials/t_1/approve').set(headers).send({});
    expect(allowed.status).toBe(200);
    expect(store.Testimonial[0].confirmed).toBe(true);

    const denied = await request(app).patch('/v1/testimonials/t_2/approve').set(headers).send({});
    expect(denied.status).toBe(403);
    expect(store.Testimonial[1].confirmed).toBe(false);
  });

  it('keeps reviews.moderate / ADMIN as the global fallback', async () => {
    const admin = authHeader('emp_admin', 'ADMIN');
    const approved = await request(app).patch('/v1/testimonials/t_2/approve').set(admin).send({});
    expect(approved.status).toBe(200);
    expect(store.Testimonial[1].confirmed).toBe(true);
  });

  it('an explicit DENY on reviews.moderate blocks the ADMIN fallback', async () => {
    store.Employee.push({ id: 'emp_admin_deny', role: 'ADMIN', positionId: null });
    store.EmployeePermission.push({
      employeeId: 'emp_admin_deny', permissionKey: 'reviews.moderate', effect: 'DENY',
    });
    const denied = await request(app)
      .patch('/v1/testimonials/t_1/approve')
      .set(authHeader('emp_admin_deny', 'ADMIN'))
      .send({});
    expect(denied.status).toBe(403);
  });
});
