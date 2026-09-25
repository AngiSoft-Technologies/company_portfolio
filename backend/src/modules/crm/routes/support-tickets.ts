import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
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

    router.get('/', async (req: AuthRequest, res) => {
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

    router.get('/:id', async (req: AuthRequest, res) => {
        const ticket = await prisma.orm.public.SupportTicket
            .where({ id: req.params.id })
            .include('client', (c: any) => c.select('id', 'name', 'email'))
            .include('ticketMessages', (m: any) => m.orderBy((x: any) => x.createdAt.asc()))
            .first();
        if (!ticket) return res.status(404).json({ error: 'Not found' });
        const { ticketMessages, ...rest } = ticket as any;
        res.json({ ...rest, messages: ticketMessages });
    });

    router.post('/', async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
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

    router.put('/:id', async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const ticket = await prisma.orm.public.SupportTicket.where({ id: req.params.id }).update(payload);
        res.json(ticket);
    });

    router.post('/:id/messages', async (req: AuthRequest, res) => {
        const parsed = messageSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
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
