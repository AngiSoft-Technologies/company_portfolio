import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles, isRole } from '../middleware/roles';
import { servicesController } from '../controllers/servicesController';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  priceFrom: z.coerce.number().optional(),
  targetAudience: z.string().optional(),
  scope: z.string().optional(),
  images: z.array(z.string()).optional(),
  published: z.boolean().optional()
});

const updateSchema = createSchema.partial();

export default function servicesRouter() {
    const router = Router();

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const isDeveloper = isRole(req, ['DEVELOPER']);
            const services = await servicesController.list({
                where: includeAll ? {} : (isDeveloper ? { authorId: req.user?.sub } : { published: true }),
                include: {
                    categoryRef: true,
                    author: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } }
                }
            });
            res.json(services);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const isDeveloper = isRole(req, ['DEVELOPER']);
            const service = await servicesController.get(req.params.id, {
                where: includeAll
                    ? { id: req.params.id }
                    : (isDeveloper ? { id: req.params.id, authorId: req.user?.sub } : { id: req.params.id, published: true }),
                include: {
                    categoryRef: true,
                    author: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } }
                }
            });
            if (!service) return res.status(404).json({ error: 'Not found' });
            res.json(service);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING', 'DEVELOPER'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            let categoryLabel = data.category || 'General';
            if (data.categoryId) {
                const category = await prisma.serviceCategory.findUnique({ where: { id: data.categoryId } });
                if (category) categoryLabel = category.name;
            }
            const authorId = req.user?.sub || undefined;
            const created = await servicesController.create({
                ...data,
                category: categoryLabel,
                authorId
            }, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const canManageAll = isRole(req, ['ADMIN', 'MARKETING']);
            if (!canManageAll) {
                const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
                if (!existing || existing.authorId !== req.user?.sub) {
                    return res.status(403).json({ error: 'Not authorized' });
                }
            }
            const data = parsed.data;
            let categoryLabel = data.category;
            if (data.categoryId) {
                const category = await prisma.serviceCategory.findUnique({ where: { id: data.categoryId } });
                if (category) categoryLabel = category.name;
            }
            const updated = await servicesController.update(req.params.id, {
                ...data,
                ...(categoryLabel ? { category: categoryLabel } : {})
            }, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
        try {
            const canManageAll = isRole(req, ['ADMIN', 'MARKETING']);
            if (!canManageAll) {
                const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
                if (!existing || existing.authorId !== req.user?.sub) {
                    return res.status(403).json({ error: 'Not authorized' });
                }
            }
            await servicesController.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
