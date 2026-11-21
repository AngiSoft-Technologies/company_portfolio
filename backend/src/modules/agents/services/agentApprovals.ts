import crypto from 'crypto';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import type { AgentOutput } from './agentRunner';

/**
 * Agent action → approval queue bridge.
 *
 * Every successful run ends with `output.actions` — concrete items that need
 * a human decision ("Finance: 3 overdue invoices need a collections call").
 * Historically those only lived inside the run JSON and the owner's email
 * digest, so nothing tracked whether anyone actually handled them.
 *
 * This module mirrors each action into the shared `ApprovalRequest` queue as
 * an `agent_action` entity: one pending request per unique action shape per
 * agent. When a human approves/rejects/cancels it, the next run that still
 * sees the same underlying issue files a fresh request — so recurring
 * problems keep resurfacing until they're actually dealt with, while a
 * resolved item never nags twice for the same state.
 *
 * Dedupe key strips digits so "3 overdue invoices" and "4 overdue invoices"
 * collapse to one pending item; the stored title keeps the live text.
 */

const MAX_ACTIONS_PER_RUN = 5;
const ENTITY_TYPE = 'agent_action';
// Single-step chain: the workforce decision is owner-level, so the step
// requires agents.manage (ADMIN holds all keys; SUPER_ADMIN holds '*').
const STEP_PERMISSION = 'agents.manage';

function normalizeAction(text: string): string {
    // Keep digits: "invoice 1042" and "invoice 2048" are different approvals.
    // Collapse only whitespace/punctuation so wording changes don't duplicate.
    return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function actionEntityId(agentKey: string, text: string): string {
    const hash = crypto.createHash('sha1').update(normalizeAction(text)).digest('hex').slice(0, 12);
    return `${agentKey}:${hash}`;
}

/**
 * Ensure every actionable item in this run's output has a pending
 * ApprovalRequest. Idempotent — safe to call after every run. Never throws:
 * queue sync is best-effort and must not fail the agent run.
 */
export async function syncAgentActions(prisma: Db, agent: any, output: AgentOutput): Promise<number> {
    try {
        const completed = new Set((output.completed ?? []).map((a) => String(a).trim().toLowerCase()));
        const candidates = output.approvalRequired ?? output.actions ?? [];
        const actions = candidates
            .map((a) => String(a).trim())
            .filter((a) => a && !completed.has(a.toLowerCase()))
            .slice(0, MAX_ACTIONS_PER_RUN);
        if (!actions.length) return 0;

        const pending = (await prisma.orm.public.ApprovalRequest
            .where({ entityType: ENTITY_TYPE, status: 'pending' })
            .limit(500)
            .all()) as any[];
        const queued = new Set(pending.map((r) => r.entityId));

        const seen = new Set<string>();
        let created = 0;
        for (const text of actions) {
            const entityId = actionEntityId(agent.key, text);
            if (queued.has(entityId) || seen.has(entityId)) continue;
            seen.add(entityId);
            try {
                await prisma.orm.public.ApprovalRequest.create({
                    id: newId(),
                    entityType: ENTITY_TYPE,
                    entityId,
                    title: `${agent.name ?? agent.key}: ${text}`.slice(0, 200),
                    amount: null,
                    currency: null,
                    requestedById: `agent:${agent.key}`,
                    status: 'pending',
                    steps: [{
                        permission: STEP_PERMISSION,
                        label: 'Workforce action — owner sign-off',
                        status: 'pending',
                        decidedById: null,
                        decidedAt: null,
                        note: null,
                    }] as any,
                    updatedAt: ts(),
                });
                created += 1;
            } catch (err: any) {
                console.warn(`[agents] approval queue write failed for ${agent.key}:`, err?.message || err);
            }
        }
        return created;
    } catch (err: any) {
        console.warn(`[agents] approval queue sync failed for ${agent?.key}:`, err?.message || err);
        return 0;
    }
}
