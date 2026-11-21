import type Redis from 'ioredis';
import prisma from '../db';
import { tsMs } from '../prisma/db';
import { createRedisClient, getRedisUrl } from '../shared/services/redis';
import { ensureAgentsSeeded } from '../modules/agents/services/agentRegistry';
import { runAgent } from '../modules/agents/services/agentRunner';

/**
 * AI Workforce scheduler.
 *
 * Every AGENT_SCHEDULER_INTERVAL_MS (default 60s) it materializes the agent
 * roster, finds active agents whose `nextRunAt` is due, and runs them
 * sequentially. Each agent failure is isolated — one bad collector never
 * blocks the rest of the roster.
 */

const DEFAULT_INTERVAL_MS = 60 * 1000;
const MAX_AGENTS_PER_SWEEP = 20;

// Multiple Fly machines each run this scheduler; a Redis lock ensures only one
// sweeps at a time so agents don't double-run (duplicate reports/runs). The
// lock expires on its own if the holder dies mid-sweep.
const LOCK_KEY = 'angisoft:agent-scheduler:lock';
const LOCK_TTL_MS = 90 * 1000;
let lockClient: Redis | null | undefined;

function schedulerLockClient(): Redis | null {
    if (lockClient !== undefined) return lockClient;
    if (!getRedisUrl()) {
        lockClient = null;
        return null;
    }
    try {
        lockClient = createRedisClient();
    } catch {
        lockClient = null;
    }
    return lockClient;
}

async function acquireSweepLock(): Promise<boolean> {
    const client = schedulerLockClient();
    if (!client) return true; // no Redis (dev/test): single process, no contention
    try {
        const holder = process.env.FLY_MACHINE_ID ?? `pid-${process.pid}`;
        const res = await client.set(LOCK_KEY, holder, 'PX', LOCK_TTL_MS, 'NX');
        return res === 'OK';
    } catch (err: any) {
        // Redis unreachable: prefer availability — sweep anyway. Outreach
        // dedupe (AuditLog ledger) still prevents double-contacting anyone.
        console.warn('[agents] scheduler lock unavailable, sweeping anyway:', err?.message || err);
        return true;
    }
}

export async function sweepDueAgents(): Promise<number> {
    if (!(await acquireSweepLock())) return 0;
    await ensureAgentsSeeded(prisma);

    const nowMs = Date.now();
    const due = (await prisma.orm.public.Agent
        .where({ status: 'active' })
        .orderBy((a: any) => a.nextRunAt.asc())
        .limit(MAX_AGENTS_PER_SWEEP)
        .all()) as any[];

    let ran = 0;
    for (const agent of due) {
        // nextRunAt null means "due now" (freshly seeded rows).
        if (agent.nextRunAt && tsMs(agent.nextRunAt) > nowMs) continue;
        try {
            await runAgent(prisma, agent, 'schedule');
            ran += 1;
        } catch (err: any) {
            console.warn(`[agents] scheduler: ${agent.key} failed:`, err?.message || err);
        }
    }
    return ran;
}

export function startAgentScheduler(): NodeJS.Timeout | null {
    const intervalMs = Number(process.env.AGENT_SCHEDULER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;

    const timer = setInterval(() => {
        sweepDueAgents().catch((err) => console.warn('Agent scheduler sweep failed:', err?.message || err));
    }, intervalMs);
    timer.unref?.();
    // Stagger the boot sweep so it doesn't collide with the other monitors.
    const boot = setTimeout(() => {
        sweepDueAgents().catch((err) => console.warn('Agent scheduler boot sweep failed:', err?.message || err));
    }, 120_000);
    boot.unref?.();
    return timer;
}
