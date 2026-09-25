import { Router } from 'express';
import { z } from 'zod';
import db, { type Db } from '../../../db';
import { ts } from '../../../prisma/db';
import { optionalAuth, requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission, requireRoles, isRole } from '../../../shared/middleware/roles';
import { blogController } from '../controllers/blogController';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  subtitle: z.string().optional(),
  contentType: z.string().optional(),
  mediaUrl: z.string().optional(),
  transcript: z.string().optional(),
  coverImage: z.string().optional(),
  excerpt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  categoryId: z.string().optional(),
  featured: z.boolean().optional(),
  visibilityType: z.string().optional(),
  visibleUntil: z.string().datetime().optional().nullable(),
  resourceLinks: z.any().optional()
});

const updateSchema = createSchema.partial();

export default function blogsRouter(prisma: Db = db) {
    const router = Router();

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            if (isRole(req, ['ADMIN', 'MARKETING'])) {
                const posts = await blogController.list({});
                return res.json(posts);
            }
            if (isRole(req, ['DEVELOPER'])) {
                const posts = await blogController.list({ where: { authorId: req.user?.sub } });
                return res.json(posts);
            }
            const posts = await blogController.list({ where: { published: true } });
            res.json(posts);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const post = await blogController.get(req.params.id, {});
            if (!post) return res.status(404).json({ error: 'Not found' });

            if (post.published) return res.json(post);

            if (isRole(req, ['ADMIN', 'MARKETING'])) return res.json(post);
            if (isRole(req, ['DEVELOPER']) && post.authorId === req.user?.sub) return res.json(post);

            return res.status(404).json({ error: 'Not found' });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', requireAuth, requirePermission('publications.create'), requireRoles('ADMIN', 'MARKETING', 'DEVELOPER'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const data = parsed.data;
            const created = await blogController.create({
                ...data,
                authorId: req.user?.sub,
                publishedAt: data.published ? ts() : null
            }, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', requireAuth, requirePermission('publications.update_own'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const existing = await prisma.orm.public.BlogPost.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Not found' });

            const canManageAll = isRole(req, ['ADMIN', 'MARKETING']);
            if (!canManageAll && existing.authorId !== req.user?.sub) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const data = parsed.data;
            const publishedAt = data.published && !existing.publishedAt ? ts() : existing.publishedAt;
            const updated = await blogController.update(req.params.id, {
                ...data,
                publishedAt
            }, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', requireAuth, requirePermission('publications.update_own'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.BlogPost.where({ id: req.params.id }).first();
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
