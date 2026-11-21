import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Portfolio Studio config endpoints (`employee-profiles.ts`, Phase 3).
 *
 * Exercises the publish/unpublish/public-read contract against an in-memory
 * Prisma-8-contract-shape facade — same approach as `require-access.spec.ts`,
 * so no database is needed. Auth uses real JWTs via `signAccessToken`.
 */

// ─── In-memory store + queryable facade ────────────────────────────────────

const store: Record<string, any[]> = {
    EmployeePortfolioConfig: [],
    EmployeePortfolioItem: [],
    EmployeeProfileStat: [],
    AuditLog: [],
    Employee: [],
    EmployeePermission: [],
    EmployeeRoleAssignment: [],
    Position: [],
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
            const row = { id: `cfg_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
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

// ─── App harness ───────────────────────────────────────────────────────────
// Dynamic imports: the vi.mock factories above are hoisted, so the facade
// must only be touched after this file's top-level code has run.

import { signAccessToken } from '../src/modules/identity/utils/token';
import type { Express } from 'express';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const { default: employeeProfilesRouter } = await import('../src/modules/identity/routes/employee-profiles');
    app = express();
    app.use(express.json());
    app.use('/api/employee-profiles', employeeProfilesRouter());
    request = supertest;
});

const token = (sub: string, role: string) =>
    `Bearer ${signAccessToken({ sub, role })}`;

const authed = (sub: string, role: string) => ({ Authorization: token(sub, role) });

const EMPLOYEE = 'emp_owner';

beforeEach(() => {
    for (const key of Object.keys(store)) store[key] = [];
    // Owner passes requirePermission('profile.update_own'); canManageEmployee
    // then limits writes to self or privileged roles.
    store.EmployeePermission.push({
        employeeId: EMPLOYEE,
        permissionKey: 'profile.update_own',
        effect: 'GRANT',
    });
    store.EmployeePortfolioConfig.push({
        id: 'cfg_1',
        employeeId: EMPLOYEE,
        theme: 'ocean',
        layout: 'spotlight',
        sections: [{ key: 'about', visible: true, title: 'My story' }],
        draftConfig: { testimonials: [{ quote: 'Great work', author: 'A Client' }] },
        publishedConfig: {},
        versionHistory: [],
        published: false,
        version: 0,
    });
});

describe('portfolio-config endpoints', () => {
    it('rejects unauthenticated reads of the draft config', async () => {
        const res = await request(app).get(`/api/employee-profiles/portfolio-config/${EMPLOYEE}`);
        expect(res.status).toBe(401);
    });

    it('returns null publicly until published', async () => {
        const res = await request(app).get(`/api/employee-profiles/portfolio-config/public/${EMPLOYEE}`);
        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });

    it('lets an owner read their draft config', async () => {
        const res = await request(app)
            .get(`/api/employee-profiles/portfolio-config/${EMPLOYEE}`)
            .set(authed(EMPLOYEE, 'DEVELOPER'));
        expect(res.status).toBe(200);
        expect(res.body.draftConfig.testimonials).toHaveLength(1);
    });

    it('forbids a non-owner without a privileged role', async () => {
        store.EmployeePermission.push({
            employeeId: 'emp_other',
            permissionKey: 'profile.update_own',
            effect: 'GRANT',
        });
        const res = await request(app)
            .get(`/api/employee-profiles/portfolio-config/${EMPLOYEE}`)
            .set(authed('emp_other', 'DEVELOPER'));
        expect(res.status).toBe(403);
    });

    it('publish snapshots draftConfig, bumps version, and records history', async () => {
        const res = await request(app)
            .post(`/api/employee-profiles/portfolio-config/${EMPLOYEE}/publish`)
            .set(authed(EMPLOYEE, 'DEVELOPER'));
        expect(res.status).toBe(200);
        expect(res.body.published).toBe(true);
        expect(res.body.version).toBe(1);
        expect(res.body.publishedConfig.testimonials).toHaveLength(1);
        expect(res.body.versionHistory).toHaveLength(1);
        expect(res.body.versionHistory[0].version).toBe(1);
    });

    it('exposes the published snapshot via the public endpoint', async () => {
        await request(app)
            .post(`/api/employee-profiles/portfolio-config/${EMPLOYEE}/publish`)
            .set(authed(EMPLOYEE, 'DEVELOPER'));

        const res = await request(app).get(`/api/employee-profiles/portfolio-config/public/${EMPLOYEE}`);
        expect(res.status).toBe(200);
        expect(res.body.theme).toBe('ocean');
        expect(res.body.layout).toBe('spotlight');
        expect(res.body.config.testimonials).toHaveLength(1);
        expect(res.body.version).toBe(1);
    });

    it('unpublish hides the config publicly but keeps the draft', async () => {
        await request(app)
            .post(`/api/employee-profiles/portfolio-config/${EMPLOYEE}/publish`)
            .set(authed(EMPLOYEE, 'DEVELOPER'));
        const unpub = await request(app)
            .post(`/api/employee-profiles/portfolio-config/${EMPLOYEE}/unpublish`)
            .set(authed(EMPLOYEE, 'DEVELOPER'));
        expect(unpub.status).toBe(200);
        expect(unpub.body.published).toBe(false);

        const pub = await request(app).get(`/api/employee-profiles/portfolio-config/public/${EMPLOYEE}`);
        expect(pub.body).toBeNull();

        const draft = await request(app)
            .get(`/api/employee-profiles/portfolio-config/${EMPLOYEE}`)
            .set(authed(EMPLOYEE, 'DEVELOPER'));
        expect(draft.body.draftConfig.testimonials).toHaveLength(1);
    });

    it('admin list requires auth', async () => {
        const res = await request(app).get('/api/employee-profiles/portfolio-config/admin/all');
        expect(res.status).toBe(401);
    });
});
