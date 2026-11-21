import Redis, { type RedisOptions } from 'ioredis';
import { ts } from '../../../prisma/db';
import { getRedisUrl, redisConnectionOptions } from '../../../shared/services/redis';
import { AGENT_REGISTRY } from './agentRegistry';

/**
 * Shared live workforce state.
 *
 * The runtime (workers/agentRuntime.ts) writes per-agent status here every
 * poll cycle; any agent, route, or service can read it. With Redis configured
 * the state is shared across all Fly machines; otherwise it is in-process
 * (fine for dev/tests where a single process runs everything).
 */

export interface AgentRuntimeStatus {
    key: string;
    state: 'idle' | 'working' | 'scheduled' | 'unknown';
    pending: number;          // -1 = no detector (scheduled-only agent)
    handled: number;          // lifetime event-runs dispatched by triage
    lastEventAt: string | null;
    currentTask: string | null;
    lastRunAt: string | null;
    nextRunAt: string | null;
    updatedAt: string;
}

const STATUS_TTL_S = 120;
const WORKFORCE_STATE_KEY = 'agent:workforce:state';

const memoryStatus = new Map<string, AgentRuntimeStatus>();
let statusClient: Redis | null | undefined;

function statusRedis(): Redis | null {
    if (statusClient !== undefined) return statusClient;
    const url = getRedisUrl();
    if (!url) {
        statusClient = null;
        return null;
    }
    try {
        // Lazy + no offline queue: status must NEVER block a request or the
        // runtime loop waiting on a Redis connect (tests, cold starts, Fly
        // private-network hiccups). Commands only run once 'ready'.
        const { url: _u, ...opts } = redisConnectionOptions();
        statusClient = new Redis(url, {
            ...(opts as RedisOptions),
            lazyConnect: true,
            enableOfflineQueue: false,
            connectTimeout: 3000,
            maxRetriesPerRequest: 1,
        });
        statusClient.on('error', () => { /* best-effort status only */ });
        void statusClient.connect().catch(() => { /* stays unready → memory fallback */ });
    } catch {
        statusClient = null;
    }
    return statusClient;
}

function redisReady(client: Redis | null): client is Redis {
    return Boolean(client && client.status === 'ready');
}

export async function writeAgentStatus(agentKey: string, patch: Partial<AgentRuntimeStatus>): Promise<void> {
    const prev = memoryStatus.get(agentKey) ?? {
        key: agentKey, state: 'unknown', pending: -1, handled: 0, lastEventAt: null,
        currentTask: null, lastRunAt: null, nextRunAt: null, updatedAt: ts(),
    };
    const next: AgentRuntimeStatus = { ...prev, key: agentKey, ...patch, updatedAt: ts() };
    memoryStatus.set(agentKey, next);
    const client = statusRedis();
    if (redisReady(client)) {
        try {
            await client.set(`agent:status:${agentKey}`, JSON.stringify(next), 'EX', STATUS_TTL_S);
        } catch { /* status is best-effort */ }
    }
}

/** Shared snapshot — what every agent is doing right now, company-wide. */
export async function getWorkforceState(): Promise<Record<string, AgentRuntimeStatus> | null> {
    const client = statusRedis();
    if (redisReady(client)) {
        try {
            const raw = await client.get(WORKFORCE_STATE_KEY);
            if (raw) return JSON.parse(raw);
        } catch { /* fall through */ }
    }
    if (!memoryStatus.size) return null;
    return Object.fromEntries(memoryStatus.entries());
}

export async function publishWorkforceState(): Promise<void> {
    if (!memoryStatus.size) return;
    const snapshot = Object.fromEntries(memoryStatus.entries());
    const client = statusRedis();
    if (redisReady(client)) {
        try {
            await client.set(WORKFORCE_STATE_KEY, JSON.stringify(snapshot), 'EX', STATUS_TTL_S);
        } catch { /* best-effort */ }
    }
}

export async function getAgentRuntimeStatus(agentKey?: string): Promise<AgentRuntimeStatus | AgentRuntimeStatus[] | null> {
    const read = async (key: string): Promise<AgentRuntimeStatus | null> => {
        const client = statusRedis();
        if (redisReady(client)) {
            try {
                const raw = await client.get(`agent:status:${key}`);
                if (raw) return JSON.parse(raw) as AgentRuntimeStatus;
            } catch { /* fall through to memory */ }
        }
        return memoryStatus.get(key) ?? null;
    };
    if (agentKey) return read(agentKey);
    const out: AgentRuntimeStatus[] = [];
    for (const d of AGENT_REGISTRY) {
        const s = await read(d.key);
        if (s) out.push(s);
    }
    return out;
}

/** Compact one-line-per-agent digest for prompts/collectors. */
export function describeWorkforce(state: Record<string, AgentRuntimeStatus> | null): string {
    if (!state) return 'Workforce state unavailable.';
    return Object.entries(state)
        .map(([key, s]) => {
            const bits = [`${key}: ${s.state}`];
            if (s.pending > 0) bits.push(`${s.pending} pending`);
            if (s.currentTask) bits.push(`task="${s.currentTask}"`);
            if (s.handled > 0) bits.push(`${s.handled} events handled`);
            return `  - ${bits.join(', ')}`;
        })
        .join('\n');
}
