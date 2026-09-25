import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

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

export default function staffBlogsRouter(prisma: Db = db) {
    const router = Router();

    router.get('/', async (_req, res) => {
        const blogs = await prisma.orm.public.StaffBlog
            .where({ published: true })
            .include('employee', (e: any) => e.select('firstName', 'lastName', 'avatarUrl', 'publicTitle'))
            .orderBy((b: any) => b.createdAt.desc())
            .all();
        res.json(blogs);
    });

    router.get('/my', requireAuth, async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const blogs = await prisma.orm.public.StaffBlog
            .where({ employeeId: req.user.sub })
            .orderBy((b: any) => b.createdAt.desc())
            .all();
        res.json(blogs);
    });

    router.post('/', requireAuth, requirePermission('publications.create'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const blog = await prisma.orm.public.StaffBlog.create({
            id: newId(),
            updatedAt: ts(),
            employeeId: req.user.sub,
            title: parsed.data.title,
            slug: slugify(parsed.data.title),
            content: parsed.data.content,
            coverImage: parsed.data.coverImage ?? null,
            tags: parsed.data.tags,
            published: parsed.data.published
        });
        res.status(201).json(blog);
    });

    router.put('/:id', requireAuth, requirePermission('publications.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const blog = await prisma.orm.public.StaffBlog.where({ id: req.params.id }).first();
        if (!blog) return res.status(404).json({ error: 'Not found' });
        if (blog.employeeId !== req.user.sub && !['ADMIN', 'BLOG_MANAGER'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        if (parsed.data.title) payload.slug = slugify(parsed.data.title);
        const updated = await prisma.orm.public.StaffBlog.where({ id: req.params.id }).update(payload);
        res.json(updated);
    });

    router.delete('/:id', requireAuth, requirePermission('publications.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const blog = await prisma.orm.public.StaffBlog.where({ id: req.params.id }).first();
        if (!blog) return res.status(404).json({ error: 'Not found' });
        if (blog.employeeId !== req.user.sub && !['ADMIN', 'BLOG_MANAGER'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.orm.public.StaffBlog.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    });

    return router;
}
