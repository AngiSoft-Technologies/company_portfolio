import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * Phase 5.1 — business lifecycle smoke test (service level, in-memory DB).
 *
 * Chains the real domain services the way production does:
 *   booking accepted → ClientProject + milestones (booking→project trigger)
 *   → invoice created + issued (draft→sent)
 *   → payment outcome SUCCEEDED → invoice settled + booking DEPOSIT_PAID
 *     (payment→invoice trigger, Phase 4.1)
 */

const h = vi.hoisted(() => {
    const store: Record<string, any[]> = {
        Booking: [],
        Client: [],
        ClientProject: [],
        ProjectMilestone: [],
        ProjectActivity: [],
        Invoice: [],
        InvoiceLineItem: [],
        Payment: [],
        Notification: [],
        SupportTicket: [],
        TicketMessage: [],
        ClientAccessToken: [],
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

let services: {
    createClientProjectFromBooking: typeof import('../src/modules/projects/services/clientProjects').createClientProjectFromBooking;
    createInvoice: typeof import('../src/modules/crm/services/invoices').createInvoice;
    updateInvoice: typeof import('../src/modules/crm/services/invoices').updateInvoice;
    applyPaymentOutcome: typeof import('../src/modules/billing/services/payments').applyPaymentOutcome;
    computeClientHealth: typeof import('../src/modules/crm/routes/renewals').computeClientHealth;
    sweepRenewalReminders: typeof import('../src/workers/renewalMonitor').sweepRenewalReminders;
};

beforeAll(async () => {
    const [clientProjects, invoices, payments, renewals, renewalMonitor] = await Promise.all([
        import('../src/modules/projects/services/clientProjects'),
        import('../src/modules/crm/services/invoices'),
        import('../src/modules/billing/services/payments'),
        import('../src/modules/crm/routes/renewals'),
        import('../src/workers/renewalMonitor'),
    ]);
    services = {
        createClientProjectFromBooking: clientProjects.createClientProjectFromBooking,
        createInvoice: invoices.createInvoice,
        updateInvoice: invoices.updateInvoice,
        applyPaymentOutcome: payments.applyPaymentOutcome,
        computeClientHealth: renewals.computeClientHealth,
        sweepRenewalReminders: renewalMonitor.sweepRenewalReminders,
    };
});

const store = h.store;
const prisma = () => h.buildFacade() as any;

beforeEach(() => {
    for (const key of Object.keys(store)) store[key] = [];
    store.Booking.push({
        id: 'bk_1',
        title: 'Website rebuild',
        description: 'Marketing site rebuild',
        clientId: 'cli_1',
        assignedToId: 'emp_owner',
        status: 'ACCEPTED',
        publicReference: 'BK-TEST-1',
    });
});

describe('business lifecycle (booking → project → invoice → payment)', () => {
    it('runs the full chain end to end', async () => {
        // 1. Booking accepted → client project tracker + milestones.
        await services.createClientProjectFromBooking(prisma(), 'bk_1', 'emp_actor');
        expect(store.ClientProject).toHaveLength(1);
        expect(store.ProjectMilestone).toHaveLength(4);
        const project = store.ClientProject[0];

        // 2. Invoice created against the project, then issued (draft → sent).
        const invoice = await services.createInvoice(prisma(), {
            clientId: 'cli_1',
            bookingId: 'bk_1',
            clientProjectId: project.id,
            lineItems: [{ description: 'Build fee', quantity: 1, unitPrice: 50000 }],
        }, 'emp_actor');
        expect(invoice.status).toBe('draft');
        expect(Number(invoice.total)).toBe(50000);

        const issued = await services.updateInvoice(prisma(), invoice.id, { status: 'sent' });
        expect(issued.status).toBe('sent');

        // 3. Payment succeeds → invoice settles, booking flips to DEPOSIT_PAID.
        await services.applyPaymentOutcome(prisma(), {
            provider: 'MPESA',
            providerId: 'ws_LIFECYCLE_1',
            amount: 50000,
            currency: 'KES',
            status: 'SUCCEEDED',
            invoiceId: invoice.id,
            bookingId: 'bk_1',
            clientId: 'cli_1',
        });

        const settled = store.Invoice.find((i) => i.id === invoice.id);
        expect(settled.status).toBe('paid');
        expect(Number(settled.amountPaid)).toBe(50000);
        expect(Number(settled.balanceDue)).toBe(0);

        const booking = store.Booking.find((b) => b.id === 'bk_1');
        expect(booking.status).toBe('DEPOSIT_PAID');
        expect(booking.depositPaidAt).toBeTruthy();

        const payment = store.Payment.find((p) => p.providerId === 'ws_LIFECYCLE_1');
        expect(payment.status).toBe('SUCCEEDED');
        expect(payment.bookingId).toBe('bk_1');
    });

    it('derives renewal health across the post-delivery lifecycle', async () => {
        const now = Date.now();
        const client = { id: 'cli_r', name: 'Renewal Co', email: 'r@example.com', org: 'Renewal Co' };
        const old = new Date(now - 120 * 24 * 60 * 60 * 1000);
        const recent = new Date(now - 5 * 24 * 60 * 60 * 1000);

        // Delivered project long ago, nothing in flight → renewal_due.
        store.ClientProject.push({
            id: 'cp_old', clientId: 'cli_r', title: 'Old build',
            status: 'COMPLETED', completedAt: old, updatedAt: old,
        });
        let health = await services.computeClientHealth(prisma(), client, now);
        expect(health.health).toBe('renewal_due');
        expect(health.daysSinceActivity).toBeGreaterThanOrEqual(90);
        expect(health.openProjects).toBe(0);

        // Fresh activity + an open support ticket → at_risk.
        store.ClientProject[0].completedAt = recent;
        store.ClientProject[0].updatedAt = recent;
        store.SupportTicket.push({ id: 'tkt_1', clientId: 'cli_r', subject: 'Help', status: 'open', priority: 'normal' });
        health = await services.computeClientHealth(prisma(), client, now);
        expect(health.health).toBe('at_risk');
        expect(health.openTickets).toBe(1);

        // Ticket resolved, project delivered → back to active.
        store.SupportTicket[0].status = 'resolved';
        health = await services.computeClientHealth(prisma(), client, now);
        expect(health.health).toBe('active');
        expect(health.openTickets).toBe(0);
    });

    it('renewal monitor auto-notifies renewal_due clients once per cooldown', async () => {
        const now = Date.now();
        const old = new Date(now - 120 * 24 * 60 * 60 * 1000);
        store.Client.push({ id: 'cli_auto', name: 'Auto Co', email: 'a@x.com', org: 'Auto Co', createdAt: old });
        store.ClientProject.push({
            id: 'cp_auto', clientId: 'cli_auto', title: 'Old',
            status: 'COMPLETED', completedAt: old, updatedAt: old,
        });
        // A healthy client should be skipped entirely.
        store.Client.push({ id: 'cli_ok', name: 'OK Co', email: 'o@x.com', org: 'OK Co', createdAt: new Date(now) });
        store.ClientProject.push({
            id: 'cp_ok', clientId: 'cli_ok', title: 'Recent',
            status: 'COMPLETED', completedAt: new Date(now - 86400000), updatedAt: new Date(now - 86400000),
        });

        const sent = await services.sweepRenewalReminders();
        expect(sent).toBe(1);
        const notes = store.Notification.filter((n) => n.userId === 'cli_auto');
        expect(notes).toHaveLength(1);
        expect(notes[0]._type).toBe('renewal');
        expect(notes[0].userType).toBe('client');
        expect(notes[0].meta.automated).toBe(true);

        // Second sweep inside the cooldown window sends nothing.
        const again = await services.sweepRenewalReminders();
        expect(again).toBe(0);
        expect(store.Notification.filter((n) => n.userId === 'cli_auto')).toHaveLength(1);
    });
});
