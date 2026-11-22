import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Pricing package endpoints (`cms/routes/pricing-packages.ts`).
 *
 * In-memory Prisma-8-contract-shape facade — same approach as
 * `portfolio-config.spec.ts`; no database required.
 */

const store: Record<string, any[]> = {
    PricingPackage: [],
    Service: [],
    AuditLog: [],
    Employee: [],
    EmployeePermission: [],
    EmployeeRoleAssignment: [],
    Position: [],
    EmployeeProfileStat: [],
    ProductTeamMember: [],
    ProjectEmployee: [],
    Booking: [],
    ContactEnquiry: [],
    BlogPost: [],
};

const matches = (row: any, crit: any) =>
    Object.entries(crit ?? {}).every(([k, v]) => row[k] === v);

function queryable(model: string) {
    const rows = () => store[model] ?? [];
    const filtered = (crit?: any) => rows().filter((r) => matches(r, crit));
    const makeChain = (crit?: any): any => ({
        where: (c: any) => makeChain(c ?? crit),
        select: () => makeChain(crit),
        include: () => makeChain(crit),
        orderBy: () => makeChain(crit),
        limit: () => makeChain(crit),
        offset: () => makeChain(crit),
        all: async () => filtered(crit),
        first: async () => filtered(crit)[0] ?? null,
        count: async () => filtered(crit).length,
        aggregate: async () => ({ n: filtered(crit).length }),
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
            const row = { id: `pp_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
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

import { signAccessToken } from '../src/modules/identity/utils/token';
import type { Express } from 'express';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const { default: pricingPackagesRouter } = await import('../src/modules/cms/routes/pricing-packages');
    app = express();
    app.use(express.json());
    app.use('/v1/pricing-packages', pricingPackagesRouter());
    request = supertest;
});

const authed = (sub: string, role: string) => ({
    Authorization: `Bearer ${signAccessToken({ sub, role })}`,
});

const ADMIN = 'emp_admin';
const MEMBER = 'emp_member';

beforeEach(() => {
    for (const key of Object.keys(store)) store[key] = [];
    store.EmployeePermission.push({
        employeeId: ADMIN,
        permissionKey: 'services.manage_pricing',
        effect: 'GRANT',
    });
    store.Service.push({ id: 'svc_1', title: 'Web Development', slug: 'web-development', published: true });
    store.PricingPackage.push(
        { id: 'pp_pub', name: 'Starter', slug: 'starter', price: 50000, currency: 'KES', published: true, sortOrder: 1, serviceId: 'svc_1', features: ['Landing page'], highlighted: false, billingPeriod: 'project', description: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'pp_draft', name: 'Enterprise', slug: 'enterprise', price: 500000, currency: 'KES', published: false, sortOrder: 2, serviceId: null, features: null, highlighted: true, billingPeriod: null, description: null, createdAt: new Date(), updatedAt: new Date() },
    );
});

describe('pricing-packages endpoints', () => {
    it('public list returns only published packages', async () => {
        const res = await request(app).get('/v1/pricing-packages');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].slug).toBe('starter');
    });

    it('rejects unauthenticated admin list', async () => {
        const res = await request(app).get('/v1/pricing-packages/admin');
        expect(res.status).toBe(401);
    });

    it('rejects admin list without services.manage_pricing', async () => {
        const res = await request(app).get('/v1/pricing-packages/admin').set(authed(MEMBER, 'STAFF'));
        expect(res.status).toBe(403);
    });

    it('admin list returns all packages including drafts', async () => {
        const res = await request(app).get('/v1/pricing-packages/admin').set(authed(ADMIN, 'ADMIN'));
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('creates a package and it appears publicly once published', async () => {
        const res = await request(app)
            .post('/v1/pricing-packages/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ name: 'Growth', slug: 'growth', price: 120000, published: true, features: ['SEO', 'Analytics'] });
        expect(res.status).toBe(201);
        expect(res.body.slug).toBe('growth');

        const pub = await request(app).get('/v1/pricing-packages');
        expect(pub.body.map((p: any) => p.slug)).toContain('growth');
    });

    it('rejects invalid slug format', async () => {
        const res = await request(app)
            .post('/v1/pricing-packages/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ name: 'Bad', slug: 'Not A Slug!', price: 1 });
        expect(res.status).toBe(400);
    });

    it('updates and deletes a package', async () => {
        const upd = await request(app)
            .put('/v1/pricing-packages/admin/pp_draft')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ published: true, price: 600000 });
        expect(upd.status).toBe(200);
        expect(Number(upd.body.price)).toBe(600000);
        expect(upd.body.published).toBe(true);

        const pub = await request(app).get('/v1/pricing-packages');
        expect(pub.body.map((p: any) => p.slug)).toContain('enterprise');

        const del = await request(app)
            .delete('/v1/pricing-packages/admin/pp_draft')
            .set(authed(ADMIN, 'ADMIN'));
        expect(del.status).toBe(200);
        expect(store.PricingPackage.find((p) => p.id === 'pp_draft')).toBeUndefined();
    });
});
