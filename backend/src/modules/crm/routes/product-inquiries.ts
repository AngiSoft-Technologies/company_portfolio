import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const createSchema = z.object({
    productId: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    message: z.string().min(1)
});

const updateSchema = z.object({ status: z.string().optional() });

export default function productInquiriesRouter(prisma: Db = db) {
    const router = Router();

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (_req: AuthRequest, res) => {
        const inquiries = await prisma.orm.public.ProductInquiry
            .include('product', (p: any) => p.select('name', 'slug'))
            .orderBy((i: any) => i.createdAt.desc())
            .all();
        res.json(inquiries);
    });

    router.post('/', async (req, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const inquiry = await prisma.orm.public.ProductInquiry.create({
            id: newId(),
            updatedAt: ts(),
            productId: parsed.data.productId,
            clientId: null,
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone ?? null,
            message: parsed.data.message
        });
        res.status(201).json(inquiry);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const inquiry = await prisma.orm.public.ProductInquiry.where({ id: req.params.id }).update(payload);
        res.json(inquiry);
    });

    return router;
}
