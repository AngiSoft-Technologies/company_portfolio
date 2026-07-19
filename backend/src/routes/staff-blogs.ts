import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission, requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    coverImage: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    published: z.boolean().default(false)
});

const updateSchema = createSchema.partial();

function slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function staffBlogsRouter() {
    const router = Router();

    router.get('/', async (_req, res) => {
        const blogs = await prisma.staffBlog.findMany({
            where: { published: true },
            include: { employee: { select: { firstName: true, lastName: true, avatarUrl: true, publicTitle: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(blogs);
    });

    router.get('/my', requireAuth, async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const blogs = await prisma.staffBlog.findMany({
            where: { employeeId: req.user.sub },
            orderBy: { createdAt: 'desc' }
        });
        res.json(blogs);
    });

    router.post('/', requireAuth, requirePermission('publications.create'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const blog = await prisma.staffBlog.create({
            data: { ...parsed.data, slug: slugify(parsed.data.title), employeeId: req.user.sub }
        });
        res.status(201).json(blog);
    });

    router.put('/:id', requireAuth, requirePermission('publications.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const blog = await prisma.staffBlog.findUnique({ where: { id: req.params.id } });
        if (!blog) return res.status(404).json({ error: 'Not found' });
        if (blog.employeeId !== req.user.sub && !['ADMIN', 'BLOG_MANAGER'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const updated = await prisma.staffBlog.update({
            where: { id: req.params.id },
            data: { ...parsed.data, ...(parsed.data.title ? { slug: slugify(parsed.data.title) } : {}) }
        });
        res.json(updated);
    });

    router.delete('/:id', requireAuth, requirePermission('publications.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const blog = await prisma.staffBlog.findUnique({ where: { id: req.params.id } });
        if (!blog) return res.status(404).json({ error: 'Not found' });
        if (blog.employeeId !== req.user.sub && !['ADMIN', 'BLOG_MANAGER'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.staffBlog.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
