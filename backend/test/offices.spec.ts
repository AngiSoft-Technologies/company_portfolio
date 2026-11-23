import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Office/location endpoints (`cms/routes/offices.ts`).
 *
 * In-memory Prisma-8-contract-shape facade — same approach as
 * `pricing-packages.spec.ts`; no database required.
 */

const store: Record<string, any[]> = {
    Office: [],
    AuditLog: [],
    Employee: [],
    EmployeePermission: [],
    EmployeeRoleAssignment: [],
    Position: [],
    EmployeeProfileStat: [],
    ProductTeamMember: [],
    ProjectEmployee: [],
    ServiceTeamMember: [],
    TestimonialReviewAssignment: [],
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
            const row = { id: `of_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
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
    const { default: officesRouter } = await import('../src/modules/cms/routes/offices');
    app = express();
    app.use(express.json());
    app.use('/v1/offices', officesRouter());
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
        permissionKey: 'pages.update_contact',
        effect: 'GRANT',
    });
    store.Office.push(
        { id: 'of_pub', name: 'Nairobi HQ', slug: 'nairobi-hq', addressLine: '1 Ngong Rd', city: 'Nairobi', country: 'Kenya', phone: '+254700000001', email: 'hq@angisoft.co.ke', hours: [{ days: 'Mon-Fri', hours: '8:00-17:00' }], mapUrl: 'https://maps.google.com/?q=nairobi', isHeadquarters: true, published: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 'of_draft', name: 'Mombasa', slug: 'mombasa', addressLine: null, city: 'Mombasa', country: 'Kenya', phone: null, email: null, hours: null, mapUrl: null, isHeadquarters: false, published: false, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    );
});

describe('offices endpoints', () => {
    it('public list returns only published offices', async () => {
        const res = await request(app).get('/v1/offices');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].slug).toBe('nairobi-hq');
    });

    it('rejects unauthenticated admin list', async () => {
        const res = await request(app).get('/v1/offices/admin');
        expect(res.status).toBe(401);
    });

    it('rejects admin list without pages.update_contact', async () => {
        const res = await request(app).get('/v1/offices/admin').set(authed(MEMBER, 'STAFF'));
        expect(res.status).toBe(403);
    });

    it('admin list returns all offices including drafts', async () => {
        const res = await request(app).get('/v1/offices/admin').set(authed(ADMIN, 'ADMIN'));
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('creates an office and it appears publicly once published', async () => {
        const res = await request(app)
            .post('/v1/offices/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ name: 'Kisumu', slug: 'kisumu', city: 'Kisumu', published: true, hours: [{ days: 'Mon-Fri', hours: '8:00-16:00' }] });
        expect(res.status).toBe(201);
        expect(res.body.slug).toBe('kisumu');

        const pub = await request(app).get('/v1/offices');
        expect(pub.body.map((o: any) => o.slug)).toContain('kisumu');
    });

    it('rejects invalid slug format and bad map URL', async () => {
        const badSlug = await request(app)
            .post('/v1/offices/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ name: 'Bad', slug: 'Not A Slug!' });
        expect(badSlug.status).toBe(400);

        const badMap = await request(app)
            .post('/v1/offices/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ name: 'Bad Map', slug: 'bad-map', mapUrl: 'not-a-url' });
        expect(badMap.status).toBe(400);
    });

    it('updates and deletes an office', async () => {
        const upd = await request(app)
            .put('/v1/offices/admin/of_draft')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ published: true, city: 'Kilifi' });
        expect(upd.status).toBe(200);
        expect(upd.body.published).toBe(true);
        expect(upd.body.city).toBe('Kilifi');

        const pub = await request(app).get('/v1/offices');
        expect(pub.body.map((o: any) => o.slug)).toContain('mombasa');

        const del = await request(app)
            .delete('/v1/offices/admin/of_draft')
            .set(authed(ADMIN, 'ADMIN'));
        expect(del.status).toBe(200);
        expect(store.Office.find((o) => o.id === 'of_draft')).toBeUndefined();
    });
});
