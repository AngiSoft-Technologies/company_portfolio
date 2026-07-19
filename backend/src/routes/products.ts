import { Router } from 'express';
import { ProductStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission, requireRoles } from '../middleware/roles';
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
    status: z.nativeEnum(ProductStatus).optional(),
    seoTitle: z.string().nullable().optional(),
    seoDesc: z.string().nullable().optional(),
    published: z.boolean().default(false),
    sortOrder: z.number().default(0)
});

const updateSchema = createSchema.partial();

export default function productsRouter() {
    const router = Router();

    const auditProduct = async (req: AuthRequest, action: string, entityId?: string) => {
        await prisma.auditLog.create({
            data: {
                actorId: req.user?.sub,
                actorRole: req.user?.role as Role | undefined,
                action,
                entity: 'Product',
                entityId
            }
        }).catch(() => undefined);
    };

    router.get('/', async (_req, res) => {
        const products = await prisma.product.findMany({
            where: { published: true },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(products);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (_req: AuthRequest, res) => {
        const products = await prisma.product.findMany({
            include: { _count: { select: { faqs: true, inquiries: true } } },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(products);
    });

    // ── Staff-scoped product routes (assigned team members) ──
    router.get('/staff', requireAuth, requirePermission('products.update_assigned'), async (req: AuthRequest, res) => {
        const products = await prisma.product.findMany({
            where: { productTeamMembers: { some: { employeeId: req.user!.sub } } },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(products);
    });

    router.get('/staff/:id', requireAuth, requirePermission('products.update_assigned'), async (req: AuthRequest, res) => {
        const member = await prisma.productTeamMember.findUnique({
            where: { productId_employeeId: { productId: req.params.id, employeeId: req.user!.sub } }
        });
        if (!member) return res.status(403).json({ error: 'Not assigned to this product' });
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!product) return res.status(404).json({ error: 'Not found' });
        res.json(product);
    });

    router.put('/staff/:id', requireAuth, requirePermission('products.update_assigned'), async (req: AuthRequest, res) => {
        const member = await prisma.productTeamMember.findUnique({
            where: { productId_employeeId: { productId: req.params.id, employeeId: req.user!.sub } }
        });
        if (!member) return res.status(403).json({ error: 'Not assigned to this product' });
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        await auditProduct(req, 'product.update_assigned', product.id);
        res.json(product);
    });

    router.get('/:slug', async (req, res) => {
        const product = await prisma.product.findUnique({
            where: { slug: req.params.slug },
            include: {
                faqs: {
                    where: { published: true },
                    orderBy: { order: 'asc' }
                }
            }
        });
        if (!product || !product.published) return res.status(404).json({ error: 'Not found' });
        res.json(product);
    });

    router.post('/', requireAuth, requirePermission('products.create'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const product = await prisma.product.create({ data: parsed.data });
        await auditProduct(req, 'product.create', product.id);
        res.status(201).json(product);
    });

    router.put('/:id', requireAuth, requirePermission('products.update'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        await auditProduct(req, 'product.update', product.id);
        res.json(product);
    });

    router.delete('/:id', requireAuth, requirePermission('products.archive'), requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.product.delete({ where: { id: req.params.id } });
        await auditProduct(req, 'product.delete', req.params.id);
        res.json({ ok: true });
    });

    return router;
}
