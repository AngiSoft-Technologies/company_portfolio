import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Route-coverage specs for the routers that previously had no automated
 * coverage (ANGISOFT_DIGITAL_HQ_PLAN.md §13 P3):
 *
 *   - `bookings` staff + admin endpoints
 *   - `client-projects`
 *   - `notifications`
 *   - `files/uploads`
 *   - `staff-dashboard` / `employee-profiles` auth gates
 *
 * Like `security.spec.ts`, the suite is DB-free: `../src/db` and
 * `../src/prisma/db` are mocked with the Prisma 8 contract shape so the
 * Express app loads without TEST_DATABASE_URL. Auth uses real JWTs via
 * `signAccessToken`.
 */

// ─── Prisma 8 contract-shape mock ──────────────────────────────────────────

const store: Record<string, any[]> = {};

const MODELS = [
    'Employee',
    'EmployeePermission',
    'EmployeeRoleAssignment',
    'Position',
    'ProductTeamMember',
    'ProjectEmployee',
    'ServiceTeamMember',
    'TestimonialReviewAssignment',
    'Booking',
    'BookingEvent',
    'ContactEnquiry',
    'BlogPost',
    'Faq',
    'RefreshToken',
    'Client',
    'Payment',
    'ChatConversation',
    'AppRole',
    'RolePermission',
    'Permission',
    'ClientProject',
    'ProjectMilestone',
    'ProjectComment',
    'ProjectDeliverable',
    'ProjectActivity',
    'Notification',
    'File',
];

for (const model of MODELS) store[model] = [];

let idCounter = 0;

/**
 * Chainable query stub. Rows are read from `store` at call time so specs can
 * populate the store after the module graph is built. Supports the subset of
 * the Prisma 8 contract the covered routers actually use.
 */
function queryable(model: string) {
    const readRows = () => store[model] ?? [];
    const makeChain = (crit: any): any => {
        const filtered = () => {
            const rows = readRows();
            if (typeof crit === 'function' || crit == null) return rows;
            const entries = Object.entries(crit);
            if (!entries.length) return rows;
            return rows.filter((row) => entries.every(([k, v]) => (row as any)[k] === v));
        };
        return {
            where: (c: any) =>
                makeChain(
                    crit != null && typeof crit === 'object' && !Array.isArray(crit) &&
                    c != null && typeof c === 'object' && !Array.isArray(c)
                        ? { ...crit, ...c }
                        : c ?? crit
                ),
            select: () => makeChain(crit),
            include: () => makeChain(crit),
            orderBy: () => makeChain(crit),
            limit: () => makeChain(crit),
            offset: () => makeChain(crit),
            groupBy: () => ({ aggregate: async () => [] }),
            all: async () => filtered(),
            first: async () => filtered()[0] ?? null,
            aggregate: async () => ({ n: filtered().length }),
            count: async () => filtered().length,
            create: async (data: any) => {
                const row = { id: data?.id ?? `mock_${++idCounter}`, ...data };
                readRows().push(row);
                return row;
            },
            update: async (data: any) => {
                const hit = filtered()[0];
                if (hit) Object.assign(hit, data);
                return hit ?? null;
            },
            updateAndCount: async (data: any) => {
                const rows = filtered();
                for (const row of rows) Object.assign(row, data);
                return { count: rows.length };
            },
        };
    };
    return makeChain(undefined);
}

/** The mocked Prisma façade, shared by both entry points. */
const ormFacade = () => {
    const publics: Record<string, unknown> = {};
    for (const model of MODELS) publics[model] = queryable(model);
    const facade: any = { orm: { public: publics } };
    facade.transaction = async (fn: any) => fn(facade);
    return facade;
};

// `src/prisma/db.ts` resolves the connection URL at import time, which would
// trip the production-DB guard in `src/connectionUrl.ts`. Mock it directly so
// the module graph loads without any database — and keep `ts`/`newId`, which
// route modules import from the same file.
vi.mock('../src/prisma/db', () => ({
    db: ormFacade(),
    default: ormFacade(),
    ts: (value?: any) =>
        typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
    newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

// `src/db.ts` re-exports the façade; mock it too so no real pool is created.
vi.mock('../src/db', () => ({
    db: ormFacade(),
    default: ormFacade(),
    validateDatabaseConnection: async () => true,
    disconnectDatabase: async () => undefined,
}));

// ─── HTTP specs ────────────────────────────────────────────────────────────

import { signAccessToken } from '../src/modules/identity/utils/token';

const authed = (sub: string, role: string) => ({
    Authorization: `Bearer ${signAccessToken({ sub, role })}`,
});

describe('route coverage: previously unguarded/untested routers', () => {
    let app: any;
    let request: any;

    beforeEach(async () => {
        for (const key of Object.keys(store)) store[key] = [];
        const mod = await import('../src/app');
        app = mod.default;
        request = (await import('supertest')).default;
    });

    describe('bookings staff + admin endpoints', () => {
        it('GET /v1/bookings/staff rejects anonymous callers', async () => {
            const res = await request(app).get('/v1/bookings/staff');
            expect(res.status).toBe(401);
        });

        it('GET /v1/bookings/staff returns the caller\'s bookings', async () => {
            store.Booking = [
                { id: 'b1', assignedToId: 'emp_1', title: 'Mine' },
                { id: 'b2', assignedToId: 'emp_2', title: 'Theirs' },
            ];
            const res = await request(app)
                .get('/v1/bookings/staff')
                .set(authed('emp_1', 'EMPLOYEE'));
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].id).toBe('b1');
        });

        it('GET /v1/bookings/admin rejects anonymous callers', async () => {
            const res = await request(app).get('/v1/bookings/admin');
            expect(res.status).toBe(401);
        });

        it('GET /v1/bookings/admin rejects a role without bookings.view_all', async () => {
            const res = await request(app)
                .get('/v1/bookings/admin')
                .set(authed('emp_client', 'CLIENT'));
            expect(res.status).toBe(403);
        });

        it('GET /v1/bookings/admin allows SUPER_ADMIN via the wildcard', async () => {
            const res = await request(app)
                .get('/v1/bookings/admin')
                .set(authed('emp_root', 'SUPER_ADMIN'));
            expect(res.status).toBe(200);
        });

        it('PATCH /v1/bookings/admin/:id/stage rejects anonymous callers', async () => {
            const res = await request(app)
                .patch('/v1/bookings/admin/b1/stage')
                .send({ stage: 'IN_PROGRESS' });
            expect(res.status).toBe(401);
        });
    });

    describe('client-projects', () => {
        it('GET /v1/client-projects rejects anonymous callers', async () => {
            const res = await request(app).get('/v1/client-projects');
            expect(res.status).toBe(401);
        });

        it('GET /v1/client-projects returns an empty list for a member', async () => {
            const res = await request(app)
                .get('/v1/client-projects')
                .set(authed('emp_1', 'EMPLOYEE'));
            expect(res.status).toBe(200);
            expect(res.body.projects).toEqual([]);
        });

        it('GET /v1/client-projects/:id 404s for an unknown project', async () => {
            const res = await request(app)
                .get('/v1/client-projects/nope')
                .set(authed('emp_1', 'EMPLOYEE'));
            expect(res.status).toBe(404);
        });

        it('POST /v1/client-projects/:id/comments rejects anonymous callers', async () => {
            const res = await request(app)
                .post('/v1/client-projects/p1/comments')
                .send({ body: 'hi' });
            expect(res.status).toBe(401);
        });
    });

    describe('notifications', () => {
        it('GET /v1/notifications rejects anonymous callers', async () => {
            const res = await request(app).get('/v1/notifications');
            expect(res.status).toBe(401);
        });

        it('GET /v1/notifications returns the caller\'s notifications', async () => {
            store.Notification = [
                { id: 'n1', userId: 'emp_1', read: false, title: 'Hi' },
                { id: 'n2', userId: 'emp_2', read: false, title: 'Theirs' },
            ];
            const res = await request(app)
                .get('/v1/notifications')
                .set(authed('emp_1', 'EMPLOYEE'));
            expect(res.status).toBe(200);
            expect(res.body.notifications).toHaveLength(1);
            expect(res.body.unreadCount).toBe(1);
        });

        it('POST /v1/notifications/mark-read rejects anonymous callers', async () => {
            const res = await request(app)
                .post('/v1/notifications/mark-read')
                .send({});
            expect(res.status).toBe(401);
        });
    });

    describe('files/uploads', () => {
        it('POST /v1/uploads/sign rejects anonymous callers', async () => {
            const res = await request(app)
                .post('/v1/uploads/sign')
                .send({ filename: 'a.png', contentType: 'image/png' });
            expect(res.status).toBe(401);
        });

        it('POST /v1/uploads/confirm rejects anonymous callers', async () => {
            const res = await request(app)
                .post('/v1/uploads/confirm')
                .send({ key: 'public/a.png' });
            expect(res.status).toBe(401);
        });

        it('GET /v1/uploads/files/:fileId/download rejects anonymous callers', async () => {
            const res = await request(app).get('/v1/uploads/files/f1/download');
            expect(res.status).toBe(401);
        });

        it('GET /v1/uploads stays public but only lists public files', async () => {
            store.File = [
                { id: 'f1', metadata: { public: true }, createdAt: '2026-01-01' },
                { id: 'f2', metadata: { public: false }, createdAt: '2026-01-02' },
            ];
            const res = await request(app).get('/v1/uploads');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].id).toBe('f1');
        });
    });

    describe('staff-dashboard + employee-profiles auth gates', () => {
        it('GET /v1/staff-dashboard/effective-access rejects anonymous callers', async () => {
            const res = await request(app).get('/v1/staff-dashboard/effective-access');
            expect(res.status).toBe(401);
        });

        it('PUT /v1/staff-dashboard/profile rejects anonymous callers', async () => {
            const res = await request(app)
                .put('/v1/staff-dashboard/profile')
                .send({ preferences: { theme: 'dark' } });
            expect(res.status).toBe(401);
        });

        it('POST /v1/employee-profiles/portfolio rejects anonymous callers', async () => {
            const res = await request(app)
                .post('/v1/employee-profiles/portfolio')
                .send({});
            expect(res.status).toBe(401);
        });

        it('GET /v1/employee-profiles/portfolio/admin rejects anonymous callers', async () => {
            const res = await request(app).get('/v1/employee-profiles/portfolio/admin');
            expect(res.status).toBe(401);
        });
    });
});
