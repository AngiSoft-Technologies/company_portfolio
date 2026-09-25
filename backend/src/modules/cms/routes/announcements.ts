import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';

const createSchema = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    audience: z.string().default('all'),
    priority: z.string().default('normal'),
    published: z.boolean().default(false),
    expiresAt: z.string().datetime().nullable().optional()
});

const updateSchema = createSchema.partial();

export default function announcementsRouter(prisma: Db = db) {
    const router = Router();

    router.get('/', async (req, res) => {
        const now = ts();
        const announcements = await prisma.orm.public.Announcement
            .where({ published: true })
            .where((a: any) => or(a.expiresAt.isNull(), a.expiresAt.gt(now)))
            .orderBy((a: any) => a.createdAt.desc())
            .all();
        res.json(announcements);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const announcements = await prisma.orm.public.Announcement
            .orderBy((a: any) => a.createdAt.desc())
            .all();
        res.json(announcements);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const data = parsed.data;
        const announcement = await prisma.orm.public.Announcement.create({
            id: newId(),
            updatedAt: ts(),
            title: data.title,
            body: data.body,
            audience: data.audience,
            priority: data.priority,
            published: data.published,
            publishedAt: data.published ? ts() : null,
            expiresAt: data.expiresAt ? ts(data.expiresAt) : null,
            authorId: req.user?.sub ?? null
        });
        res.status(201).json(announcement);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) {
            if (v === undefined) continue;
            if (k === 'expiresAt') payload.expiresAt = v != null ? ts(v as string) : null;
            else payload[k] = v;
        }
        if (parsed.data.published) payload.publishedAt = ts();
        const announcement = await prisma.orm.public.Announcement.where({ id: req.params.id }).update(payload);
        res.json(announcement);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.orm.public.Announcement.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    });

    return router;
}
