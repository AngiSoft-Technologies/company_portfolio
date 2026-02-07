import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles, isRole } from '../middleware/roles';
import { serviceCategoriesController } from '../controllers/serviceCategoriesController';

const createSchema = z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.coerce.number().int().optional(),
    published: z.boolean().optional()
});

const updateSchema = createSchema.partial();

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export default function serviceCategoriesRouter() {
    const router = Router();

    // Public list (published only). Authenticated admins/marketing can see all.
    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const list = await serviceCategoriesController.list({
                where: includeAll ? {} : { published: true }
            });
            res.json(list);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const category = await serviceCategoriesController.get(req.params.id, {
                where: includeAll ? { id: req.params.id } : { id: req.params.id, published: true }
            });
            if (!category) return res.status(404).json({ error: 'Not found' });
            res.json(category);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Protected writes
    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            const slug = data.slug && data.slug.trim() ? data.slug : slugify(data.name);
            const created = await serviceCategoriesController.create({
                ...data,
                slug,
                order: data.order ?? 0
            }, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const existing = await prisma.serviceCategory.findUnique({ where: { id: req.params.id } });
            if (!existing) return res.status(404).json({ error: 'Not found' });
            const data = parsed.data;
            const slug = data.slug && data.slug.trim() ? data.slug : (data.name ? slugify(data.name) : undefined);
            const updated = await serviceCategoriesController.update(req.params.id, {
                ...data,
                ...(slug ? { slug } : {})
            }, req.user);

            // Keep service labels in sync when category name changes
            if (data.name && data.name !== existing.name) {
                await prisma.service.updateMany({
                    where: {
                        OR: [
                            { categoryId: existing.id },
                            { category: existing.name }
                        ]
                    },
                    data: { category: data.name }
                });
            }

            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        try {
            await prisma.service.updateMany({
                where: { categoryId: req.params.id },
                data: { categoryId: null }
            });
            await serviceCategoriesController.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
