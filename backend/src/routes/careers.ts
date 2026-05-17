import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    title: z.string().min(1),
    department: z.string().nullable().optional(),
    location: z.string().default('Nairobi, Kenya'),
    type: z.string().default('full-time'),
    description: z.string().min(1),
    requirements: z.array(z.string()).default([]),
    benefits: z.array(z.string()).default([]),
    salaryRange: z.string().nullable().optional(),
    published: z.boolean().default(false),
    expiresAt: z.string().datetime().nullable().optional()
});

const updateSchema = createSchema.partial();

function slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function careersRouter() {
    const router = Router();

    router.get('/', async (_req, res) => {
        const jobs = await prisma.jobPosting.findMany({
            where: {
                published: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(jobs);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (_req: AuthRequest, res) => {
        const jobs = await prisma.jobPosting.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(jobs);
    });

    router.get('/:slug', async (req, res) => {
        const job = await prisma.jobPosting.findUnique({ where: { slug: req.params.slug } });
        if (!job || !job.published) return res.status(404).json({ error: 'Job not found' });
        res.json(job);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const data = parsed.data;
        const job = await prisma.jobPosting.create({
            data: { ...data, slug: slugify(data.title) }
        });
        res.status(201).json(job);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const data = parsed.data;
        const job = await prisma.jobPosting.update({
            where: { id: req.params.id },
            data: { ...data, ...(data.title ? { slug: slugify(data.title) } : {}) }
        });
        res.json(job);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN', 'HR'), async (req: AuthRequest, res) => {
        await prisma.jobPosting.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
