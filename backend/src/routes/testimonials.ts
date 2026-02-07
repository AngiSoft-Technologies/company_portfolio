import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles, isRole } from '../middleware/roles';
import { testimonialsController } from '../controllers/testimonialsController';

const createSchema = z.object({
    name: z.string().min(1),
    company: z.string().optional(),
    role: z.string().optional(),
    text: z.string().min(10),
    rating: z.coerce.number().min(1).max(5).optional(),
    imageUrl: z.string().optional(),
    confirmed: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export default function testimonialsRouter() {
    const router = Router();

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const includeAll = isRole(req, ['ADMIN', 'MARKETING']);
            const list = await testimonialsController.list({
                where: includeAll ? {} : { confirmed: true }
            });
            res.json(list);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
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

    router.delete('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), async (req: AuthRequest, res) => {
        try {
            await testimonialsController.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
