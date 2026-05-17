import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles, isRole } from '../middleware/roles';
import { testimonialsController } from '../controllers/testimonialsController';
import prisma from '../db';

const createSchema = z.object({
    name: z.string().min(1),
    company: z.string().optional(),
    role: z.string().optional(),
    text: z.string().min(10),
    rating: z.coerce.number().min(1).max(5).optional(),
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    location: z.string().optional(),
    projectType: z.string().optional(),
    productId: z.string().optional(),
    confirmed: z.boolean().optional(),
    featured: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export default function testimonialsRouter() {
    const router = Router();

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const list = await testimonialsController.list({
                where: includeAll ? {} : { confirmed: true, rejected: false }
            });
            res.json(list);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/featured', async (req, res) => {
        const featured = await prisma.testimonial.findMany({
            where: { featured: true, confirmed: true, rejected: false },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        res.json(featured);
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const testimonial = await testimonialsController.get(req.params.id, {
                where: includeAll ? { id: req.params.id } : { id: req.params.id, confirmed: true }
            });
            if (!testimonial) return res.status(404).json({ error: 'Not found' });
            res.json(testimonial);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const created = await testimonialsController.create(parsed.data, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const updated = await testimonialsController.update(req.params.id, parsed.data, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.patch('/:id/feature', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const testimonial = await prisma.testimonial.findUnique({ where: { id: req.params.id } });
        if (!testimonial) return res.status(404).json({ error: 'Not found' });
        const updated = await prisma.testimonial.update({
            where: { id: req.params.id },
            data: { featured: !testimonial.featured }
        });
        res.json(updated);
    });

    router.patch('/:id/approve', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const updated = await prisma.testimonial.update({
            where: { id: req.params.id },
            data: { confirmed: true, rejected: false, rejectionReason: null }
        });
        res.json(updated);
    });

    router.patch('/:id/reject', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const { reason } = req.body;
        const updated = await prisma.testimonial.update({
            where: { id: req.params.id },
            data: { confirmed: false, rejected: true, rejectionReason: reason || 'Rejected by admin' }
        });
        res.json(updated);
    });

    router.patch('/:id/reply', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        const { reply } = req.body;
        if (!reply) return res.status(400).json({ error: 'Reply required' });
        const updated = await prisma.testimonial.update({
            where: { id: req.params.id },
            data: { adminReply: reply }
        });
        res.json(updated);
    });

    router.post('/:id/react', async (req, res) => {
        const { visitorKey } = req.body;
        if (!visitorKey) return res.status(400).json({ error: 'Visitor key required' });
        try {
            const existing = await prisma.reviewReaction.findUnique({
                where: { testimonialId_visitorKey: { testimonialId: req.params.id, visitorKey } }
            });
            if (existing) return res.json({ alreadyReacted: true });
            await prisma.reviewReaction.create({
                data: { testimonialId: req.params.id, visitorKey }
            });
            await prisma.testimonial.update({
                where: { id: req.params.id },
                data: { helpfulCount: { increment: 1 } }
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), async (req: AuthRequest, res) => {
        try {
            await testimonialsController.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
