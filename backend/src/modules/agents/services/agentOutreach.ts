import { getConfig } from '../../../shared/services/runtimeConfig';
import Redis, { type RedisOptions } from 'ioredis';
import type { Db } from '../../../db';
import { ts, tsMs, newId } from '../../../prisma/db';
import { getRedisUrl, redisConnectionOptions } from '../../../shared/services/redis';
import {
    escapeHtml,
    renderBrandedDocument,
    renderBrandedEmail,
    sendMail,
} from '../../../shared/services/email';
import type { BrandedDocumentInput } from '../../../shared/services/email';
import type { AgentOutput } from './agentRunner';

export { escapeHtml };

/**
 * Proactive outreach layer for the AI workforce.
 *
 * Collectors observe; this module acts — within hard bounds:
 *
 *   - Every outbound email is human-written in the owner's voice, queued via
 *     the existing Zoho `sendMail` pipeline, capped per run, and deduplicated
 *     through the AuditLog ledger (`agent.outreach` / `agent.report_emailed`
 *     actions) so a 2-hourly agent never double-pings the same person.
 *   - SMS goes through a generic HTTP gateway configured purely by env
 *     (`SMS_GATEWAY_URL`, `SMS_GATEWAY_TOKEN`, `SMS_TO`). With no gateway
 *     configured it is a no-op — agents degrade to email + in-app reports.
 *   - Agents still never mutate *business* records here; record creation
 *     (draft posts, opportunities, ticket notes) lives in the collectors'
 *     companion `proactive` phase and is itself capped and logged.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_EMAILS_PER_AGENT_RUN = 5;
const OWNER_REPORT_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000; // ~daily digest throttle

// ─── Owner addressing ──────────────────────────────────────────────────────

let cachedOwnerEmail: string | null = null;

export async function ownerEmail(prisma: Db): Promise<string | null> {
    // CEO reporting address — OWNER_EMAIL/CEO_EMAIL win over the generic
    // ADMIN_EMAIL so workforce reports land in the owner's personal inbox.
    if (getConfig('OWNER_EMAIL')) return getConfig('OWNER_EMAIL');
    if (getConfig('CEO_EMAIL')) return getConfig('CEO_EMAIL');
    if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL;
    if (cachedOwnerEmail) return cachedOwnerEmail;
    try {
        const admins = (await prisma.orm.public.Employee
            .orderBy((e: any) => e.createdAt.asc())
            .limit(100)
            .all()) as any[];
        const owner = admins.find((e) => e.role === 'SUPER_ADMIN') ?? admins.find((e) => e.role === 'ADMIN');
        cachedOwnerEmail = owner?.email ?? null;
    } catch {
        cachedOwnerEmail = null;
    }
    return cachedOwnerEmail;
}

// ─── Outreach ledger (AuditLog doubles as the dedupe store) ────────────────

async function ledgerEntries(
    prisma: Db,
    action: string,
    entity?: string,
    limit = 200,
    entityId?: string,
): Promise<any[]> {
    try {
        let q: any = prisma.orm.public.AuditLog.where({ action });
        if (entity) q = q.where({ entity });
        if (entityId) q = q.where({ entityId });
        return (await q.orderBy((a: any) => a.createdAt.desc()).limit(limit).all()) ?? [];
    } catch {
        return [];
    }
}

async function recordLedger(
    prisma: Db,
    action: string,
    entity: string,
    entityId: string,
    meta: Record<string, unknown>
): Promise<void> {
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
        console.warn('[agents] ledger write failed:', err?.message || err);
    }
}

/** True when this agent already emailed this entity within `withinDays`. */
export async function alreadyContacted(
    prisma: Db,
    agentKey: string,
    entityType: string,
    entityId: string,
    withinDays = 7
): Promise<boolean> {
    const cutoff = Date.now() - withinDays * DAY_MS;
    const rows = await ledgerEntries(prisma, 'agent.outreach', entityType, 50, entityId);
    return rows.some((r) =>
        r.entityId === entityId &&
        (r.meta?.agentKey === agentKey || r.meta?.agent === agentKey) &&
        tsMs(r.createdAt) > cutoff
    );
}

/** Throttle owner report emails to roughly one per day per agent. */
export async function ownerReportDue(prisma: Db, agentKey: string): Promise<boolean> {
    const cutoff = Date.now() - OWNER_REPORT_MIN_INTERVAL_MS;
    const rows = await ledgerEntries(prisma, 'agent.report_emailed', 'agent', 100);
    return !rows.some((r) => r.entityId === agentKey && tsMs(r.createdAt) > cutoff);
}

// ─── Senders ───────────────────────────────────────────────────────────────

export interface OutboundEmail {
    to: string;
    subject: string;
    html: string;
    text?: string;
    entityType?: string;
    entityId?: string;
}

/**
 * Department identity for outbound mail. Send-as is enabled in Zoho, so
 * agents send *from* their department mailbox — prospects see
 * "AngiSoft Sales <sales@angisoft.co.ke>" and replies land in that inbox.
 */
const DEPARTMENT_FROM: Record<string, string> = {
    'marketing-content': '"AngiSoft Marketing" <marketing@angisoft.co.ke>',
    'marketing-growth': '"AngiSoft Marketing" <marketing@angisoft.co.ke>',
    'sales-agent': '"AngiSoft Sales" <sales@angisoft.co.ke>',
    'customer-care': '"AngiSoft Support" <support@angisoft.co.ke>',
    relationships: '"AngiSoft Partnerships" <sales@angisoft.co.ke>',
};

function deptFrom(agentKey: string): string {
    return DEPARTMENT_FROM[agentKey] ?? '"AngiSoft Technologies" <info@angisoft.co.ke>';
}

/** Per-agent run budgets. The per-agent run claim prevents same-agent overlap. */
const outboundBudgets = new Map<string, number>();
export function resetOutboundBudget(agentKey = 'default'): void {
    outboundBudgets.set(agentKey, 0);
}
export function releaseOutboundBudget(agentKey = 'default'): void {
    outboundBudgets.delete(agentKey);
}

let outreachRedis: Redis | null | undefined;
const outreachClaims = new Map<string, number>();

function claimsRedis(): Redis | null {
    if (outreachRedis !== undefined) return outreachRedis;
    const url = getRedisUrl();
    if (!url) {
        outreachRedis = null;
        return null;
    }
    try {
        const { url: _u, ...opts } = redisConnectionOptions();
        outreachRedis = new Redis(url, {
            ...(opts as RedisOptions),
            lazyConnect: true,
            enableOfflineQueue: false,
            connectTimeout: 3000,
            maxRetriesPerRequest: 1,
        });
        outreachRedis.on('error', () => {});
        void outreachRedis.connect().catch(() => {});
    } catch {
        outreachRedis = null;
    }
    return outreachRedis;
}

/** Atomic-ish outreach claim so two processes can't send the same follow-up. */
async function claimOutreachTarget(agentKey: string, entityType: string, entityId: string, dedupeDays: number): Promise<boolean> {
    const key = `agent:outreach:${agentKey}:${entityType}:${entityId}`;
    const ttlMs = Math.max(60_000, dedupeDays * DAY_MS);
    const client = claimsRedis();
    if (client?.status === 'ready') {
        try {
            return (await client.set(key, '1', 'PX', ttlMs, 'NX')) === 'OK';
        } catch {
            return false;
        }
    }
    const now = Date.now();
    for (const [k, expires] of outreachClaims) if (expires <= now) outreachClaims.delete(k);
    if (outreachClaims.has(key)) return false;
    outreachClaims.set(key, now + ttlMs);
    return true;
}

/**
 * Send a human-voiced email on behalf of the company. Deduped per
 * (agent, entity) and capped per run. Returns true when actually sent.
 */
export async function sendAgentEmail(
    prisma: Db,
    agentKey: string,
    mail: OutboundEmail,
    dedupeDays = 7
): Promise<boolean> {
    if ((outboundBudgets.get(agentKey) ?? 0) >= MAX_EMAILS_PER_AGENT_RUN) return false;
    if (!mail.to || !mail.to.includes('@')) return false;
    if (mail.entityType && mail.entityId) {
        // Scope the query to this entity instead of scanning the global ledger.
        const rows = await ledgerEntries(prisma, 'agent.outreach', mail.entityType, 50, mail.entityId);
        if (rows.some((r) => (r.meta?.agentKey === agentKey || r.meta?.agent === agentKey))) return false;
        if (!(await claimOutreachTarget(agentKey, mail.entityType, mail.entityId, dedupeDays))) return false;
    }
    try {
        await sendMail({
            to: mail.to,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            purpose: 'general',
            from: deptFrom(agentKey),
        });
        outboundBudgets.set(agentKey, (outboundBudgets.get(agentKey) ?? 0) + 1);
        if (mail.entityType && mail.entityId) {
            await recordLedger(prisma, 'agent.outreach', mail.entityType, mail.entityId, {
                agentKey,
                channel: 'email',
                to: mail.to,
                subject: mail.subject,
            });
        }
        return true;
    } catch (err: any) {
        console.warn(`[agents] ${agentKey} email to ${mail.to} failed:`, err?.message || err);
        return false;
    }
}

/** Email the owner's personal inbox with an agent's report (throttled daily). */
export async function emailOwnerReport(
    prisma: Db,
    agent: any,
    output: AgentOutput
): Promise<boolean> {
    const to = await ownerEmail(prisma);
    if (!to) return false;
    if (!(await ownerReportDue(prisma, agent.key))) return false;

    const highlights = (output.highlights ?? []).map((h) => `<li>${escapeHtml(h)}</li>`).join('');
    const actions = (output.actions ?? []).length
        ? `<h3 style="margin:16px 0 4px">Needs your decision</h3><ul>${(output.actions ?? []).map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
        : '';
    const metrics = Object.entries(output.metrics ?? {})
        .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#64748b">${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`)
        .join('');

    const sent = await sendMail({
        to,
        subject: `${agent.name} (${agent.role}) — ${new Date().toDateString()}`,
        purpose: 'general',
        senderName: 'AngiSoft AI Workforce',
        replyTo: to,
        text: `${output.summary}\n\n${(output.actions ?? []).join('\n')}`,
        html: renderBrandedEmail({
            title: `${agent.name} — ${agent.role}`,
            eyebrow: 'AI Workforce Report',
            preheader: output.summary.slice(0, 140),
            footerNote: 'Automated report from the AngiSoft AI workforce.',
            cta: {
                label: 'Open AI Workforce',
                url: `${getConfig('ADMIN_URL', 'https://admin.angisoft.co.ke')}/agents`,
            },
            bodyHtml: `
              <p style="margin:0 0 16px;color:#64748B;font-size:13px">${escapeHtml(agent.department ?? '')} · ${escapeHtml(new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }))}</p>
              <p style="margin:0 0 18px">${escapeHtml(output.summary)}</p>
              ${metrics ? `<table style="border-collapse:collapse;margin:8px 0 18px;font-size:14px">${metrics}</table>` : ''}
              ${highlights ? `<h2 style="margin:20px 0 8px;font-size:16px;color:#07142B">Highlights</h2><ul style="margin:0;padding-left:20px">${highlights}</ul>` : ''}
              ${actions}
              <p style="margin:20px 0 0;color:#64748B;font-size:13px">Review and decide in the admin console — no agent action is executed without approval.</p>`,
        }),
    });
    await recordLedger(prisma, 'agent.report_emailed', 'agent', agent.key, {
        agentKey: agent.key,
        to,
        summary: output.summary,
    });
    return Boolean(sent);
}

/** Immediate owner alert — used for anomalies that can't wait for the digest. */
export async function alertOwner(
    prisma: Db,
    agentKey: string,
    subject: string,
    body: string
): Promise<void> {
    const to = await ownerEmail(prisma);
    if (!to) return;
    try {
        await sendMail({
            to,
            subject: `[Agent alert] ${subject}`,
            purpose: 'general',
            senderName: 'AngiSoft Monitoring',
            replyTo: to,
            text: body,
            html: renderBrandedEmail({
            title: subject,
            eyebrow: 'AI Workforce Alert',
            preheader: body.slice(0, 140),
            footerNote: `Triggered by agent "${agentKey}".`,
            bodyHtml: `
              <p style="margin:0 0 16px">${escapeHtml(body)}</p>
              <p style="margin:0;color:#64748B;font-size:13px">This alert needs your attention. Reply to this email or open the admin console to review the agent run.</p>`,
        }),
        });
    } catch (err: any) {
        console.warn(`[agents] owner alert failed:`, err?.message || err);
    }
    await notifyOwnerSms(`${agentKey}: ${subject} — ${body.slice(0, 140)}`);
}

/**
 * Email the owner a print-ready branded document (NDA, letter, contract draft)
 * for approval. The document is attached as HTML and never sent to the other
 * party — that remains a SUPER_ADMIN decision.
 */
export async function emailOwnerDocument(
    prisma: Db,
    agent: any,
    args: {
        entityType: string;
        entityId: string;
        subject: string;
        filename: string;
        document: BrandedDocumentInput;
    }
): Promise<boolean> {
    const to = await ownerEmail(prisma);
    if (!to) return false;
    const prior = await ledgerEntries(prisma, 'agent.document_emailed', args.entityType, 50, args.entityId);
    if (prior.length) return false;

    try {
        await sendMail({
            to,
            subject: args.subject,
            purpose: 'general',
            senderName: 'AngiSoft Relationships',
            replyTo: to,
            text: `${args.subject}\n\nA branded draft is attached for your review. Do not send or sign it without your explicit approval.`,
            html: renderBrandedEmail({
                title: args.subject,
                eyebrow: 'Contract Draft — Owner Approval',
                preheader: 'A branded document is attached for your review.',
                footerNote: 'Draft generated by the AngiSoft relationships agent.',
                cta: {
                    label: 'Review Approvals',
                    url: `${getConfig('ADMIN_URL', 'https://admin.angisoft.co.ke')}/approvals`,
                },
                bodyHtml: `
                  <p style="margin:0 0 16px">A branded draft is attached to this email, ready for your review.</p>
                  <p style="margin:0 0 16px"><strong>${escapeHtml(args.document.title)}</strong>${args.document.reference ? ` · ${escapeHtml(args.document.reference)}` : ''}</p>
                  <p style="margin:0;color:#64748B;font-size:13px">Nothing has been sent to the counterparty. Approve, edit or reject the draft in the admin console.</p>`,
            }),
            attachments: [{
                filename: args.filename,
                contentType: 'text/html',
                content: renderBrandedDocument(args.document),
            }],
        });
        await recordLedger(prisma, 'agent.document_emailed', args.entityType, args.entityId, {
            agentKey: agent.key,
            to,
            filename: args.filename,
            title: args.document.title,
        });
        return true;
    } catch (err: any) {
        console.warn(`[agents] owner document email failed:`, err?.message || err);
        return false;
    }
}

// ─── SMS (optional gateway — no-op until configured) ───────────────────────

/**
 * SMS via a generic HTTPS gateway. Configure with:
 *   SMS_GATEWAY_URL    e.g. https://sms.example.com/send
 *   SMS_GATEWAY_TOKEN  bearer token
 *   SMS_TO             owner phone (E.164)
 * Unset → logs once and skips. Voice calls are intentionally out of scope:
 * they need a telephony provider and human-like AI voice isn't wired yet.
 */
export async function notifyOwnerSms(text: string): Promise<boolean> {
    const url = getConfig('SMS_GATEWAY_URL');
    const to = getConfig('SMS_TO');
    if (!url || !to) return false;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(getConfig('SMS_GATEWAY_TOKEN') ? { Authorization: `Bearer ${getConfig('SMS_GATEWAY_TOKEN')}` } : {}),
            },
            body: JSON.stringify({ to, message: text, text }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) console.warn(`[agents] SMS gateway responded ${res.status}`);
        return res.ok;
    } catch (err: any) {
        console.warn('[agents] SMS send failed:', err?.message || err);
        return false;
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Wrap a body in the branded AngiSoft HTML email shell. */
export function emailShell(title: string, bodyHtml: string): string {
    return renderBrandedEmail({
        title,
        eyebrow: 'AngiSoft Technologies',
        preheader: bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140),
        bodyHtml,
        footerNote: 'You received this because you contacted AngiSoft Technologies.',
    });
}

/** Render a print-ready branded document for owner approval. */
export function brandedDocument(input: BrandedDocumentInput): string {
    return renderBrandedDocument(input);
}
