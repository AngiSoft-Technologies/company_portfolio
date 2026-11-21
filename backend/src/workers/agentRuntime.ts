import Redis, { type RedisOptions } from 'ioredis';
import prisma from '../db';
import { ts, tsMs } from '../prisma/db';
import { getRedisUrl, redisConnectionOptions } from '../shared/services/redis';
import { ensureAgentsSeeded, AGENT_REGISTRY } from '../modules/agents/services/agentRegistry';
import { triageOnce, TRIAGE_DETECTORS } from '../modules/agents/services/agentTriage';
import {
    writeAgentStatus,
    publishWorkforceState,
    getAgentRuntimeStatus,
    getWorkforceState,
    type AgentRuntimeStatus,
} from '../modules/agents/services/agentStatus';
import { runAgent } from '../modules/agents/services/agentRunner';

/**
 * Agent runtime — the workforce's heartbeat.
 *
 * ONE machine (Redis lock winner) runs a continuous loop: every
 * AGENT_POLL_MS it (a) triages all detectors for pending work and fires
 * event-runs, and (b) runs any scheduled-report agents whose nextRunAt is
 * due. There is no "sleep until next timer" — the loop polls constantly and
 * agents are effectively always watching. Poll interval is env-tunable down
 * to ~100ms; detectors are cheap indexed reads.
 *
 * Live per-agent status is published to the shared agentStatus store every
 * cycle (Redis-shared across machines, in-memory fallback) and a company-wide
 * workforce snapshot is republished so every agent knows what its colleagues
 * are doing in real time.
 */

const DEFAULT_POLL_MS = 1_000;
const MIN_POLL_MS = 100;
const RUNTIME_LOCK_KEY = 'angisoft:agent-runtime:lock';
const RUNTIME_LOCK_TTL_MS = 60 * 1000;
const MAX_AGENTS_PER_SWEEP = 20;
const STALE_RUN_MS = 15 * 60 * 1000;
let seededThisProcess = false;

export { getAgentRuntimeStatus, getWorkforceState };
export type { AgentRuntimeStatus };

// ─── Runtime lock ──────────────────────────────────────────────────────────

let runtimeClient: Redis | null | undefined;
function runtimeRedis(): Redis | null {
    if (runtimeClient !== undefined) return runtimeClient;
    const url = getRedisUrl();
    if (!url) {
        runtimeClient = null;
        return null;
    }
    try {
        const { url: _u, ...opts } = redisConnectionOptions();
        runtimeClient = new Redis(url, {
            ...(opts as RedisOptions),
            lazyConnect: true,
            enableOfflineQueue: false,
            connectTimeout: 3000,
            maxRetriesPerRequest: 1,
        });
        runtimeClient.on('error', () => { /* lock is best-effort */ });
        void runtimeClient.connect().catch(() => { /* unready → degrade */ });
    } catch {
        runtimeClient = null;
    }
    return runtimeClient;
}

function lockHolder(): string {
    return process.env.FLY_MACHINE_ID ?? `pid-${process.pid}`;
}

async function acquireRuntimeLock(): Promise<boolean> {
    const client = runtimeRedis();
    if (!client) return true; // no Redis configured (dev/test): single process
    // Redis configured but not ready → standby. Running anyway would let all
    // Fly machines sweep concurrently and duplicate every agent run.
    if (client.status !== 'ready') return false;
    try {
        const holder = lockHolder();
        // Renew our own hold first — plain SET NX would fail while we hold
        // the key, rotating the lock to a random machine every 30s.
        const current = await Promise.race([
            client.get(RUNTIME_LOCK_KEY),
            new Promise<null>((r) => setTimeout(() => r(null), 3000)),
        ]);
        if (current === holder) {
            await client.set(RUNTIME_LOCK_KEY, holder, 'PX', RUNTIME_LOCK_TTL_MS);
            return true;
        }
        const res = await Promise.race([
            client.set(RUNTIME_LOCK_KEY, holder, 'PX', RUNTIME_LOCK_TTL_MS, 'NX'),
            new Promise<null>((r) => setTimeout(() => r(null), 3000)),
        ]);
        return res === 'OK';
    } catch {
        return false; // lock check failed — standby this cycle rather than risk duplicates
    }
}

/** Keep the leader lock alive while a long sweep/article generation runs. */
function startLockHeartbeat(): () => void {
    const client = runtimeRedis();
    const holder = lockHolder();
    const timer = setInterval(() => {
        if (client?.status !== 'ready') return;
        void client.get(RUNTIME_LOCK_KEY).then((current) => {
            if (current === holder) return client.set(RUNTIME_LOCK_KEY, holder, 'PX', RUNTIME_LOCK_TTL_MS);
        }).catch(() => {});
    }, Math.max(5_000, Math.floor(RUNTIME_LOCK_TTL_MS / 3)));
    return () => clearInterval(timer);
}

async function releaseRuntimeLock(): Promise<void> {
    const client = runtimeRedis();
    if (client?.status !== 'ready') return;
    try {
        const current = await client.get(RUNTIME_LOCK_KEY);
        if (current === lockHolder()) await client.del(RUNTIME_LOCK_KEY);
    } catch { /* TTL will expire */ }
}

/** Mark runs orphaned by a crash/deploy so they don't look "running" forever. */
async function reapStaleRuns(): Promise<number> {
    try {
        const stale = (await prisma.orm.public.AgentRun
            .where({ status: 'running' })
            .limit(100)
            .all()) as any[];
        const cutoff = Date.now() - STALE_RUN_MS;
        let reaped = 0;
        for (const run of stale) {
            if (tsMs(run.startedAt) > cutoff) continue;
            await prisma.orm.public.AgentRun.where({ id: run.id }).update({
                status: 'failed',
                error: 'Run reaped after exceeding stale-run deadline',
                finishedAt: ts(),
            });
            reaped += 1;
        }
        if (reaped) console.warn(`[agents] reaped ${reaped} stale running agent run(s)`);
        return reaped;
    } catch (err: any) {
        console.warn('[agents] stale-run reaper failed:', err?.message || err);
        return 0;
    }
}

// ─── Scheduled-report sweep ────────────────────────────────────────────────

async function sweepScheduledAgents(): Promise<number> {
    const nowMs = Date.now();
    const due = (await prisma.orm.public.Agent
        .where({ status: 'active' })
        .orderBy((a: any) => a.nextRunAt.asc())
        .limit(MAX_AGENTS_PER_SWEEP)
        .all()) as any[];

    let ran = 0;
    for (const agent of due) {
        if (agent.nextRunAt && tsMs(agent.nextRunAt) > nowMs) continue;
        try {
            await writeAgentStatus(agent.key, { state: 'working' });
            await runAgent(prisma, agent, 'schedule');
            ran += 1;
        } catch (err: any) {
            console.warn(`[agents] scheduler: ${agent.key} failed:`, err?.message || err);
        } finally {
            await writeAgentStatus(agent.key, { state: 'idle' });
        }
    }
    return ran;
}

// ─── Main loop ─────────────────────────────────────────────────────────────

let running = false;
let inFlight = false;
let sleepTimer: NodeJS.Timeout | null = null;
let wakeSleep: (() => void) | null = null;
let loopPromise: Promise<void> | null = null;

async function cycle(): Promise<void> {
    if (inFlight) return; // never overlap cycles — agents stay responsive
    inFlight = true;
    try {
        if (!seededThisProcess) {
            await ensureAgentsSeeded(prisma);
            seededThisProcess = true;
        }
        await reapStaleRuns();

        // 1) Reactive triage — detectors count pending work; event runs fire.
        const outcomes = await triageOnce(prisma, true);
        for (const o of outcomes) {
            if (o.pending === -1) continue; // scheduled-only agent
            const handled = (await getWorkforceState())?.[o.agentKey]?.handled ?? 0;
            await writeAgentStatus(o.agentKey, {
                pending: o.pending,
                state: o.pending > 0 ? 'working' : 'idle',
                ...(o.fired ? { lastEventAt: ts(), handled: handled + 1 } : {}),
            });
        }

        // 2) Scheduled reports — agents due for their digest/analysis run.
        await sweepScheduledAgents();

        // 3) Publish the shared workforce snapshot — every agent can see what
        //    its colleagues are doing/idle/pending in real time.
        await publishWorkforceState();
    } catch (err: any) {
        console.warn('Agent runtime cycle failed:', err?.message || err);
    } finally {
        inFlight = false;
    }
}

/**
 * Start the continuous agent runtime. Polls every AGENT_POLL_MS (default
 * 1s, floor 100ms) forever; only the Redis-lock holder actually works —
 * other machines standby and take over within ~30s if it dies.
 */
export function startAgentRuntime(): void {
    if (running) return;
    running = true;
    const pollMs = Math.max(MIN_POLL_MS, Number(process.env.AGENT_POLL_MS ?? DEFAULT_POLL_MS) || DEFAULT_POLL_MS);

    const loop = async () => {
        while (running) {
            try {
                if (await acquireRuntimeLock()) {
                    const stopHeartbeat = startLockHeartbeat();
                    try {
                        await cycle();
                    } finally {
                        stopHeartbeat();
                    }
                }
            } catch (err: any) {
                console.warn('Agent runtime loop error:', err?.message || err);
            }
            if (!running) break;
            // Interruptible sleep — stopAgentRuntime() wakes this immediately
            // so shutdown doesn't wait a full poll interval.
            await new Promise<void>((resolve) => {
                wakeSleep = resolve;
                sleepTimer = setTimeout(() => {
                    sleepTimer = null;
                    wakeSleep = null;
                    resolve();
                }, pollMs);
            });
        }
    };
    loopPromise = loop();
    console.log(`🧠 Agent runtime started (poll ${pollMs}ms, continuous)`);
}

/**
 * Stop the runtime loop. Must run BEFORE the process closes the Prisma pool —
 * otherwise the 1s poll keeps firing cycles that all reject with
 * "Postgres client is closed" during the shutdown window. Waits (bounded) for
 * the in-flight cycle so its DB writes can land cleanly.
 */
export async function stopAgentRuntime(): Promise<void> {
    if (!running) return;
    running = false;
    if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
    }
    wakeSleep?.();
    wakeSleep = null;
    void releaseRuntimeLock();
    if (loopPromise) {
        await Promise.race([
            loopPromise,
            new Promise((r) => setTimeout(r, 2_500)),
        ]);
    }
}
