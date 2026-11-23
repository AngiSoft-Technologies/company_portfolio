import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

import {
    isLegalStageTransition as isLegalBookingStageTransition,
    stageForStatus,
    customerActionStage,
} from '../src/modules/bookings/services/bookingStageMachine';
import leadsRouter from '../src/modules/crm/routes/leads';
import supportTicketsRouter from '../src/modules/crm/routes/support-tickets';

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
        // Sales CRM lifecycle (§14 Phase 2): front-of-funnel + quotation rows.
        Lead: [],
        Opportunity: [],
        Quote: [],
        QuoteLineItem: [],
        // Booking write side-effects (the booking write itself is route-only).
        BookingEvent: [],
        AuditLog: [],
        File: [],
    };

    const matches = (row: any, crit: any) =>
        Object.entries(crit ?? {}).every(([k, v]) => row[k] === v);

    // Relation hydration for the includes services rely on (getQuote/getInvoice
    // read `lineItems` from the include, not from a scalar column).
    const relations: Record<string, Record<string, { model: string; fk: string }>> = {
        Quote: { lineItems: { model: 'QuoteLineItem', fk: 'quoteId' } },
        Invoice: { lineItems: { model: 'InvoiceLineItem', fk: 'invoiceId' } },
        ClientProject: {
            projectMilestones: { model: 'ProjectMilestone', fk: 'projectId' },
            projectActivities: { model: 'ProjectActivity', fk: 'clientProjectId' },
        },
        Booking: { clientProject: { model: 'ClientProject', fk: 'bookingId' } },
        SupportTicket: { ticketMessages: { model: 'TicketMessage', fk: 'ticketId' } },
    };

    function queryable(model: string) {
        const rows = () => store[model] ?? [];
        const filtered = (crit?: any) => rows().filter((r) => matches(r, crit));
        const hydrate = (row: any, includes: string[]) => {
            if (!row) return row;
            for (const relation of includes) {
                const spec = relations[model]?.[relation];
                if (spec) {
                    (row as any)[relation] = (store[spec.model] ?? [])
                        .filter((child: any) => child[spec.fk] === row.id);
                }
            }
            return row;
        };
        const createRow = async (data: any) => {
            // Mirror the DB defaults the route handlers rely on.
            const defaults = model === 'SupportTicket' && data.status === undefined
                ? { status: 'open' }
                : {};
            const row = { id: `row_${model}_${rows().length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...defaults, ...data };
            store[model].push(row);
            return row;
        };
        const makeChain = (crit?: any, includes: string[] = []): any => ({
            where: (c: any) => makeChain(c ?? crit, includes),
            select: () => makeChain(crit, includes),
            include: (relation: string) => makeChain(crit, [...includes, relation]),
            orderBy: () => makeChain(crit, includes),
            limit: () => makeChain(crit, includes),
            offset: () => makeChain(crit, includes),
            all: async () => filtered(crit).map((row) => hydrate(row, includes)),
            first: async () => hydrate(filtered(crit)[0] ?? null, includes),
            count: async () => filtered(crit).length,
            aggregate: async () => ({ n: filtered(crit).length }),
            create: createRow,
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
        return makeChain(undefined);
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

// Lead + support-ticket writes live in route handlers (no domain service).
// Exercise the real handlers over supertest with auth/permission gates stubbed.
vi.mock('../src/shared/middleware/auth', () => ({
    requireAuth: (req: any, _res: any, next: () => void) => {
        req.user = { sub: 'emp_actor', role: 'ADMIN' };
        next();
    },
}));

vi.mock('../src/shared/middleware/roles', () => ({
    requireAccess: () => (_req: any, _res: any, next: () => void) => next(),
    requirePermission: () => (_req: any, _res: any, next: () => void) => next(),
}));

let services: {
    createClientProjectFromBooking: typeof import('../src/modules/projects/services/clientProjects').createClientProjectFromBooking;
    createOpportunity: typeof import('../src/modules/crm/services/opportunities').createOpportunity;
    updateOpportunity: typeof import('../src/modules/crm/services/opportunities').updateOpportunity;
    createQuote: typeof import('../src/modules/crm/services/quotes').createQuote;
    updateQuote: typeof import('../src/modules/crm/services/quotes').updateQuote;
    createInvoice: typeof import('../src/modules/crm/services/invoices').createInvoice;
    updateInvoice: typeof import('../src/modules/crm/services/invoices').updateInvoice;
    applyPaymentOutcome: typeof import('../src/modules/billing/services/payments').applyPaymentOutcome;
    computeClientHealth: typeof import('../src/modules/crm/routes/renewals').computeClientHealth;
    sweepRenewalReminders: typeof import('../src/workers/renewalMonitor').sweepRenewalReminders;
};

beforeAll(async () => {
    const [clientProjects, opportunities, quotes, invoices, payments, renewals, renewalMonitor] = await Promise.all([
        import('../src/modules/projects/services/clientProjects'),
        import('../src/modules/crm/services/opportunities'),
        import('../src/modules/crm/services/quotes'),
        import('../src/modules/crm/services/invoices'),
        import('../src/modules/billing/services/payments'),
        import('../src/modules/crm/routes/renewals'),
        import('../src/workers/renewalMonitor'),
    ]);
    services = {
        createClientProjectFromBooking: clientProjects.createClientProjectFromBooking,
        createOpportunity: opportunities.createOpportunity,
        updateOpportunity: opportunities.updateOpportunity,
        createQuote: quotes.createQuote,
        updateQuote: quotes.updateQuote,
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

/**
 * Phase 2 success metric (DIGITAL_HQ_PLAN §14): one Sales CRM department
 * workspace must complete the full lifecycle. Every boundary is chained in a
 * single test against the same in-memory Prisma facade, with real service /
 * route-handler code. Booking writes are the one exception: there is no
 * DB-free booking service, so its authoritative pure stage machine validates
 * each edge and the resulting state is persisted through the same facade.
 */
describe('full Sales CRM lifecycle (lead → opportunity → quotation → booking → project → invoice → payment → support)', () => {
    it('chains every stage with legal transitions and cross-link IDs', async () => {
        const ledger = prisma();
        const bookingId = 'bk_flow';

        // ── 1. Lead (real leads route handler: create → qualified → converted) ──
        const leadApp = express();
        leadApp.use(express.json());
        leadApp.use('/leads', leadsRouter(ledger));

        const leadCreated = await request(leadApp).post('/leads').send({
            name: 'Ada Buyer',
            email: 'ada@lifecycle.test',
            source: 'website',
            assignedToId: 'emp_owner',
        });
        expect(leadCreated.status).toBe(201);
        const lead = leadCreated.body;
        expect(lead.id).toBeTruthy();
        expect(store.Lead).toHaveLength(1);

        const leadQualified = await request(leadApp)
            .put(`/leads/${lead.id}`)
            .send({ status: 'qualified' });
        expect(leadQualified.status).toBe(200);
        expect(leadQualified.body.status).toBe('qualified');

        const leadConverted = await request(leadApp)
            .put(`/leads/${lead.id}`)
            .send({ status: 'converted' });
        expect(leadConverted.status).toBe(200);
        expect(leadConverted.body.status).toBe('converted');
        expect(store.Lead[0].status).toBe('converted');

        // ── 2. Opportunity (real service: new → qualified → proposal → negotiation → won) ──
        const opportunity = await services.createOpportunity(ledger, {
            title: 'Website rebuild',
            leadId: lead.id,
            clientId: 'cli_1',
            assignedToId: 'emp_owner',
            stage: 'new',
            value: 50000,
            currency: 'KES',
            source: 'website',
        }, 'emp_actor');
        expect(opportunity.id).toBeTruthy();
        expect(opportunity.leadId).toBe(lead.id); // lead → opportunity cross-link
        expect(opportunity.clientId).toBe('cli_1');
        expect(opportunity.stage).toBe('new');

        let currentOpportunity = opportunity;
        for (const [stage, probability] of [
            ['qualified', 30],
            ['proposal', 50],
            ['negotiation', 70],
            ['won', 100],
        ] as const) {
            const advanced = await services.updateOpportunity(ledger, opportunity.id, { stage });
            expect(advanced.stage).toBe(stage);
            expect(advanced.probability).toBe(probability);
            expect(advanced.leadId).toBe(lead.id);
            currentOpportunity = advanced;
        }
        await expect(
            services.updateOpportunity(ledger, opportunity.id, { stage: 'new' }),
        ).rejects.toMatchObject({ statusCode: 409 }); // terminal stage rejects regression
        expect(currentOpportunity.stage).toBe('won');

        // ── 3. Quotation (real service: draft → sent → accepted) ──
        const quote = await services.createQuote(ledger, {
            opportunityId: opportunity.id,
            lineItems: [{ description: 'Build fee', quantity: 1, unitPrice: '50000.00' }],
            currency: 'KES',
        }, 'emp_actor');
        expect(quote.id).toBeTruthy();
        expect(quote.opportunityId).toBe(opportunity.id); // opportunity → quotation cross-link
        expect(quote.clientId).toBe('cli_1'); // inherited from the opportunity
        expect(quote.status).toBe('draft');
        expect(Number(quote.total)).toBe(50000);
        expect(store.QuoteLineItem).toHaveLength(1);

        const sentQuote = await services.updateQuote(ledger, quote.id, { status: 'sent' });
        expect(sentQuote.status).toBe('sent');
        expect(sentQuote.issuedAt).toBeTruthy();
        const acceptedQuote = await services.updateQuote(ledger, quote.id, { status: 'accepted' });
        expect(acceptedQuote.status).toBe('accepted');
        expect(acceptedQuote.acceptedAt).toBeTruthy();
        await expect(
            services.updateQuote(ledger, quote.id, { status: 'draft' }),
        ).rejects.toMatchObject({ statusCode: 409 });

        // ── 4. Booking (authoritative pure stage machine + facade persistence) ──
        await ledger.orm.public.Booking.create({
            id: bookingId,
            clientId: 'cli_1',
            title: 'Website rebuild',
            description: 'Sales CRM lifecycle booking',
            projectType: 'SOFTWARE',
            status: 'SUBMITTED',
            currentStage: 'request_submitted',
            assignedToId: 'emp_owner',
            publicReference: 'BK-FLOW-1',
        });
        const bookingRow = () => store.Booking.find((b: any) => b.id === bookingId);
        const advanceBooking = async (stage: string, status?: string) => {
            expect(isLegalBookingStageTransition(bookingRow().currentStage, stage)).toBe(true);
            await ledger.orm.public.Booking.where({ id: bookingId }).update({
                currentStage: stage,
                ...(status ? { status } : {}),
            });
        };

        expect(stageForStatus('SUBMITTED', 'request_submitted')).toBe('request_submitted');
        await advanceBooking('requirements_review', 'UNDER_REVIEW');
        await advanceBooking('scope_and_quotation');
        await advanceBooking('awaiting_confirmation', 'ACCEPTED');
        expect(bookingRow().status).toBe('ACCEPTED');
        expect(isLegalBookingStageTransition('request_submitted', 'scheduled')).toBe(false);

        // Accepted quotation → booking confirmation, linked in both directions
        // through the real opportunity/quote services.
        expect(customerActionStage('ACCEPT_QUOTATION', 'awaiting_confirmation')).toBe('scheduled');
        await advanceBooking('scheduled', 'TERMS_ACCEPTED');
        const linkedQuote = await services.updateQuote(ledger, quote.id, { bookingId });
        expect(linkedQuote.bookingId).toBe(bookingId); // quotation → booking cross-link
        const linkedOpportunity = await services.updateOpportunity(ledger, opportunity.id, { bookingId });
        expect(linkedOpportunity.bookingId).toBe(bookingId); // opportunity → booking cross-link

        // ── 5. Project (real booking→project trigger service) ──
        const project = await services.createClientProjectFromBooking(ledger, bookingId, 'emp_actor');
        expect(project.bookingId).toBe(bookingId); // booking → project cross-link
        expect(project.clientId).toBe('cli_1');
        expect(store.ProjectMilestone).toHaveLength(4);
        expect(store.ProjectActivity[0].clientProjectId).toBe(project.id);

        // ── 6. Invoice (real service, quoting the accepted quote as a snapshot) ──
        const invoice = await services.createInvoice(ledger, {
            quoteId: quote.id,
            clientId: 'cli_1',
            bookingId,
            clientProjectId: project.id,
        }, 'emp_actor');
        expect(invoice.quoteId).toBe(quote.id); // quotation → invoice cross-link
        expect(invoice.bookingId).toBe(bookingId); // booking → invoice cross-link
        expect(invoice.clientProjectId).toBe(project.id); // project → invoice cross-link
        expect(Number(invoice.total)).toBe(50000);
        expect(store.InvoiceLineItem).toHaveLength(1);
        expect(store.InvoiceLineItem[0].description).toBe('Build fee');

        const issuedInvoice = await services.updateInvoice(ledger, invoice.id, { status: 'sent' });
        expect(issuedInvoice.status).toBe('sent');
        expect(issuedInvoice.issuedAt).toBeTruthy();

        // ── 7. Payment (real outcome service settles invoice + booking) ──
        await services.applyPaymentOutcome(ledger, {
            provider: 'MPESA',
            providerId: 'ws_FULL_LIFECYCLE_1',
            amount: 50000,
            currency: 'KES',
            status: 'SUCCEEDED',
            invoiceId: invoice.id,
            bookingId,
            clientId: 'cli_1',
            metadata: { invoiceId: invoice.id },
        });

        const settled = store.Invoice.find((i: any) => i.id === invoice.id);
        expect(settled.status).toBe('paid');
        expect(Number(settled.amountPaid)).toBe(50000);
        expect(Number(settled.balanceDue)).toBe(0);
        expect(settled.paidAt).toBeTruthy();
        await expect(
            services.updateInvoice(ledger, invoice.id, { status: 'draft' }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(bookingRow().status).toBe('DEPOSIT_PAID');
        expect(bookingRow().depositPaidAt).toBeTruthy();
        const payment = store.Payment.find((p: any) => p.providerId === 'ws_FULL_LIFECYCLE_1');
        expect(payment.status).toBe('SUCCEEDED');
        expect(payment.bookingId).toBe(bookingId); // payment → booking cross-link
        expect(payment.metadata.invoiceId).toBe(invoice.id); // payment → invoice cross-link

        // ── 8. Support ticket (real support-tickets route handler) ──
        const ticketApp = express();
        ticketApp.use(express.json());
        ticketApp.use('/tickets', supportTicketsRouter(ledger));

        const ticketCreated = await request(ticketApp).post('/tickets').send({
            clientId: 'cli_1',
            subject: 'Follow-up on website rebuild',
            body: 'One page renders incorrectly after launch.',
            priority: 'high',
        });
        expect(ticketCreated.status).toBe(201);
        const ticket = ticketCreated.body;
        expect(ticket.id).toBeTruthy();
        expect(ticket.clientId).toBe('cli_1'); // client → support ticket cross-link
        expect(ticket.status).toBe('open');

        const inProgress = await request(ticketApp)
            .put(`/tickets/${ticket.id}`)
            .send({ status: 'in_progress', assignedToId: 'emp_owner' });
        expect(inProgress.status).toBe(200);
        expect(inProgress.body.status).toBe('in_progress');

        const reply = await request(ticketApp)
            .post(`/tickets/${ticket.id}/messages`)
            .send({ body: 'Investigating the layout regression.', internal: false });
        expect(reply.status).toBe(201);
        expect(reply.body.ticketId).toBe(ticket.id); // message → ticket cross-link
        expect(reply.body.authorId).toBe('emp_actor');

        const resolved = await request(ticketApp)
            .put(`/tickets/${ticket.id}`)
            .send({ status: 'resolved' });
        expect(resolved.body.status).toBe('resolved');

        // One ledger row per boundary, all pointing at the same chain.
        expect({
            lead: lead.id,
            opportunity: opportunity.id,
            quote: quote.id,
            booking: bookingId,
            project: project.id,
            invoice: invoice.id,
            payment: payment.id,
            ticket: ticket.id,
        }).toEqual({
            lead: store.Lead[0].id,
            opportunity: store.Opportunity[0].id,
            quote: store.Quote[0].id,
            booking: bookingRow().id,
            project: store.ClientProject.find((p: any) => p.bookingId === bookingId).id,
            invoice: store.Invoice[0].id,
            payment: store.Payment[0].id,
            ticket: store.SupportTicket[0].id,
        });
    });
});
