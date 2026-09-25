import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission, requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

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
    status: z.enum(['PLANNED', 'DEVELOPMENT', 'BETA', 'LIVE', 'MAINTENANCE', 'DEPRECATED']).optional(),
    seoTitle: z.string().nullable().optional(),
    seoDesc: z.string().nullable().optional(),
    published: z.boolean().default(false),
    sortOrder: z.number().default(0)
});

const updateSchema = createSchema.partial();

export default function productsRouter(prisma: Db = db) {
    const router = Router();

    const auditProduct = async (req: AuthRequest, action: string, entityId?: string) => {
        await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: req.user?.sub ?? null,
            actorRole: (req.user?.role ?? null) as any,
            action,
            entity: 'Product',
            entityId: entityId ?? null
        }).catch(() => undefined);
    };

    router.get('/', async (_req, res) => {
        const products = await prisma.orm.public.Product
            .where({ published: true })
            .orderBy((p: any) => p.sortOrder.asc())
            .all();
        res.json(products);
    });

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (_req: AuthRequest, res) => {
        const products = await prisma.orm.public.Product
            .orderBy((p: any) => p.sortOrder.asc())
            .include('productFaqs', (f: any) => f.count())
            .include('productInquiries', (i: any) => i.count())
            .all();
        res.json(products.map((p: any) => {
            const { productFaqs, productInquiries, ...rest } = p;
            return { ...rest, _count: { faqs: productFaqs, inquiries: productInquiries } };
        }));
    });

    // ── Staff-scoped product routes (assigned team members) ──
    router.get('/staff', requireAuth, requirePermission('products.update_assigned'), async (req: AuthRequest, res) => {
        const products = await prisma.orm.public.Product
            .where((p: any) => p.productTeamMembers.some((m: any) => m.employeeId.eq(req.user!.sub)))
            .orderBy((p: any) => p.sortOrder.asc())
            .all();
        res.json(products);
    });

    router.get('/staff/:id', requireAuth, requirePermission('products.update_assigned'), async (req: AuthRequest, res) => {
        const member = await prisma.orm.public.ProductTeamMember
            .where({ productId: req.params.id, employeeId: req.user!.sub })
            .first();
        if (!member) return res.status(403).json({ error: 'Not assigned to this product' });
        const product = await prisma.orm.public.Product.where({ id: req.params.id }).first();
        if (!product) return res.status(404).json({ error: 'Not found' });
        res.json(product);
    });

    router.put('/staff/:id', requireAuth, requirePermission('products.update_assigned'), async (req: AuthRequest, res) => {
        const member = await prisma.orm.public.ProductTeamMember
            .where({ productId: req.params.id, employeeId: req.user!.sub })
            .first();
        if (!member) return res.status(403).json({ error: 'Not assigned to this product' });
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const product = await prisma.orm.public.Product.where({ id: req.params.id }).update(payload);
        await auditProduct(req, 'product.update_assigned', product?.id);
        res.json(product);
    });

    router.get('/:slug', async (req, res) => {
        const product = await prisma.orm.public.Product
            .where({ slug: req.params.slug })
            .include('productFaqs', (f: any) => f.where({ published: true }).orderBy((x: any) => x.order.asc()))
            .first();
        if (!product || !product.published) return res.status(404).json({ error: 'Not found' });
        const { productFaqs, ...rest } = product as any;
        res.json({ ...rest, faqs: productFaqs });
    });

    router.post('/', requireAuth, requirePermission('products.create'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const product = await prisma.orm.public.Product.create({
            id: newId(),
            updatedAt: ts(),
            name: parsed.data.name,
            slug: parsed.data.slug,
            tagline: parsed.data.tagline ?? null,
            description: parsed.data.description,
            category: parsed.data.category ?? null,
            logoUrl: parsed.data.logoUrl ?? null,
            bannerUrl: parsed.data.bannerUrl ?? null,
            features: parsed.data.features ?? null,
            pricing: parsed.data.pricing ?? null,
            screenshots: parsed.data.screenshots ?? null,
            demoUrl: parsed.data.demoUrl ?? null,
            status: parsed.data.status ?? 'DEVELOPMENT',
            seoTitle: parsed.data.seoTitle ?? null,
            seoDesc: parsed.data.seoDesc ?? null,
            published: parsed.data.published,
            sortOrder: parsed.data.sortOrder
        });
        await auditProduct(req, 'product.create', product.id);
        res.status(201).json(product);
    });

    router.put('/:id', requireAuth, requirePermission('products.update'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const product = await prisma.orm.public.Product.where({ id: req.params.id }).update(payload);
        await auditProduct(req, 'product.update', product?.id);
        res.json(product);
    });

    router.delete('/:id', requireAuth, requirePermission('products.archive'), requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.orm.public.Product.where({ id: req.params.id }).delete();
        await auditProduct(req, 'product.delete', req.params.id);
        res.json({ ok: true });
    });

    return router;
}
