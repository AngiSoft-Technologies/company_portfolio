import type { Db } from '../../../db';
import { ts, tsMs, newId } from '../../../prisma/db';
import { sendMail } from '../../../shared/services/email';
import type { AgentOutput } from './agentRunner';

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
    if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL;
    if (process.env.OWNER_EMAIL) return process.env.OWNER_EMAIL;
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

async function ledgerEntries(prisma: Db, action: string, entity?: string, limit = 200): Promise<any[]> {
    try {
        let q: any = prisma.orm.public.AuditLog.where({ action });
        if (entity) q = q.where({ entity });
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
    const rows = await ledgerEntries(prisma, 'agent.outreach', entityType);
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

let emailsSentThisRun = 0;
export function resetOutboundBudget(): void {
    emailsSentThisRun = 0;
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
    if (emailsSentThisRun >= MAX_EMAILS_PER_AGENT_RUN) return false;
    if (!mail.to || !mail.to.includes('@')) return false;
    if (mail.entityType && mail.entityId) {
        if (await alreadyContacted(prisma, agentKey, mail.entityType, mail.entityId, dedupeDays)) return false;
    }
    try {
        await sendMail({
            to: mail.to,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            purpose: 'general',
        });
        emailsSentThisRun += 1;
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
        text: `${output.summary}\n\n${(output.actions ?? []).join('\n')}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:640px">
            <h2 style="margin:0 0 4px">${escapeHtml(agent.name)} — ${escapeHtml(agent.role)}</h2>
            <p style="color:#64748b;margin:0 0 12px">${escapeHtml(agent.department ?? '')} · automated report</p>
            <p>${escapeHtml(output.summary)}</p>
            ${metrics ? `<table style="border-collapse:collapse;margin:8px 0">${metrics}</table>` : ''}
            ${highlights ? `<ul>${highlights}</ul>` : ''}
            ${actions}
            <p style="color:#94a3b8;font-size:12px;margin-top:20px">Sent by the AngiSoft AI workforce · manage agents in admin → AI Workforce</p>
          </div>`,
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
            text: body,
            html: `<div style="font-family:system-ui,sans-serif"><h3>${escapeHtml(subject)}</h3><p>${escapeHtml(body)}</p><p style="color:#94a3b8;font-size:12px">Sent by agent "${escapeHtml(agentKey)}"</p></div>`,
        });
    } catch (err: any) {
        console.warn(`[agents] owner alert failed:`, err?.message || err);
    }
    await notifyOwnerSms(`${agentKey}: ${subject} — ${body.slice(0, 140)}`);
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
    const url = process.env.SMS_GATEWAY_URL;
    const to = process.env.SMS_TO;
    if (!url || !to) return false;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.SMS_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}` } : {}),
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

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Wrap a body in a minimal human-voiced HTML email shell. */
export function emailShell(title: string, bodyHtml: string): string {
    return `
      <div style="font-family:Georgia,serif;max-width:620px;color:#1e293b">
        <p style="font-size:13px;color:#64748b;margin:0 0 16px">AngiSoft Technologies</p>
        <div style="font-size:15px;line-height:1.6">${bodyHtml}</div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">
        <p style="font-size:12px;color:#94a3b8">You received this because you contacted AngiSoft Technologies.
        Reply to this email or reach us on WhatsApp +254710398690.</p>
      </div>`;
}
