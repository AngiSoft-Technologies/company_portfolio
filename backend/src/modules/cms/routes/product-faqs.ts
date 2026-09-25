import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const createSchema = z.object({
    productId: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
    order: z.number().default(0),
    published: z.boolean().default(true)
});

const updateSchema = createSchema.partial();

export default function productFaqsRouter(prisma: Db = db) {
    const router = Router();

    const auditFaq = async (req: AuthRequest, action: string, entityId?: string) => {
        await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: req.user?.sub ?? null,
            actorRole: (req.user?.role ?? null) as any,
            action,
            entity: 'ProductFaq',
            entityId: entityId ?? null
        }).catch(() => undefined);
    };

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), async (_req: AuthRequest, res) => {
        const faqs = await prisma.orm.public.ProductFaq
            .include('product', (p: any) => p.select('id', 'name', 'slug'))
            .orderBy([(f: any) => f.productId.asc(), (f: any) => f.order.asc()])
            .all();
        res.json(faqs);
    });

    router.get('/product/:productId', async (req, res) => {
        const faqs = await prisma.orm.public.ProductFaq
            .where({ productId: req.params.productId, published: true })
            .orderBy((f: any) => f.order.asc())
            .all();
        res.json(faqs);
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING', 'CONTENT_CREATOR'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const faq = await prisma.orm.public.ProductFaq.create({
            id: newId(),
            updatedAt: ts(),
            productId: parsed.data.productId,
            question: parsed.data.question,
            answer: parsed.data.answer,
            order: parsed.data.order,
            published: parsed.data.published
        });
        await auditFaq(req, 'productFaq.create', faq.id);
        res.status(201).json(faq);
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const faq = await prisma.orm.public.ProductFaq.where({ id: req.params.id }).update(payload);
        await auditFaq(req, 'productFaq.update', faq?.id);
        res.json(faq);
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        await prisma.orm.public.ProductFaq.where({ id: req.params.id }).delete();
        await auditFaq(req, 'productFaq.delete', req.params.id);
        res.json({ ok: true });
    });

    return router;
}
