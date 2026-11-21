import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * AI Workforce specs — the automated-agent roster, run engine and admin API
 * (`/api/admin/agents`). DB-free like `route-coverage.spec.ts`: the Prisma 8
 * façade is mocked, auth uses real JWTs, and the LLM provider is stubbed so
 * no network call is ever made.
 */

const store: Record<string, any[]> = {};

const MODELS = [
    'Agent',
    'AgentRun',
    'Employee',
    'EmployeePermission',
    'EmployeeRoleAssignment',
    'Position',
    'ProductTeamMember',
    'ProjectEmployee',
    'Booking',
    'BookingEvent',
    'ContactEnquiry',
    'BlogPost',
    'Faq',
    'RefreshToken',
    'Client',
    'Payment',
    'ChatConversation',
    'AppRole',
    'RolePermission',
    'Permission',
    'ClientProject',
    'ProjectMilestone',
    'ProjectComment',
    'ProjectDeliverable',
    'ProjectActivity',
    'Notification',
    'File',
    'Lead',
    'Opportunity',
    'Quote',
    'Invoice',
    'Expense',
    'LeaveRequest',
    'AttendanceRecord',
    'EmployeePortfolioConfig',
    'AuditLog',
    'ApprovalRequest',
    'Subscriber',
    'Service',
    'Product',
    'Setting',
    'SupportTicket',
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

// Never let a run reach a real LLM provider — the deterministic collectors are
// the contract under test.
vi.mock('../src/modules/ai/services/aiProvider', () => ({
    loadAIConfig: async () => ({ config: { enabled: false, apiKey: '' }, source: 'env' }),
    aiComplete: async () => '',
    AI_PROVIDER_PRESETS: [],
    AI_CONFIG_SETTING_KEY: 'chatbot_ai_config',
}));

// The proactive phase sends real email through this service — stub the
// transport so tests never touch SMTP or the queue.
vi.mock('../src/shared/services/email', () => ({
    sendMail: async () => ({ messageId: 'mock' }),
    sendMailDirect: async () => ({ messageId: 'mock' }),
}));

describe('AI workforce: agent registry + runner + admin API', () => {
    let app: any;
    let request: any;
    let signAccessToken: any;
    let AGENT_REGISTRY: any[];
    const authed = (sub: string, role: string) => ({
        Authorization: `Bearer ${signAccessToken({ sub, role })}`,
    });

    beforeEach(async () => {
        for (const key of Object.keys(store)) store[key] = [];
        const mod = await import('../src/app');
        app = mod.default;
        request = (await import('supertest')).default;
        signAccessToken = (await import('../src/modules/identity/utils/token')).signAccessToken;
        AGENT_REGISTRY = (await import('../src/modules/agents/services/agentRegistry')).AGENT_REGISTRY;
    });

    it('registry defines up to 10 agents covering the company departments', () => {
        expect(AGENT_REGISTRY.length).toBeLessThanOrEqual(12);
        expect(AGENT_REGISTRY.length).toBeGreaterThanOrEqual(10);
        const kinds = new Set(AGENT_REGISTRY.map((a) => a.kind));
        for (const expected of ['coordinator', 'marketing', 'sales', 'support', 'monitoring', 'finance', 'hr']) {
            expect(kinds.has(expected as any)).toBe(true);
        }
        for (const agent of AGENT_REGISTRY) {
            expect(agent.scheduleMinutes).toBeGreaterThan(0);
        }
    });

    describe('GET /api/admin/agents', () => {
        it('rejects anonymous callers', async () => {
            const res = await request(app).get('/api/admin/agents');
            expect(res.status).toBe(401);
        });

        it('rejects a role without agents.view', async () => {
            const res = await request(app)
                .get('/api/admin/agents')
                .set(authed('emp_client', 'STAFF'));
            expect(res.status).toBe(403);
        });

        it('seeds the roster and returns agents for an admin', async () => {
            const res = await request(app)
                .get('/api/admin/agents')
                .set(authed('emp_admin', 'ADMIN'));
            expect(res.status).toBe(200);
            expect(res.body.agents).toHaveLength(AGENT_REGISTRY.length);
            const coordinator = res.body.agents.find((a: any) => a.key === 'coordinator');
            expect(coordinator.name).toBeTruthy();
            expect(coordinator.lastRun).toBeNull();
            // Second call must be idempotent — no duplicate rows.
            await request(app).get('/api/admin/agents').set(authed('emp_admin', 'ADMIN'));
            expect(store.Agent).toHaveLength(AGENT_REGISTRY.length);
        });
    });

    describe('POST /api/admin/agents/:key/run', () => {
        it('rejects anonymous callers', async () => {
            const res = await request(app)
                .post('/api/admin/agents/monitoring/run')
                .send({});
            expect(res.status).toBe(401);
        });

        it('runs an agent, stores the report and notifies the owner', async () => {
            store.Employee = [
                { id: 'emp_owner', role: 'SUPER_ADMIN', firstName: 'Owner' },
                { id: 'emp_staff', role: 'STAFF', firstName: 'Staff' },
            ];
            store.Booking = [{ id: 'b1', status: 'SUBMITTED', createdAt: new Date().toISOString() }];

            const res = await request(app)
                .post('/api/admin/agents/monitoring/run')
                .set(authed('emp_owner', 'SUPER_ADMIN'))
                .send({});
            expect(res.status).toBe(200);
            expect(res.body.run.status).toBe('success');
            expect(res.body.run.agentKey).toBe('monitoring');
            expect(res.body.run.output.metrics.bookings24h).toBe(1);

            // Persisted run + agent bookkeeping
            expect(store.AgentRun).toHaveLength(1);
            const agent = store.Agent.find((a) => a.key === 'monitoring');
            expect(agent.lastRunAt).toBeTruthy();
            expect(agent.nextRunAt).toBeTruthy();

            // Report went to SUPER_ADMIN + ADMIN recipients only.
            const notes = store.Notification.filter((n) => n._type === 'agent_report');
            expect(notes).toHaveLength(1);
            expect(notes[0].userId).toBe('emp_owner');
            expect(notes[0].title).toContain('Pulse');
        });

        it('refuses to run a paused agent without force', async () => {
            await request(app).get('/api/admin/agents').set(authed('emp_admin', 'ADMIN'));
            await request(app)
                .patch('/api/admin/agents/monitoring')
                .set(authed('emp_admin', 'ADMIN'))
                .send({ status: 'paused' });

            const res = await request(app)
                .post('/api/admin/agents/monitoring/run')
                .set(authed('emp_admin', 'ADMIN'))
                .send({});
            expect(res.status).toBe(409);

            const forced = await request(app)
                .post('/api/admin/agents/monitoring/run')
                .set(authed('emp_admin', 'ADMIN'))
                .send({ force: true });
            expect(forced.status).toBe(200);
        });
    });

    describe('GET /api/admin/agents/runs + PATCH', () => {
        it('lists runs and filters by agentKey', async () => {
            store.Agent = [{ id: 'a1', key: 'monitoring', name: 'Pulse', status: 'active' }];
            store.AgentRun = [
                { id: 'r1', agentId: 'a1', agentKey: 'monitoring', status: 'success', startedAt: '2026-01-01T00:00:00Z' },
                { id: 'r2', agentId: 'a1', agentKey: 'coordinator', status: 'failed', startedAt: '2026-01-02T00:00:00Z' },
            ];
            const res = await request(app)
                .get('/api/admin/agents/runs?agentKey=monitoring')
                .set(authed('emp_admin', 'ADMIN'));
            expect(res.status).toBe(200);
            expect(res.body.runs).toHaveLength(1);
            expect(res.body.runs[0].id).toBe('r1');
        });

        it('PATCH updates schedule and status', async () => {
            await request(app).get('/api/admin/agents').set(authed('emp_admin', 'ADMIN'));
            const res = await request(app)
                .patch('/api/admin/agents/coordinator')
                .set(authed('emp_admin', 'ADMIN'))
                .send({ status: 'paused', scheduleMinutes: 120 });
            expect(res.status).toBe(200);
            const agent = store.Agent.find((a) => a.key === 'coordinator');
            expect(agent.status).toBe('paused');
            expect(agent.scheduleMinutes).toBe(120);
            expect(agent.nextRunAt).toBeTruthy();
        });
    });
});
