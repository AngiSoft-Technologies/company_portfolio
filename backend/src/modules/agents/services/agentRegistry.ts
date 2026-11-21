import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

/**
 * AI Workforce registry — the company's automated employees.
 *
 * Each definition becomes an `Agent` row (seeded lazily by
 * `ensureAgentsSeeded`) that the scheduler picks up on its own cadence.
 * Agents never take irreversible actions on their own: every run produces a
 * structured report, notifies the owner team, and anything needing a human
 * decision is surfaced as a recommendation for the Approvals queue.
 *
 * The roster mirrors the company's departments so the org chart reads:
 *   you + developers + these agents.
 */

export type AgentKind =
    | 'coordinator'
    | 'marketing'
    | 'sales'
    | 'support'
    | 'monitoring'
    | 'finance'
    | 'hr'
    | 'analytics'
    | 'security'
    | 'workforce'
    | 'relationships';

export interface AgentDefinition {
    key: string;
    name: string;
    role: string;
    department: string;
    kind: AgentKind;
    description: string;
    /** Minutes between scheduled runs. */
    scheduleMinutes: number;
}

export const AGENT_REGISTRY: AgentDefinition[] = [
    {
        key: 'coordinator',
        name: 'Ari',
        role: 'Chief of Staff & Operations Coordinator',
        department: 'Executive',
        kind: 'coordinator',
        description:
            'Coordinates work across the company: compiles the daily briefing, ' +
            'tracks job schedules, flags blockers, and sequences priorities for ' +
            'the human team and the other agents.',
        scheduleMinutes: 24 * 60,
    },
    {
        key: 'marketing-content',
        name: 'Maya',
        role: 'Content & Campaigns Manager',
        department: 'Marketing',
        kind: 'marketing',
        description:
            'Creates and refreshes marketing content: blog post drafts, campaign ' +
            'copy, product announcements, and the editorial calendar for AngiSoft ' +
            'services and products.',
        scheduleMinutes: 12 * 60,
    },
    {
        key: 'marketing-growth',
        name: 'Growth',
        role: 'Growth & Outreach Specialist',
        department: 'Marketing',
        kind: 'marketing',
        description:
            'Finds relevant platforms and audiences, drafts outreach emails and ' +
            'social posts, and builds lead lists for the sales pipeline.',
        scheduleMinutes: 12 * 60,
    },
    {
        key: 'sales-agent',
        name: 'Sage',
        role: 'Sales Development Representative',
        department: 'Sales',
        kind: 'sales',
        description:
            'Works the full sales cycle support side: qualifies inbound leads, ' +
            'keeps the opportunity pipeline healthy, drafts follow-ups and ' +
            'quotes, and flags deals that need a human close.',
        scheduleMinutes: 6 * 60,
    },
    {
        key: 'customer-care',
        name: 'Care',
        role: 'Customer Care Team Lead',
        department: 'Client Operations',
        kind: 'support',
        description:
            'Triages support tickets, contact enquiries and chat conversations; ' +
            'drafts responses, watches SLA breaches, and escalates anything ' +
            'needing a human reply.',
        scheduleMinutes: 2 * 60,
    },
    {
        key: 'monitoring',
        name: 'Pulse',
        role: 'Systems Monitoring Agent',
        department: 'Engineering',
        kind: 'monitoring',
        description:
            'Watches platform health signals — booking volume anomalies, failed ' +
            'background work, queue pressure — and reports incidents with a ' +
            'severity rating to the owner.',
        scheduleMinutes: 30,
    },
    {
        key: 'finance',
        name: 'Ledger',
        role: 'Finance & Billing Analyst',
        department: 'Finance',
        kind: 'finance',
        description:
            'Tracks invoicing, collections and expenses: overdue invoices, ' +
            'unpaid bookings, payout status, and month-end summaries for the ' +
            'owner.',
        scheduleMinutes: 24 * 60,
    },
    {
        key: 'hr',
        name: 'People',
        role: 'HR & People Operations Partner',
        department: 'People',
        kind: 'hr',
        description:
            'Looks after the team: leave and attendance anomalies, onboarding ' +
            'checklists, portfolio-approval backlog, and team capacity notes.',
        scheduleMinutes: 24 * 60,
    },
    {
        key: 'analytics',
        name: 'Insight',
        role: 'Business Intelligence Analyst',
        department: 'Executive',
        kind: 'analytics',
        description:
            'Turns operational data into decisions: cross-department KPIs, ' +
            'conversion funnel health, content performance and revenue trends, ' +
            'delivered as a weekly digest.',
        scheduleMinutes: 7 * 24 * 60,
    },
    {
        key: 'security-compliance',
        name: 'Sentinel',
        role: 'Security & Compliance Officer',
        department: 'Engineering',
        kind: 'security',
        description:
            'Reviews the security posture: audit-log anomalies, permission ' +
            'changes, failed-auth spikes and data-handling compliance notes, ' +
            'with recommendations for the owner.',
        scheduleMinutes: 7 * 24 * 60,
    },
    {
        key: 'pa',
        name: 'Pia',
        role: 'Executive Assistant & AI Workforce Coach',
        department: 'Executive',
        kind: 'workforce',
        description:
            'Trains and coaches the agent workforce: audits every agent\u2019s ' +
            'run quality and charter compliance, writes coaching notes, and ' +
            'reports workforce health to the owner like a real EA.',
        scheduleMinutes: 12 * 60,
    },
    {
        key: 'relationships',
        name: 'Nexus',
        role: 'Relationships & Contracts Officer',
        department: 'Business Development',
        kind: 'relationships',
        description:
            'Owns company-to-company relationships: partnership enquiries, NDAs, ' +
            'letters, proposals, contract drafting and clause-by-clause review of ' +
            'inbound agreements. Drafts and risk notes are prepared for owner ' +
            'approval — Nexus never signs, sends or amends a binding document alone.',
        scheduleMinutes: 12 * 60,
    },
];

export function agentDefinition(key: string): AgentDefinition | undefined {
    return AGENT_REGISTRY.find((a) => a.key === key);
}

function hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    return Math.abs(hash);
}

/**
 * Idempotently materialize the roster as `Agent` rows. Safe to call on every
 * scheduler sweep and every admin list request — it only writes when a row is
 * missing, so admin edits to status/schedule/config are never overwritten.
 */
export async function ensureAgentsSeeded(prisma: Db): Promise<void> {
    for (const def of AGENT_REGISTRY) {
        try {
            const existing = await prisma.orm.public.Agent
                .where({ key: def.key })
                .first();
            if (existing) continue;
            await prisma.orm.public.Agent.create({
                id: newId(),
                key: def.key,
                name: def.name,
                role: def.role,
                department: def.department,
                kind: def.kind,
                description: def.description,
                status: 'active',
                scheduleMinutes: def.scheduleMinutes,
                // Spread first runs so a fresh deploy doesn't stampede the DB/LLM.
                nextRunAt: ts(Date.now() + (hashKey(def.key) % Math.max(60_000, Math.min(def.scheduleMinutes * 60_000, 15 * 60_000)))),
                updatedAt: ts(),
            });
        } catch (err: any) {
            // A concurrent seeder may have won the unique-key race — fine.
            if (!/unique|duplicate/i.test(String(err?.message ?? ''))) {
                console.warn(`[agents] seed failed for ${def.key}:`, err?.message || err);
            }
        }
    }
}
