import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Admin editing paths for structured legal copy.
 *
 * The site router whitelists `legal-privacy` / `legal-terms` Setting keys;
 * the public legal router reads the same rows. DB-free Prisma-8-contract
 * facade, real JWTs for the auth gates.
 */

const store: Record<string, any[]> = { Setting: [], AuditLog: [] };
const MODELS = [
  'Setting', 'AuditLog', 'EmployeeRoleAssignment', 'Employee', 'Position',
  'EmployeePermission', 'ProductTeamMember', 'ProjectEmployee', 'Booking',
  'ContactEnquiry', 'BlogPost', 'ServiceTeamMember', 'TestimonialReviewAssignment',
];

const matches = (row: any, crit: any) =>
  Object.entries(crit ?? {}).every(([key, value]) => row[key] === value);

function queryable(model: string) {
  const rows = () => store[model] ?? (store[model] = []);
  const chain = (crit?: any): any => ({
    where: (next: any) => chain({ ...(crit ?? {}), ...next }),
    select: () => chain(crit),
    include: () => chain(crit),
    orderBy: () => chain(crit),
    limit: () => chain(crit),
    offset: () => chain(crit),
    all: async () => rows().filter((row) => matches(row, crit)),
    first: async () => rows().find((row) => matches(row, crit)) ?? null,
    count: async () => rows().filter((row) => matches(row, crit)).length,
    update: async (data: any) => {
      const hit = rows().find((row) => matches(row, crit));
      if (hit) Object.assign(hit, data);
      return hit ?? null;
    },
    delete: async () => {
      const hit = rows().find((row) => matches(row, crit));
      if (hit) rows().splice(rows().indexOf(hit), 1);
      return hit ?? null;
    },
  });
  return {
    ...chain(undefined),
    create: async (data: any) => {
      const row = { id: `mock_${Math.random().toString(36).slice(2)}`, ...data };
      rows().push(row);
      return row;
    },
  };
}

const ormFacade = () => {
  const publics: Record<string, unknown> = {};
  for (const model of MODELS) publics[model] = queryable(model);
  const facade: any = { orm: { public: publics } };
  facade.transaction = async (fn: any) => fn(facade);
  return facade;
};

vi.mock('../src/prisma/db', () => ({
  db: ormFacade(),
  default: ormFacade(),
  ts: (value?: any) => typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
  newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
  db: ormFacade(),
  default: ormFacade(),
  validateDatabaseConnection: async () => true,
  disconnectDatabase: async () => undefined,
}));

import type { Express } from 'express';
import { signAccessToken } from '../src/modules/identity/utils/token';

const auth = (role: string) => ({ Authorization: `Bearer ${signAccessToken({ sub: 'emp_admin', role })}` });

let app: Express;
let request: any;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = (await import('supertest')).default;
  const { default: siteRouter } = await import('../src/modules/cms/routes/site');
  const { default: legalRouter } = await import('../src/modules/cms/routes/legal');
  const facade = ormFacade();
  app = express();
  app.use(express.json());
  app.use('/v1/site', siteRouter(facade as any));
  app.use('/v1/legal', legalRouter(facade as any));
  request = supertest;
});

beforeEach(() => {
  for (const key of Object.keys(store)) store[key] = [];
});

describe('structured legal copy admin endpoints', () => {
  it('exposes the legal settings publicly as empty before an override', async () => {
    const [privacy, terms] = await Promise.all([
      request(app).get('/v1/site/legal-privacy'),
      request(app).get('/v1/site/legal-terms'),
    ]);
    expect(privacy.status).toBe(200);
    expect(privacy.body).toBeNull();
    expect(terms.status).toBe(200);
    expect(terms.body).toBeNull();
  });

  it('rejects anonymous and non-admin writes', async () => {
    const body = { summary: 'Unauthorized edit.' };
    expect((await request(app).put('/v1/site/legal-privacy').send(body)).status).toBe(401);
    expect((await request(app).put('/v1/site/legal-privacy').set(auth('EMPLOYEE')).send(body)).status).toBe(403);
    expect(store.Setting).toHaveLength(0);
  });

  it('persists a partial override and the public legal route merges it', async () => {
    const res = await request(app)
      .put('/v1/site/legal-privacy')
      .set(auth('ADMIN'))
      .send({ summary: 'Owner-edited privacy summary.' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: 'Owner-edited privacy summary.' });
    expect(store.Setting).toMatchObject([{ key: 'legal.privacy' }]);
    expect(store.AuditLog).toMatchObject([{ action: 'site.update', entity: 'Setting', entityId: 'legal.privacy' }]);

    const publicRes = await request(app).get('/v1/legal/privacy');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.source).toBe('cms');
    expect(publicRes.body.summary).toBe('Owner-edited privacy summary.');
    expect(publicRes.body.titleLead).toBe('Privacy ');
    expect(publicRes.body.sections).toHaveLength(8);
  });

  it('rejects a structurally invalid document instead of storing it', async () => {
    const res = await request(app)
      .put('/v1/site/legal-terms')
      .set(auth('ADMIN'))
      .send({ sections: [{ id: 'bad', title: 'Bad', blocks: [{ type: 'html', html: '<script />' }] }] });
    expect(res.status).toBe(400);
    expect(store.Setting).toHaveLength(0);
  });

  it('restores the checked-in fallback with an empty override', async () => {
    await request(app).put('/v1/site/legal-terms').set(auth('ADMIN')).send({ summary: 'Temporary.' });
    const reset = await request(app).put('/v1/site/legal-terms').set(auth('ADMIN')).send({});
    expect(reset.status).toBe(200);
    const publicRes = await request(app).get('/v1/legal/terms');
    expect(publicRes.body.source).toBe('fallback');
    expect(publicRes.body.summary).toContain('May 16, 2026');
    expect(JSON.stringify(publicRes.body)).not.toContain('<script');
  });
});
