import type { Db } from '../../../db';
import { tsMs } from '../../../prisma/db';
import { alreadyContacted } from './agentOutreach';
import { runAgent } from './agentRunner';

/**
 * Event triage — the workforce's reactive nervous system.
 *
 * Detectors run continuously (see agentRuntime.ts) and return the number of
 * *pending* work items they can see. Pending > 0 means the agent has live
 * work; the runtime fires an `event`-triggered run (subject to a per-agent
 * cooldown) and the proactive phase clears the backlog — after which the
 * detector returns to 0.
 *
 *   - new contact enquiry / unassigned ticket     → customer-care, coordinator
 *   - fresh CRM lead nobody has touched           → marketing-growth
 *   - stale opportunity                           → sales-agent
 *   - overdue invoice                             → finance
 *   - leave request pending >3d                   → hr
 *   - failed agent run in the last 30 min         → monitoring (pages owner)
 */

const DAY_MS = 24 * 60 * 60 * 1000;

async function latest(prisma: Db, model: string, limit: number, orderField = 'createdAt'): Promise<any[]> {
    try {
        const q: any = (prisma.orm.public as any)[model];
        if (!q) return [];
        return (await q.orderBy((r: any) => r[orderField].desc()).limit(limit).all()) ?? [];
    } catch {
        return [];
    }
}

/** Count of pending items a detector can see right now (0 = idle). */
export type Detector = (prisma: Db) => Promise<number>;

export const TRIAGE_DETECTORS: Record<string, Detector> = {
    'customer-care': async (prisma) => {
        const enquiries = await latest(prisma, 'ContactEnquiry', 30);
        const fresh = enquiries.filter((e) => e.status === 'new' && !e.respondedAt).length;
        const tickets = await latest(prisma, 'SupportTicket', 30);
        const unassigned = tickets.filter((t) => t.status === 'open' && !t.assignedToId).length;
        return fresh + unassigned;
    },

    'marketing-growth': async (prisma) => {
        const leads = await latest(prisma, 'Lead', 50);
        const fresh = leads.filter((l) => l.email && String(l.email).includes('@') && (l.status === 'new' || l.stage === 'new'));
        let pending = 0;
        for (const lead of fresh.slice(0, 8)) {
            if (!(await alreadyContacted(prisma, 'marketing-growth', 'lead', lead.id, 7))) pending += 1;
        }
        return pending;
    },

    'sales-agent': async (prisma) => {
        const staleBefore = Date.now() - 14 * DAY_MS;
        const opps = await latest(prisma, 'Opportunity', 60, 'updatedAt');
        const stale = opps.filter((o) => !['won', 'lost'].includes(String(o.stage)) && tsMs(o.updatedAt) < staleBefore);
        let pending = 0;
        for (const opp of stale.slice(0, 5)) {
            if (!(await alreadyContacted(prisma, 'sales-agent', 'opportunity', opp.id, 7))) pending += 1;
        }
        return pending;
    },

    finance: async (prisma) => {
        const invoices = await latest(prisma, 'Invoice', 60);
        const overdue = invoices.filter((i) =>
            ['issued', 'partially_paid', 'overdue'].includes(String(i.status)) &&
            i.dueAt && tsMs(i.dueAt) < Date.now() && Number(i.balanceDue ?? 0) > 0
        );
        let pending = 0;
        for (const inv of overdue.slice(0, 5)) {
            if (!(await alreadyContacted(prisma, 'finance', 'invoice', inv.id, 7))) pending += 1;
        }
        return pending;
    },

    hr: async (prisma) => {
        const requests = await latest(prisma, 'LeaveRequest', 40);
        const stale = requests.filter((r) => r.status === 'pending' && tsMs(r.createdAt) < Date.now() - 3 * DAY_MS);
        if (!stale.length) return 0;
        const employees = await latest(prisma, 'Employee', 200);
        const reviewers = employees.filter((e) => ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(String(e.role)));
        let pending = 0;
        for (const req of stale.slice(0, 3)) {
            for (const reviewer of reviewers.slice(0, 4)) {
                if (!(await alreadyContacted(prisma, 'hr', 'leave_request', `${req.id}:${reviewer.id}`, 7))) {
                    pending += 1;
                    break;
                }
            }
        }
        return pending;
    },

    coordinator: async (prisma) => {
        const enquiries = await latest(prisma, 'ContactEnquiry', 30);
        const unassignedEnquiries = enquiries.filter((e) => e.status === 'new' && !e.assigneeId && !e.assignedStaffId).length;
        const tickets = await latest(prisma, 'SupportTicket', 30);
        const unassignedTickets = tickets.filter((t) => t.status === 'open' && !t.assignedToId).length;
        return unassignedEnquiries + unassignedTickets;
    },

    monitoring: async (prisma) => {
        const runs = await latest(prisma, 'AgentRun', 40, 'startedAt');
        const cutoff = Date.now() - 30 * 60 * 1000;
        return runs.filter((r) => r.status === 'failed' && tsMs(r.startedAt) > cutoff).length;
    },
};

const lastEventRun = new Map<string, number>();

export function eventCooldownMs(agent: any): number {
    const configured = Number(agent?.config?.eventCooldownSeconds);
    if (Number.isFinite(configured) && configured > 0) return configured * 1000;
    return 45 * 1000;
}

export interface TriageOutcome {
    agentKey: string;
    pending: number;
    fired: boolean;
}

/**
 * One triage pass over the roster. For every agent with a detector, count
 * pending work; when pending > 0 and the cooldown has elapsed, dispatch an
 * event-triggered run. Returns per-agent outcomes for status reporting.
 */
export async function triageOnce(prisma: Db, fireEvents = true): Promise<TriageOutcome[]> {
    let agents: any[] = [];
    try {
        agents = (await prisma.orm.public.Agent.where({ status: 'active' }).all()) ?? [];
    } catch (err: any) {
        console.warn('[agents] triage roster query failed:', err?.message || err);
        return [];
    }

    const outcomes: TriageOutcome[] = [];
    for (const agent of agents) {
        const detect = TRIAGE_DETECTORS[agent.key];
        if (!detect) {
            outcomes.push({ agentKey: agent.key, pending: -1, fired: false });
            continue;
        }
        let pending = 0;
        try {
            pending = await detect(prisma);
        } catch (err: any) {
            console.warn(`[agents] triage detector ${agent.key} failed:`, err?.message || err);
            outcomes.push({ agentKey: agent.key, pending: -1, fired: false });
            continue;
        }
        let fired = false;
        if (fireEvents && pending > 0) {
            const cooldown = eventCooldownMs(agent);
            if (Date.now() - (lastEventRun.get(agent.key) ?? 0) >= cooldown) {
                lastEventRun.set(agent.key, Date.now());
                try {
                    void runAgent(prisma, agent, 'event').catch((err: any) =>
                        console.warn(`[agents] event run ${agent.key} failed:`, err?.message || err)
                    );
                    fired = true;
                } catch (err: any) {
                    console.warn(`[agents] triage dispatch ${agent.key} failed:`, err?.message || err);
                }
            }
        }
        outcomes.push({ agentKey: agent.key, pending, fired });
    }
    return outcomes;
}
