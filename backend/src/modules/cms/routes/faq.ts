import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { z } from 'zod';

const faqSchema = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    category: z.string().optional(),
    order: z.number().optional(),
    published: z.boolean().optional(),
});

export default function faqRouter(prisma: Db) {
    const router = Router();

    // ─── Public: List published FAQs ────────────────────────────────
    router.get('/', async (req, res) => {
        try {
            const faqs = await prisma.orm.public.Faq
                .where({ published: true })
                .orderBy([(f: any) => f.category.asc(), (f: any) => f.order.asc()])
                .all();
            res.json(faqs);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Admin: List all FAQs (including unpublished) ───────────────
    router.get('/all', requireAuth, async (req: any, res) => {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
            return res.status(403).json({ error: 'Not allowed' });
        }
        try {
            const faqs = await prisma.orm.public.Faq
                .orderBy([(f: any) => f.category.asc(), (f: any) => f.order.asc()])
                .all();
            res.json(faqs);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Admin: Create FAQ ──────────────────────────────────────────
    router.post('/', requireAuth, async (req: any, res) => {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
            return res.status(403).json({ error: 'Not allowed' });
        }
        const parsed = faqSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

        try {
            const faq = await prisma.orm.public.Faq.create({
                id: newId(),
                updatedAt: ts(),
                question: parsed.data.question,
                answer: parsed.data.answer,
                category: parsed.data.category ?? 'General',
                order: parsed.data.order ?? 0,
                published: parsed.data.published ?? true
            });
            res.status(201).json(faq);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Admin: Update FAQ ──────────────────────────────────────────
    router.put('/:id', requireAuth, async (req: any, res) => {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
            return res.status(403).json({ error: 'Not allowed' });
        }
        const parsed = faqSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

        try {
            const payload: any = {};
            for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
            const faq = await prisma.orm.public.Faq.where({ id: req.params.id }).update(payload);
            if (!faq) return res.status(404).json({ error: 'FAQ not found' });
            res.json(faq);
        } catch (err: any) {
            res.status(404).json({ error: 'FAQ not found' });
        }
    });

    // ─── Admin: Delete FAQ ──────────────────────────────────────────
    router.delete('/:id', requireAuth, async (req: any, res) => {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin only' });
        }
        try {
            const deleted = await prisma.orm.public.Faq.where({ id: req.params.id }).delete();
            if (!deleted) return res.status(404).json({ error: 'FAQ not found' });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(404).json({ error: 'FAQ not found' });
        }
    });

    return router;
}
