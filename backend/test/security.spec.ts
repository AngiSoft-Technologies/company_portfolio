import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Security regression specs for the Phase 0 production-safety fixes.
 *
 * These specs are intentionally DB-free: `../src/db` is mocked with the
 * Prisma 8 contract shape so the Express app can be exercised without any
 * database (and therefore without TEST_DATABASE_URL). Coverage:
 *
 *   1. `effectivePermissions.has()` — explicit DENY beats the SUPER_ADMIN
 *      wildcard (ANGISOFT_DIGITAL_HQ_PLAN.md §5.3).
 *   2. Chatbot admin endpoints — unauthenticated access is rejected.
 *   3. CSRF — double-submit is enforced on state-changing requests.
 *   4. Public JSON cache — authenticated requests are never cached.
 *   5. Route ordering — `/admin` and `/staff` are no longer shadowed by
 *      `/:id`.
 */

// ─── Prisma 8 contract-shape mock ──────────────────────────────────────────

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
    Faq: [],
    RefreshToken: [],
};

const MODELS = [
    'Employee',
    'EmployeePermission',
    'EmployeeRoleAssignment',
    'Position',
    'ProductTeamMember',
    'ProjectEmployee',
    'Booking',
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
];

/**
 * Builds a chainable query stub. Rows are read from `store` **at call time**
 * (not captured at construction time) so a spec can populate the store after
 * the module graph is already built.
 */
function queryable(model: string) {
    const readRows = () => store[model] ?? [];
    const makeChain = (crit: any): any => {
        const filtered = () => {
            const rows = readRows();
            const entries = Object.entries(crit ?? {});
            if (!entries.length) return rows;
            return rows.filter((row) => entries.every(([k, v]) => (row as any)[k] === v));
        };
        return {
            where: (c: any) => makeChain(c),
            select: () => makeChain(crit),
            include: () => makeChain(crit),
            orderBy: () => makeChain(crit),
            limit: () => makeChain(crit),
            offset: () => makeChain(crit),
            all: async () => filtered(),
            first: async () => filtered()[0] ?? null,
            aggregate: async () => ({ n: filtered().length }),
            count: async () => filtered().length,
            update: async (data: any) => {
                const hit = filtered()[0];
                if (hit) Object.assign(hit, data);
                return hit ?? null;
            },
        };
    };
    return makeChain(undefined);
}

/** The mocked Prisma façade, shared by both entry points. */
const ormFacade = () => {
    const publics: Record<string, unknown> = {};
    for (const model of MODELS) publics[model] = queryable(model);
    return { orm: { public: publics } };
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

describe('effectivePermissions precedence', () => {
    beforeEach(() => {
        // Reset every store so one spec's rows cannot leak into the next.
        for (const key of Object.keys(store)) store[key] = [];
    });

    it('blocks an explicitly denied key even for SUPER_ADMIN', async () => {
        store.Employee = [{ id: 'emp_1', role: 'SUPER_ADMIN', positionId: null }];
        store.EmployeePermission = [{ employeeId: 'emp_1', permissionKey: 'roles.manage', effect: 'DENY' }];
        store.EmployeeRoleAssignment = [];

        const { has, clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_1');

        // The wildcard still grants untouched keys…
        expect(await has({ employeeId: 'emp_1', systemRole: 'SUPER_ADMIN' }, 'services.update')).toBe(true);
        // …but the explicit DENY wins. This is the P0 precedence fix.
        expect(await has({ employeeId: 'emp_1', systemRole: 'SUPER_ADMIN' }, 'roles.manage')).toBe(false);
    });

    it('grants a normal employee key only when the effect resolves to GRANT', async () => {
        store.Employee = [{ id: 'emp_2', role: 'ADMIN', positionId: null }];
        store.EmployeePermission = [
            { employeeId: 'emp_2', permissionKey: 'services.update', effect: 'GRANT' },
            { employeeId: 'emp_2', permissionKey: 'roles.manage', effect: 'DENY' },
        ];
        store.EmployeeRoleAssignment = [];

        const { has, clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_2');

        expect(await has({ employeeId: 'emp_2', systemRole: 'ADMIN' }, 'services.update')).toBe(true);
        expect(await has({ employeeId: 'emp_2', systemRole: 'ADMIN' }, 'roles.manage')).toBe(false);
        expect(await has({ employeeId: 'emp_2', systemRole: 'ADMIN' }, 'products.update')).toBe(false);
    });
});

// ─── App-level guards ───────────────────────────────────────────────────────

/** Builds a cookie header from a name/value map. */
function cookieHeader(cookies: Record<string, string>): string {
    return Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

describe('HTTP security guards', () => {
    let app: any;

    beforeEach(async () => {
        const mod = await import('../src/app');
        app = mod.default;
    });

    describe('chatbot admin endpoints (P0.3)', () => {
        it('GET /api/chatbot/conversations rejects anonymous callers', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app).get('/api/chatbot/conversations');
            expect(res.status).toBe(401);
        });

        it('GET /api/chatbot/conversations/:id rejects anonymous callers', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app).get('/api/chatbot/conversations/9f8c1d4e-1111-4222-8333-444455556666');
            expect(res.status).toBe(401);
        });

        it('PUT /api/chatbot/conversations/:id rejects anonymous callers', async () => {
            const request = (await import('supertest')).default;
            const token = 'test-csrf-token-value';
            const res = await request(app)
                .put('/api/chatbot/conversations/9f8c1d4e-1111-4222-8333-444455556666')
                .set('Cookie', cookieHeader({ csrfToken: token }))
                .set('x-csrf-token', token)
                .send({ status: 'closed' });
            // 403 when the CSRF token does not match, 401 once it does — either
            // way the endpoint is not reachable anonymously.
            expect([401, 403]).toContain(res.status);
        });
    });

    describe('CSRF double-submit (P0.1)', () => {
        it('rejects a session-bearing state-changing request without a token', async () => {
            const request = (await import('supertest')).default;
            // A live session (refresh cookie) but no matching header is exactly
            // the request a cross-site forgery would make.
            const res = await request(app)
                .put('/api/settings/site_name')
                .set('Cookie', cookieHeader({ refreshToken: 'live-session-token' }))
                .send({ value: 'x' });
            expect(res.status).toBe(403);
            expect(String(res.body?.error ?? '')).toMatch(/csrf/i);
        });

        it('rejects a mismatched token', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app)
                .put('/api/settings/site_name')
                .set('Cookie', cookieHeader({ csrfToken: 'real-token', refreshToken: 'live-session-token' }))
                .set('x-csrf-token', 'forged-token')
                .send({ value: 'x' });
            expect(res.status).toBe(403);
        });

        it('lets a matching token through to the auth layer', async () => {
            const request = (await import('supertest')).default;
            const token = 'test-csrf-token-value';
            const res = await request(app)
                .put('/api/settings/site_name')
                .set('Cookie', cookieHeader({ csrfToken: token, refreshToken: 'live-session-token' }))
                .set('x-csrf-token', token)
                .send({ value: 'x' });
            // CSRF passed; the request is now stopped by authentication.
            expect(res.status).toBe(401);
        });

        it('lets a cookieless first-contact request through to the auth layer', async () => {
            const request = (await import('supertest')).default;
            // No cookies means no ambient credentials to abuse, so forgot-password
            // and 2FA verification from a cold browser must not 403.
            const res = await request(app).post('/api/auth/forgot').send({ email: 'a@b.co' });
            expect(res.status).toBe(200);
        });
    });

    describe('public JSON cache isolation (P0.4)', () => {
        it('does not emit public cache headers for authenticated requests', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app)
                .get('/api/faqs')
                .set('Authorization', 'Bearer some-admin-access-token');
            expect(res.headers['cache-control']).toBeUndefined();
        });

        it('still caches genuinely anonymous public reads', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app).get('/api/faqs');
            expect(res.headers['cache-control']).toMatch(/public/);
        });
    });

    describe('route ordering (P0.6)', () => {
        it('GET /api/bookings/admin reaches the admin handler, not /:id', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app).get('/api/bookings/admin');
            // The admin handler runs requireAuth, so the error names
            // authentication — proving /:id (which demands an email) was not
            // reached first.
            expect(res.status).toBe(401);
            expect(String(res.body?.error ?? '')).not.toMatch(/email verification/i);
        });

        it('GET /api/bookings/:id still demands email proof-of-possession', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app).get('/api/bookings/9f8c1d4e-1111-4222-8333-444455556666');
            expect(res.status).toBe(401);
            expect(String(res.body?.error ?? '')).toMatch(/email verification/i);
        });

        it('GET /api/projects/staff reaches the staff handler, not /:id', async () => {
            const request = (await import('supertest')).default;
            const res = await request(app).get('/api/projects/staff');
            // /:id is public (optionalAuth) and would return 404 for a missing
            // project named "staff"; the staff handler returns 401 instead.
            expect(res.status).toBe(401);
        });
    });
});