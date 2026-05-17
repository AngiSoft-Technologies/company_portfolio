import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    productId: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    message: z.string().min(1)
});

const updateSchema = z.object({ status: z.string().optional() });

export default function productInquiriesRouter() {
    const router = Router();

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (_req: AuthRequest, res) => {
        const inquiries = await prisma.productInquiry.findMany({
            include: { product: { select: { name: true, slug: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(inquiries);
    });

    router.post('/', async (req, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const inquiry = await prisma.productInquiry.create({ data: parsed.data });
        res.status(201).json(inquiry);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const inquiry = await prisma.productInquiry.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(inquiry);
    });

    return router;
}
