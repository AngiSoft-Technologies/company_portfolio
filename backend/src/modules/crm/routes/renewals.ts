import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

/**
 * Client renewal / account-health tracking (DIGITAL_HQ_PLAN §Client Success).
 * Renewal candidates are derived — no separate table: a client is due for a
 * renewal touch when their most recent project finished (or their last
 * booking activity) is older than RENEWAL_WINDOW_DAYS and they have no
 * active project or booking in flight.
 */

const RENEWAL_WINDOW_DAYS = Math.max(7, Number(process.env.RENEWAL_WINDOW_DAYS ?? 90));
const REMINDER_COOLDOWN_DAYS = Math.max(1, Number(process.env.RENEWAL_REMINDER_COOLDOWN_DAYS ?? 30));
const MAX_CLIENTS_SCANNED = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

interface ClientHealth {
    clientId: string;
    name: string;
    email: string;
    org: string | null;
    lastProjectCompletedAt: string | null;
    lastBookingAt: string | null;
    openProjects: number;
    openTickets: number;
    outstandingBalance: number;
    overdueInvoices: number;
    daysSinceActivity: number | null;
    health: 'active' | 'at_risk' | 'renewal_due';
}

export async function computeClientHealth(prisma: Db, client: any, now: number): Promise<ClientHealth> {
    const projects = await prisma.orm.public.ClientProject
        .where({ clientId: client.id })
        .select('status', 'completedAt', 'deliveredAt', 'updatedAt')
        .all();
    const completed = projects
        .map((p: any) => p.completedAt ?? p.deliveredAt)
        .filter(Boolean)
        .sort()
        .pop() ?? null;
    const openProjects = projects.filter((p: any) => !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(String(p.status))).length;

    const bookings = await prisma.orm.public.Booking
        .where({ clientId: client.id })
        .select('status', 'updatedAt')
        .orderBy((b: any) => b.updatedAt.desc())
        .limit(50)
        .all();
    const lastBookingAt = bookings[0]?.updatedAt ?? null;
    const activeBookings = bookings.filter((b: any) =>
        !['COMPLETED', 'CANCELLED', 'REJECTED', 'DELIVERED'].includes(String(b.status))).length;

    const invoices = await prisma.orm.public.Invoice
        .where({ clientId: client.id })
        .select('status', 'balanceDue', 'dueAt', 'currency')
        .all();
    const openInvoices = invoices.filter((i: any) => !['paid', 'void', 'draft'].includes(String(i.status)));
    const outstandingBalance = openInvoices.reduce((sum: number, i: any) => sum + Number(i.balanceDue ?? 0), 0);
    const overdueInvoices = openInvoices.filter((i: any) => i.dueAt && new Date(i.dueAt).getTime() < now).length;

    const tickets = await prisma.orm.public.SupportTicket
        .where({ clientId: client.id })
        .select('status')
        .all();
    const openTickets = tickets.filter((t: any) => !['resolved', 'closed'].includes(String(t.status).toLowerCase())).length;

    const lastActivityCandidates = [completed, lastBookingAt,
        ...projects.map((p: any) => p.updatedAt),
        ...bookings.map((b: any) => b.updatedAt),
        ...openInvoices.map((i: any) => i.dueAt),
    ].filter(Boolean).map((d: any) => new Date(d).getTime());
    const lastActivityMs = lastActivityCandidates.length ? Math.max(...lastActivityCandidates) : null;
    const daysSinceActivity = lastActivityMs ? Math.floor((now - lastActivityMs) / DAY_MS) : null;

    const hasActiveWork = openProjects > 0 || activeBookings > 0;
    let health: ClientHealth['health'] = 'active';
    if (!hasActiveWork && daysSinceActivity !== null && daysSinceActivity >= RENEWAL_WINDOW_DAYS) {
        health = 'renewal_due';
    } else if (openTickets > 0 || overdueInvoices > 0 || outstandingBalance > 0) {
        health = 'at_risk';
    }

    return {
        clientId: client.id,
        name: client.name,
        email: client.email,
        org: client.org ?? null,
        lastProjectCompletedAt: completed,
        lastBookingAt,
        openProjects,
        openTickets,
        outstandingBalance,
        overdueInvoices,
        daysSinceActivity,
        health,
    };
}

export default function renewalsRouter(prisma: Db) {
    const router = Router();
    router.use(requireAuth);

    router.get('/', requirePermission('client_projects.view_all'), async (_req: AuthRequest, res) => {
        const clients = await prisma.orm.public.Client
            .orderBy((c: any) => c.createdAt.desc())
            .limit(MAX_CLIENTS_SCANNED)
            .select('id', 'name', 'email', 'org')
            .all();
        const now = Date.now();
        const rows: ClientHealth[] = [];
        for (const client of clients) {
            try {
                rows.push(await computeClientHealth(prisma, client, now));
            } catch (err) {
                console.error(`renewals: health computation failed for client ${client.id}`, err);
            }
        }
        const order = { renewal_due: 0, at_risk: 1, active: 2 } as const;
        rows.sort((a, b) => order[a.health] - order[b.health] || (b.daysSinceActivity ?? -1) - (a.daysSinceActivity ?? -1));
        res.json({
            renewalWindowDays: RENEWAL_WINDOW_DAYS,
            reminderCooldownDays: REMINDER_COOLDOWN_DAYS,
            clients: rows,
            summary: {
                renewal_due: rows.filter((r) => r.health === 'renewal_due').length,
                at_risk: rows.filter((r) => r.health === 'at_risk').length,
                active: rows.filter((r) => r.health === 'active').length,
            },
        });
    });

    router.post('/remind', requirePermission('client_projects.view_all'), async (req: AuthRequest, res) => {
        try {
            const clientId = String(req.body?.clientId ?? '');
            if (!clientId) return res.status(400).json({ error: 'clientId is required' });
            const client = await prisma.orm.public.Client
                .where({ id: clientId })
                .select('id', 'name', 'email')
                .first();
            if (!client) return res.status(404).json({ error: 'Client not found' });

            // Cooldown: don't spam the client — one renewal nudge per window.
            const cutoff = ts(Date.now() - REMINDER_COOLDOWN_DAYS * DAY_MS);
            const recent = await prisma.orm.public.Notification
                .where({ userId: clientId })
                .where({ userType: 'client' })
                .where({ _type: 'renewal' })
                .where((n: any) => n.createdAt.gt(cutoff))
                .limit(1)
                .all();
            if (recent.length > 0) {
                return res.status(409).json({ error: `A renewal reminder was already sent within the last ${REMINDER_COOLDOWN_DAYS} days` });
            }

            await prisma.orm.public.Notification.create({
                id: newId(),
                userId: clientId,
                userType: 'client',
                _type: 'renewal',
                title: 'Let\u2019s talk about what\u2019s next',
                message: `Hi ${client.name || 'there'} — it\u2019s been a while since your last project with AngiSoft. Reply to this portal message or contact us to plan your next engagement.`,
                link: '/portal',
                meta: { kind: 'renewal', sentBy: req.user?.sub ?? null },
            });

            await logAudit({
                actorId: req.user?.sub ?? null,
                actorRole: req.user?.role ?? null,
                action: 'renewal.reminder_sent',
                entity: 'Client',
                entityId: clientId,
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message ?? 'Failed to send renewal reminder' });
        }
    });

    return router;
}
