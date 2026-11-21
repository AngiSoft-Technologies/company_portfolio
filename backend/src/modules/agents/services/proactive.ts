import type { Db } from '../../../db';
import { ts, tsMs, newId } from '../../../prisma/db';
import {
    sendAgentEmail,
    emailOwnerReport,
    alertOwner,
    alreadyContacted,
    emailShell,
    resetOutboundBudget,
    MAX_EMAILS_PER_AGENT_RUN,
} from './agentOutreach';
import type { AgentOutput } from './agentRunner';

/**
 * Proactive phase — runs after a successful agent report.
 *
 * This is where agents *act* on what they found, within hard bounds:
 *   - outbound email capped at MAX_EMAILS_PER_AGENT_RUN per run, deduplicated
 *     through the AuditLog ledger (agent.outreach) over 7 days
 *   - record creation limited to low-risk CRM/CMS artifacts (opportunities,
 *     draft posts, internal ticket notes) — never financial or publishing
 *     mutations; anything consequential stays a recommendation for humans
 *   - every action is ledgered so the security-compliance agent and the
 *     audit log can review exactly what the workforce did and to whom
 */

export interface ProactiveResult {
    emailsSent: number;
    recordsCreated: number;
    alerts: number;
    notes: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 14;

function since(days: number): string {
    return ts(Date.now() - days * DAY_MS);
}

async function rows(prisma: Db, model: string, limit = 100, orderField = 'createdAt'): Promise<any[]> {
    try {
        const q: any = (prisma.orm.public as any)[model];
        if (!q) return [];
        return (await q.orderBy((r: any) => r[orderField].desc()).limit(limit).all()) ?? [];
    } catch {
        return [];
    }
}

async function findOne(prisma: Db, model: string, crit: Record<string, unknown>): Promise<any | null> {
    try {
        const q: any = (prisma.orm.public as any)[model];
        if (!q) return null;
        return await q.where(crit).first();
    } catch {
        return null;
    }
}

async function ledgerRecord(prisma: Db, action: string, entity: string, entityId: string, meta: Record<string, unknown>): Promise<void> {
    try {
        await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: null,
            action,
            entity,
            entityId,
            meta: meta as any,
            createdAt: ts(),
        });
    } catch (err: any) {
        console.warn('[agents] proactive ledger write failed:', err?.message || err);
    }
}

async function firstEmployeeId(prisma: Db): Promise<string> {
    try {
        const emps: any[] = (await prisma.orm.public.Employee.orderBy((e: any) => e.createdAt.asc()).limit(1).all()) ?? [];
        return emps[0]?.id ?? 'system';
    } catch {
        return 'system';
    }
}

// ─── Per-agent proactive routines ──────────────────────────────────────────

/** marketing-growth: intro/follow-up emails to fresh leads; qualify into opportunities. */
async function growthOutreach(prisma: Db, agent: any, _output: AgentOutput, res: ProactiveResult): Promise<void> {
    const leads = (await rows(prisma, 'Lead', 100)).filter((l) => l.email && String(l.email).includes('@'));
    const fresh = leads.filter((l) => l.status === 'new' || l.stage === 'new');
    for (const lead of fresh.slice(0, MAX_EMAILS_PER_AGENT_RUN)) {
        if (await alreadyContacted(prisma, agent.key, 'lead', lead.id, 7)) continue;
        const firstName = String(lead.name ?? '').split(' ')[0] || 'there';
        const interest = lead.source ? ` about ${lead.source}` : '';
        const sent = await sendAgentEmail(prisma, agent.key, {
            to: lead.email,
            subject: `Following up on your interest${interest} — AngiSoft Technologies`,
            entityType: 'lead',
            entityId: lead.id,
            text: `Hi ${firstName},\n\nThanks for reaching out to AngiSoft Technologies${interest}. I'm following up personally to understand what you're building and whether we can help.\n\nWould a quick 15-minute call this week work?\n\n— AngiSoft Technologies`,
            html: emailShell(
                'Following up',
                `<p>Hi ${firstName},</p>
                 <p>Thanks for reaching out to AngiSoft Technologies${interest}. I'm following up personally to understand what you're building and whether we can help.</p>
                 <p>Would a quick 15-minute call this week work? Just reply to this email with a time that suits you.</p>
                 <p>Warm regards,<br>AngiSoft Technologies</p>`
            ),
        });
        if (sent) res.emailsSent += 1;
    }

    // Create opportunities for qualified leads that don't have one yet.
    const qualified = leads.filter((l) => l.stage === 'qualified');
    for (const lead of qualified.slice(0, 3)) {
        const existing = await findOne(prisma, 'Opportunity', { leadId: lead.id });
        if (existing) continue;
        try {
            await prisma.orm.public.Opportunity.create({
                id: newId(),
                publicReference: `OPP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`,
                title: `${lead.name} — ${lead.source ?? 'inbound lead'}`,
                leadId: lead.id,
                stage: 'new',
                currency: lead.currency ?? 'KES',
                probability: 20,
                notes: 'Auto-created by marketing-growth agent from a qualified lead.',
                createdAt: ts(),
                updatedAt: ts(),
            });
            res.recordsCreated += 1;
            await ledgerRecord(prisma, 'agent.record_created', 'opportunity', lead.id, { agentKey: agent.key, leadId: lead.id });
            res.notes.push(`Created opportunity for qualified lead "${lead.name}"`);
        } catch (err: any) {
            console.warn('[agents] opportunity create failed:', err?.message || err);
        }
    }
}

/** marketing-content: SEO audit + draft a blog post when the calendar runs dry. */
async function contentProactive(prisma: Db, agent: any, output: AgentOutput, res: ProactiveResult): Promise<void> {
    const [services, products, posts] = await Promise.all([
        rows(prisma, 'Service', 100),
        rows(prisma, 'Product', 100),
        rows(prisma, 'BlogPost', 100),
    ]);
    const published = posts.filter((p) => p.published);
    const seoGaps = [
        ...services.filter((s) => s.published && (!s.seoTitle || !s.seoDesc)).map((s) => `service "${s.title}"`),
        ...products.filter((p) => p.published && (!p.seoTitle || !p.seoDesc)).map((p) => `product "${p.name}"`),
        ...published.filter((p) => !p.seoTitle || !p.seoDescription).map((p) => `post "${p.title}"`),
    ];
    if (seoGaps.length) {
        output.highlights.push(`SEO gaps: ${seoGaps.length} published item(s) missing meta titles/descriptions — top: ${seoGaps.slice(0, 3).join(', ')}`);
        output.recommendations.unshift('Marketing: fill seoTitle/seoDesc on the flagged services, products and posts.');
    }

    // Keep the editorial calendar alive: if nothing published in 14 days and no
    // draft is waiting, create a draft outline post for human review.
    const twoWeeksAgo = since(14);
    const recentPublished = published.filter((p) => tsMs(p.publishedAt ?? p.createdAt) >= tsMs(twoWeeksAgo));
    const hasDraft = posts.some((p) => !p.published);
    if (recentPublished.length === 0 && !hasDraft) {
        const serviceNames = services.filter((s) => s.published).map((s) => s.title).slice(0, 5);
        const topic = serviceNames.length ? serviceNames[0] : 'our services';
        try {
            await prisma.orm.public.BlogPost.create({
                id: newId(),
                title: `How ${topic} helps growing teams in Kenya`,
                slug: `how-${String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
                content: `# Draft — needs human editing before publishing\n\n## Outline\n- The problem ${topic} solves\n- How AngiSoft approaches it\n- A client example\n- How to get started\n\n*Generated by the marketing-content agent. Replace this scaffold with a real article.*`,
                authorId: await firstEmployeeId(prisma),
                published: false,
                excerpt: `An overview of how ${topic} delivers results for teams across Kenya.`,
                contentType: 'article',
                createdAt: ts(),
                updatedAt: ts(),
            });
            res.recordsCreated += 1;
            await ledgerRecord(prisma, 'agent.record_created', 'blog_post', 'draft', { agentKey: agent.key, topic });
            res.notes.push('Created a draft blog post — review and publish in CMS');
        } catch (err: any) {
            console.warn('[agents] draft post create failed:', err?.message || err);
        }
    }
}

/** sales-agent: follow up stale opportunities and draft-quote reminders. */
async function salesOutreach(prisma: Db, agent: any, output: AgentOutput, res: ProactiveResult): Promise<void> {
    const opportunities = await rows(prisma, 'Opportunity', 100);
    const stale = opportunities.filter((o) =>
        !['won', 'lost'].includes(String(o.stage)) && tsMs(o.updatedAt) < tsMs(since(STALE_DAYS))
    );
    const clients = await rows(prisma, 'Client', 200);
    const leads = await rows(prisma, 'Lead', 200);
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const leadById = new Map(leads.map((l) => [l.id, l]));

    for (const opp of stale.slice(0, MAX_EMAILS_PER_AGENT_RUN)) {
        const contact = (opp.clientId && clientById.get(opp.clientId)) || (opp.leadId && leadById.get(opp.leadId));
        if (!contact?.email || !String(contact.email).includes('@')) continue;
        if (await alreadyContacted(prisma, agent.key, 'opportunity', opp.id, 7)) continue;
        const name = String(contact.name ?? '').split(' ')[0] || 'there';
        const sent = await sendAgentEmail(prisma, agent.key, {
            to: contact.email,
            subject: `Checking in on "${opp.title}" — AngiSoft Technologies`,
            entityType: 'opportunity',
            entityId: opp.id,
            text: `Hi ${name},\n\nI wanted to check in on "${opp.title}". Has anything changed on your side since we last spoke? Happy to pick things up whenever you're ready — even a quick reply helps me plan the team's week.\n\n— AngiSoft Technologies`,
            html: emailShell(
                'Checking in',
                `<p>Hi ${name},</p>
                 <p>I wanted to check in on <strong>"${String(opp.title).replace(/</g, '&lt;')}"</strong>. Has anything changed on your side since we last spoke?</p>
                 <p>Happy to pick things up whenever you're ready — even a quick reply helps me plan the team's week.</p>
                 <p>Warm regards,<br>AngiSoft Technologies</p>`
            ),
        });
        if (sent) {
            res.emailsSent += 1;
            await ledgerRecord(prisma, 'agent.outreach_note', 'opportunity', opp.id, { agentKey: agent.key, followUp: true });
        }
    }
    if (stale.length > res.emailsSent) {
        output.actions.push(`Sales: ${stale.length - res.emailsSent} stale opportunit${stale.length === 1 ? 'y needs' : 'ies need'} a human follow-up call`);
    }
}

/** customer-care: acknowledge new enquiries and triage-note fresh tickets. */
async function careProactive(prisma: Db, agent: any, _output: AgentOutput, res: ProactiveResult): Promise<void> {
    const enquiries = await rows(prisma, 'ContactEnquiry', 50);
    const fresh = enquiries.filter((e) => e.status === 'new' && !e.respondedAt && e.email);
    for (const enquiry of fresh.slice(0, MAX_EMAILS_PER_AGENT_RUN)) {
        if (await alreadyContacted(prisma, agent.key, 'enquiry', enquiry.id, 7)) continue;
        const name = String(enquiry.name ?? '').split(' ')[0] || 'there';
        const sent = await sendAgentEmail(prisma, agent.key, {
            to: enquiry.email,
            subject: `We received your enquiry — AngiSoft Technologies`,
            entityType: 'enquiry',
            entityId: enquiry.id,
            text: `Hi ${name},\n\nThanks for getting in touch about "${enquiry.subject}". A member of our team will review it and come back to you shortly — usually within one business day.\n\n— AngiSoft Technologies`,
            html: emailShell(
                'Enquiry received',
                `<p>Hi ${name},</p>
                 <p>Thanks for getting in touch about <strong>${String(enquiry.subject ?? '').replace(/</g, '&lt;')}</strong>. A member of our team will review it and come back to you shortly — usually within one business day.</p>
                 <p>— AngiSoft Technologies</p>`
            ),
        });
        if (sent) {
            res.emailsSent += 1;
            // Move the enquiry into the human review queue so staff see it was touched.
            try {
                await prisma.orm.public.ContactEnquiry.where({ id: enquiry.id }).update({ status: 'in_review', respondedAt: ts() });
            } catch { /* status enum drift — ledger still records the touch */ }
        }
    }

    // Internal triage note on brand-new tickets so the assignee sees AI context.
    const tickets = await rows(prisma, 'SupportTicket', 50);
    const untriaged = tickets.filter((t) => t.status === 'open' && !t.assignedToId);
    for (const ticket of untriaged.slice(0, 3)) {
        try {
            const existing: any = await prisma.orm.public.TicketMessage
                .where({ ticketId: ticket.id, internal: true })
                .first()
                .catch(() => null);
            if (existing) continue;
            await prisma.orm.public.TicketMessage.create({
                id: newId(),
                ticketId: ticket.id,
                authorId: null,
                body: `AI triage (${agent.name}): ticket opened ${String(ticket.createdAt).slice(0, 10)} with priority "${ticket.priority}". Suggested first response: acknowledge receipt, restate the issue, and give an ETA.`,
                internal: true,
                createdAt: ts(),
            });
            res.recordsCreated += 1;
            await ledgerRecord(prisma, 'agent.record_created', 'ticket_message', ticket.id, { agentKey: agent.key, kind: 'triage_note' });
        } catch (err: any) {
            console.warn('[agents] triage note failed:', err?.message || err);
        }
    }
}

/** finance: payment reminders for overdue invoices. */
async function financeProactive(prisma: Db, agent: any, output: AgentOutput, res: ProactiveResult): Promise<void> {
    const invoices = await rows(prisma, 'Invoice', 200);
    const overdue = invoices.filter((i) =>
        ['issued', 'partially_paid', 'overdue'].includes(String(i.status)) &&
        i.dueAt && tsMs(i.dueAt) < Date.now() && Number(i.balanceDue ?? 0) > 0
    );
    const clients = await rows(prisma, 'Client', 200);
    const clientById = new Map(clients.map((c) => [c.id, c]));
    for (const inv of overdue.slice(0, MAX_EMAILS_PER_AGENT_RUN)) {
        const client = inv.clientId ? clientById.get(inv.clientId) : null;
        if (!client?.email || !String(client.email).includes('@')) continue;
        if (await alreadyContacted(prisma, agent.key, 'invoice', inv.id, 7)) continue;
        const name = String(client.name ?? '').split(' ')[0] || 'there';
        const amount = `${Math.round(Number(inv.balanceDue)).toLocaleString('en-KE')} ${inv.currency ?? 'KES'}`;
        const sent = await sendAgentEmail(prisma, agent.key, {
            to: client.email,
            subject: `Payment reminder — Invoice ${inv.number ?? inv.publicReference ?? ''}`,
            entityType: 'invoice',
            entityId: inv.id,
            text: `Hi ${name},\n\nA friendly reminder that invoice ${inv.number ?? inv.publicReference} for ${amount} was due on ${String(inv.dueAt).slice(0, 10)}. If you've already paid, please disregard this note.\n\nYou can pay via the client portal or reply here and we'll sort it out.\n\n— AngiSoft Technologies`,
            html: emailShell(
                'Payment reminder',
                `<p>Hi ${name},</p>
                 <p>A friendly reminder that invoice <strong>${String(inv.number ?? inv.publicReference ?? '').replace(/</g, '&lt;')}</strong> for <strong>${amount}</strong> was due on ${String(inv.dueAt).slice(0, 10)}.</p>
                 <p>If you've already paid, please disregard this note. Otherwise you can pay via the client portal or simply reply to this email.</p>
                 <p>— AngiSoft Technologies</p>`
            ),
        });
        if (sent) res.emailsSent += 1;
    }
    if (overdue.length > res.emailsSent) {
        output.actions.push(`Finance: ${overdue.length - res.emailsSent} overdue invoice(s) still need a human collections call`);
    }
}

/** hr: nudge stale pending leave requests toward the reviewers. */
async function hrProactive(prisma: Db, agent: any, _output: AgentOutput, res: ProactiveResult): Promise<void> {
    const requests = await rows(prisma, 'LeaveRequest', 100);
    const stale = requests.filter((r) => r.status === 'pending' && tsMs(r.createdAt) < tsMs(since(3)));
    const employees = await rows(prisma, 'Employee', 200);
    const empById = new Map(employees.map((e) => [e.id, e]));
    const reviewers = employees.filter((e) => e.role === 'SUPER_ADMIN' || e.role === 'ADMIN' || e.role === 'HR');
    for (const req of stale.slice(0, 3)) {
        const emp = empById.get(req.employeeId);
        const empName = emp ? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() : 'A team member';
        for (const reviewer of reviewers.slice(0, 2)) {
            if (!reviewer.email) continue;
            const sent = await sendAgentEmail(prisma, agent.key, {
                to: reviewer.email,
                subject: `Leave request awaiting review — ${empName}`,
                // entityId includes the reviewer so each gets their own dedupe slot.
                entityType: 'leave_request',
                entityId: `${req.id}:${reviewer.id}`,
                text: `Hi,\n\n${empName} has a ${req.type ?? 'leave'} request pending since ${String(req.createdAt).slice(0, 10)} (${String(req.startDate).slice(0, 10)} → ${String(req.endDate).slice(0, 10)}). Could you review it when you get a chance?\n\n— AngiSoft HR agent`,
                html: emailShell(
                    'Leave review needed',
                    `<p>Hi,</p>
                     <p><strong>${empName}</strong> has a ${String(req.type ?? 'leave')} request pending since ${String(req.createdAt).slice(0, 10)} (${String(req.startDate).slice(0, 10)} → ${String(req.endDate).slice(0, 10)}).</p>
                     <p>Could you review it when you get a chance?</p>
                     <p>— AngiSoft HR agent</p>`
                ),
            });
            if (sent) res.emailsSent += 1;
        }
    }
}

/** pa: the workforce coach — audits run health and writes coaching notes. */
async function paCoach(prisma: Db, agent: any, output: AgentOutput, res: ProactiveResult): Promise<void> {
    const roster = (await rows(prisma, 'Agent', 50)).filter((a) => a.status === 'active' && a.key !== 'pa');
    const runs = await rows(prisma, 'AgentRun', 300, 'startedAt');
    const weekAgo = since(7);
    const recent = runs.filter((r) => tsMs(r.startedAt) >= tsMs(weekAgo));

    for (const member of roster) {
        const mine = recent.filter((r) => r.agentKey === member.key);
        const failures = mine.filter((r) => r.status === 'failed');
        const cadenceMin = Number(member.scheduleMinutes ?? 1440);
        const stale = member.lastRunAt
            ? Date.now() - tsMs(member.lastRunAt) > cadenceMin * 60 * 1000 * 2.5
            : mine.length === 0;
        if (!failures.length && !stale) continue;

        // Compose a specific, professional coaching note — cite the evidence.
        const lastError = failures[0]?.error ? ` Last error: ${String(failures[0].error).slice(0, 160)}.` : '';
        const note =
            `[${ts().slice(0, 10)}] PA review: ${failures.length} failed run(s) and/or stale schedule in the last 7 days.${lastError} ` +
            `Charter reminder: stay inside your decision rights — escalate hard calls to the owner instead of guessing, ` +
            `respect the outreach caps, and make sure every report ends with clear actions or an explicit "all clear".`;

        try {
            const cfg = (member.config && typeof member.config === 'object' ? { ...member.config } : {}) as any;
            const log: any[] = Array.isArray(cfg.paCoaching) ? [...cfg.paCoaching] : [];
            log.unshift({ at: ts(), note, failures7d: failures.length, stale });
            cfg.paCoaching = log.slice(0, 8);
            await prisma.orm.public.Agent.where({ id: member.id }).update({ config: cfg, updatedAt: ts() });
            res.recordsCreated += 1;
            res.notes.push(`Coaching note written for ${member.key}`);
            await ledgerRecord(prisma, 'agent.record_created', 'agent', member.key, { agentKey: agent.key, kind: 'coaching_note' });
        } catch (err: any) {
            console.warn(`[agents] PA coaching write failed for ${member.key}:`, err?.message || err);
        }
        output.actions.push(`PA coached ${member.name} (${member.key}) — see config.paCoaching`);
    }
    if (!res.recordsCreated) res.notes.push('Roster healthy — no coaching needed this cycle');
}

/** monitoring: page the owner immediately when agent runs are failing. */
async function monitoringProactive(prisma: Db, agent: any, output: AgentOutput, res: ProactiveResult): Promise<void> {
    const failed = Number(output.metrics?.failedAgentRuns ?? 0);
    if (failed > 0) {
        await alertOwner(
            prisma,
            agent.key,
            `${failed} agent run(s) failing`,
            `The monitoring agent detected ${failed} failed agent run(s) in recent history. Check admin → AI Workforce → recent runs for the error column.`
        );
        res.alerts += 1;
        res.notes.push('Owner alerted about failed agent runs');
    }
}

// ─── Entry point ───────────────────────────────────────────────────────────

const proactiveRoutines: Record<string, (prisma: Db, agent: any, output: AgentOutput, res: ProactiveResult) => Promise<void>> = {
    'marketing-growth': growthOutreach,
    'marketing-content': contentProactive,
    'sales-agent': salesOutreach,
    'customer-care': careProactive,
    finance: financeProactive,
    hr: hrProactive,
    monitoring: monitoringProactive,
    pa: paCoach,
};

/**
 * Execute the proactive phase for a successful run, then email the owner's
 * report (self-throttled to ~daily per agent). Never throws — proactive
 * failures are logged, not fatal to the run record.
 */
export async function runProactive(prisma: Db, agent: any, output: AgentOutput): Promise<ProactiveResult> {
    const res: ProactiveResult = { emailsSent: 0, recordsCreated: 0, alerts: 0, notes: [] };
    resetOutboundBudget();
    try {
        const routine = proactiveRoutines[agent.key];
        if (routine) await routine(prisma, agent, output, res);
        if (await emailOwnerReport(prisma, agent, output)) res.notes.push('Owner report emailed');
        if (res.emailsSent || res.recordsCreated || res.alerts) {
            output.highlights.push(
                `Proactive actions this run: ${res.emailsSent} email(s) sent, ${res.recordsCreated} record(s) created, ${res.alerts} owner alert(s)`
            );
        }
    } catch (err: any) {
        console.warn(`[agents] proactive phase failed for ${agent.key}:`, err?.message || err);
        res.notes.push(`Proactive phase error: ${err?.message || err}`);
    }
    return res;
}
