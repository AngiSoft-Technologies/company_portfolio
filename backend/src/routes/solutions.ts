import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const slugify = (input: string): string =>
    input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const createSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    icon: z.string().optional(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
    slug: z.string().optional(),
});

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
    slug: z.string().optional(),
});

export default function solutionsRouter() {
    const router = Router();

    // Public: active solutions only, ordered.
    router.get('/', async (_req, res) => {
        try {
            const items = await prisma.solution.findMany({
                where: { active: true },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            });
            res.json(items);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Admin: all solutions.
    router.get('/admin', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), async (_req: AuthRequest, res) => {
        try {
            const items = await prisma.solution.findMany({
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            });
            res.json(items);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/admin', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
        const data = parsed.data;
        try {
            const item = await prisma.solution.create({
                data: {
                    name: data.name,
                    slug: data.slug?.trim() || slugify(data.name),
                    description: data.description,
                    icon: data.icon,
                    sortOrder: data.sortOrder ?? 0,
                    active: data.active ?? true,
                },
            });
            res.status(201).json(item);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/admin/:id', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
        const data = parsed.data;
        try {
            const item = await prisma.solution.update({
                where: { id: req.params.id },
                data: {
                    name: data.name,
                    slug: data.slug?.trim() || undefined,
                    description: data.description,
                    icon: data.icon,
                    sortOrder: data.sortOrder,
                    active: data.active,
                },
            });
            res.json(item);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/admin/:id', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
        try {
            await prisma.solution.delete({ where: { id: req.params.id } });
            res.status(204).end();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
