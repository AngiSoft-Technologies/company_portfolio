import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Public testimonials endpoints (`cms/routes/testimonials.ts`).
 *
 * Regression coverage for a production 500 (`where is not a function`):
 * the Prisma 8 contract facade does not allow `.where()` after `.orderBy()`.
 * The mock below models that constraint — once `orderBy` is applied the
 * chain no longer exposes `where`, so a regression fails loudly here too.
 */

const store: Record<string, any[]> = {
    Testimonial: [],
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
    // sorted=true mirrors the real facade: orderBy() returns a chain with no .where().
    const makeChain = (crit: any, sorted = false): any => ({
        ...(sorted
            ? {}
            : {
                  where: (c: any) => makeChain(c ?? crit, sorted),
              }),
        select: () => makeChain(crit, sorted),
        include: () => makeChain(crit, sorted),
        orderBy: () => makeChain(crit, true),
        limit: () => makeChain(crit, sorted),
        offset: () => makeChain(crit, sorted),
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
            const row = { id: `t_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
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
    const { default: testimonialsRouter } = await import('../src/modules/cms/routes/testimonials');
    app = express();
    app.use(express.json());
    app.use('/v1/testimonials', testimonialsRouter());
    request = supertest;
});

beforeEach(() => {
    for (const key of Object.keys(store)) store[key] = [];
    store.Testimonial.push(
        { id: 't_pub', name: 'Jane', company: 'Acme', role: 'CTO', text: 'Great work delivered on time.', rating: 5, confirmed: true, rejected: false, featured: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
        { id: 't_pending', name: 'Bob', company: null, role: null, text: 'Awaiting moderation right now.', rating: 4, confirmed: false, rejected: false, featured: false, createdAt: new Date('2026-01-02'), updatedAt: new Date('2026-01-02') },
        { id: 't_rejected', name: 'Eve', company: null, role: null, text: 'This one was rejected by staff.', rating: 1, confirmed: false, rejected: true, featured: false, createdAt: new Date('2026-01-03'), updatedAt: new Date('2026-01-03') },
    );
});

describe('testimonials endpoints', () => {
    it('public list returns only confirmed, non-rejected testimonials', async () => {
        const res = await request(app).get('/v1/testimonials');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe('t_pub');
    });

    it('featured list returns featured confirmed testimonials', async () => {
        const res = await request(app).get('/v1/testimonials/featured');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe('t_pub');
    });

    it('get by id hides unconfirmed testimonials from anonymous callers', async () => {
        const hidden = await request(app).get('/v1/testimonials/t_pending');
        expect(hidden.status).toBe(404);
        const visible = await request(app).get('/v1/testimonials/t_pub');
        expect(visible.status).toBe(200);
        expect(visible.body.id).toBe('t_pub');
    });
});
