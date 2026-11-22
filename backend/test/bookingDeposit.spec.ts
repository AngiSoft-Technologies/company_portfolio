import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * DB-free contract specs for the token-gated public deposit route:
 *   POST /v1/bookings/reference/:publicReference/deposit
 *
 * The browser may only choose a payment method. The authoritative amount,
 * currency and booking identity are read from the persisted
 * `Booking.details.phase7Deposit` row after the caller proves control of the
 * raw tracking token (or presents a signed booking access token).
 *
 * Follows the Prisma 8 `contract.json` façade mock used by
 * `test/route-coverage.spec.ts` / `test/security.spec.ts`, plus targeted
 * billing-service overrides so no provider credentials or network are needed.
 */

// ─── Hoisted spies (available inside vi.mock factories) ─────────────────────

const h = vi.hoisted(() => ({
    initializePayment: vi.fn(),
    generateReference: vi.fn((prefix = 'DEP') => `${prefix}-TEST-REF`),
    isProviderConfigured: vi.fn(() => true),
    withScopeLock: vi.fn(async (_prisma: any, _scope: string, fn: any) => fn(_prisma)),
    resolvePaymentMethod: vi.fn(),
    paypalSettlementCurrency: vi.fn(),
}));

// ─── Prisma 8 contract-shape mock (shared in-memory store) ──────────────────

const store: Record<string, any[]> = {};

const MODELS = [
    'Booking', 'BookingEvent', 'Client', 'Payment', 'AuditLog',
    'File', 'Note', 'RefreshToken', 'Setting', 'Employee',
    'EmployeePermission', 'EmployeeRoleAssignment', 'Position',
    'ProductTeamMember', 'ProjectEmployee', 'ContactEnquiry',
    'BlogPost', 'Faq', 'AppRole', 'RolePermission', 'Permission',
    'ClientProject', 'ProjectMilestone', 'ProjectComment',
    'ProjectDeliverable', 'ProjectActivity', 'Notification',
];

for (const model of MODELS) store[model] = [];

let idCounter = 0;

/** Chainable query stub reading from the shared store at call time. */
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
                        : c ?? crit,
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

const ormFacade = () => {
    const publics: Record<string, unknown> = {};
    for (const model of MODELS) publics[model] = queryable(model);
    const facade: any = { orm: { public: publics } };
    facade.transaction = async (fn: any) => fn(facade);
    return facade;
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

// ─── Billing service overrides (preserve every export the app imports) ─────

vi.mock('../src/modules/billing/services/payments', async () => {
    const actual = await vi.importActual<any>('../src/modules/billing/services/payments');
    return {
        ...actual,
        initializePayment: h.initializePayment,
        generateReference: h.generateReference,
        isProviderConfigured: h.isProviderConfigured,
        withScopeLock: h.withScopeLock,
    };
});

vi.mock('../src/modules/billing/services/payments/methods', async () => {
    const actual = await vi.importActual<any>('../src/modules/billing/services/payments/methods');
    return { ...actual, resolvePaymentMethod: h.resolvePaymentMethod };
});

vi.mock('../src/modules/billing/services/payments/paypalService', async () => {
    const actual = await vi.importActual<any>('../src/modules/billing/services/payments/paypalService');
    return { ...actual, paypalSettlementCurrency: h.paypalSettlementCurrency };
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const PUBLIC_REFERENCE = 'ANG-2026-DEPOSIT1';
const TRACKING_TOKEN = 'track-secret';

const METHOD_CATALOG: Record<string, any> = {
    MPESA_DARAJA: {
        id: 'MPESA_DARAJA',
        label: 'M-Pesa STK (Safaricom direct)',
        group: 'Mobile money',
        provider: 'MPESA',
        kind: 'stk',
        requiresPhone: true,
        available: true,
    },
    PAYPAL: {
        id: 'PAYPAL',
        label: 'PayPal',
        group: 'Wallet',
        provider: 'PAYPAL',
        kind: 'redirect',
        requiresEmail: true,
        available: true,
    },
};

function seedBooking(overrides: Record<string, any> = {}) {
    const row = {
        id: 'booking_1',
        publicReference: PUBLIC_REFERENCE,
        trackingToken: TRACKING_TOKEN,
        title: 'Deposit booking',
        status: 'SUBMITTED',
        currentStage: 'awaiting_confirmation',
        currency: 'KES',
        clientId: 'client_1',
        client: {
            id: 'client_1',
            name: 'Test Client',
            email: 'client@example.com',
            phone: '+254712345678',
        },
        details: {
            phase7Deposit: { amount: 2500, currency: 'KES', required: true },
        },
        ...overrides,
    };
    store.Booking.push(row);
    return row;
}

function postDeposit(body: Record<string, any>, token?: string, headers: Record<string, string> = {}) {
    // `request`/`app` are assigned in beforeEach after the module graph loads.
    return request(app)
        .post(`/v1/bookings/reference/${PUBLIC_REFERENCE}/deposit`)
        .query(token === undefined ? {} : { token })
        .set(headers)
        .send(body);
}

let app: any;
let request: any;

// ─── Specs ──────────────────────────────────────────────────────────────────

describe('POST /v1/bookings/reference/:publicReference/deposit', () => {
    beforeEach(async () => {
        for (const key of Object.keys(store)) store[key] = [];

        h.initializePayment.mockReset();
        h.generateReference.mockReset();
        h.isProviderConfigured.mockReset();
        h.withScopeLock.mockReset();
        h.resolvePaymentMethod.mockReset();
        h.paypalSettlementCurrency.mockReset();

        h.generateReference.mockImplementation((prefix = 'DEP') => `${prefix}-TEST-REF`);
        h.isProviderConfigured.mockImplementation(() => true);
        h.withScopeLock.mockImplementation(async (_prisma: any, _scope: string, fn: any) => fn(_prisma));
        h.resolvePaymentMethod.mockImplementation((id: string) => METHOD_CATALOG[id] ?? null);
        h.paypalSettlementCurrency.mockImplementation((currency?: string) => {
            if (String(currency ?? '').trim().toUpperCase() === 'KES') {
                throw new Error('KES is not a PayPal settlement currency');
            }
            return 'USD';
        });
        h.initializePayment.mockResolvedValue({
            provider: 'MPESA',
            providerId: 'mock-stk-checkout-id',
            kind: 'stk',
            // Deliberately no checkoutUrl: STK is a phone prompt, not a redirect.
            details: { checkoutRequestId: 'mock-stk-checkout-id' },
        });

        const mod = await import('../src/app');
        app = mod.default;
        request = (await import('supertest')).default;
    });

    it('1. returns 404 when no access token is supplied', async () => {
        seedBooking();
        const res = await postDeposit({ method: 'MPESA_DARAJA', phone: '+254712345678' });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
        expect(h.initializePayment).not.toHaveBeenCalled();
    });

    it('2. returns 404 for a wrong tracking token (no booking existence leak)', async () => {
        seedBooking();
        const res = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            'not-the-tracking-token',
        );
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Booking not found');
        expect(h.initializePayment).not.toHaveBeenCalled();
    });

    it('3. returns 409 when the booking has no persisted phase7Deposit', async () => {
        seedBooking({ details: { note: 'no deposit requested' } });
        const res = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            TRACKING_TOKEN,
        );
        expect(res.status).toBe(409);
        expect(String(res.body.error)).toMatch(/no deposit due/i);
        expect(h.initializePayment).not.toHaveBeenCalled();
    });

    it('4. strict schema rejects a browser-supplied amount field', async () => {
        seedBooking();
        const res = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678', amount: 1 },
            TRACKING_TOKEN,
        );
        expect(res.status).toBe(400);
        expect(String(res.body.error)).toMatch(/valid payment method/i);
        expect(h.initializePayment).not.toHaveBeenCalled();
        expect(store.Payment).toHaveLength(0);
    });

    it('5. charges the persisted KES deposit via MPESA_DARAJA and persists a PENDING Payment', async () => {
        seedBooking();
        const res = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            TRACKING_TOKEN,
        );

        expect(res.status).toBe(201);
        expect(h.initializePayment).toHaveBeenCalledTimes(1);
        const args = h.initializePayment.mock.calls[0][0];
        expect(args).toEqual(expect.objectContaining({
            provider: 'MPESA',
            amount: 2500,
            currency: 'KES',
            reference: 'DEP-TEST-REF',
            metadata: expect.objectContaining({
                purpose: 'booking_deposit',
                bookingId: 'booking_1',
                publicReference: PUBLIC_REFERENCE,
            }),
        }));

        expect(store.Payment).toHaveLength(1);
        expect(store.Payment[0]).toEqual(expect.objectContaining({
            bookingId: 'booking_1',
            status: 'PENDING',
            reference: 'DEP-TEST-REF',
            currency: 'KES',
        }));
        expect(res.body.reference).toBe('DEP-TEST-REF');
        expect(res.body.status).toBe('PENDING');
        expect(res.body.kind).toBe('stk');
        // STK Push is a phone prompt — never hand the browser a checkout URL.
        expect(res.body.checkoutUrl).toBeUndefined();
    });

    it('6. rejects a non-PayPal rail with a non-KES deposit', async () => {
        seedBooking({
            details: { phase7Deposit: { amount: 2500, currency: 'USD', required: true } },
            currency: 'USD',
        });
        const res = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            TRACKING_TOKEN,
        );
        expect(res.status).toBe(409);
        expect(String(res.body.error)).toMatch(/KES only/i);
        expect(String(res.body.error)).toMatch(/USD/);
        expect(h.initializePayment).not.toHaveBeenCalled();
    });

    it('7. rejects a PayPal rail with a KES deposit via the settlement guard', async () => {
        seedBooking();
        const res = await postDeposit(
            { method: 'PAYPAL', email: 'client@example.com' },
            TRACKING_TOKEN,
        );
        expect(res.status).toBe(409);
        expect(h.paypalSettlementCurrency).toHaveBeenCalledWith('KES');
        expect(String(res.body.error)).toMatch(/not a PayPal settlement currency/i);
        expect(h.initializePayment).not.toHaveBeenCalled();
    });

    it('8. resumes an existing PENDING deposit without a second provider call', async () => {
        seedBooking();
        store.Payment.push({
            id: 'pay_existing',
            bookingId: 'booking_1',
            clientId: 'client_1',
            status: 'PENDING',
            provider: 'MPESA',
            reference: 'DEP-EXISTING',
            amount: '2500.00',
            currency: 'KES',
            metadata: {
                purpose: 'booking_deposit',
                bookingId: 'booking_1',
                method: 'MPESA_DARAJA',
                reference: 'DEP-EXISTING',
            },
        });

        const res = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            TRACKING_TOKEN,
        );

        expect(res.status).toBe(200);
        expect(res.body.existing).toBe(true);
        expect(res.body.reference).toBe('DEP-EXISTING');
        expect(h.initializePayment).not.toHaveBeenCalled();
        expect(store.Payment).toHaveLength(1);
    });

    it('9. returns 409 for an already-paid deposit', async () => {
        seedBooking({ depositPaidAt: '2026-01-01T00:00:00.000Z' });
        const byTimestamp = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            TRACKING_TOKEN,
        );
        expect(byTimestamp.status).toBe(409);
        expect(String(byTimestamp.body.error)).toMatch(/already paid/i);
        expect(h.initializePayment).not.toHaveBeenCalled();

        store.Booking = [];
        seedBooking({ status: 'DEPOSIT_PAID' });
        const byStatus = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            TRACKING_TOKEN,
        );
        expect(byStatus.status).toBe(409);
        expect(String(byStatus.body.error)).toMatch(/already paid/i);
        expect(h.initializePayment).not.toHaveBeenCalled();
    });

    it('10. bypasses CSRF double-submit even with ambient cookies present', async () => {
        seedBooking();
        // An ambient session cookie with no x-csrf-token header would be a 403
        // on a non-bypassed route. The deposit endpoint is in CSRF_BYPASS_PATHS.
        const res = await postDeposit(
            { method: 'MPESA_DARAJA', phone: '+254712345678' },
            TRACKING_TOKEN,
            { Cookie: 'refreshToken=ambient-session' },
        );
        expect(res.status).not.toBe(403);
        expect(res.status).toBe(201);
        expect(h.initializePayment).toHaveBeenCalledTimes(1);
    });
});
