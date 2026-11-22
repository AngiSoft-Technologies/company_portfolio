import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * AI Boardroom API specs.
 *
 * DB-free like `agents.spec.ts`: the Prisma 8 façade is mocked, auth uses real
 * JWTs, and the LLM provider is stubbed so no network call is made. The room is
 * owner-only and every decision is mirrored into the approval queue.
 */

const store: Record<string, any[]> = {};

function rows(model: string): any[] {
    if (!store[model]) store[model] = [];
    return store[model];
}

function queryable(model: string): any {
    const makeChain = (crit: any): any => {
        const filtered = () => {
            const all = rows(model);
            if (typeof crit === 'function' || crit == null) return all;
            const entries = Object.entries(crit);
            if (!entries.length) return all;
            return all.filter((row) => entries.every(([k, v]) => row[k] === v));
        };
        return {
            where: (c: any) => makeChain(
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
            all: async () => filtered(),
            first: async () => filtered()[0] ?? null,
            count: async () => filtered().length,
            create: async (data: any) => {
                const row = { id: data?.id ?? `mock_${rows(model).length + 1}`, ...data };
                rows(model).push(row);
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

const facade: any = {
    orm: {
        public: new Proxy({}, {
            get: (_target, model) => typeof model === 'string' ? queryable(model) : undefined,
        }),
    },
    transaction: async (fn: any) => fn(facade),
};

vi.mock('../src/prisma/db', () => ({
    db: facade,
    default: facade,
    ts: (value?: any) => typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString(),
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
    db: facade,
    default: facade,
    validateDatabaseConnection: async () => true,
    disconnectDatabase: async () => undefined,
}));

vi.mock('../src/modules/ai/services/aiProvider', () => ({
    loadAIConfig: async () => ({ config: { enabled: false, apiKey: '' }, source: 'env' }),
    aiComplete: async () => '',
    AI_PROVIDER_PRESETS: [],
    AI_CONFIG_SETTING_KEY: 'chatbot_ai_config',
}));

vi.mock('../src/shared/services/email', async () => {
    const template = await import('../src/shared/services/emailTemplate');
    return {
        ...template,
        sendMail: async () => ({ messageId: 'mock' }),
        sendMailDirect: async () => ({ messageId: 'mock' }),
    };
});

describe('AI Boardroom API', () => {
    let app: any;
    let request: any;
    let signAccessToken: any;
    const authed = (sub: string, role: string) => ({
        Authorization: `Bearer ${signAccessToken({ sub, role })}`,
    });
    const owner = () => authed('emp_owner', 'SUPER_ADMIN');

    beforeEach(async () => {
        for (const key of Object.keys(store)) delete store[key];
        const mod = await import('../src/app');
        app = mod.default;
        request = (await import('supertest')).default;
        signAccessToken = (await import('../src/modules/identity/utils/token')).signAccessToken;
    });

    async function openMeeting(): Promise<string> {
        const res = await request(app)
            .post('/v1/admin/boardroom/sessions')
            .set(owner())
            .send({});
        expect(res.status).toBe(201);
        return res.body.session.id as string;
    }

    it('rejects anonymous and non-owner callers', async () => {
        expect((await request(app).get('/v1/admin/boardroom/sessions')).status).toBe(401);
        const admin = await request(app)
            .get('/v1/admin/boardroom/sessions')
            .set(authed('emp_admin', 'ADMIN'));
        expect(admin.status).toBe(403);
    });

    it('opens a meeting as an AgentRun and lists it at /sessions', async () => {
        const id = await openMeeting();
        expect(rows('AgentRun').some((r) => r.id === id && r.agentKey === 'boardroom')).toBe(true);
        const list = await request(app)
            .get('/v1/admin/boardroom/sessions')
            .set(owner());
        expect(list.status).toBe(200);
        expect(list.body.sessions).toHaveLength(1);
        expect(list.body.sessions[0].output.kind).toBe('boardroom');
        expect(list.body.sessions[0].output.metrics.participants).toBe(12);
    });

    it('posts a question, gathers agent replies and rejects malformed input', async () => {
        const id = await openMeeting();
        const bad = await request(app)
            .post(`/v1/admin/boardroom/sessions/${id}/messages`)
            .set(owner())
            .send({ content: 'hi', unexpected: true });
        expect(bad.status).toBe(400);

        const res = await request(app)
            .post(`/v1/admin/boardroom/sessions/${id}/messages`)
            .set(owner())
            .send({ content: 'Review the NDA and contract terms please', askAll: true });
        expect(res.status).toBe(200);
        const messages = res.body.session.output.messages as any[];
        expect(messages.some((m) => m.role === 'owner' && m.content.includes('NDA'))).toBe(true);
        expect(messages.filter((m) => m.role === 'assistant').length).toBeGreaterThan(0);
        expect(res.body.session.output.metrics.repliesGenerated).toBeGreaterThan(0);
    });

    it('finalizes minutes and mirrors action items into the approval queue', async () => {
        const id = await openMeeting();
        const res = await request(app)
            .post(`/v1/admin/boardroom/sessions/${id}/finalize`)
            .set(owner())
            .send({
                decision: 'Proceed only after owner sign-off',
                actionItems: ['Draft mutual NDA for Acme Ltd', 'Review inbound MSA terms'],
            });
        expect(res.status).toBe(200);
        expect(res.body.session.output.minutes.join(' ')).toContain('Owner decision');
        const approvals = rows('ApprovalRequest').filter((r) => r.entityType === 'boardroom_action');
        expect(approvals).toHaveLength(2);
        expect(approvals.every((a) => a.status === 'pending')).toBe(true);
    });
});
