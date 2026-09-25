import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';

const updateSchema = z.object({
    title: z.string().min(1).optional(),
    component: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    visible: z.boolean().optional(),
    order: z.number().optional(),
    settings: z.any().optional()
});

export default function homeSectionsRouter(prisma: Db = db) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const sections = await prisma.orm.public.HomePageSection
            .where({ visible: true })
            .orderBy((s: any) => s.order.asc())
            .all();
        res.json(sections);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), async (_req: AuthRequest, res) => {
        const sections = await prisma.orm.public.HomePageSection
            .orderBy((s: any) => s.order.asc())
            .all();
        res.json(sections);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const section = await prisma.orm.public.HomePageSection.where({ id: req.params.id }).update(payload);
        res.json(section);
    });

    return router;
}
