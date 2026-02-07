import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles, isRole } from '../middleware/roles';
import { blogController } from '../controllers/blogController';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional()
});

const updateSchema = createSchema.partial();

export default function blogsRouter() {
    const router = Router();

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const include = {
                author: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } }
            };
            if (isRole(req, ['ADMIN', 'MARKETING'])) {
                const posts = await blogController.list({ include });
                return res.json(posts);
            }
            if (isRole(req, ['DEVELOPER'])) {
                const posts = await blogController.list({ where: { authorId: req.user?.sub }, include });
                return res.json(posts);
            }
            const posts = await blogController.list({ where: { published: true }, include });
            res.json(posts);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const include = {
                author: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } }
            };
            const post = await blogController.get(req.params.id, { include });
            if (!post) return res.status(404).json({ error: 'Not found' });

            if (post.published) return res.json(post);

            if (isRole(req, ['ADMIN', 'MARKETING'])) return res.json(post);
            if (isRole(req, ['DEVELOPER']) && post.authorId === req.user?.sub) return res.json(post);

            return res.status(404).json({ error: 'Not found' });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING', 'DEVELOPER'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            const created = await blogController.create({
                ...data,
                authorId: req.user?.sub,
                publishedAt: data.published ? new Date() : null
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
            const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
            if (!existing) return res.status(404).json({ error: 'Not found' });

            const canManageAll = isRole(req, ['ADMIN', 'MARKETING']);
            if (!canManageAll && existing.authorId !== req.user?.sub) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const data = parsed.data;
            const publishedAt = data.published && !existing.publishedAt ? new Date() : existing.publishedAt;
            const updated = await blogController.update(req.params.id, {
                ...data,
                publishedAt
            }, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
            if (!existing) return res.status(404).json({ error: 'Not found' });

            const canManageAll = isRole(req, ['ADMIN', 'MARKETING']);
            if (!canManageAll && existing.authorId !== req.user?.sub) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            await blogController.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
