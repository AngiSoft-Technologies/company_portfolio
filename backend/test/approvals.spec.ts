import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Multi-step approval chains (`shared/routes/approvals.ts`).
 * In-memory Prisma-8-contract-shape facade — same approach as
 * `attendance.spec.ts`; no database required.
 */

const store: Record<string, any[]> = {
    ApprovalRequest: [],
    Employee: [],
    AuditLog: [],
    Notification: [],
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

const matches = (row: any, crit: any) => {
    if (typeof crit === 'function') return true; // predicate form: facade can't evaluate ORM expressions
    return Object.entries(crit ?? {}).every(([k, v]) => row[k] === v);
};

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
            const row = { id: `ar_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
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

// createNotification emits realtime events — stub it out.
vi.mock('../src/modules/notifications/services/notifications', () => ({
    createNotification: async () => ({}),
}));

import { signAccessToken } from '../src/modules/identity/utils/token';
import type { Express } from 'express';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const { default: approvalsRouter } = await import('../src/shared/routes/approvals');
    app = express();
    app.use(express.json());
    app.use('/v1/approvals', approvalsRouter());
    request = supertest;
});

const authed = (sub: string, role: string) => ({
    Authorization: `Bearer ${signAccessToken({ sub, role })}`,
});

const REQUESTER = 'emp_req';
const APPROVER1 = 'emp_app1';
const APPROVER2 = 'emp_app2';
const OUTSIDER = 'emp_out';

const grant = (employeeId: string, permissionKey: string) =>
    store.EmployeePermission.push({ employeeId, permissionKey, effect: 'GRANT' });

beforeEach(() => {
    for (const key of Object.keys(store)) store[key] = [];
    // Requester can create requests; approvers can respond and hold the
    // domain permissions named by the chain steps.
    grant(REQUESTER, 'approvals.manage');
    grant(REQUESTER, 'approvals.view');
    grant(APPROVER1, 'approvals.respond');
    grant(APPROVER1, 'approvals.view');
    grant(APPROVER1, 'quotes.approve');
    grant(APPROVER2, 'approvals.respond');
    grant(APPROVER2, 'approvals.view');
    grant(APPROVER2, 'invoices.issue');
    grant(OUTSIDER, 'approvals.view');
    store.Employee.push({ id: REQUESTER, firstName: 'Req', lastName: 'Uester', email: 'req@x.co' });
    store.Employee.push({ id: APPROVER1, firstName: 'Amy', lastName: 'One', email: 'a1@x.co' });
    store.Employee.push({ id: APPROVER2, firstName: 'Bob', lastName: 'Two', email: 'b2@x.co' });
});

const createChain = () =>
    request(app)
        .post('/v1/approvals')
        .set(authed(REQUESTER, 'STAFF'))
        .send({
            entityType: 'quote',
            entityId: 'quote_1',
            title: 'Big quote needs sign-off',
            amount: 5000000,
            currency: 'KES',
            steps: [
                { permission: 'quotes.approve', label: 'Sales lead' },
                { permission: 'invoices.issue', label: 'Finance' },
            ],
        });

describe('approval chains', () => {
    it('rejects unauthenticated access', async () => {
        expect((await request(app).get('/v1/approvals')).status).toBe(401);
        expect((await request(app).post('/v1/approvals')).status).toBe(401);
    });

    it('requires approvals.manage to create and validates step permissions', async () => {
        const denied = await request(app)
            .post('/v1/approvals')
            .set(authed(OUTSIDER, 'STAFF'))
            .send({ entityType: 'custom', entityId: 'x', title: 't', steps: [{ permission: 'quotes.approve' }] });
        expect(denied.status).toBe(403);

        const bad = await request(app)
            .post('/v1/approvals')
            .set(authed(REQUESTER, 'STAFF'))
            .send({ entityType: 'custom', entityId: 'x', title: 't', steps: [{ permission: 'not.a.real.key' }] });
        expect(bad.status).toBe(400);

        const noSteps = await request(app)
            .post('/v1/approvals')
            .set(authed(REQUESTER, 'STAFF'))
            .send({ entityType: 'custom', entityId: 'x', title: 't', steps: [] });
        expect(noSteps.status).toBe(400);
    });

    it('enforces sequential steps and per-step permissions', async () => {
        const created = await createChain();
        expect(created.status).toBe(201);
        const id = created.body.id;

        // Step 2 approver cannot jump ahead while step 1 is pending.
        const jump = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(APPROVER2, 'STAFF'))
            .send({ decision: 'approved' });
        expect(jump.status).toBe(403);

        // Requester cannot decide their own request.
        const self = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(REQUESTER, 'STAFF'))
            .send({ decision: 'approved' });
        expect(self.status).toBe(403);

        // Outsider lacks approvals.respond.
        const outsider = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(OUTSIDER, 'STAFF'))
            .send({ decision: 'approved' });
        expect(outsider.status).toBe(403);

        // Step 1 approver approves → still pending (step 2 remains).
        const s1 = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(APPROVER1, 'STAFF'))
            .send({ decision: 'approved', note: 'LGTM' });
        expect(s1.status).toBe(200);
        expect(s1.body.status).toBe('pending');
        expect(s1.body.steps[0].status).toBe('approved');
        expect(s1.body.steps[1].status).toBe('pending');

        // Step 1 approver cannot decide step 2 (lacks invoices.issue).
        const wrongPerm = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(APPROVER1, 'STAFF'))
            .send({ decision: 'approved' });
        expect(wrongPerm.status).toBe(403);

        // Step 2 approver completes the chain.
        const s2 = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(APPROVER2, 'STAFF'))
            .send({ decision: 'approved' });
        expect(s2.status).toBe(200);
        expect(s2.body.status).toBe('approved');
        expect(s2.body.decidedAt).toBeTruthy();

        // Terminal state rejects further decisions.
        const late = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(APPROVER1, 'STAFF'))
            .send({ decision: 'approved' });
        expect(late.status).toBe(409);
    });

    it('rejection fails the whole request', async () => {
        const created = await createChain();
        const id = created.body.id;
        const rej = await request(app)
            .post(`/v1/approvals/${id}/decide`)
            .set(authed(APPROVER1, 'STAFF'))
            .send({ decision: 'rejected', note: 'Price too high' });
        expect(rej.status).toBe(200);
        expect(rej.body.status).toBe('rejected');
        expect(rej.body.decidedAt).toBeTruthy();
    });

    it('mine=1 lists only requests where the caller holds the next step', async () => {
        await createChain();
        const forA1 = await request(app).get('/v1/approvals?mine=1').set(authed(APPROVER1, 'STAFF'));
        expect(forA1.status).toBe(200);
        expect(forA1.body).toHaveLength(1);

        // After step 1 is decided, it moves to APPROVER2's queue.
        const id = forA1.body[0].id;
        await request(app).post(`/v1/approvals/${id}/decide`).set(authed(APPROVER1, 'STAFF')).send({ decision: 'approved' });
        const forA1After = await request(app).get('/v1/approvals?mine=1').set(authed(APPROVER1, 'STAFF'));
        expect(forA1After.body).toHaveLength(0);
        const forA2 = await request(app).get('/v1/approvals?mine=1').set(authed(APPROVER2, 'STAFF'));
        expect(forA2.body).toHaveLength(1);
    });

    it('requester or approvals manager can cancel a pending request', async () => {
        const created = await createChain();
        const id = created.body.id;

        const outsiderCancel = await request(app)
            .post(`/v1/approvals/${id}/cancel`)
            .set(authed(OUTSIDER, 'STAFF'));
        expect(outsiderCancel.status).toBe(403);

        const requesterCancel = await request(app)
            .post(`/v1/approvals/${id}/cancel`)
            .set(authed(REQUESTER, 'STAFF'));
        expect(requesterCancel.status).toBe(200);
        expect(requesterCancel.body.status).toBe('cancelled');
    });
});
