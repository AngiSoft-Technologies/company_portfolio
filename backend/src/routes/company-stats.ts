import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../db';

const createSchema = z.object({
    label: z.string().min(1),
    value: z.number(),
    suffix: z.string().default(''),
    icon: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    order: z.number().default(0),
    published: z.boolean().default(true)
});

const updateSchema = createSchema.partial();

export default function companyStatsRouter() {
    const router = Router();

    router.get('/', asyncHandler(async (_req, res) => {
        const stats = await prisma.companyStat.findMany({
            where: { published: true },
            orderBy: { order: 'asc' }
        });
        res.json(stats);
    }));

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'MANAGER'), asyncHandler(async (_req: AuthRequest, res) => {
        const stats = await prisma.companyStat.findMany({ orderBy: { order: 'asc' } });
        res.json(stats);
    }));

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), asyncHandler(async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const stat = await prisma.companyStat.create({ data: parsed.data });
        res.status(201).json(stat);
    }));

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), asyncHandler(async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const stat = await prisma.companyStat.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(stat);
    }));

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), asyncHandler(async (req: AuthRequest, res) => {
        await prisma.companyStat.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }));

    return router;
}
