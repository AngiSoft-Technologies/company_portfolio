import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    audience: z.string().default('all'),
    priority: z.string().default('normal'),
    published: z.boolean().default(false),
    expiresAt: z.string().datetime().nullable().optional()
});

const updateSchema = createSchema.partial();

export default function announcementsRouter() {
    const router = Router();

    router.get('/', async (req, res) => {
        const now = new Date();
        const announcements = await prisma.announcement.findMany({
            where: {
                published: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(announcements);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(announcements);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const data = parsed.data;
        const announcement = await prisma.announcement.create({
            data: {
                ...data,
                publishedAt: data.published ? new Date() : null,
                authorId: req.user?.sub
            }
        });
        res.status(201).json(announcement);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const announcement = await prisma.announcement.update({
            where: { id: req.params.id },
            data: {
                ...parsed.data,
                publishedAt: parsed.data.published ? new Date() : undefined
            }
        });
        res.json(announcement);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.announcement.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
