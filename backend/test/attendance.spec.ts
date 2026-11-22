import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Attendance endpoints (`identity/routes/attendance.ts`).
 * In-memory Prisma-8-contract-shape facade — same approach as
 * `offices.spec.ts`; no database required.
 */

const store: Record<string, any[]> = {
    AttendanceRecord: [],
    Holiday: [],
    WorkSchedule: [],
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

import { signAccessToken } from '../src/modules/identity/utils/token';
import type { Express } from 'express';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const { default: attendanceRouter } = await import('../src/modules/identity/routes/attendance');
    app = express();
    app.use(express.json());
    app.use('/v1/attendance', attendanceRouter());
    request = supertest;
});

const authed = (sub: string, role: string) => ({
    Authorization: `Bearer ${signAccessToken({ sub, role })}`,
});

const STAFF = 'emp_staff';
const ADMIN = 'emp_admin';

beforeEach(() => {
    for (const key of Object.keys(store)) store[key] = [];
    store.EmployeePermission.push(
        { employeeId: STAFF, permissionKey: 'attendance.record', effect: 'GRANT' },
        { employeeId: ADMIN, permissionKey: 'attendance.record', effect: 'GRANT' },
        { employeeId: ADMIN, permissionKey: 'attendance.view', effect: 'GRANT' },
        { employeeId: ADMIN, permissionKey: 'attendance.manage', effect: 'GRANT' },
    );
    store.Employee.push({ id: STAFF, firstName: 'Ada', lastName: 'Staff', email: 'ada@x.co' });
    store.Employee.push({ id: ADMIN, firstName: 'Bob', lastName: 'Admin', email: 'bob@x.co' });
});

describe('attendance endpoints', () => {
    it('rejects unauthenticated access', async () => {
        expect((await request(app).post('/v1/attendance/check-in')).status).toBe(401);
        expect((await request(app).get('/v1/attendance/me')).status).toBe(401);
    });

    it('check-in creates today\'s record and blocks a second check-in', async () => {
        const res = await request(app).post('/v1/attendance/check-in').set(authed(STAFF, 'STAFF'));
        expect(res.status).toBe(201);
        expect(res.body.employeeId).toBe(STAFF);
        expect(res.body.checkInAt).toBeTruthy();

        const again = await request(app).post('/v1/attendance/check-in').set(authed(STAFF, 'STAFF'));
        expect(again.status).toBe(409);
    });

    it('check-out requires an open check-in and stamps checkOutAt', async () => {
        const noIn = await request(app).post('/v1/attendance/check-out').set(authed(STAFF, 'STAFF'));
        expect(noIn.status).toBe(404);

        await request(app).post('/v1/attendance/check-in').set(authed(STAFF, 'STAFF'));
        const out = await request(app).post('/v1/attendance/check-out').set(authed(STAFF, 'STAFF'));
        expect(out.status).toBe(200);
        expect(out.body.checkOutAt).toBeTruthy();

        const twice = await request(app).post('/v1/attendance/check-out').set(authed(STAFF, 'STAFF'));
        expect(twice.status).toBe(409);
    });

    it('staff without attendance.record cannot check in', async () => {
        // A user with no explicit grants and a role whose preset lacks
        // attendance.* must be denied (role fallback can't invent access).
        const res = await request(app).post('/v1/attendance/check-in').set(authed('emp_noperm', 'DEVELOPER'));
        expect(res.status).toBe(403);
    });

    it('admin list requires attendance.view and returns employee names', async () => {
        const denied = await request(app).get('/v1/attendance/admin').set(authed(STAFF, 'STAFF'));
        expect(denied.status).toBe(403);

        await request(app).post('/v1/attendance/check-in').set(authed(STAFF, 'STAFF'));
        const res = await request(app).get('/v1/attendance/admin').set(authed(ADMIN, 'ADMIN'));
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].employee?.firstName).toBe('Ada');
    });

    it('admin can create and delete a record', async () => {
        const create = await request(app)
            .post('/v1/attendance/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: STAFF, workDate: '2026-11-01', status: 'remote', notes: 'WFH' });
        expect(create.status).toBe(201);
        expect(create.body.status).toBe('remote');

        const del = await request(app)
            .delete(`/v1/attendance/admin/${create.body.id}`)
            .set(authed(ADMIN, 'ADMIN'));
        expect(del.status).toBe(200);
        expect(store.AttendanceRecord.find((r) => r.id === create.body.id)).toBeUndefined();
    });

    it('holidays: admin CRUD with date uniqueness', async () => {
        const create = await request(app)
            .post('/v1/attendance/admin/holidays')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ date: '2026-12-25', name: 'Christmas', isHalfDay: false });
        expect(create.status).toBe(201);

        const dupe = await request(app)
            .post('/v1/attendance/admin/holidays')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ date: '2026-12-25', name: 'Xmas dup' });
        expect(dupe.status).toBe(409);

        // staff without attendance.view can't list
        const denied = await request(app)
            .get('/v1/attendance/admin/holidays')
            .set(authed('emp_noperm', 'DEVELOPER'));
        expect(denied.status).toBe(403);

        const list = await request(app).get('/v1/attendance/admin/holidays').set(authed(ADMIN, 'ADMIN'));
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);

        const upd = await request(app)
            .put(`/v1/attendance/admin/holidays/${create.body.id}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({ isHalfDay: true });
        expect(upd.status).toBe(200);
        expect(upd.body.isHalfDay).toBe(true);

        const del = await request(app)
            .delete(`/v1/attendance/admin/holidays/${create.body.id}`)
            .set(authed(ADMIN, 'ADMIN'));
        expect(del.status).toBe(200);
    });

    it('schedules: replace-all per employee, self view, validation', async () => {
        // self view requires attendance.record
        const selfDenied = await request(app).get('/v1/attendance/me/schedule').set(authed('emp_noperm', 'DEVELOPER'));
        expect(selfDenied.status).toBe(403);

        const bad = await request(app)
            .put(`/v1/attendance/admin/schedules/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({ days: [{ weekday: 9, startTime: '09:00' }] });
        expect(bad.status).toBe(400);

        const badTime = await request(app)
            .put(`/v1/attendance/admin/schedules/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({ days: [{ weekday: 1, startTime: '9am' }] });
        expect(badTime.status).toBe(400);

        const first = await request(app)
            .put(`/v1/attendance/admin/schedules/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({
                days: [
                    { weekday: 1, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
                    { weekday: 6, isWorkingDay: false },
                ],
            });
        expect(first.status).toBe(200);
        expect(first.body).toHaveLength(2);

        // replace-all removes omitted weekdays
        const second = await request(app)
            .put(`/v1/attendance/admin/schedules/${STAFF}`)
            .set(authed(ADMIN, 'ADMIN'))
            .send({ days: [{ weekday: 2, startTime: '10:00', endTime: '18:00' }] });
        expect(second.status).toBe(200);
        expect(store.WorkSchedule.filter((s) => s.employeeId === STAFF)).toHaveLength(1);

        const mine = await request(app).get('/v1/attendance/me/schedule').set(authed(STAFF, 'STAFF'));
        expect(mine.status).toBe(200);
        expect(mine.body).toHaveLength(1);
        expect(mine.body[0].weekday).toBe(2);
    });

    it('report: aggregates per-employee status counts and worked hours', async () => {
        const denied = await request(app).get('/v1/attendance/admin/report').set(authed('emp_noperm', 'DEVELOPER'));
        expect(denied.status).toBe(403);

        // STAFF: two 8h present days; ADMIN: one absent day (no times).
        for (const day of ['2026-11-02', '2026-11-03']) {
            const res = await request(app)
                .post('/v1/attendance/admin')
                .set(authed(ADMIN, 'ADMIN'))
                .send({
                    employeeId: STAFF,
                    workDate: day,
                    checkInAt: `${day}T08:00:00.000Z`,
                    checkOutAt: `${day}T16:00:00.000Z`,
                    status: 'present',
                });
            expect(res.status).toBe(201);
        }
        await request(app)
            .post('/v1/attendance/admin')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ employeeId: ADMIN, workDate: '2026-11-02', status: 'absent' });

        const res = await request(app)
            .get('/v1/attendance/admin/report?from=2026-11-01&to=2026-11-30')
            .set(authed(ADMIN, 'ADMIN'));
        expect(res.status).toBe(200);
        const staff = res.body.employees.find((e: any) => e.employeeId === STAFF);
        const admin = res.body.employees.find((e: any) => e.employeeId === ADMIN);
        expect(staff.records).toBe(2);
        expect(staff.hoursWorked).toBe(16);
        expect(staff.byStatus.present).toBe(2);
        expect(staff.employee.firstName).toBe('Ada');
        expect(admin.records).toBe(1);
        expect(admin.hoursWorked).toBe(0);
        expect(admin.byStatus.absent).toBe(1);
    });

    it('import: creates by email/id, updates existing, collects row errors', async () => {
        const denied = await request(app)
            .post('/v1/attendance/admin/import')
            .set(authed('emp_noperm', 'DEVELOPER'))
            .send({ rows: [{ workDate: '2026-11-10' }] });
        expect(denied.status).toBe(403);

        const res = await request(app)
            .post('/v1/attendance/admin/import')
            .set(authed(ADMIN, 'ADMIN'))
            .send({
                rows: [
                    { employeeEmail: 'ada@x.co', workDate: '2026-11-10', checkInAt: '2026-11-10T08:00:00.000Z', checkOutAt: '2026-11-10T17:00:00.000Z', status: 'present' },
                    { employeeId: STAFF, workDate: '2026-11-11', status: 'remote' },
                    { employeeEmail: 'ghost@x.co', workDate: '2026-11-10' },
                    { workDate: 'not-a-date' },
                ],
            });
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(2);
        expect(res.body.updated).toBe(0);
        expect(res.body.errors).toHaveLength(2);

        const records = store.AttendanceRecord.filter((r) => r.employeeId === STAFF);
        expect(records).toHaveLength(2);
        expect(records.every((r) => r.source === 'import')).toBe(true);

        // re-import same rows → updates, not duplicates
        const res2 = await request(app)
            .post('/v1/attendance/admin/import')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ rows: [{ employeeEmail: 'ada@x.co', workDate: '2026-11-10', status: 'leave' }] });
        expect(res2.body.updated).toBe(1);
        expect(store.AttendanceRecord.filter((r) => r.workDate === '2026-11-10T00:00:00.000Z')).toHaveLength(1);
        expect(store.AttendanceRecord.find((r) => r.workDate === '2026-11-10T00:00:00.000Z').status).toBe('leave');
    });

    it('derive: holiday marks + scheduled absences, skips rest days/existing', async () => {
        const date = '2026-11-10';
        const wd = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        store.Employee.push({ id: 'emp_carol', firstName: 'Carol', lastName: 'Third', email: 'carol@x.co' });
        // STAFF: working day but already has a record → skip
        // ADMIN: rest day → skip
        // carol: working day, no record → absent
        store.WorkSchedule.push(
            { id: 'ws_s', employeeId: STAFF, weekday: wd, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
            { id: 'ws_a', employeeId: ADMIN, weekday: wd, startTime: null, endTime: null, isWorkingDay: false },
            { id: 'ws_c', employeeId: 'emp_carol', weekday: wd, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
        );
        store.AttendanceRecord.push({
            id: 'ar_existing', employeeId: STAFF, workDate: `${date}T00:00:00.000Z`,
            status: 'present', source: 'manual', checkInAt: `${date}T08:00:00.000Z`, updatedAt: new Date(),
        });

        const res = await request(app)
            .post('/v1/attendance/admin/derive')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ workDate: date });
        expect(res.status).toBe(200);
        expect(res.body.absentCreated).toBe(1);
        expect(res.body.holidayMarked).toBe(0);
        expect(res.body.skipped).toBe(2);

        const carol = store.AttendanceRecord.find((r) => r.employeeId === 'emp_carol');
        expect(carol.status).toBe('absent');
        expect(carol.source).toBe('schedule');
        // STAFF's manual record untouched
        expect(store.AttendanceRecord.find((r) => r.id === 'ar_existing').status).toBe('present');

        // holiday on the next day → every employee without a record gets 'holiday'
        store.Holiday.push({ id: 'hol_1', date: '2026-11-11T00:00:00.000Z', name: 'Founders Day', isHalfDay: false });
        const res2 = await request(app)
            .post('/v1/attendance/admin/derive')
            .set(authed(ADMIN, 'ADMIN'))
            .send({ workDate: '2026-11-11' });
        expect(res2.status).toBe(200);
        expect(res2.body.holiday).toBe(true);
        expect(res2.body.holidayMarked).toBe(3);
        const holidayRows = store.AttendanceRecord.filter((r) => r.workDate === '2026-11-11T00:00:00.000Z');
        expect(holidayRows).toHaveLength(3);
        expect(holidayRows.every((r) => r.status === 'holiday' && r.source === 'schedule')).toBe(true);
    });
});
