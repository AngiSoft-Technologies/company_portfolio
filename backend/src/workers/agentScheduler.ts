import prisma from '../db';
import { ts } from '../prisma/db';
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

export async function sweepDueAgents(): Promise<number> {
    await ensureAgentsSeeded(prisma);

    const now = ts();
    const due = (await prisma.orm.public.Agent
        .where({ status: 'active' })
        .orderBy((a: any) => a.nextRunAt.asc())
        .limit(MAX_AGENTS_PER_SWEEP)
        .all()) as any[];

    let ran = 0;
    for (const agent of due) {
        // nextRunAt null means "due now" (freshly seeded rows).
        if (agent.nextRunAt && String(agent.nextRunAt) > now) continue;
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
