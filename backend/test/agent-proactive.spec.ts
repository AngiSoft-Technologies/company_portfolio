import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Proactive-layer specs — the outward actions agents take after a report:
 * deduped outreach emails, owner digests/alerts, and low-risk record creation.
 * The email transport is mocked; the AuditLog ledger is the real dedupe store
 * under test (same in-memory Prisma façade as agents.spec.ts).
 */

const sentMails: any[] = [];
vi.mock('../src/shared/services/email', () => ({
    sendMail: async (opts: any) => {
        sentMails.push(opts);
        return { messageId: 'mock' };
    },
    sendMailDirect: async (opts: any) => {
        sentMails.push(opts);
        return { messageId: 'mock' };
    },
}));

const store: Record<string, any[]> = {};

const MODELS = [
    'Agent',
    'AgentRun',
    'Employee',
    'AuditLog',
    'Lead',
    'Opportunity',
    'Client',
    'ContactEnquiry',
    'SupportTicket',
    'TicketMessage',
    'Invoice',
    'LeaveRequest',
    'BlogPost',
    'Service',
    'Product',
];

for (const model of MODELS) store[model] = [];

let idCounter = 0;

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
                        : c ?? crit
                ),
            select: () => makeChain(crit),
            orderBy: () => makeChain(crit),
            limit: () => makeChain(crit),
            offset: () => makeChain(crit),
            all: async () => filtered(),
            first: async () => filtered()[0] ?? null,
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
    tsMs: (value?: any) => {
        if (value == null) return 0;
        const s = String(value);
        const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
        const ms = new Date(iso).getTime();
        return Number.isFinite(ms) ? ms : 0;
    },
    newId: () => `test_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/db', () => ({
    db: ormFacade(),
    default: ormFacade(),
    validateDatabaseConnection: async () => true,
    disconnectDatabase: async () => undefined,
}));

vi.mock('../src/modules/ai/services/aiProvider', () => ({
    loadAIConfig: async () => ({ config: { enabled: false, apiKey: '' }, source: 'env' }),
    aiComplete: async () => '',
    AI_PROVIDER_PRESETS: [],
    AI_CONFIG_SETTING_KEY: 'chatbot_ai_config',
}));

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400_000).toISOString();

describe('AI workforce: proactive outreach layer', () => {
    let prisma: any;
    let runProactive: any;

    beforeEach(async () => {
        for (const key of Object.keys(store)) store[key] = [];
        sentMails.length = 0;
        process.env.ADMIN_EMAIL = 'owner@example.com';
        prisma = ormFacade();
        runProactive = (await import('../src/modules/agents/services/proactive')).runProactive;
        store.Employee = [{ id: 'emp_owner', role: 'SUPER_ADMIN', firstName: 'Owner', email: 'boss@angisoft.co.ke' }];
    });

    const agent = (key: string) => ({ id: `ag_${key}`, key, name: key, role: 'test', department: 'test' });
    const output = () => ({ summary: 'test report', metrics: {}, highlights: [], actions: [], recommendations: [] });

    it('emails the owner a throttled daily report digest', async () => {
        const out = output();
        await runProactive(prisma, agent('analytics'), out);
        const digest = sentMails.filter((m) => m.to === 'owner@example.com');
        expect(digest.length).toBe(1);
        expect(digest[0].subject).toContain('test report'.length ? 'analytics' : '');
        // Second run same day must not re-email the owner.
        await runProactive(prisma, agent('analytics'), output());
        expect(sentMails.filter((m) => m.to === 'owner@example.com')).toHaveLength(1);
    });

    it('marketing-growth emails fresh leads once and creates opportunities for qualified leads', async () => {
        store.Lead = [
            { id: 'lead_new', name: 'Jane Doe', email: 'jane@acme.co.ke', status: 'new', stage: 'new', source: 'website', createdAt: iso(1) },
            { id: 'lead_qual', name: 'John Kamau', email: 'john@biz.co.ke', status: 'contacted', stage: 'qualified', source: 'referral', createdAt: iso(2) },
        ];
        const ag = agent('marketing-growth');
        const out = output();
        await runProactive(prisma, ag, out);

        const toJane = sentMails.filter((m) => m.to === 'jane@acme.co.ke');
        expect(toJane.length).toBe(1);
        expect(toJane[0].subject).toContain('AngiSoft');
        expect(toJane[0].html).toContain('Jane');

        // Qualified lead with no opportunity → record created.
        const opps = store.Opportunity.filter((o) => o.leadId === 'lead_qual');
        expect(opps.length).toBe(1);
        expect(opps[0].stage).toBe('new');

        // Second run: no duplicate email, no duplicate opportunity.
        const before = sentMails.length;
        await runProactive(prisma, ag, output());
        expect(sentMails.filter((m) => m.to === 'jane@acme.co.ke')).toHaveLength(1);
        expect(store.Opportunity.filter((o) => o.leadId === 'lead_qual')).toHaveLength(1);
        // Owner digest may add one more mail — that's the throttle's job, not outreach's.
        expect(sentMails.length - before).toBeLessThanOrEqual(1);
    });

    it('customer-care acknowledges new enquiries and marks them in_review', async () => {
        store.ContactEnquiry = [
            { id: 'enq1', name: 'Amina', email: 'amina@example.com', subject: 'Website quote', status: 'new', createdAt: iso(0) },
        ];
        await runProactive(prisma, agent('customer-care'), output());
        expect(sentMails.filter((m) => m.to === 'amina@example.com').length).toBe(1);
        expect(store.ContactEnquiry[0].status).toBe('in_review');
        expect(store.ContactEnquiry[0].respondedAt).toBeTruthy();
    });

    it('finance sends payment reminders only for genuinely overdue invoices', async () => {
        store.Client = [{ id: 'cli1', name: 'Beta Ltd', email: 'ap@beta.co.ke' }];
        store.Invoice = [
            { id: 'inv_over', number: 'INV-1', clientId: 'cli1', status: 'issued', balanceDue: 50000, currency: 'KES', dueAt: iso(10), createdAt: iso(20) },
            { id: 'inv_ok', number: 'INV-2', clientId: 'cli1', status: 'issued', balanceDue: 10000, currency: 'KES', dueAt: new Date(Date.now() + 86400_000).toISOString(), createdAt: iso(5) },
            { id: 'inv_paid', number: 'INV-3', clientId: 'cli1', status: 'paid', balanceDue: 0, dueAt: iso(30), createdAt: iso(40) },
        ];
        await runProactive(prisma, agent('finance'), output());
        const reminders = sentMails.filter((m) => m.to === 'ap@beta.co.ke');
        expect(reminders.length).toBe(1);
        expect(reminders[0].subject).toContain('INV-1');
    });

    it('sales-agent follows up stale opportunities via the linked contact', async () => {
        store.Client = [{ id: 'cli1', name: 'Gamma Inc', email: 'hi@gamma.co.ke' }];
        store.Opportunity = [
            { id: 'opp_stale', title: 'ERP rollout', clientId: 'cli1', stage: 'proposal_sent', updatedAt: iso(20), createdAt: iso(30) },
            { id: 'opp_fresh', title: 'New deal', clientId: 'cli1', stage: 'new', updatedAt: iso(1), createdAt: iso(5) },
        ];
        const out = output();
        await runProactive(prisma, agent('sales-agent'), out);
        const followUps = sentMails.filter((m) => m.to === 'hi@gamma.co.ke');
        expect(followUps.length).toBe(1);
        expect(followUps[0].subject).toContain('ERP rollout');
    });

    it('monitoring pages the owner when agent runs are failing', async () => {
        store.AgentRun = [
            { id: 'run_failed_1', agentKey: 'sales-agent', status: 'failed', startedAt: iso(0), error: 'boom' },
        ];
        const out = output();
        out.metrics.failedAgentRuns = 3;
        await runProactive(prisma, agent('monitoring'), out);
        const alert = sentMails.find((m) => m.to === 'owner@example.com' && /agent run/i.test(m.subject));
        expect(alert).toBeTruthy();
        // Dedupe: a second proactive pass must not re-page for the same run.
        await runProactive(prisma, agent('monitoring'), out);
        expect(sentMails.filter((m) => m.to === 'owner@example.com' && /agent run/i.test(m.subject))).toHaveLength(1);
    });

    it('pa writes a coaching note into an underperforming agent\'s config', async () => {
        store.Agent = [
            { id: 'ag_pa', key: 'pa', name: 'Pia', role: 'Coach', status: 'active', scheduleMinutes: 720, lastRunAt: iso(0), config: {} },
            { id: 'ag_mon', key: 'monitoring', name: 'Pulse', role: 'Monitoring', status: 'active', scheduleMinutes: 30, lastRunAt: iso(5), config: {} },
        ];
        store.AgentRun = [
            { id: 'run1', agentKey: 'monitoring', status: 'failed', startedAt: iso(1), error: 'collector timeout', output: null },
            { id: 'run2', agentKey: 'monitoring', status: 'failed', startedAt: iso(2), error: 'collector timeout', output: null },
            { id: 'run3', agentKey: 'monitoring', status: 'failed', startedAt: iso(3), error: 'collector timeout', output: null },
        ];
        const out = output();
        await runProactive(prisma, agent('pa'), out);
        const coached = store.Agent.find((a) => a.key === 'monitoring');
        expect(coached.config.paCoaching).toHaveLength(1);
        expect(coached.config.paCoaching[0].note).toContain('Charter reminder');
        expect(coached.config.paCoaching[0].failures7d).toBe(3);
        // PA never coaches itself.
        expect(store.Agent.find((a) => a.key === 'pa').config.paCoaching).toBeUndefined();
        expect(out.actions.join(' ')).toContain('PA coached');
    });

    it('pa leaves a healthy roster alone', async () => {
        store.Agent = [
            { id: 'ag_pa', key: 'pa', name: 'Pia', role: 'Coach', status: 'active', scheduleMinutes: 720, lastRunAt: iso(0), config: {} },
            { id: 'ag_fin', key: 'finance', name: 'Ledger', role: 'Finance', status: 'active', scheduleMinutes: 1440, lastRunAt: iso(0), config: {} },
        ];
        store.AgentRun = [
            { id: 'run1', agentKey: 'finance', status: 'success', startedAt: iso(0), output: { actions: ['x'], recommendations: [] } },
        ];
        await runProactive(prisma, agent('pa'), output());
        expect(store.Agent.find((a) => a.key === 'finance').config.paCoaching).toBeUndefined();
    });

    it('never exceeds the per-run email cap', async () => {
        store.Lead = Array.from({ length: 12 }, (_, i) => ({
            id: `lead_${i}`, name: `Lead ${i}`, email: `lead${i}@x.co.ke`, status: 'new', stage: 'new', createdAt: iso(1),
        }));
        await runProactive(prisma, agent('marketing-growth'), output());
        const outreach = sentMails.filter((m) => !m.to.includes('owner@example.com'));
        expect(outreach.length).toBeLessThanOrEqual(5);
    });
});
