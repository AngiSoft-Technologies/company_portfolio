import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

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

export default function industriesRouter(prisma: Db = db) {
    const router = Router();

    // Public: active industries only, ordered.
    router.get('/', async (_req, res) => {
        try {
            const items = await prisma.orm.public.Industry
                .where({ active: true })
                .orderBy([(i: any) => i.sortOrder.asc(), (i: any) => i.name.asc()])
                .all();
            res.json(items);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Admin: all industries.
    router.get('/admin', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), async (_req: AuthRequest, res) => {
        try {
            const items = await prisma.orm.public.Industry
                .orderBy([(i: any) => i.sortOrder.asc(), (i: any) => i.createdAt.desc()])
                .all();
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
            const item = await prisma.orm.public.Industry.create({
                id: newId(),
                updatedAt: ts(),
                name: data.name,
                slug: data.slug?.trim() || slugify(data.name),
                description: data.description ?? null,
                icon: data.icon ?? null,
                sortOrder: data.sortOrder ?? 0,
                active: data.active ?? true,
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
            const payload: any = {};
            if (data.name !== undefined) payload.name = data.name;
            if (data.slug?.trim()) payload.slug = data.slug.trim();
            if (data.description !== undefined) payload.description = data.description;
            if (data.icon !== undefined) payload.icon = data.icon;
            if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
            if (data.active !== undefined) payload.active = data.active;
            const item = await prisma.orm.public.Industry.where({ id: req.params.id }).update(payload);
            res.json(item);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/admin/:id', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
        try {
            await prisma.orm.public.Industry.where({ id: req.params.id }).delete();
            res.status(204).end();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
