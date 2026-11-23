import { Router } from 'express';
import { z } from 'zod';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const BILLING_PERIODS = ['one_time', 'monthly', 'yearly', 'project', 'custom'] as const;

const packageSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase-kebab-case'),
    description: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
    price: z.coerce.number().min(0),
    currency: z.string().length(3).optional(),
    billingPeriod: z.enum(BILLING_PERIODS).optional().nullable(),
    features: z.array(z.string()).optional().nullable(),
    highlighted: z.boolean().optional(),
    published: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
});

const updateSchema = packageSchema.partial();

export default function pricingPackagesRouter(prisma: Db = db) {
    const router = Router();

    // Public: published packages only, stable sort.
    router.get('/', async (_req, res) => {
        try {
            const rows = await prisma.orm.public.PricingPackage
                .where({ published: true })
                .include('service', (s: any) => s.select('id', 'title', 'slug', 'published'))
                .orderBy((p: any) => p.sortOrder.asc())
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ── Admin CRUD ──
    router.get('/admin', requireAuth, requirePermission('services.manage_pricing'), async (_req: AuthRequest, res) => {
        try {
            const rows = await prisma.orm.public.PricingPackage
                .include('service', (s: any) => s.select('id', 'title', 'slug'))
                .orderBy((p: any) => p.sortOrder.asc())
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/admin', requireAuth, requirePermission('services.manage_pricing'), async (req: AuthRequest, res) => {
        const parsed = packageSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const data = parsed.data;
            const payload: any = {
                id: newId(),
                name: data.name,
                slug: data.slug,
                description: data.description ?? null,
                serviceId: data.serviceId ?? null,
                price: data.price,
                currency: (data.currency ?? 'KES').toUpperCase(),
                billingPeriod: data.billingPeriod ?? null,
                features: data.features ?? null,
                highlighted: data.highlighted ?? false,
                published: data.published ?? false,
                sortOrder: data.sortOrder ?? 0,
                updatedAt: ts(),
            };
            const created = await prisma.orm.public.PricingPackage.create(payload);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'pricing_package.create',
                entity: 'PricingPackage',
                entityId: created!.id,
                meta: { slug: data.slug },
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.put('/admin/:id', requireAuth, requirePermission('services.manage_pricing'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const existing = await prisma.orm.public.PricingPackage.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Pricing package not found' });
            const data = parsed.data;
            const payload: any = { updatedAt: ts() };
            for (const [k, v] of Object.entries(data)) {
                if (v === undefined) continue;
                if (k === 'price') payload[k] = Number(v);
                else if (k === 'currency') payload[k] = String(v).toUpperCase();
                else payload[k] = v;
            }
            const updated = await prisma.orm.public.PricingPackage.where({ id: existing.id }).update(payload);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'pricing_package.update',
                entity: 'PricingPackage',
                entityId: existing.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/admin/:id', requireAuth, requirePermission('services.manage_pricing'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.PricingPackage.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Pricing package not found' });
            await prisma.orm.public.PricingPackage.where({ id: existing.id }).delete();
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'pricing_package.delete',
                entity: 'PricingPackage',
                entityId: existing.id,
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
