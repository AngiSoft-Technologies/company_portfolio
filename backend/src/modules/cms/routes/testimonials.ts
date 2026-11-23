import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import {
  checkAssigned,
  has as hasPermission,
  isDenied,
} from '../../identity/services/effectivePermissions';
import { testimonialsService } from '../services/testimonialsService';
import db, { type Db } from '../../../db';
import { newId } from '../../../prisma/db';

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

export default function testimonialsRouter(prisma: Db = db) {
    const router = Router();

    const permCtx = (req: AuthRequest) =>
        req.user?.sub ? { employeeId: req.user.sub, systemRole: req.user.role } : null;

    // Global `reviews.moderate` (and the legacy role fallback) still moderates
    // every testimonial. Assigned reviewers may only touch rows in their queue.
    const canModerate = async (req: AuthRequest, testimonialId: string, fallbackRoles: string[]) => {
        const ctx = permCtx(req);
        if (!ctx) return false;
        if (await isDenied(ctx, 'reviews.moderate')) return false;
        if (await hasPermission(ctx, 'reviews.moderate')) return true;
        if (req.user?.role && fallbackRoles.includes(req.user.role)) return true;
        return (await checkAssigned(ctx, 'reviews.moderate_assigned', {
            type: 'review',
            id: testimonialId,
        })).allowed;
    };

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const includeAll = ctx ? await hasPermission(ctx, 'reviews.moderate') : false;
            const list = await testimonialsService.list({
                where: includeAll ? {} : { confirmed: true, rejected: false }
            });
            res.json(list);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/featured', async (req, res) => {
        const featured = await prisma.orm.public.Testimonial
            .where({ featured: true, confirmed: true, rejected: false })
            .orderBy((t: any) => t.createdAt.desc())
            .limit(10)
            .all();
        res.json(featured);
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const includeAll = ctx ? await hasPermission(ctx, 'reviews.moderate') : false;
            const testimonial = await testimonialsService.get(req.params.id, {
                where: includeAll ? { id: req.params.id } : { id: req.params.id, confirmed: true }
            });
            if (!testimonial) return res.status(404).json({ error: 'Not found' });
            res.json(testimonial);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/', requireAuth, requireAccess('reviews.moderate', ['ADMIN', 'MARKETING']), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const created = await testimonialsService.create(parsed.data, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        if (!(await canModerate(req, req.params.id, ['ADMIN', 'MARKETING']))) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        try {
            const updated = await testimonialsService.update(req.params.id, parsed.data, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.patch('/:id/feature', requireAuth, async (req: AuthRequest, res) => {
        if (!(await canModerate(req, req.params.id, ['ADMIN', 'MARKETING']))) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const testimonial = await prisma.orm.public.Testimonial.where({ id: req.params.id }).first();
        if (!testimonial) return res.status(404).json({ error: 'Not found' });
        const updated = await prisma.orm.public.Testimonial.where({ id: req.params.id })
            .update({ featured: !testimonial.featured });
        res.json(updated);
    });

    router.patch('/:id/approve', requireAuth, async (req: AuthRequest, res) => {
        if (!(await canModerate(req, req.params.id, ['ADMIN', 'MARKETING']))) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const updated = await prisma.orm.public.Testimonial.where({ id: req.params.id })
            .update({ confirmed: true, rejected: false, rejectionReason: null });
        res.json(updated);
    });

    router.patch('/:id/reject', requireAuth, async (req: AuthRequest, res) => {
        if (!(await canModerate(req, req.params.id, ['ADMIN', 'MARKETING']))) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { reason } = req.body;
        const updated = await prisma.orm.public.Testimonial.where({ id: req.params.id })
            .update({ confirmed: false, rejected: true, rejectionReason: reason || 'Rejected by admin' });
        res.json(updated);
    });

    router.patch('/:id/reply', requireAuth, async (req: AuthRequest, res) => {
        if (!(await canModerate(req, req.params.id, ['ADMIN', 'MARKETING']))) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { reply } = req.body;
        if (!reply) return res.status(400).json({ error: 'Reply required' });
        const updated = await prisma.orm.public.Testimonial.where({ id: req.params.id })
            .update({ adminReply: reply });
        res.json(updated);
    });

    router.post('/:id/react', async (req, res) => {
        const { visitorKey } = req.body;
        if (!visitorKey) return res.status(400).json({ error: 'Visitor key required' });
        try {
            const existing = await prisma.orm.public.ReviewReaction
                .where({ testimonialId: req.params.id, visitorKey })
                .first();
            if (existing) return res.json({ alreadyReacted: true });
            await prisma.orm.public.ReviewReaction.create({
                id: newId(),
                testimonialId: req.params.id,
                visitorKey
            });
            const plan = prisma.raw.sql`UPDATE "Testimonial" SET "helpfulCount" = "helpfulCount" + 1 WHERE "id" = ${req.params.id}`
                .affectedCount()
                .build();
            await prisma.runtime().execute(plan);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
        if (!(await canModerate(req, req.params.id, ['ADMIN']))) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        try {
            await testimonialsService.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
}
