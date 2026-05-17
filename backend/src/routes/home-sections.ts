import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const updateSchema = z.object({
    visible: z.boolean().optional(),
    order: z.number().optional(),
    settings: z.any().optional()
});

export default function homeSectionsRouter() {
    const router = Router();

    router.get('/', async (_req, res) => {
        const sections = await prisma.homePageSection.findMany({
            where: { visible: true },
            orderBy: { order: 'asc' }
        });
        res.json(sections);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), async (_req: AuthRequest, res) => {
        const sections = await prisma.homePageSection.findMany({ orderBy: { order: 'asc' } });
        res.json(sections);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const section = await prisma.homePageSection.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(section);
    });

    return router;
}
