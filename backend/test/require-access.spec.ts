import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * `requireAccess(permission, fallbackRoles)` contract — Phase 1.2.
 *
 * The helper exists so a migrated permission and a legacy system role can both
 * grant access while the registry catches up (`ANGISOFT_DIGITAL_HQ_PLAN.md`
 * §12). The risk in that design is precedence: a role fallback must never
 * rescue a key the employee is explicitly DENIED, otherwise "DENY always wins"
 * (§5.3) would be false for every route that still carries a fallback.
 *
 * These specs exercise the middleware directly with a stubbed request/response,
 * so they need no route wiring and no database.
 */

// ─── Prisma 8 contract-shape mock (same shape as security.spec.ts) ─────────

const store: Record<string, any[]> = {
    Employee: [],
    EmployeePermission: [],
    EmployeeRoleAssignment: [],
    Position: [],
    ProductTeamMember: [],
    ProjectEmployee: [],
    ServiceTeamMember: [],
    TestimonialReviewAssignment: [],
    Booking: [],
    ContactEnquiry: [],
    BlogPost: [],
};

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
        };
    };
    return makeChain(undefined);
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

// ─── Harness ───────────────────────────────────────────────────────────────

interface Call {
    status?: number;
    body?: unknown;
    next: boolean;
}

/** Invokes an Express middleware with a minimal request/response pair. */
async function run(
    middleware: any,
    user: { sub?: string; role?: string } | undefined,
): Promise<Call> {
    const call: Call = { next: false };
    const req: any = { user };
    const res: any = {
        status(code: number) {
            call.status = code;
            return this;
        },
        json(payload: unknown) {
            call.body = payload;
            return this;
        },
    };
    await middleware(req, res, () => {
        call.next = true;
    });
    return call;
}

describe('requireAccess precedence', () => {
    beforeEach(() => {
        for (const key of Object.keys(store)) store[key] = [];
    });

    it('rejects an unauthenticated caller with 401', async () => {
        const { requireAccess } = await import('../src/shared/middleware/roles');
        const call = await run(requireAccess('leads.view', ['ADMIN']), undefined);
        expect(call.status).toBe(401);
        expect(call.next).toBe(false);
    });

    it('grants by permission alone, with no fallback role', async () => {
        store.Employee = [{ id: 'emp_perm', role: 'DEVELOPER', positionId: null }];
        store.EmployeePermission = [
            { employeeId: 'emp_perm', permissionKey: 'leads.view', effect: 'GRANT' },
        ];

        const { clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_perm');

        const { requireAccess } = await import('../src/shared/middleware/roles');
        const call = await run(requireAccess('leads.view', []), { sub: 'emp_perm', role: 'DEVELOPER' });
        expect(call.next).toBe(true);
        expect(call.status).toBeUndefined();
    });

    it('grants by fallback role when the permission has not been migrated', async () => {
        store.Employee = [{ id: 'emp_role', role: 'ADMIN', positionId: null }];
        store.EmployeePermission = [];

        const { clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_role');

        const { requireAccess } = await import('../src/shared/middleware/roles');
        const call = await run(requireAccess('leads.view', ['ADMIN']), { sub: 'emp_role', role: 'ADMIN' });
        expect(call.next).toBe(true);
    });

    it('rejects a role that is neither granted the permission nor in the fallback', async () => {
        store.Employee = [{ id: 'emp_none', role: 'STAFF', positionId: null }];
        store.EmployeePermission = [];

        const { clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_none');

        const { requireAccess } = await import('../src/shared/middleware/roles');
        const call = await run(requireAccess('leads.view', ['ADMIN']), { sub: 'emp_none', role: 'STAFF' });
        expect(call.status).toBe(403);
        expect(call.next).toBe(false);
    });

    it('an explicit DENY beats the fallback role — DENY always wins (§5.3)', async () => {
        store.Employee = [{ id: 'emp_denied', role: 'ADMIN', positionId: null }];
        store.EmployeePermission = [
            { employeeId: 'emp_denied', permissionKey: 'leads.view', effect: 'DENY' },
        ];

        const { clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_denied');

        const { requireAccess } = await import('../src/shared/middleware/roles');
        const call = await run(requireAccess('leads.view', ['ADMIN']), { sub: 'emp_denied', role: 'ADMIN' });
        expect(call.status).toBe(403);
        expect(call.next).toBe(false);
    });

    it('an explicit DENY beats the SUPER_ADMIN wildcard on a fallback route', async () => {
        store.Employee = [{ id: 'emp_super', role: 'SUPER_ADMIN', positionId: null }];
        store.EmployeePermission = [
            { employeeId: 'emp_super', permissionKey: 'payments.reconcile', effect: 'DENY' },
        ];

        const { clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_super');

        const { requireAccess } = await import('../src/shared/middleware/roles');

        const denied = await run(requireAccess('payments.reconcile', ['ADMIN']), {
            sub: 'emp_super',
            role: 'SUPER_ADMIN',
        });
        expect(denied.status).toBe(403);

        // …and an untouched key still passes through the wildcard.
        const allowed = await run(requireAccess('leads.view', []), {
            sub: 'emp_super',
            role: 'SUPER_ADMIN',
        });
        expect(allowed.next).toBe(true);
    });

    it('a legacy key denied today still blocks its canonical key', async () => {
        // `roles.manage` is aliased to `administration.roles`; a DENY stored under
        // the old vocabulary must block the new guard key.
        store.Employee = [{ id: 'emp_legacy', role: 'ADMIN', positionId: null }];
        store.EmployeePermission = [
            { employeeId: 'emp_legacy', permissionKey: 'roles.manage', effect: 'DENY' },
        ];

        const { clearEffectiveCache } = await import('../src/modules/identity/services/effectivePermissions');
        clearEffectiveCache('emp_legacy');

        const { requireAccess } = await import('../src/shared/middleware/roles');
        const call = await run(requireAccess('administration.roles', ['ADMIN']), {
            sub: 'emp_legacy',
            role: 'ADMIN',
        });
        expect(call.status).toBe(403);
    });
});
