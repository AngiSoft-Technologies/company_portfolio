import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { ts, tsMs } from '../../../prisma/db';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { AGENT_REGISTRY, agentDefinition, ensureAgentsSeeded } from '../services/agentRegistry';
import { agentCharter } from '../services/agentCharters';
import { runAgent } from '../services/agentRunner';
import { getAgentRuntimeStatus, getWorkforceState } from '../services/agentStatus';

/**
 * AI Workforce admin API — mounted at /api/admin/agents.
 *
 *   GET    /                 roster + latest run per agent
 *   GET    /runs             recent runs (optional ?agentKey=&limit=)
 *   GET    /:key             agent detail + recent runs
 *   POST   /:key/run         trigger a manual run now
 *   PATCH  /:key             update status / schedule / config
 *
 * Guards use the canonical permission keys `agents.view|manage|run`
 * (permissionRegistry.ts) with ADMIN as the role fallback while grants
 * propagate through the seed.
 */

const patchSchema = z.object({
    status: z.enum(['active', 'paused']).optional(),
    scheduleMinutes: z.coerce.number().int().min(5).max(7 * 24 * 60).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
});

async function latestRunsByAgent(prisma: Db): Promise<Map<string, any>> {
    const runs = (await prisma.orm.public.AgentRun
        .orderBy((r: any) => r.startedAt.desc())
        .limit(200)
        .all()) as any[];
    const map = new Map<string, any>();
    for (const run of runs) {
        if (!map.has(run.agentKey)) map.set(run.agentKey, run);
    }
    return map;
}

export default function agentsRouter(prisma: Db) {
    const router = Router();
    router.use(requireAuth);

    router.get('/', requireAccess('agents.view', ['ADMIN', 'SUPER_ADMIN']), async (_req: AuthRequest, res) => {
        try {
            await ensureAgentsSeeded(prisma);
            const agents = (await prisma.orm.public.Agent
                .orderBy((a: any) => a.key.asc())
                .all()) as any[];
            const latest = await latestRunsByAgent(prisma);
            const statusMap = await getAgentRuntimeStatus() as any[] | null;
            const byKey = new Map((statusMap ?? []).map((s: any) => [s.agentKey ?? s.key, s]));
            res.json({
                agents: agents.map((a) => ({
                    ...a,
                    definition: agentDefinition(a.key) ?? null,
                    charter: agentCharter(a.key) ?? null,
                    lastRun: latest.get(a.key) ?? null,
                    runtime: byKey.get(a.key) ?? null,
                })),
                workforce: await getWorkforceState(),
            });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/runs', requireAccess('agents.view', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
        try {
            const agentKey = typeof req.query.agentKey === 'string' ? req.query.agentKey : undefined;
            const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50) || 50));
            let q: any = prisma.orm.public.AgentRun;
            if (agentKey) q = q.where({ agentKey });
            const runs = await q
                .orderBy((r: any) => r.startedAt.desc())
                .limit(limit)
                .all();
            res.json({ runs });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Exposed for the scheduler + tests: the canonical roster size.
    router.get('/registry', requireAccess('agents.view', ['ADMIN', 'SUPER_ADMIN']), (_req, res) => {
        res.json({ registry: AGENT_REGISTRY });
    });

    router.get('/:key', requireAccess('agents.view', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
        try {
            await ensureAgentsSeeded(prisma);
            const agent = await prisma.orm.public.Agent.where({ key: req.params.key }).first();
            if (!agent) return res.status(404).json({ error: 'Agent not found' });
            const runs = await prisma.orm.public.AgentRun
                .where({ agentKey: agent.key })
                .orderBy((r: any) => r.startedAt.desc())
                .limit(50)
                .all();
            res.json({ agent: { ...agent, definition: agentDefinition(agent.key) ?? null, charter: agentCharter(agent.key) ?? null }, runs });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/:key/run', requireAccess('agents.run', ['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
        try {
            await ensureAgentsSeeded(prisma);
            const agent = await prisma.orm.public.Agent.where({ key: req.params.key }).first();
            if (!agent) return res.status(404).json({ error: 'Agent not found' });
            if (agent.status !== 'active' && req.body?.force !== true) {
                return res.status(409).json({ error: 'Agent is paused — pass { force: true } to run anyway' });
            }
            const task = typeof req.body?.task === 'string' && req.body.task.trim()
                ? req.body.task.trim().slice(0, 300)
                : undefined;
            const run = await runAgent(prisma, agent, 'manual', req.user?.sub, task);
            res.status(run.status === 'failed' ? 502 : 200).json({ run });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.patch('/:key', requireAccess('agents.manage', ['ADMIN']), async (req: AuthRequest, res) => {
        try {
            const parsed = patchSchema.safeParse(req.body ?? {});
            if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
            const agent = await prisma.orm.public.Agent.where({ key: req.params.key }).first();
            if (!agent) return res.status(404).json({ error: 'Agent not found' });
            const patch: Record<string, unknown> = { updatedAt: ts() };
            if (parsed.data.status) patch.status = parsed.data.status;
            if (parsed.data.scheduleMinutes) {
                patch.scheduleMinutes = parsed.data.scheduleMinutes;
                // Recompute the next due time from the new cadence.
                const base = agent.lastRunAt ? tsMs(agent.lastRunAt) : Date.now();
                patch.nextRunAt = ts(Math.max(Date.now(), base + parsed.data.scheduleMinutes * 60 * 1000));
            }
            if (parsed.data.config) patch.config = parsed.data.config;
            const updated = await prisma.orm.public.Agent.where({ id: agent.id }).update(patch);
            res.json({ agent: updated });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
}
