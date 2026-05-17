import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    assignedToId: z.string().nullable().optional()
});

const updateSchema = createSchema.partial().extend({
    status: z.string().optional()
});

export default function leadsRouter() {
    const router = Router();
    router.use(requireAuth, requireRoles('ADMIN', 'MARKETING'));

    router.get('/', async (req: AuthRequest, res) => {
        const { status, search } = req.query;
        const where: any = {};
        if (status) where.status = status;
        if (search) where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
        ];
        const leads = await prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(leads);
    });

    router.get('/stats', async (req: AuthRequest, res) => {
        const total = await prisma.lead.count();
        const newCount = await prisma.lead.count({ where: { status: 'new' } });
        const converted = await prisma.lead.count({ where: { status: 'converted' } });
        res.json({ total, new: newCount, converted });
    });

    router.post('/', async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const lead = await prisma.lead.create({ data: parsed.data });
        res.status(201).json(lead);
    });

    router.put('/:id', async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const lead = await prisma.lead.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(lead);
    });

    router.delete('/:id', async (req: AuthRequest, res) => {
        await prisma.lead.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
