import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    productId: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
    order: z.number().default(0),
    published: z.boolean().default(true)
});

const updateSchema = createSchema.partial();

export default function productFaqsRouter() {
    const router = Router();

    const auditFaq = async (req: AuthRequest, action: string, entityId?: string) => {
        await prisma.auditLog.create({
            data: {
                actorId: req.user?.sub,
                actorRole: req.user?.role as Role | undefined,
                action,
                entity: 'ProductFaq',
                entityId
            }
        }).catch(() => undefined);
    };

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), async (_req: AuthRequest, res) => {
        const faqs = await prisma.productFaq.findMany({
            include: { product: { select: { id: true, name: true, slug: true } } },
            orderBy: [{ productId: 'asc' }, { order: 'asc' }]
        });
        res.json(faqs);
    });

    router.get('/product/:productId', async (req, res) => {
        const faqs = await prisma.productFaq.findMany({
            where: { productId: req.params.productId, published: true },
            orderBy: { order: 'asc' }
        });
        res.json(faqs);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const faq = await prisma.productFaq.create({ data: parsed.data });
        await auditFaq(req, 'productFaq.create', faq.id);
        res.status(201).json(faq);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const faq = await prisma.productFaq.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        await auditFaq(req, 'productFaq.update', faq.id);
        res.json(faq);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.productFaq.delete({ where: { id: req.params.id } });
        await auditFaq(req, 'productFaq.delete', req.params.id);
        res.json({ ok: true });
    });

    return router;
}
