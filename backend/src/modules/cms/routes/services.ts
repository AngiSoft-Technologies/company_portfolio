import { Router } from 'express';
import { z } from 'zod';
import db, { type Db } from '../../../db';
import { optionalAuth, requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess, requirePermission } from '../../../shared/middleware/roles';
import {
  checkAssigned,
  has as hasPermission,
  isDenied,
} from '../../identity/services/effectivePermissions';
import { servicesService } from '../services/servicesService';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  priceFrom: z.coerce.number().optional(),
  targetAudience: z.string().optional(),
  scope: z.string().optional(),
  images: z.array(z.string()).optional(),
  published: z.boolean().optional()
});

const updateSchema = createSchema.partial();

export default function servicesRouter(prisma: Db = db) {
    const router = Router();

    const permCtx = (req: AuthRequest) =>
        req.user?.sub ? { employeeId: req.user.sub, systemRole: req.user.role } : null;

    // Global `services.update` still manages every service. Scoped editors hold
    // `services.update_assigned` and must also have a ServiceTeamMember row (or
    // be the author); an explicit DENY on either key is final.
    const canEditService = async (req: AuthRequest, id: string, existing?: any): Promise<boolean> => {
        const ctx = permCtx(req);
        if (!ctx) return false;
        if (await isDenied(ctx, 'services.update')) return false;
        if (await hasPermission(ctx, 'services.update')) return true;
        return (await checkAssigned(ctx, 'services.update_assigned', {
            type: 'service',
            id,
            ownerIds: existing ? [existing.authorId] : [],
        })).allowed;
    };

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const includeAll = ctx ? await hasPermission(ctx, 'services.update') : false;
            const isDeveloper = ctx ? await hasPermission(ctx, 'services.create') : false;
            const services = await servicesService.list({
                where: includeAll ? {} : (isDeveloper ? { authorId: req.user?.sub } : { published: true })
            });
            res.json(services);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const includeAll = ctx ? await hasPermission(ctx, 'services.update') : false;
            const isDeveloper = ctx ? await hasPermission(ctx, 'services.create') : false;
            const service = await servicesService.get(req.params.id, {
                where: includeAll
                    ? {}
                    : (isDeveloper ? { authorId: req.user?.sub } : { published: true })
            });
            if (!service) return res.status(404).json({ error: 'Not found' });
            res.json(service);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/', requireAuth, requirePermission('services.create'), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const data = parsed.data;
            let categoryLabel = data.category || 'General';
            if (data.categoryId) {
                const category = await prisma.orm.public.ServiceCategory.where({ id: data.categoryId }).first();
                if (category) categoryLabel = category.name;
            }
            const authorId = req.user?.sub || undefined;
            const created = await servicesService.create({
                ...data,
                category: categoryLabel,
                authorId
            }, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const existing = await prisma.orm.public.Service.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Not found' });
            if (!(await canEditService(req, req.params.id, existing))) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const data = parsed.data;
            let categoryLabel = data.category;
            if (data.categoryId) {
                const category = await prisma.orm.public.ServiceCategory.where({ id: data.categoryId }).first();
                if (category) categoryLabel = category.name;
            }
            const updated = await servicesService.update(req.params.id, {
                ...data,
                ...(categoryLabel ? { category: categoryLabel } : {})
            }, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.delete('/:id', requireAuth, requirePermission('services.archive'), async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const canManageAll = ctx ? await hasPermission(ctx, 'services.update') : false;
            if (!canManageAll) {
                const existing = await prisma.orm.public.Service.where({ id: req.params.id }).first();
                if (!existing || existing.authorId !== req.user?.sub) {
                    return res.status(403).json({ error: 'Not authorized' });
                }
            }
            await servicesService.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ── Pricing admin (Service.pricing JSON) ──
    // Least-invasive gap fix: no dedicated PricingPackage table. Expose the
    // existing Service.pricing JSON for admin viewing/editing.
    router.get('/admin/pricing', requireAuth, requireAccess('services.manage_pricing', ['ADMIN', 'MARKETING']), async (_req: AuthRequest, res) => {
        try {
            const services = await prisma.orm.public.Service
                .select('id', 'title', 'slug', 'category', 'priceFrom', 'pricing')
                .orderBy((s: any) => s.title.asc())
                .all();
            res.json(services);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Update only the pricing JSON field. Body must be a non-null object or array.
    router.put('/:id/pricing', requireAuth, requirePermission('services.manage_pricing'), async (req: AuthRequest, res) => {
        const value = req.body?.pricing;
        if (value === null || value === undefined || typeof value !== 'object') {
            return res.status(400).json({ error: 'pricing must be a JSON object or array' });
        }
        try {
            const existing = await prisma.orm.public.Service.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Not found' });
            const updated = await prisma.orm.public.Service.where({ id: req.params.id })
                .update({ pricing: value });
            res.json({ id: updated!.id, pricing: updated!.pricing });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
}
