import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    tagline: z.string().nullable().optional(),
    description: z.string().min(1),
    category: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    bannerUrl: z.string().nullable().optional(),
    features: z.any().optional(),
    pricing: z.any().optional(),
    screenshots: z.any().optional(),
    demoUrl: z.string().nullable().optional(),
    published: z.boolean().default(false),
    sortOrder: z.number().default(0)
});

const updateSchema = createSchema.partial();

export default function productsRouter() {
    const router = Router();

    router.get('/', async (req, res) => {
        const products = await prisma.product.findMany({
            where: { published: true },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(products);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const products = await prisma.product.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json(products);
    });

    router.get('/:slug', async (req, res) => {
        const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
        if (!product || !product.published) return res.status(404).json({ error: 'Not found' });
        res.json(product);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const product = await prisma.product.create({ data: parsed.data });
        res.status(201).json(product);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(product);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
