import prisma from '../db';
import { ts, newId } from '../prisma/db';
import { computeClientHealth } from '../modules/crm/routes/renewals';

/**
 * Recurring renewal automation (DIGITAL_HQ_PLAN — client success).
 *
 * Periodically scans clients, derives account health via the same
 * `computeClientHealth` used by /api/admin/renewals, and sends a
 * client-facing renewal notification for `renewal_due` accounts —
 * respecting the same RENEWAL_REMINDER_COOLDOWN_DAYS window as the manual
 * remind endpoint so automated and manual nudges share one cooldown.
 *
 * Idempotent and cheap: the cooldown query is the dedupe mechanism.
 */

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const MAX_CLIENTS_SCANNED = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function sweepRenewalReminders(): Promise<number> {
    const now = Date.now();
    const cooldownDays = Math.max(1, Number(process.env.RENEWAL_REMINDER_COOLDOWN_DAYS ?? 30));
    const cutoff = ts(now - cooldownDays * DAY_MS);

    const clients = (await prisma.orm.public.Client
        .orderBy((c: any) => c.createdAt.desc())
        .limit(MAX_CLIENTS_SCANNED)
        .select('id', 'name', 'email', 'org')
        .all()) as any[];

    let sent = 0;
    for (const client of clients) {
        try {
            const health = await computeClientHealth(prisma as any, client, now);
            if (health.health !== 'renewal_due') continue;

            const recent = await prisma.orm.public.Notification
                .where({ userId: client.id })
                .where({ userType: 'client' })
                .where({ _type: 'renewal' })
                .where((n: any) => n.createdAt.gt(cutoff))
                .limit(1)
                .all();
            if (recent.length > 0) continue;

            await prisma.orm.public.Notification.create({
                id: newId(),
                userId: client.id,
                userType: 'client',
                _type: 'renewal',
                title: 'Let\u2019s talk about what\u2019s next',
                message: `Hi ${client.name || 'there'} — it\u2019s been a while since your last project with AngiSoft. Reply to this portal message or contact us to plan your next engagement.`,
                link: '/portal',
                meta: { kind: 'renewal', automated: true, daysSinceActivity: health.daysSinceActivity },
            });
            sent++;
        } catch (err) {
            console.error(`renewal monitor: failed for client ${client.id}`, err);
        }
    }
    return sent;
}

export function startRenewalMonitor(): NodeJS.Timeout | null {
    const intervalMs = Number(process.env.RENEWAL_MONITOR_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;

    const timer = setInterval(() => {
        sweepRenewalReminders().catch((err) => console.warn('Renewal monitor sweep failed:', err?.message || err));
    }, intervalMs);
    timer.unref?.();
    // Stagger the boot sweep so it doesn't collide with the SLA monitor's.
    const boot = setTimeout(() => {
        sweepRenewalReminders().catch((err) => console.warn('Renewal monitor boot sweep failed:', err?.message || err));
    }, 90_000);
    boot.unref?.();
    return timer;
}
