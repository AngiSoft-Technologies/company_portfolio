import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const createSchema = z.object({
    clientId: z.string().optional(),
    subject: z.string().min(1),
    body: z.string().min(1),
    priority: z.string().default('normal')
});

const updateSchema = z.object({
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedToId: z.string().nullable().optional()
});

const messageSchema = z.object({
    body: z.string().min(1),
    internal: z.boolean().default(false)
});

export default function supportTicketsRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth);

    router.get('/', requirePermission('support_tickets.view'), async (req: AuthRequest, res) => {
        const { status, assignedToMe } = req.query;
        const where: any = {};
        if (status) where.status = status;
        if (assignedToMe === 'true') where.assignedToId = req.user?.sub;
        let query: any = prisma.orm.public.SupportTicket;
        if (Object.keys(where).length > 0) query = query.where(where);
        const tickets = await query
            .include('client', (c: any) => c.select('id', 'name', 'email'))
            .include('ticketMessages', (m: any) => m.count())
            .orderBy((t: any) => t.createdAt.desc())
            .all();
        res.json(tickets.map((t: any) => {
            const { ticketMessages, ...rest } = t;
            return { ...rest, _count: { messages: ticketMessages } };
        }));
    });

    router.get('/:id', requirePermission('support_tickets.view'), async (req: AuthRequest, res) => {
        const ticket = await prisma.orm.public.SupportTicket
            .where({ id: req.params.id })
            .include('client', (c: any) => c.select('id', 'name', 'email'))
            .include('ticketMessages', (m: any) => m.orderBy((x: any) => x.createdAt.asc()))
            .first();
        if (!ticket) return res.status(404).json({ error: 'Not found' });
        const { ticketMessages, ...rest } = ticket as any;
        res.json({ ...rest, messages: ticketMessages });
    });

    router.post('/', requirePermission('support_tickets.create'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        const ticket = await prisma.orm.public.SupportTicket
            .include('ticketMessages')
            .create({
                id: newId(),
                updatedAt: ts(),
                clientId: parsed.data.clientId ?? null,
                subject: parsed.data.subject,
                body: parsed.data.body,
                priority: parsed.data.priority
            });
        const { ticketMessages, ...rest } = ticket as any;
        res.status(201).json({ ...rest, messages: ticketMessages });
    });

    router.put('/:id', requirePermission('support_tickets.update'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        // Reopened tickets get a fresh SLA window: clear the breach marker so
        // the monitor can alert again if the new cycle also breaches.
        if (typeof payload.status === 'string' && ['open', 'in_progress', 'pending'].includes(payload.status)) {
            const current = await prisma.orm.public.SupportTicket
                .where({ id: req.params.id })
                .select('status')
                .first();
            if (current && ['resolved', 'closed'].includes(String((current as any).status))) {
                payload.slaBreachedAt = null;
            }
        }
        const ticket = await prisma.orm.public.SupportTicket.where({ id: req.params.id }).update(payload);
        res.json(ticket);
    });

    router.post('/:id/messages', requirePermission('support_tickets.respond'), async (req: AuthRequest, res) => {
        const parsed = messageSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        const message = await prisma.orm.public.TicketMessage.create({
            id: newId(),
            ticketId: req.params.id,
            authorId: req.user?.sub ?? null,
            body: parsed.data.body,
            internal: parsed.data.internal
        });
        res.status(201).json(message);
    });

    return router;
}
