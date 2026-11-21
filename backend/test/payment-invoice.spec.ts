import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Phase 4.1 — payment→invoice workflow trigger.
 *
 * `applyPaymentOutcome` settles an invoice inside the same transaction when a
 * succeeded payment carries `invoiceId` (explicit field or outcome metadata).
 * These specs prove: settlement math, idempotent re-delivery, and that
 * non-invoice payments are untouched. In-memory Prisma-8-contract facade,
 * same approach as `require-access.spec.ts`.
 */

// vi.hoisted: the mock factories below run during module resolution, before
// ordinary top-level consts — everything they touch must live here.
const h = vi.hoisted(() => {
    const store: Record<string, any[]> = {
        Payment: [],
        Invoice: [],
        InvoiceLineItem: [],
        Booking: [],
        Notification: [],
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
                const row = { id: `row_${model}_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
                store[model].push(row);
                return row;
            },
        };
    }

    function buildFacade() {
        const facade: any = {
            orm: { public: {} as Record<string, unknown> },
            transaction: async (fn: any) => fn(facade),
        };
        for (const model of Object.keys(store)) facade.orm.public[model] = queryable(model);
        return facade;
    }

    return { store, buildFacade };
});

vi.mock('../src/prisma/db', () => ({
    db: h.buildFacade(),
    default: h.buildFacade(),
    ts: (value?: any) =>
        typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
    newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
    db: h.buildFacade(),
    default: h.buildFacade(),
    validateDatabaseConnection: async () => true,
    disconnectDatabase: async () => undefined,
}));

let applyPaymentOutcome: typeof import('../src/modules/billing/services/payments').applyPaymentOutcome;

beforeAll(async () => {
    ({ applyPaymentOutcome } = await import('../src/modules/billing/services/payments'));
});

const store = h.store;
const buildFacade = h.buildFacade;

const seedInvoice = (over: Record<string, unknown> = {}) => {
    store.Invoice.push({
        id: 'inv_1',
        status: 'sent',
        total: 5000,
        amountPaid: 0,
        balanceDue: 5000,
        currency: 'KES',
        paidAt: null,
        ...over,
    });
};

const invoice = () => store.Invoice.find((i) => i.id === 'inv_1');

describe('payment→invoice trigger', () => {
    beforeEach(() => {
        for (const key of Object.keys(store)) store[key] = [];
    });

    it('settles the invoice when a succeeded payment carries invoiceId', async () => {
        seedInvoice();
        await applyPaymentOutcome(buildFacade() as any, {
            provider: 'MPESA',
            providerId: 'ws_CO_TEST_1',
            amount: 5000,
            currency: 'KES',
            status: 'SUCCEEDED',
            invoiceId: 'inv_1',
            clientId: 'cli_1',
        });

        const inv = invoice();
        expect(inv.status).toBe('paid');
        expect(Number(inv.amountPaid)).toBe(5000);
        expect(Number(inv.balanceDue)).toBe(0);
        expect(inv.paidAt).toBeTruthy();
    });

    it('reads invoiceId from outcome metadata (callback path)', async () => {
        seedInvoice({ total: 3000, balanceDue: 3000 });
        await applyPaymentOutcome(buildFacade() as any, {
            provider: 'PAYHERO',
            providerId: 'ph_CO_TEST_2',
            amount: 3000,
            status: 'SUCCEEDED',
            metadata: { invoiceId: 'inv_1', callback: {} },
            clientId: 'cli_1',
        });

        const inv = invoice();
        expect(inv.status).toBe('paid');
        expect(Number(inv.amountPaid)).toBe(3000);
    });

    it('does not double-apply on webhook re-delivery', async () => {
        seedInvoice();
        const prisma = buildFacade() as any;
        const input = {
            provider: 'MPESA' as const,
            providerId: 'ws_CO_TEST_3',
            amount: 5000,
            status: 'SUCCEEDED' as const,
            invoiceId: 'inv_1',
        };
        await applyPaymentOutcome(prisma, input);
        await applyPaymentOutcome(prisma, input);

        const inv = invoice();
        expect(Number(inv.amountPaid)).toBe(5000);
        expect(inv.status).toBe('paid');
    });

    it('settles a partially_paid invoice to paid', async () => {
        seedInvoice({
            status: 'partially_paid',
            amountPaid: 2000,
            balanceDue: 3000,
        });

        await applyPaymentOutcome(buildFacade() as any, {
            provider: 'MPESA',
            providerId: 'ws_CO_TEST_4',
            amount: 3000,
            status: 'SUCCEEDED',
            invoiceId: 'inv_1',
        });

        const inv = invoice();
        expect(Number(inv.amountPaid)).toBe(5000);
        expect(inv.status).toBe('paid');
    });

    it('leaves invoices untouched for payments without invoiceId', async () => {
        seedInvoice();
        await applyPaymentOutcome(buildFacade() as any, {
            provider: 'MPESA',
            providerId: 'ws_CO_TEST_5',
            amount: 5000,
            status: 'SUCCEEDED',
            bookingId: 'bk_1',
        });

        const inv = invoice();
        expect(inv.status).toBe('sent');
        expect(Number(inv.amountPaid)).toBe(0);
    });
});
