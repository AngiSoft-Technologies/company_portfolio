import prisma from '../db';
import { ts } from '../prisma/db';
import { createNotification } from '../modules/notifications/services/notifications';
import { isOpenStatus, slaBreached, slaHoursFor } from './slaRules';

/**
 * SLA breach monitor (DIGITAL_HQ_PLAN Phase 4.1 — "SLA breach → alert").
 *
 * Periodically scans open support tickets and raises a notification the first
 * time a ticket exceeds its priority-based response SLA. `slaBreachedAt` is
 * the dedupe marker: once set, the ticket never alerts again until it is
 * reopened (the support-tickets route clears the marker on reopen).
 *
 * Runs on a plain interval inside the API/worker process; no queue needed —
 * the sweep is idempotent and cheap. Pure rules live in `slaRules.ts`.
 */

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

export async function sweepSlaBreaches(): Promise<number> {
    const now = Date.now();
    const tickets = (await prisma.orm.public.SupportTicket
        .where((t) => t.status.neq('resolved'))
        .where((t) => t.status.neq('closed'))
        .where((t) => t.slaBreachedAt.isNull())
        .all()) as any[];

    let alerted = 0;
    for (const ticket of tickets) {
        if (!isOpenStatus(ticket.status)) continue;
        const slaHours = slaHoursFor(ticket.priority);
        if (!slaBreached(ticket.createdAt, ticket.priority, now)) continue;

        // Claim the breach marker first so concurrent sweeps can't double-alert.
        const claimed = await prisma.orm.public.SupportTicket
            .where((t) => t.id.eq(ticket.id))
            .where((t) => t.slaBreachedAt.isNull())
            .update({ slaBreachedAt: ts(now) })
            .catch(() => null);
        if (!claimed) continue;

        const ageMs = now - new Date(ticket.createdAt).getTime();
        const hours = Math.floor(ageMs / 3600_000);
        const message = `Ticket "${ticket.subject}" (${ticket.priority} priority) has been open for ${hours}h and breached its ${slaHours}h SLA.`;

        const targets: string[] = [];
        if (ticket.assignedToId) targets.push(ticket.assignedToId);
        if (targets.length === 0) {
            // Unassigned breach → notify ADMIN staff so someone picks it up.
            const admins = (await prisma.orm.public.Employee
                .where((e) => e.role.eq('ADMIN'))
                .select('id')
                .all()) as any[];
            targets.push(...admins.map((a) => a.id));
        }

        for (const userId of targets) {
            void createNotification(
                userId,
                'ticket.sla_breach',
                'SLA breach: support ticket',
                message,
                '/support-tickets',
                { ticketId: ticket.id, priority: ticket.priority, slaHours },
            ).catch(() => undefined);
        }
        alerted++;
    }
    return alerted;
}

export function startSlaMonitor(): NodeJS.Timeout | null {
    const intervalMs = Number(process.env.SLA_MONITOR_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;

    const timer = setInterval(() => {
        sweepSlaBreaches().catch((err) => console.warn('SLA monitor sweep failed:', err?.message || err));
    }, intervalMs);
    timer.unref?.();
    // Run once shortly after boot so a fresh deploy doesn't wait a full interval.
    const boot = setTimeout(() => {
        sweepSlaBreaches().catch((err) => console.warn('SLA monitor boot sweep failed:', err?.message || err));
    }, 30_000);
    boot.unref?.();
    return timer;
}
