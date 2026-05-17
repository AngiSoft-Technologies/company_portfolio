import { Router } from 'express';
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
        res.status(201).json(faq);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const faq = await prisma.productFaq.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(faq);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.productFaq.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
