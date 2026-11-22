import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Payroll/payslip endpoints (`identity/routes/payroll.ts`).
 * In-memory Prisma-8-contract-shape facade — same approach as
 * `attendance.spec.ts`; no database required.
 */

const store: Record<string, any[]> = {
    Payslip: [],
    PayrollRun: [],
    SalaryStructure: [],
    Payout: [],
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
            const row = { id: `ps_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
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

// sendMail would hit real SMTP — stub it and expose the mock for assertions.
const sendMailMock = vi.fn(async () => ({ queued: true }));
vi.mock('../src/shared/services/email', () => ({
    sendMail: (...args: unknown[]) => sendMailMock(...args),
    sendMailDirect: async () => ({ queued: true }),
}));

// PayHero payouts hit a real provider — stub config + withdraw.
const payheroConfigured = vi.fn(() => true);
const payheroWithdraw = vi.fn(async () => ({
    providerReference: 'PH_REF_1',
    checkoutRequestId: 'WS_CO_1',
    status: 'success',
    success: true,
    meta: {},
}));
vi.mock('../src/modules/billing/services/payments/payheroService', () => ({
    isConfigured: () => payheroConfigured(),
    withdraw: (...args: unknown[]) => payheroWithdraw(...args),
}));

import { signAccessToken } from '../src/modules/identity/utils/token';
import type { Express } from 'express';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const { default: payrollRouter } = await import('../src/modules/identity/routes/payroll');
    app = express();
    app.use(express.json());
    app.use('/v1/payroll', payrollRouter());
    request = supertest;
});

const authed = (sub: string, role: string) => ({
    Authorization: `Bearer ${signAccessToken({ sub, role })}`,
});

const STAFF = 'emp_staff';
const APPROVER = 'emp_approver';
const ADMIN = 'emp_admin';

beforeEach(() => {
    for (const key of Object.keys(store)) store[key] = [];
    store.EmployeePermission.push(
        { employeeId: APPROVER, permissionKey: 'payroll.view', effect: 'GRANT' },
        { employeeId: APPROVER, permissionKey: 'payroll.manage', effect: 'GRANT' },
        { employeeId: APPROVER, permissionKey: 'payroll.approve', effect: 'GRANT' },
        { employeeId: APPROVER, permissionKey: 'payroll.mark_paid', effect: 'GRANT' },
        { employeeId: ADMIN, permissionKey: 'payroll.view', effect: 'GRANT' },
        { employeeId: ADMIN, permissionKey: 'payroll.manage', effect: 'GRANT' },
        { employeeId: ADMIN, permissionKey: 'payroll.approve', effect: 'GRANT' },
        { employeeId: ADMIN, permissionKey: 'payroll.mark_paid', effect: 'GRANT' },
    );
    store.Employee.push({ id: STAFF, firstName: 'Ada', lastName: 'Staff', email: 'ada@x.co', phone: '+254700000001' });
    store.Payslip.push({
        id: 'ps_seed', employeeId: STAFF, period: '2026-10', grossAmount: 100000,
        deductions: [{ label: 'PAYE', amount: 30000 }], netAmount: 70000, currency: 'KES',
        status: 'paid', paidAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });
});

describe('payroll endpoints', () => {
    it('rejects unauthenticated access', async () => {
        expect((await request(app).get('/v1/payroll/me')).status).toBe(401);
        expect((await request(app).get('/v1/payroll/admin')).status).toBe(401);
    });

    it('/me returns only the caller\'s payslips', async () => {
        const res = await request(app).get('/v1/payroll/me').set(authed(STAFF, 'STAFF'));
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].employeeId).toBe(STAFF);
    });

    it('admin list requires payroll.view', async () => {
        const denied = await request(app).get('/v1/payroll/admin').set(authed(STAFF, 'STAFF'));
        expect(denied.status).toBe(403);

        const res = await request(app).get('/v1/payroll/admin').set(authed(ADMIN, 'ADMIN'));
        expect(res.status).toBe(200);
        expect(res.body[0].employee?.firstName).toBe('Ada');
    });

    it('creates a payslip with auto net = gross − deductions', async () => {
        const res = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({
                employeeId: STAFF, period: '2026-11', grossAmount: 120000,
                deductions: [{ label: 'PAYE', amount: 36000 }, { label: 'NHIF', amount: 1700 }],
            });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('draft');
        expect(Number(res.body.netAmount)).toBe(82300);
    });

    it('rejects bad period format', async () => {
        const res = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: 'Nov-2026', grossAmount: 1 });
        expect(res.status).toBe(400);
    });

    it('approve moves draft → approved, blocks self-approval and non-draft', async () => {
        const create = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2026-12', grossAmount: 50000 });
        const id = create.body.id;

        // employee cannot approve own payslip even with permission
        store.EmployeePermission.push({ employeeId: STAFF, permissionKey: 'payroll.approve', effect: 'GRANT' });
        const selfApprove = await request(app).post(`/v1/payroll/admin/${id}/approve`).set(authed(STAFF, 'STAFF'));
        expect(selfApprove.status).toBe(403);

        const approved = await request(app).post(`/v1/payroll/admin/${id}/approve`).set(authed(APPROVER, 'HR'));
        expect(approved.status).toBe(200);
        expect(approved.body.status).toBe('approved');
        expect(approved.body.approvedById).toBe(APPROVER);

        const again = await request(app).post(`/v1/payroll/admin/${id}/approve`).set(authed(APPROVER, 'HR'));
        expect(again.status).toBe(409);
    });

    it('mark-paid requires approved status', async () => {
        const draft = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2027-01', grossAmount: 50000 });
        const early = await request(app).post(`/v1/payroll/admin/${draft.body.id}/mark-paid`).set(authed(ADMIN, 'ADMIN'));
        expect(early.status).toBe(409);

        await request(app).post(`/v1/payroll/admin/${draft.body.id}/approve`).set(authed(ADMIN, 'ADMIN'));
        const paid = await request(app).post(`/v1/payroll/admin/${draft.body.id}/mark-paid`).set(authed(ADMIN, 'ADMIN'));
        expect(paid.status).toBe(200);
        expect(paid.body.status).toBe('paid');
        expect(paid.body.paidAt).toBeTruthy();
    });

    it('edits and deletes only draft payslips', async () => {
        const create = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2027-02', grossAmount: 40000 });
        const id = create.body.id;

        const upd = await request(app)
            .put(`/v1/payroll/admin/${id}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({ grossAmount: 45000, deductions: [{ label: 'PAYE', amount: 10000 }] });
        expect(upd.status).toBe(200);
        expect(Number(upd.body.netAmount)).toBe(35000);

        await request(app).post(`/v1/payroll/admin/${id}/approve`).set(authed(ADMIN, 'ADMIN'));
        const editApproved = await request(app)
            .put(`/v1/payroll/admin/${id}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({ grossAmount: 99999 });
        expect(editApproved.status).toBe(409);

        const delApproved = await request(app).delete(`/v1/payroll/admin/${id}`).set(authed(ADMIN, 'ADMIN'));
        expect(delApproved.status).toBe(409);
    });

    it('payroll runs: create → link payslip → complete snapshots totals', async () => {
        // duplicate period rejected
        const run = await request(app)
            .post('/v1/payroll/runs')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2027-03', name: 'March payroll' });
        expect(run.status).toBe(201);
        const runId = run.body.id;

        const dup = await request(app)
            .post('/v1/payroll/runs')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2027-03' });
        expect(dup.status).toBe(409);

        // payslip for a different period can't join the run
        const wrongPeriod = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2027-04', grossAmount: 1000, payrollRunId: runId });
        expect(wrongPeriod.status).toBe(400);

        // link a payslip to the run
        const slip = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({
                employeeId: STAFF, period: '2027-03', grossAmount: 90000,
                deductions: [{ label: 'PAYE', amount: 27000 }], payrollRunId: runId,
            });
        expect(slip.status).toBe(201);
        expect(slip.body.payrollRunId).toBe(runId);

        // detail returns linked payslips with employee names
        const detail = await request(app).get(`/v1/payroll/runs/${runId}`).set(authed(ADMIN, 'ADMIN'));
        expect(detail.status).toBe(200);
        expect(detail.body.payslips).toHaveLength(1);
        expect(detail.body.payslips[0].employee.firstName).toBe('Ada');

        // complete snapshots totals (requires payroll.approve)
        const completed = await request(app)
            .post(`/v1/payroll/runs/${runId}/complete`)
            .set(authed(APPROVER, 'HR'));
        expect(completed.status).toBe(200);
        expect(completed.body.status).toBe('completed');
        expect(Number(completed.body.grossTotal)).toBe(90000);
        expect(Number(completed.body.deductionTotal)).toBe(27000);
        expect(Number(completed.body.netTotal)).toBe(63000);
        expect(completed.body.payslipCount).toBe(1);

        // terminal: can't complete again or cancel
        expect((await request(app).post(`/v1/payroll/runs/${runId}/complete`).set(authed(APPROVER, 'HR'))).status).toBe(409);
        expect((await request(app).post(`/v1/payroll/runs/${runId}/cancel`).set(authed(ADMIN, 'ADMIN'))).status).toBe(409);

        // payslips can't be added to a completed run
        const late = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2027-03', grossAmount: 1, payrollRunId: runId });
        // 409 unique (employeeId,period) may hit first depending on order — accept either guard
        expect([400, 409]).toContain(late.status);
    });

    it('payroll runs: cancel a draft run', async () => {
        const run = await request(app)
            .post('/v1/payroll/runs')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2027-05' });
        const cancelled = await request(app)
            .post(`/v1/payroll/runs/${run.body.id}/cancel`)
            .set(authed(ADMIN, 'ADMIN'));
        expect(cancelled.status).toBe(200);
        expect(cancelled.body.status).toBe('cancelled');
    });

    it('salary structures: upsert, list, generate payslips, skip existing', async () => {
        // upsert structure for STAFF
        const put = await request(app)
            .put(`/v1/payroll/admin/structures/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({
                basicSalary: 80000,
                currency: 'kes',
                allowances: [{ label: 'Housing', amount: 10000 }],
                deductions: [
                    { label: 'PAYE', amount: 24000, statutory: true },
                    { label: 'NSSF', amount: 3600, statutory: true },
                ],
            });
        expect(put.status).toBe(200);
        expect(Number(put.body.basicSalary)).toBe(80000);

        // upsert replaces the structure (still one row per employee)
        const put2 = await request(app)
            .put(`/v1/payroll/admin/structures/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({
                basicSalary: 90000,
                allowances: [{ label: 'Housing', amount: 10000 }],
                deductions: [
                    { label: 'PAYE', amount: 24000, statutory: true },
                    { label: 'NSSF', amount: 3600, statutory: true },
                ],
            });
        expect(put2.status).toBe(200);
        expect(store.SalaryStructure).toHaveLength(1);
        expect(Number(store.SalaryStructure[0].basicSalary)).toBe(90000);

        // unknown employee rejected
        const missing = await request(app)
            .put('/v1/payroll/admin/structures/emp_ghost')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ basicSalary: 1 });
        expect(missing.status).toBe(404);

        // list includes employee names
        const list = await request(app).get('/v1/payroll/admin/structures').set(authed(ADMIN, 'ADMIN'));
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0].employee.firstName).toBe('Ada');

        // generate payslips for the period — gross = basic + allowances,
        // net = gross - deductions; STAFF already has 2026-10 seeded so use 2026-11
        const gen = await request(app)
            .post('/v1/payroll/admin/generate')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2026-11' });
        expect(gen.status).toBe(200);
        expect(gen.body.created).toBe(1);
        expect(gen.body.skipped).toBe(0);

        // second generate skips the existing payslip
        const gen2 = await request(app)
            .post('/v1/payroll/admin/generate')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2026-11' });
        expect(gen2.body.created).toBe(0);
        expect(gen2.body.skipped).toBe(1);

        const slip = store.Payslip.find((p) => p.employeeId === STAFF && p.period === '2026-11');
        expect(Number(slip.grossAmount)).toBe(100000); // 90000 + 10000 housing
        expect(Number(slip.netAmount)).toBe(72400);    // 100000 - 24000 - 3600
        expect(slip.status).toBe('draft');
        expect(slip.deductions).toHaveLength(2);
        expect(slip.deductions[0].statutory).toBe(true);
    });

    it('generate respects payroll run period and draft status', async () => {
        await request(app)
            .put(`/v1/payroll/admin/structures/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({ basicSalary: 50000 });

        const run = await request(app)
            .post('/v1/payroll/runs')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2027-06' });
        expect(run.status).toBe(201);

        // wrong period rejected
        const wrong = await request(app)
            .post('/v1/payroll/admin/generate')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2027-07', payrollRunId: run.body.id });
        expect(wrong.status).toBe(400);

        // matching period links generated payslips to the run
        const gen = await request(app)
            .post('/v1/payroll/admin/generate')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2027-06', payrollRunId: run.body.id });
        expect(gen.status).toBe(200);
        expect(gen.body.created).toBe(1);
        const slip = store.Payslip.find((p) => p.period === '2027-06');
        expect(slip.payrollRunId).toBe(run.body.id);
    });

    it('statutory: preview endpoint and generate with applyStatutory', async () => {
        // preview for gross 100000 (default KE-ish rates)
        const preview = await request(app)
            .get('/v1/payroll/admin/statutory-preview?gross=100000')
            .set(authed(ADMIN, 'ADMIN'));
        expect(preview.status).toBe(200);
        const labels = preview.body.deductions.map((d: any) => d.label);
        expect(labels).toEqual(['SHIF', 'NSSF', 'Housing Levy', 'PAYE']);
        expect(preview.body.deductions.every((d: any) => d.statutory === true)).toBe(true);
        expect(preview.body.total).toBeCloseTo(32633.35, 2);

        const bad = await request(app)
            .get('/v1/payroll/admin/statutory-preview?gross=abc')
            .set(authed(ADMIN, 'ADMIN'));
        expect(bad.status).toBe(400);

        // structure with a non-statutory loan + a stale statutory line
        await request(app)
            .put(`/v1/payroll/admin/structures/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({
                basicSalary: 100000,
                deductions: [
                    { label: 'Loan recovery', amount: 5000 },
                    { label: 'Old PAYE', amount: 1, statutory: true },
                ],
            });

        const gen = await request(app)
            .post('/v1/payroll/admin/generate')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ period: '2028-01', applyStatutory: true });
        expect(gen.status).toBe(200);
        expect(gen.body.created).toBe(1);

        const slip = store.Payslip.find((p) => p.employeeId === STAFF && p.period === '2028-01');
        // Loan kept; stale statutory line replaced by the computed 4-line set
        expect(slip.deductions).toHaveLength(5);
        expect(slip.deductions.map((d: any) => d.label)).toEqual(
            expect.arrayContaining(['Loan recovery', 'SHIF', 'NSSF', 'Housing Levy', 'PAYE']),
        );
        expect(slip.deductions.find((d: any) => d.label === 'Old PAYE')).toBeUndefined();
        expect(Number(slip.netAmount)).toBeCloseTo(62366.65, 2);
    });

    it('send: emails approved/paid payslips, blocks drafts', async () => {
        sendMailMock.mockClear();

        // draft payslip → 409
        const draftRes = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2028-02', grossAmount: 1000 });
        expect(draftRes.status).toBe(201);
        const draft = draftRes.body;
        const blocked = await request(app)
            .post(`/v1/payroll/admin/${draft.id}/send`)
            .set(authed(ADMIN, 'ADMIN'));
        expect(blocked.status).toBe(409);
        expect(sendMailMock).not.toHaveBeenCalled();

        // seeded paid payslip for STAFF → sends to employee email
        const paid = store.Payslip.find((p) => p.status === 'paid');
        const sent = await request(app)
            .post(`/v1/payroll/admin/${paid.id}/send`)
            .set(authed(ADMIN, 'ADMIN'));
        expect(sent.status).toBe(200);
        expect(sent.body.sentTo).toBe('ada@x.co');
        expect(sendMailMock).toHaveBeenCalledTimes(1);
        const mail = sendMailMock.mock.calls[0][0] as any;
        expect(mail.to).toBe('ada@x.co');
        expect(mail.subject).toContain('2026-10');
        expect(mail.html).toContain('PAYE');
    });

    it('pay-out: requires payroll.mark_paid, approved status, configured provider', async () => {
        payheroConfigured.mockReturnValue(true);
        payheroWithdraw.mockClear();

        // Seeded payslip is already paid → 409
        const paid = store.Payslip.find((p) => p.status === 'paid')!;
        const onPaid = await request(app)
            .post(`/v1/payroll/admin/${paid.id}/pay-out`)
            .set(authed(ADMIN, 'ADMIN'));
        expect(onPaid.status).toBe(409);

        // Create + approve a draft payslip
        const created = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2028-03', grossAmount: 50000 });
        const draftId = created.body.id;
        await request(app)
            .post(`/v1/payroll/admin/${draftId}/approve`)
            .set(authed(APPROVER, 'ADMIN'));

        // Pay out → creates Payout, marks payslip paid, notifies
        const res = await request(app)
            .post(`/v1/payroll/admin/${draftId}/pay-out`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.reused).toBe(false);
        expect(payheroWithdraw).toHaveBeenCalledTimes(1);
        const withdrawArgs = payheroWithdraw.mock.calls[0][0] as any;
        expect(withdrawArgs.channel).toBe('mobile');
        expect(withdrawArgs.phone).toBe('+254700000001');
        expect(withdrawArgs.reference).toBe(`SAL-${draftId}`);
        const slip = store.Payslip.find((p) => p.id === draftId)!;
        expect(slip.status).toBe('paid');
        expect(slip.paidAt).toBeTruthy();
        expect(store.Payout).toHaveLength(1);
        expect(store.Payout[0].reference).toBe(`SAL-${draftId}`);
        expect(store.Payout[0].status).toBe('PROCESSING');

        // Idempotent retry → reused, no second withdraw
        const again = await request(app)
            .post(`/v1/payroll/admin/${draftId}/pay-out`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({});
        // payslip now paid → 409 before payout lookup; create a fresh approved slip to test reuse
        expect(again.status).toBe(409);

        const created2 = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2028-04', grossAmount: 60000 });
        const id2 = created2.body.id;
        await request(app)
            .post(`/v1/payroll/admin/${id2}/approve`)
            .set(authed(APPROVER, 'ADMIN'));
        const first = await request(app)
            .post(`/v1/payroll/admin/${id2}/pay-out`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({});
        expect(first.status).toBe(200);
        const calls = payheroWithdraw.mock.calls.length;
        // Force a duplicate-payout path: delete the paid status by creating a second
        // payslip is not possible (unique employee+period). Instead simulate the
        // reuse branch by pre-seeding a Payout for a new slip's reference.
        const created3 = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2028-05', grossAmount: 70000 });
        const id3 = created3.body.id;
        await request(app)
            .post(`/v1/payroll/admin/${id3}/approve`)
            .set(authed(APPROVER, 'ADMIN'));
        store.Payout.push({
            id: 'po_prior', reference: `SAL-${id3}`, provider: 'PAYHERO',
            channel: 'mobile', amount: 70000, status: 'PROCESSING',
            createdAt: new Date(), updatedAt: new Date(),
        });
        const reused = await request(app)
            .post(`/v1/payroll/admin/${id3}/pay-out`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({});
        expect(reused.status).toBe(200);
        expect(reused.body.reused).toBe(true);
        expect(payheroWithdraw.mock.calls.length).toBe(calls);

        // Provider failure → 502, payout FAILED, payslip stays approved
        payheroWithdraw.mockRejectedValueOnce(new Error('provider down'));
        const created4 = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2028-06', grossAmount: 80000 });
        const id4 = created4.body.id;
        await request(app)
            .post(`/v1/payroll/admin/${id4}/approve`)
            .set(authed(APPROVER, 'ADMIN'));
        const failed = await request(app)
            .post(`/v1/payroll/admin/${id4}/pay-out`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({});
        expect(failed.status).toBe(502);
        const failedPayout = store.Payout.find((p) => p.reference === `SAL-${id4}`)!;
        expect(failedPayout.status).toBe('FAILED');
        expect(store.Payslip.find((p) => p.id === id4)!.status).toBe('approved');

        // Unconfigured provider → 503
        payheroConfigured.mockReturnValue(false);
        const created5 = await request(app)
            .post('/v1/payroll/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, period: '2028-07', grossAmount: 90000 });
        const id5 = created5.body.id;
        await request(app)
            .post(`/v1/payroll/admin/${id5}/approve`)
            .set(authed(APPROVER, 'ADMIN'));
        const unconfigured = await request(app)
            .post(`/v1/payroll/admin/${id5}/pay-out`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({});
        expect(unconfigured.status).toBe(503);
        payheroConfigured.mockReturnValue(true);
    });
});
