import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../db';

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

export default function supportTicketsRouter() {
    const router = Router();
    router.use(requireAuth);

    router.get('/', async (req: AuthRequest, res) => {
        const { status, assignedToMe } = req.query;
        const where: any = {};
        if (status) where.status = status;
        if (assignedToMe === 'true') where.assignedToId = req.user?.sub;
        const tickets = await prisma.supportTicket.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                client: { select: { id: true, name: true, email: true } },
                _count: { select: { messages: true } }
            }
        });
        res.json(tickets);
    });

    router.get('/:id', async (req: AuthRequest, res) => {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: req.params.id },
            include: {
                client: { select: { id: true, name: true, email: true } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });
        if (!ticket) return res.status(404).json({ error: 'Not found' });
        res.json(ticket);
    });

    router.post('/', async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const ticket = await prisma.supportTicket.create({
            data: parsed.data,
            include: { messages: true }
        });
        res.status(201).json(ticket);
    });

    router.put('/:id', async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const ticket = await prisma.supportTicket.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(ticket);
    });

    router.post('/:id/messages', async (req: AuthRequest, res) => {
        const parsed = messageSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: req.params.id,
                authorId: req.user?.sub,
                body: parsed.data.body,
                internal: parsed.data.internal
            }
        });
        res.status(201).json(message);
    });

    return router;
}
