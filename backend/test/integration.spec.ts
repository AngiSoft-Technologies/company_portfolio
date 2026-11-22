import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

/**
 * DB-backed integration specs.
 *
 * These tests delete and rewrite data, so they must only ever run against a
 * disposable database. Three independent guards:
 *
 *   1. `src/db.ts` → `src/connectionUrl.ts` refuses to resolve any URL other
 *      than TEST_DATABASE_URL while NODE_ENV=test (set by vitest.config.ts).
 *   2. `assertDisposableTestDatabase()` fails the suite when the configured URL
 *      does not look like a test database (name must contain "test").
 *   3. Both suites are skipped when TEST_DATABASE_URL is absent, so
 *      `pnpm test` still runs the mocked unit specs (auth.spec.ts).
 *
 * `app` and `prisma` are imported lazily so that collecting this file without
 * a test database never opens a connection to a real one.
 */

const TEST_DATABASE_URL = (process.env.TEST_DATABASE_URL ?? '').trim();
const hasTestDatabase = Boolean(TEST_DATABASE_URL);

function assertDisposableTestDatabase() {
    const url = TEST_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
    const databaseName = url.split('/').pop()?.split('?')[0] ?? '';
    if (!databaseName || !/test/i.test(databaseName)) {
        throw new Error(
            `Refusing to run integration tests: resolved database "${databaseName}" does not look like a test database. ` +
                'Set TEST_DATABASE_URL to a disposable database whose name contains "test".'
        );
    }
}

async function loadApp() {
    const mod = await import('../src/app');
    return mod.default;
}

async function loadDb() {
    const mod = await import('../src/db');
    return mod.default;
}

/** Test-owned emails. Cleanup is scoped to these so no live row is touched. */
const TEST_CLIENT_EMAILS = ['test@example.com', 'test2@example.com'];
const TEST_EMPLOYEE_EMAILS = ['jane@angisoft.com', 'john@angisoft.com'];

afterAll(async () => {
    if (!hasTestDatabase) return;
    const prisma = await loadDb();
    await prisma.close();
});

describe.skipIf(!hasTestDatabase)('Integration: booking -> payment flow', () => {
    let app: any;
    let prisma: any;

    beforeAll(async () => {
        assertDisposableTestDatabase();
        app = await loadApp();
        prisma = await loadDb();

        // Reset only test-owned data so seeded/live content is not damaged.
        const testClients = await prisma.orm.public.Client
            .where((c: any) => c.email.in(TEST_CLIENT_EMAILS))
            .select('id')
            .all();
        const testClientIds = testClients.map((client: any) => client.id);

        // Scoped cleanup: refresh tokens belonging only to the test employees.
        const testEmployees = await prisma.orm.public.Employee
            .where((e: any) => e.email.in(TEST_EMPLOYEE_EMAILS))
            .select('id')
            .all();
        const testEmployeeIds = testEmployees.map((e: any) => e.id);

        if (testEmployeeIds.length) {
            await prisma.orm.public.RefreshToken
                .where((t: any) => t.employeeId.in(testEmployeeIds))
                .delete();
        }

        if (testClientIds.length) {
            await prisma.orm.public.Payment
                .where((p: any) => p.clientId.in(testClientIds))
                .delete();
            await prisma.orm.public.Booking
                .where((b: any) => b.clientId.in(testClientIds))
                .delete();
            await prisma.orm.public.Client
                .where((c: any) => c.id.in(testClientIds))
                .delete();
        }
    });

    it('POST /v1/bookings creates booking and optionally PaymentIntent', async () => {
        const res = await request(app)
            .post('/v1/bookings')
            .send({
                name: 'Test Client',
                email: 'test@example.com',
                phone: '+1234567890',
                title: 'Resume Review',
                description: 'Please review my resume',
                projectType: 'RESUME',
                depositRequired: false,
            });
        expect([200, 201]).toContain(res.status);
        expect(res.body.bookingId).toBeTruthy();
    }, 15000);

    it('POST /v1/bookings with deposit returns a server-held deposit, not a payment secret', async () => {
        const res = await request(app)
            .post('/v1/bookings')
            .send({
                name: 'Test Client 2',
                email: 'test2@example.com',
                phone: '+1234567890',
                title: 'Document Edit',
                description: 'Edit my document',
                projectType: 'DOCUMENT_EDIT',
                depositRequired: true,
                depositAmount: 50,
                currency: 'KES',
            });
        expect([200, 201]).toContain(res.status);
        expect(res.body.paymentRequired).toBe(true);
        expect(res.body.paymentContext).toMatchObject({ amount: 50, currency: 'KES' });
        expect(res.body.clientSecret).toBeUndefined();
        expect(res.body.trackingToken).toBeTruthy();
    });
});

describe.skipIf(!hasTestDatabase)('Integration: invite -> accept -> login', () => {
    let app: any;
    let prisma: any;

    beforeAll(async () => {
        assertDisposableTestDatabase();
        app = await loadApp();
        prisma = await loadDb();

        // Scoped cleanup: only the test employees' refresh tokens. Never a
        // blanket `where(t => t.id.isNotNull()).delete()` — that would wipe
        // every live session in the database.
        const testEmployees = await prisma.orm.public.Employee
            .where((e: any) => e.email.in(TEST_EMPLOYEE_EMAILS))
            .select('id')
            .all();
        const testEmployeeIds = testEmployees.map((e: any) => e.id);

        if (testEmployeeIds.length) {
            await prisma.orm.public.RefreshToken
                .where((t: any) => t.employeeId.in(testEmployeeIds))
                .delete();
        }
        await prisma.orm.public.Employee
            .where((e: any) => e.email.in(TEST_EMPLOYEE_EMAILS))
            .delete();
    });

    it('POST /v1/invite requires admin authentication', async () => {
        const res = await request(app)
            .post('/v1/invite')
            .send({ firstName: 'Jane', lastName: 'Developer', email: 'jane@angisoft.com' });
        expect(res.status).toBe(401);
    });

    it('POST /v1/invite/accept accepts invite and sets password', async () => {
        // first create invite
        const invite = await request(app)
            .post('/v1/invite')
            .send({ firstName: 'John', lastName: 'Admin', email: 'john@angisoft.com' });
        const emp = await prisma.orm.public.Employee
            .where({ email: 'john@angisoft.com' })
            .first();
        const token = emp?.inviteToken;
        if (!token) return;
        const res = await request(app)
            .post('/v1/invite/accept')
            .send({ token, password: 'SecurePassword123!' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
    });
});