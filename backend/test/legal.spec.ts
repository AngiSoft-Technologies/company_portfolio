import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Public legal endpoints (`cms/routes/legal.ts`).
 *
 * DB-free Prisma-8-contract-shape facade, following `offices.spec.ts`:
 * `prisma.orm.public.Setting.where({ key }).first()`.
 */

const store: Record<string, any[]> = {
  Setting: [],
};

const queriedKeys: string[] = [];
let failQueries = false;

const matches = (row: any, crit: any) =>
  Object.entries(crit ?? {}).every(([k, v]) => row[k] === v);

function queryable(model: string) {
  const rows = () => store[model] ?? [];
  const filtered = (crit?: any) => rows().filter((row) => matches(row, crit));
  const makeChain = (crit?: any): any => ({
    where: (c: any) => {
      if (c && typeof c.key === 'string') queriedKeys.push(c.key);
      return makeChain(c ?? crit);
    },
    select: () => makeChain(crit),
    include: () => makeChain(crit),
    orderBy: () => makeChain(crit),
    limit: () => makeChain(crit),
    offset: () => makeChain(crit),
    all: async () => filtered(crit),
    first: async () => {
      if (failQueries) throw new Error('database unavailable');
      return filtered(crit)[0] ?? null;
    },
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
    ...makeChain(undefined),
    create: async (data: any) => {
      const row = { createdAt: new Date(), updatedAt: new Date(), ...data };
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
  ts: (value?: any) =>
    typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
  newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
  db: ormFacade(),
  default: ormFacade(),
  validateDatabaseConnection: async () => true,
  disconnectDatabase: async () => undefined,
}));

import type { Express } from 'express';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = (await import('supertest')).default;
  const { default: legalRouter } = await import('../src/modules/cms/routes/legal');
  app = express();
  app.use(express.json());
  app.use('/v1/legal', legalRouter());
  request = supertest;
});

beforeEach(() => {
  store.Setting = [];
  queriedKeys.length = 0;
  failQueries = false;
});

describe('public legal endpoints', () => {
  it('serves the checked-in privacy fallback before any CMS value exists', async () => {
    const res = await request(app).get('/v1/legal/privacy');

    expect(res.status).toBe(200);
    expect(res.body.key).toBe('privacy');
    expect(res.body.source).toBe('fallback');
    expect(res.body.titleLead).toBe('Privacy ');
    expect(res.body.titleAccent).toBe('Policy');
    expect(res.body.summary).toContain('Last updated: May 16, 2026.');
    expect(res.body.sections.map((section: any) => section.id)).toEqual([
      'introduction', 'data-collection', 'data-usage', 'cookies',
      'third-parties', 'security', 'rights', 'contact',
    ]);
    // TOC label and on-page heading may legitimately differ.
    expect(res.body.sections[1]).toMatchObject({ title: 'Information We Collect', navTitle: 'Data We Collect' });
    const contact = res.body.sections.at(-1).blocks.find((block: any) => block.type === 'contact');
    expect(contact.lines).toContain('Email: privacy@angisoft.co.ke');
    expect(JSON.stringify(res.body)).not.toContain('dangerouslySetInnerHTML');
    expect(queriedKeys).toEqual(['legal.privacy']);
  });

  it('serves the checked-in terms fallback without auth', async () => {
    const res = await request(app).get('/v1/legal/terms');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect(res.body.titleLead).toBe('Terms & ');
    expect(res.body.titleAccent).toBe('Conditions');
    expect(res.body.sections).toHaveLength(9);
    expect(res.body.sections.map((section: any) => section.id)).toContain('governing-law');
    const contact = res.body.sections.at(-1).blocks.find((block: any) => block.type === 'contact');
    expect(contact.lines).toContain('Email: legal@angisoft.co.ke');
    expect(queriedKeys).toEqual(['legal.terms']);
  });

  it('merges a partial CMS setting over the fallback sections', async () => {
    store.Setting.push({
      key: 'legal.privacy',
      value: { summary: 'Owner-edited privacy summary.' },
      updatedAt: '2026-11-23T00:00:00.000Z',
    });

    const res = await request(app).get('/v1/legal/privacy');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('cms');
    expect(res.body.summary).toBe('Owner-edited privacy summary.');
    expect(res.body.titleLead).toBe('Privacy ');
    expect(res.body.sections).toHaveLength(8);
    expect(res.body.sections[0].blocks[0].type).toBe('paragraph');
  });

  it('returns a fully CMS-authored structured document unchanged', async () => {
    const custom = {
      titleLead: 'Custom ',
      titleAccent: 'Policy',
      summary: 'Custom summary.',
      sections: [
        {
          id: 'custom',
          title: 'Custom Section',
          blocks: [
            { type: 'paragraph', text: 'Custom paragraph.' },
            { type: 'list', items: [{ label: 'Label', text: 'Value' }] },
          ],
        },
      ],
    };
    store.Setting.push({
      key: 'legal.terms',
      value: custom,
      updatedAt: '2026-11-23T00:00:00.000Z',
    });

    const res = await request(app).get('/v1/legal/terms');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('cms');
    expect(res.body).toMatchObject(custom);
    expect(res.body.sections[0].blocks[1].items[0]).toEqual({ label: 'Label', text: 'Value' });
  });

  it('falls back when the setting value is malformed or empty', async () => {
    store.Setting.push({ key: 'legal.privacy', value: '<p>not structured</p>' });
    const malformed = await request(app).get('/v1/legal/privacy');
    expect(malformed.status).toBe(200);
    expect(malformed.body.source).toBe('fallback');
    expect(malformed.body.summary).toContain('Last updated: May 16, 2026.');

    store.Setting = [{ key: 'legal.terms', value: {}, updatedAt: '2026-11-23T00:00:00.000Z' }];
    const empty = await request(app).get('/v1/legal/terms');
    expect(empty.body.source).toBe('fallback');
    expect(empty.body.sections).toHaveLength(9);
  });

  it('falls back when CMS storage fails instead of breaking the legal page', async () => {
    failQueries = true;
    const res = await request(app).get('/v1/legal/privacy');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect(res.body.sections).toHaveLength(8);
  });

  it('rejects unknown legal keys without touching the database', async () => {
    const res = await request(app).get('/v1/legal/cookie-policy');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Legal document not found');
    expect(queriedKeys).toEqual([]);
  });
});
