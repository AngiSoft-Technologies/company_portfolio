import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Phase 2 marketing/content slices (DB-free).
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
  Campaign: [],
  ContentCalendarEntry: [],
  ContentBrief: [],
  AssetLibraryItem: [],
  AttributionLink: [],
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

const ADMIN = 'marketing_admin';
const VIEWER = 'marketing_viewer';
const DENIED = 'marketing_denied';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = (await import('supertest')).default;
  signAccessToken = (await import('../src/modules/identity/utils/token')).signAccessToken;
  clearEffectiveCache = (await import('../src/modules/identity/services/effectivePermissions')).clearEffectiveCache;
  const { default: marketingOperationsRouter } = await import('../src/modules/cms/routes/marketing-slices');
  app = express();
  app.use(express.json());
  app.use('/v1/slices', marketingOperationsRouter());
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
  grant(VIEWER, 'publications.review');
  grant(DENIED, 'publications.review', 'DENY');
  for (const id of [ADMIN, VIEWER, DENIED]) {
    store.Employee.push({ id, firstName: id, lastName: 'User', email: `${id}@example.test` });
  }
});

const CAMPAIGN = '/v1/slices/campaigns';
const validCampaign = {
  name: 'Q1 launch',
  channel: 'email',
  budgetAmount: '50000.00',
  spendAmount: '1250.50',
};

describe('Phase 2 marketing/content slices', () => {
  it('rejects unauthenticated access and permission failures', async () => {
    expect((await request(app).get(CAMPAIGN)).status).toBe(401);
    expect((await request(app).post(CAMPAIGN).send(validCampaign)).status).toBe(401);
    expect((await request(app).get(CAMPAIGN).set(authed(DENIED, 'STAFF'))).status).toBe(403);
    expect((await request(app).post(CAMPAIGN).set(authed(VIEWER, 'STAFF')).send(validCampaign)).status).toBe(403);
  });

  it('creates and lists campaigns with canonical decimal text', async () => {
    const created = await request(app)
      .post(CAMPAIGN)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send(validCampaign);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.budgetAmount).toBe('50000.00');
    expect(created.body.spendAmount).toBe('1250.50');
    expect(created.body.publicReference).toMatch(/^CAM-/);

    const list = await request(app).get(CAMPAIGN).set(authed(VIEWER, 'STAFF'));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(store.AuditLog.some((e) => e.action === 'campaign.create')).toBe(true);
  });

  it('creates calendar entries, briefs, assets and attribution links', async () => {
    const calendar = await request(app)
      .post('/v1/slices/content-calendar')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ campaignId: 'camp_1', title: 'Launch post', scheduledAt: '2026-12-01' });
    expect(calendar.status).toBe(201);
    expect(calendar.body.status).toBe('planned');

    const brief = await request(app)
      .post('/v1/slices/content-briefs')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ campaignId: 'camp_1', title: 'Launch brief', wordCount: 800 });
    expect(brief.status).toBe(201);
    expect(brief.body.publicReference).toMatch(/^CB-/);

    const asset = await request(app)
      .post('/v1/slices/assets')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ name: 'Hero image', url: 'https://cdn.example.test/hero.png', tags: ['launch', 'email'] });
    expect(asset.status).toBe(201);
    expect(asset.body.tags).toEqual(['launch', 'email']);
    expect(asset.body.publicReference).toMatch(/^ASSET-/);

    const attribution = await request(app)
      .post('/v1/slices/attribution-links')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ campaignId: 'camp_1', name: 'Email CTA', destinationUrl: 'https://example.test', token: 'email-q1' });
    expect(attribution.status).toBe(201);
    expect(attribution.body.publicReference).toMatch(/^ATT-/);

    for (const [path, model] of [
      ['content-calendar', 'ContentCalendarEntry'],
      ['content-briefs', 'ContentBrief'],
      ['assets', 'AssetLibraryItem'],
      ['attribution-links', 'AttributionLink'],
    ] as const) {
      const list = await request(app).get(`/v1/slices/${path}`).set(authed(VIEWER, 'STAFF'));
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(store[model]).toHaveLength(1);
    }
  });

  it('rejects invalid payloads without writing a row', async () => {
    const invalid = await request(app)
      .post(CAMPAIGN)
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ name: '', spendAmount: 'nope' });
    expect(invalid.status).toBe(400);
    expect(store.Campaign).toHaveLength(0);

    const attribution = await request(app)
      .post('/v1/slices/attribution-links')
      .set(authed(ADMIN, 'SUPER_ADMIN'))
      .send({ campaignId: 'camp_1', name: 'Missing fields' });
    expect(attribution.status).toBe(400);
    expect(store.AttributionLink).toHaveLength(0);
  });
});
