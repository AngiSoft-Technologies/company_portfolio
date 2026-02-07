import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const faqSchema = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    category: z.string().optional(),
    order: z.number().optional(),
    published: z.boolean().optional(),
});

export default function faqRouter(prisma: PrismaClient) {
    const router = Router();

    // ─── Public: List published FAQs ────────────────────────────────
    router.get('/', async (req, res) => {
        try {
            const faqs = await prisma.faq.findMany({
                where: { published: true },
                orderBy: [{ category: 'asc' }, { order: 'asc' }],
            });
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
            const faqs = await prisma.faq.findMany({
                orderBy: [{ category: 'asc' }, { order: 'asc' }],
            });
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
            const faq = await prisma.faq.create({ data: parsed.data });
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
            const faq = await prisma.faq.update({
                where: { id: req.params.id },
                data: parsed.data,
            });
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
            await prisma.faq.delete({ where: { id: req.params.id } });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(404).json({ error: 'FAQ not found' });
        }
    });

    return router;
}
