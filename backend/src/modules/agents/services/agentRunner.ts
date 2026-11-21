import type { Db } from '../../../db';
import { ts, tsMs, newId } from '../../../prisma/db';
import { createNotification } from '../../notifications/services/notifications';
import { loadAIConfig, aiComplete } from '../../ai/services/aiProvider';
import { getWorkforceState, describeWorkforce, writeAgentStatus } from './agentStatus';
import { agentDefinition } from './agentRegistry';
import { agentCharter } from './agentCharters';
import { runProactive } from './proactive';
import { syncAgentActions } from './agentApprovals';

/**
 * Agent run engine.
 *
 * Every run produces a structured report (`AgentRun.output`):
 *   { summary, metrics, highlights, actions, recommendations }
 *
 * Collectors are deterministic DB reads — they never mutate business data.
 * After a successful report, `runProactive` (services/proactive.ts) executes a
 * bounded set of outward actions: deduped human-voiced emails, owner digests,
 * and low-risk record creation (opportunities, draft posts, triage notes).
 * Anything consequential stays under `actions` / `recommendations` for the
 * owner to action through the normal admin UI or the Approvals queue. When an
 * LLM provider is configured (`AiConfig` / `AI_*` env), the deterministic facts
 * are optionally condensed into a short narrative; the run still succeeds if
 * the provider is unavailable.
 */

export interface AgentOutput {
    summary: string;
    metrics: Record<string, number | string>;
    highlights: string[];
    actions: string[];
    recommendations: string[];
    task?: string;
}

type Collector = (prisma: Db, agent: any) => Promise<AgentOutput>;

const DAY_MS = 24 * 60 * 60 * 1000;

async function countWhere(prisma: Db, model: string, crit?: Record<string, unknown>): Promise<number> {
    try {
        const q: any = (prisma.orm.public as any)[model];
        if (!q) return 0;
        return crit ? await q.where(crit).count() : await q.count();
    } catch {
        return 0;
    }
}

async function recentRows(prisma: Db, model: string, limit = 20, orderField = 'createdAt'): Promise<any[]> {
    try {
        const q: any = (prisma.orm.public as any)[model];
        if (!q) return [];
        return (await q.orderBy((r: any) => r[orderField].desc()).limit(limit).all()) ?? [];
    } catch {
        return [];
    }
}

function since(days: number): string {
    return ts(Date.now() - days * DAY_MS);
}

function isAfter(iso: string | null | undefined, cutoff: string): boolean {
    return !!iso && tsMs(iso) >= tsMs(cutoff);
}

// ─── Collectors ────────────────────────────────────────────────────────────

const collectors: Record<string, Collector> = {
    async coordinator(prisma) {
        const dayAgo = since(1);
        const [newLeads, newEnquiries, openTickets, pendingLeave, draftBlogs] = await Promise.all([
            countWhere(prisma, 'Lead', { status: 'new' }),
            countWhere(prisma, 'ContactEnquiry', { status: 'new' }),
            countWhere(prisma, 'SupportTicket', { status: 'open' }),
            countWhere(prisma, 'LeaveRequest', { status: 'pending' }),
            countWhere(prisma, 'BlogPost', { published: false }),
        ]);
        const recentBookings = (await recentRows(prisma, 'Booking', 50)).filter((b) => isAfter(b.createdAt, dayAgo));
        const highlights = [
            `${recentBookings.length} booking(s) arrived in the last 24h`,
            `${newLeads} new lead(s) awaiting qualification`,
            `${newEnquiries} unanswered contact enquir(ies)`,
            `${openTickets} open support ticket(s)`,
            `${pendingLeave} leave request(s) awaiting review`,
        ];
        const actions: string[] = [];
        if (newEnquiries > 0) actions.push(`Route ${newEnquiries} contact enquir(ies) to customer care`);
        if (openTickets > 5) actions.push(`Hold a support triage huddle — ${openTickets} tickets open`);
        if (pendingLeave > 0) actions.push(`Review ${pendingLeave} pending leave request(s)`);
        if (draftBlogs > 3) actions.push(`Publish or archive ${draftBlogs} unpublished post(s)`);
        return {
            summary: `Daily coordination sweep: ${recentBookings.length} new bookings, ${newLeads} fresh leads, ${openTickets} open tickets.`,
            metrics: { newBookings24h: recentBookings.length, pendingLeads: newLeads, openEnquiries: newEnquiries, openTickets, pendingLeave, draftBlogs },
            highlights,
            actions,
            recommendations: actions.length ? ['Owner: action the coordinator\'s routing list before standup.'] : ['All queues nominal — no routing needed today.'],
        };
    },

    async 'marketing-content'(prisma) {
        const [published, drafts, services, products] = await Promise.all([
            countWhere(prisma, 'BlogPost', { published: true }),
            countWhere(prisma, 'BlogPost', { published: false }),
            countWhere(prisma, 'Service', { published: true }),
            countWhere(prisma, 'Product', { published: true }),
        ]);
        const recent = await recentRows(prisma, 'BlogPost', 5);
        const titles = recent.map((b) => `"${b.title}"`).slice(0, 3);
        return {
            summary: `Content pipeline: ${published} published posts, ${drafts} drafts in progress across ${services} services and ${products} products.`,
            metrics: { publishedPosts: published, draftPosts: drafts, activeServices: services, activeProducts: products },
            highlights: titles.length ? [`Latest posts: ${titles.join(', ')}`] : ['No blog posts yet — first campaign needed'],
            actions: drafts === 0 ? ['Draft next blog post from the editorial calendar'] : [],
            recommendations: ['Refresh top-performing service pages with current pricing and case studies.'],
        };
    },

    async 'marketing-growth'(prisma) {
        const [leads, enquiries, subscribers, newLeadsWeek] = await Promise.all([
            countWhere(prisma, 'Lead'),
            countWhere(prisma, 'ContactEnquiry'),
            countWhere(prisma, 'Subscriber'),
            recentRows(prisma, 'Lead', 100),
        ]);
        const weekCount = (newLeadsWeek as any[]).filter((l) => isAfter(l.createdAt, since(7))).length;
        return {
            summary: `Growth snapshot: ${leads} leads total (${weekCount} this week), ${enquiries} enquiries, ${subscribers} newsletter subscribers.`,
            metrics: { totalLeads: leads, leadsThisWeek: weekCount, totalEnquiries: enquiries, subscribers },
            highlights: [`Lead inflow is ${weekCount > 0 ? 'active' : 'slow'} this week (${weekCount} new)`],
            actions: weekCount === 0 ? ['Launch an outreach sequence — no new leads this week'] : [],
            recommendations: ['Test a LinkedIn + email outreach batch targeting Kenyan SMEs; track replies in the pipeline.'],
        };
    },

    async 'sales-agent'(prisma) {
        const opportunities = await recentRows(prisma, 'Opportunity', 100);
        const byStage: Record<string, number> = {};
        for (const o of opportunities) byStage[o.stage ?? 'new'] = (byStage[o.stage ?? 'new'] ?? 0) + 1;
        const pipelineValue = opportunities
            .filter((o) => !['won', 'lost'].includes(o.stage))
            .reduce((sum, o) => sum + Number(o.value ?? 0), 0);
        const stale = opportunities.filter((o) => {
            const stage = o.stage ?? 'new';
            return !['won', 'lost'].includes(stage) && !isAfter(o.updatedAt, since(14));
        });
        const [newLeads, quotesDraft] = await Promise.all([
            countWhere(prisma, 'Lead', { stage: 'new' }),
            countWhere(prisma, 'Quote', { status: 'draft' }),
        ]);
        const highlights = [
            `Pipeline: ${Object.entries(byStage).map(([s, n]) => `${n} ${s}`).join(', ') || 'empty'}`,
            `Open pipeline value ≈ ${pipelineValue.toLocaleString('en-KE')} KES`,
            `${stale.length} opportunit${stale.length === 1 ? 'y' : 'ies'} untouched for 14+ days`,
        ];
        const actions: string[] = [];
        if (newLeads > 0) actions.push(`Qualify ${newLeads} new lead(s) into opportunities`);
        if (stale.length > 0) actions.push(`Re-engage ${stale.length} stale opportunit${stale.length === 1 ? 'y' : 'ies'} with a follow-up`);
        if (quotesDraft > 0) actions.push(`Send or revise ${quotesDraft} draft quote(s)`);
        return {
            summary: `Sales pipeline: ${opportunities.length} opportunities, ~${Math.round(pipelineValue).toLocaleString('en-KE')} KES open, ${stale.length} going stale.`,
            metrics: { opportunities: opportunities.length, openValueKes: Math.round(pipelineValue), staleOpportunities: stale.length, newLeads, draftQuotes: quotesDraft, ...Object.fromEntries(Object.entries(byStage).map(([k, v]) => [`stage_${k}`, v])) },
            highlights,
            actions,
            recommendations: ['Owner: review the top 3 opportunities by value and set next-step dates.'],
        };
    },

    async 'customer-care'(prisma) {
        const tickets = await recentRows(prisma, 'SupportTicket', 100);
        const open = tickets.filter((t) => t.status === 'open');
        const breached = tickets.filter((t) => t.slaBreachedAt || (t.priority === 'high' && t.status === 'open' && !isAfter(t.updatedAt, since(1))));
        const [enquiries, chats] = await Promise.all([
            countWhere(prisma, 'ContactEnquiry', { status: 'new' }),
            countWhere(prisma, 'ChatConversation', { status: 'open' }),
        ]);
        const urgent = open.filter((t) => t.priority === 'high' || t.priority === 'urgent');
        const highlights = [
            `${open.length} open ticket(s), ${urgent.length} high priority`,
            `${breached.length} SLA breach(es) detected`,
            `${enquiries} new enquiries + ${chats} open chat session(s) awaiting reply`,
        ];
        const actions: string[] = [];
        if (urgent.length) actions.push(`Respond to ${urgent.length} high-priority ticket(s) first`);
        if (breached.length) actions.push(`Escalate ${breached.length} SLA-breached ticket(s) to a human`);
        if (enquiries) actions.push(`Answer ${enquiries} contact enquir(ies)`);
        return {
            summary: `Support queue: ${open.length} open tickets (${urgent.length} urgent), ${enquiries} pending enquiries.`,
            metrics: { openTickets: open.length, urgentTickets: urgent.length, slaBreaches: breached.length, newEnquiries: enquiries, openChats: chats },
            highlights,
            actions,
            recommendations: breached.length ? ['Owner: SLA breaches need a same-day human response.'] : ['Queues healthy — keep the canned-response library updated.'],
        };
    },

    async monitoring(prisma) {
        const dayAgo = since(1);
        const [bookings24h, signups, failedRuns] = await Promise.all([
            recentRows(prisma, 'Booking', 200),
            recentRows(prisma, 'Employee', 200),
            recentRows(prisma, 'AgentRun', 50, 'startedAt'),
        ]);
        const b24 = (bookings24h as any[]).filter((b) => isAfter(b.createdAt, dayAgo)).length;
        const e24 = (signups as any[]).filter((e) => isAfter(e.createdAt, dayAgo)).length;
        const failedAgents = (failedRuns as any[]).filter((r) => r.status === 'failed').length;
        const metrics = { bookings24h: b24, newEmployees24h: e24, failedAgentRuns: failedAgents };
        const highlights = [
            `${b24} booking(s) and ${e24} new team member(s) in 24h`,
            failedAgents ? `${failedAgents} failed agent run(s) in recent history` : 'No failed agent runs recently',
        ];
        const actions = failedAgents > 0 ? [`Investigate ${failedAgents} failed agent run(s)`] : [];
        return {
            summary: `Platform pulse: ${b24} bookings/24h, ${e24} signups/24h${failedAgents ? `, ${failedAgents} failed agent runs` : ''}.`,
            metrics,
            highlights,
            actions,
            recommendations: ['Owner: check Fly.io machine status and Neon connection latency if bookings drop >50% WoW.'],
        };
    },

    async finance(prisma) {
        const invoices = await recentRows(prisma, 'Invoice', 200);
        const issued = invoices.filter((i) => ['issued', 'partially_paid', 'overdue'].includes(i.status));
        const overdue = issued.filter((i) => i.dueAt && tsMs(i.dueAt) < Date.now() && Number(i.balanceDue ?? 0) > 0);
        const outstanding = issued.reduce((s, i) => s + Number(i.balanceDue ?? 0), 0);
        const [pendingExpenses, payments24h] = await Promise.all([
            countWhere(prisma, 'Expense', { status: 'submitted' }),
            recentRows(prisma, 'Payment', 100),
        ]);
        const paid24 = (payments24h as any[]).filter((p) => isAfter(p.createdAt, since(1))).length;
        const highlights = [
            `${issued.length} open invoice(s), ${overdue.length} overdue`,
            `Outstanding balance ≈ ${Math.round(outstanding).toLocaleString('en-KE')} KES`,
            `${pendingExpenses} expense claim(s) awaiting review`,
            `${paid24} payment(s) recorded in 24h`,
        ];
        const actions: string[] = [];
        if (overdue.length) actions.push(`Send payment reminders for ${overdue.length} overdue invoice(s)`);
        if (pendingExpenses) actions.push(`Approve/reject ${pendingExpenses} expense claim(s)`);
        return {
            summary: `Finance sweep: ${issued.length} open invoices (${overdue.length} overdue), ~${Math.round(outstanding).toLocaleString('en-KE')} KES outstanding.`,
            metrics: { openInvoices: issued.length, overdueInvoices: overdue.length, outstandingKes: Math.round(outstanding), pendingExpenses, payments24h: paid24 },
            highlights,
            actions,
            recommendations: ['Owner: review overdue invoices >30 days and decide on payment plans.'],
        };
    },

    async hr(prisma) {
        const [pendingLeave, attendance, portfolioConfigs, employees] = await Promise.all([
            countWhere(prisma, 'LeaveRequest', { status: 'pending' }),
            recentRows(prisma, 'AttendanceRecord', 200),
            recentRows(prisma, 'EmployeePortfolioConfig', 200),
            recentRows(prisma, 'Employee', 200),
        ]);
        // A submitted-but-unpublished portfolio config awaits moderation.
        const pendingPortfolios = (portfolioConfigs as any[]).filter((c) => !c.published && c.draftConfig).length;
        const absentToday = (attendance as any[]).filter((a) => a.workDate === ts().slice(0, 10) && (a.status === 'absent' || a.status === 'leave')).length;
        const newHires = (employees as any[]).filter((e) => isAfter(e.createdAt, since(30))).length;
        const highlights = [
            `${pendingLeave} leave request(s) pending review`,
            `${absentToday} attendance flag(s) today`,
            `${pendingPortfolios} portfolio submission(s) awaiting approval`,
            `${newHires} team member(s) joined in the last 30 days`,
        ];
        const actions: string[] = [];
        if (pendingLeave) actions.push(`Review ${pendingLeave} leave request(s)`);
        if (pendingPortfolios) actions.push(`Moderate ${pendingPortfolios} portfolio submission(s)`);
        return {
            summary: `People ops: ${pendingLeave} pending leave requests, ${pendingPortfolios} portfolios awaiting moderation, ${newHires} recent hires.`,
            metrics: { pendingLeave, attendanceFlagsToday: absentToday, pendingPortfolios, newHires30d: newHires },
            highlights,
            actions,
            recommendations: ['Owner: keep the onboarding checklist moving for new hires.'],
        };
    },

    async analytics(prisma) {
        const [bookings, leads, invoices, tickets, posts] = await Promise.all([
            countWhere(prisma, 'Booking'),
            countWhere(prisma, 'Lead'),
            countWhere(prisma, 'Invoice'),
            countWhere(prisma, 'SupportTicket'),
            countWhere(prisma, 'BlogPost'),
        ]);
        const metrics = { totalBookings: bookings, totalLeads: leads, totalInvoices: invoices, totalTickets: tickets, totalPosts: posts };
        return {
            summary: `Weekly business digest: ${bookings} bookings, ${leads} leads, ${invoices} invoices, ${tickets} support tickets, ${posts} blog posts on record.`,
            metrics,
            highlights: [`Lead→booking coverage: ${bookings}/${leads} leads converted to bookings (lifetime)`],
            actions: [],
            recommendations: ['Owner: compare this week vs last in the Reports screen; double down on the best-converting channel.'],
        };
    },

    async 'security-compliance'(prisma) {
        const audit = await recentRows(prisma, 'AuditLog', 100);
        const weekAgo = since(7);
        const recentAudit = (audit as any[]).filter((a) => isAfter(a.createdAt, weekAgo));
        const sensitive = recentAudit.filter((a) => /delete|permission|role|payment|auth/i.test(String(a.action ?? '') + String(a.entity ?? '')));
        const deniedRuns = (await recentRows(prisma, 'AgentRun', 50, 'startedAt')).filter((r) => r.status === 'failed');
        const pendingApprovals = await countWhere(prisma, 'ApprovalRequest', { status: 'pending' });
        const highlights = [
            `${recentAudit.length} audit events in 7 days (${sensitive.length} sensitive)`,
            `${deniedRuns.length} failed agent run(s) on record`,
            `${pendingApprovals} approval(s) awaiting decision`,
        ];
        const actions: string[] = [];
        if (sensitive.length > 10) actions.push('Review elevated privileged-action volume in the audit log');
        if (pendingApprovals) actions.push(`Clear ${pendingApprovals} pending approval(s)`);
        return {
            summary: `Security sweep: ${recentAudit.length} audit events this week, ${sensitive.length} touching sensitive surfaces.`,
            metrics: { auditEvents7d: recentAudit.length, sensitiveActions7d: sensitive.length, failedAgentRuns: deniedRuns.length, pendingApprovals },
            highlights,
            actions,
            recommendations: ['Owner: confirm 2FA coverage for ADMIN/SUPER_ADMIN accounts and rotate any exposed secrets.'],
        };
    },

    async pa(prisma) {
        // Workforce scorecard: per-agent run health over the last 7 days,
        // staleness vs. each agent's own cadence, and charter-compliance
        // signals (did the agent escalate, or did it go silent?).
        const weekAgo = since(7);
        const [agents, runs] = await Promise.all([
            recentRows(prisma, 'Agent', 50),
            recentRows(prisma, 'AgentRun', 300, 'startedAt'),
        ]);
        const roster = (agents as any[]).filter((a) => a.status === 'active');
        const recent = (runs as any[]).filter((r) => isAfter(r.startedAt, weekAgo));

        const scorecard = roster.map((a) => {
            const mine = recent.filter((r) => r.agentKey === a.key);
            const failures = mine.filter((r) => r.status === 'failed').length;
            const cadenceMin = Number(a.scheduleMinutes ?? agentDefinition(a.key)?.scheduleMinutes ?? 1440);
            const staleMs = a.lastRunAt ? Date.now() - tsMs(a.lastRunAt) : Number.POSITIVE_INFINITY;
            const stale = staleMs > cadenceMin * 60 * 1000 * 2.5;
            const lastSuccess = mine.filter((r) => r.status === 'success').sort((x, y) => String(y.startedAt).localeCompare(String(x.startedAt)))[0];
            const escalated = lastSuccess?.output
                ? ((lastSuccess.output.actions?.length ?? 0) + (lastSuccess.output.recommendations?.length ?? 0)) > 0
                : false;
            return {
                key: a.key,
                name: a.name,
                runs7d: mine.length,
                failures7d: failures,
                stale,
                lastRunAt: a.lastRunAt ?? null,
                escalated,
                health: failures > 2 || stale ? 'at-risk' : failures > 0 ? 'watch' : 'healthy',
            };
        });

        const atRisk = scorecard.filter((s) => s.health === 'at-risk');
        const watch = scorecard.filter((s) => s.health === 'watch');
        const healthy = scorecard.filter((s) => s.health === 'healthy');
        const totalRuns = scorecard.reduce((n, s) => n + s.runs7d, 0);
        const totalFailures = scorecard.reduce((n, s) => n + s.failures7d, 0);

        const highlights = [
            `Workforce: ${healthy.length}/${roster.length} agents healthy, ${watch.length} on watch, ${atRisk.length} at risk`,
            `${totalRuns} agent runs in 7 days, ${totalFailures} failure(s) (${totalRuns ? Math.round((totalFailures / totalRuns) * 100) : 0}% failure rate)`,
            ...atRisk.slice(0, 3).map((s) => `At risk: ${s.name} (${s.key}) — ${s.failures7d} failures, stale=${s.stale}`),
        ];
        const actions: string[] = [];
        if (atRisk.length) actions.push(`Coach ${atRisk.map((s) => s.name).join(', ')} — PA will write coaching notes this run`);
        if (watch.length) actions.push(`Monitor ${watch.map((s) => s.name).join(', ')} for improvement`);
        const silentEscalators = scorecard.filter((s) => s.escalated === false && s.runs7d > 0);
        if (silentEscalators.length) actions.push(`${silentEscalators.length} agent(s) produced reports with no escalations — verify they are not swallowing hard decisions`);
        return {
            summary: `Workforce review: ${roster.length} active agents, ${totalRuns} runs this week, ${totalFailures} failures — ${atRisk.length} need coaching, ${watch.length} on watch.`,
            metrics: {
                agentsActive: roster.length,
                agentsHealthy: healthy.length,
                agentsOnWatch: watch.length,
                agentsAtRisk: atRisk.length,
                runs7d: totalRuns,
                failures7d: totalFailures,
                failureRatePct: totalRuns ? Math.round((totalFailures / totalRuns) * 100) : 0,
            },
            highlights,
            actions,
            recommendations: [
                'Owner: review the PA coaching log (agent config → paCoaching) and act on repeated failure patterns.',
                'Owner: if an agent stays at-risk after two coaching cycles, consider pausing it until fixed.',
            ],
        };
    },
};

// ─── Runner ────────────────────────────────────────────────────────────────

/** Owner-facing recipients: SUPER_ADMIN + ADMIN employees get the report. */
async function notifyOwners(prisma: Db, agent: any, run: any, output: AgentOutput): Promise<void> {
    try {
        const admins = (await prisma.orm.public.Employee
            .orderBy((e: any) => e.createdAt.asc())
            .limit(200)
            .all()) as any[];
        const recipients = admins.filter((e) => e.role === 'SUPER_ADMIN' || e.role === 'ADMIN');
        for (const admin of recipients) {
            await createNotification(
                admin.id,
                'agent_report',
                `${agent.name} (${agent.role}) — ${run.status === 'success' ? 'report ready' : 'run failed'}`,
                output.summary ?? run.error ?? 'Agent run completed.',
                '/agents',
                { agentKey: agent.key, agentRunId: run.id, status: run.status, metrics: output.metrics }
            );
        }
    } catch (err: any) {
        console.warn('[agents] owner notification failed:', err?.message || err);
    }
}

/** Optional LLM narrative — deterministic facts stay authoritative. */
async function polishSummary(prisma: Db, agent: any, output: AgentOutput): Promise<string> {
    try {
        const { config } = await loadAIConfig(prisma as any);
        if (!config?.enabled || !config.apiKey) return output.summary;
        const facts = JSON.stringify({ metrics: output.metrics, highlights: output.highlights }).slice(0, 4000);
        const charter = agentCharter(agent.key);
        const charterLine = charter
            ? `\nCharter: ${charter.mandate}\nDecision rights — autonomous: ${charter.autonomous.join('; ')}. Escalate to owner: ${charter.escalateToOwner.join('; ')}.`
            : '';
        const workforce = describeWorkforce(await getWorkforceState());
        const taskLine = output.task ? `\nAssigned task: ${output.task}` : '';
        const text = await aiComplete(config, [
            { role: 'system', content: 'You are a trained operations professional writing a report for your CEO. You can see your colleagues\' live state — coordinate, don\'t duplicate their work. Be concise, factual, and honest about what needs escalation. No preamble.' },
            { role: 'user', content: `Agent: ${agent.name} — ${agent.role}${charterLine}${taskLine}\nYour colleagues right now:\n${workforce}\nFacts:\n${facts}` },
        ], { maxTokens: 220, temperature: 0.3 });
        return text.trim() || output.summary;
    } catch {
        return output.summary;
    }
}

export async function runAgent(
    prisma: Db,
    agent: any,
    trigger: 'schedule' | 'manual' | 'event' = 'schedule',
    actorId?: string,
    task?: string
): Promise<any> {
    const def = agentDefinition(agent.key);
    const collector = collectors[agent.key];
    if (!collector) throw new Error(`No collector registered for agent "${agent.key}"`);

    // Publish the current assignment so colleagues/admins see it live.
    if (task) {
        try {
            const cfg = (agent.config && typeof agent.config === 'object' ? { ...agent.config } : {}) as any;
            cfg.activeTask = task;
            await prisma.orm.public.Agent.where({ id: agent.id }).update({ config: cfg, updatedAt: ts() });
            await writeAgentStatus(agent.key, { currentTask: task, state: 'working' });
        } catch { /* status is best-effort */ }
    }

    const run = await prisma.orm.public.AgentRun.create({
        id: newId(),
        agentId: agent.id,
        agentKey: agent.key,
        _trigger: trigger,
        status: 'running',
        createdById: actorId ?? null,
    });

    const started = Date.now();
    try {
        const output = await collector(prisma, agent);
        if (task) output.task = task;
        output.summary = await polishSummary(prisma, agent, output);
        await runProactive(prisma, agent, output);
        // Mirror human-decision items into the shared Approvals queue so they
        // are tracked until someone signs off (or the issue resolves itself).
        const queued = await syncAgentActions(prisma, agent, output);
        if (queued > 0) {
            output.highlights.push(`Approval queue: ${queued} new action item(s) awaiting owner decision`);
        }
        const finished = await prisma.orm.public.AgentRun
            .where({ id: run.id })
            .update({
                status: 'success',
                summary: output.summary,
                output: output as any,
                finishedAt: ts(),
            });
        const isEvent = trigger === 'event';
        await prisma.orm.public.Agent
            .where({ id: agent.id })
            .update({
                lastRunAt: ts(),
                // Event runs react to live work; they must not push the
                // scheduled report cadence out — nextRunAt stays untouched.
                ...(isEvent ? {} : { nextRunAt: ts(Date.now() + (def?.scheduleMinutes ?? agent.scheduleMinutes ?? 1440) * 60 * 1000) }),
                updatedAt: ts(),
            });
        // Event runs can fire every few seconds — don't spam the in-app
        // notification feed; scheduled/manual runs still notify on success.
        if (!isEvent) void notifyOwners(prisma, agent, { ...finished, status: 'success' }, output);
        if (task) void clearActiveTask(prisma, agent);
        console.log(`[agents] ${agent.key} run ${run.id} succeeded in ${Date.now() - started}ms`);
        return { ...finished, output };
    } catch (err: any) {
        const message = String(err?.message ?? err).slice(0, 2000);
        const failed = await prisma.orm.public.AgentRun
            .where({ id: run.id })
            .update({ status: 'failed', error: message, finishedAt: ts() });
        const isEvent = trigger === 'event';
        await prisma.orm.public.Agent
            .where({ id: agent.id })
            .update({
                lastRunAt: ts(),
                ...(isEvent ? {} : { nextRunAt: ts(Date.now() + (def?.scheduleMinutes ?? agent.scheduleMinutes ?? 1440) * 60 * 1000) }),
                updatedAt: ts(),
            });
        void notifyOwners(prisma, agent, { ...failed, status: 'failed', error: message }, {
            summary: `Agent run failed: ${message}`,
            metrics: {}, highlights: [], actions: [], recommendations: ['Owner: check backend logs for the agent failure.'],
        });
        console.warn(`[agents] ${agent.key} run ${run.id} failed:`, message);
        if (task) void clearActiveTask(prisma, agent);
        return { ...failed, output: null };
    }
}

async function clearActiveTask(prisma: Db, agent: any): Promise<void> {
    try {
        const cfg = (agent.config && typeof agent.config === 'object' ? { ...agent.config } : {}) as any;
        delete cfg.activeTask;
        await prisma.orm.public.Agent.where({ id: agent.id }).update({ config: cfg, updatedAt: ts() });
        await writeAgentStatus(agent.key, { currentTask: null, state: 'idle' });
    } catch { /* best-effort */ }
}
