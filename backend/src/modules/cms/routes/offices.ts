import { Router } from 'express';
import { z } from 'zod';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission } from '../../../shared/middleware/roles';
import { logAudit } from '../../../shared/services/audit';

const officeSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase-kebab-case'),
    addressLine: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    hours: z.array(z.object({
        label: z.string().optional(),
        days: z.string().optional(),
        hours: z.string().optional(),
    })).optional().nullable(),
    mapUrl: z.string().url().optional().nullable().or(z.literal('')),
    isHeadquarters: z.boolean().optional(),
    published: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
});

const updateSchema = officeSchema.partial();

const normalizeEmail = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const normalizeUrl = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export default function officesRouter(prisma: Db = db) {
    const router = Router();

    // Public: published offices only, stable sort.
    router.get('/', async (_req, res) => {
        try {
            const rows = await prisma.orm.public.Office
                .where({ published: true })
                .orderBy((o: any) => o.sortOrder.asc())
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ── Admin CRUD ──
    router.get('/admin', requireAuth, requirePermission('pages.update_contact'), async (_req: AuthRequest, res) => {
        try {
            const rows = await prisma.orm.public.Office
                .orderBy((o: any) => o.sortOrder.asc())
                .all();
            res.json(rows);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/admin', requireAuth, requirePermission('pages.update_contact'), async (req: AuthRequest, res) => {
        const parsed = officeSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const data = parsed.data;
            const payload: any = {
                id: newId(),
                name: data.name,
                slug: data.slug,
                addressLine: data.addressLine ?? null,
                city: data.city ?? null,
                country: data.country ?? 'Kenya',
                phone: data.phone ?? null,
                email: normalizeEmail(data.email),
                hours: data.hours ?? null,
                mapUrl: normalizeUrl(data.mapUrl),
                isHeadquarters: data.isHeadquarters ?? false,
                published: data.published ?? false,
                sortOrder: data.sortOrder ?? 0,
                updatedAt: ts(),
            };
            const created = await prisma.orm.public.Office.create(payload);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'office.create',
                entity: 'Office',
                entityId: created!.id,
                meta: { slug: data.slug },
            });
            res.status(201).json(created);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.put('/admin/:id', requireAuth, requirePermission('pages.update_contact'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const existing = await prisma.orm.public.Office.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Office not found' });
            const data = parsed.data;
            const payload: any = { updatedAt: ts() };
            for (const [k, v] of Object.entries(data)) {
                if (v === undefined) continue;
                if (k === 'email' || k === 'mapUrl') payload[k] = normalizeEmail(v) ?? normalizeUrl(v);
                else if (k === 'sortOrder') payload[k] = Number(v);
                else payload[k] = v;
            }
            const updated = await prisma.orm.public.Office.where({ id: existing.id }).update(payload);
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'office.update',
                entity: 'Office',
                entityId: existing.id,
            });
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.delete('/admin/:id', requireAuth, requirePermission('pages.update_contact'), async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.Office.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Office not found' });
            await prisma.orm.public.Office.where({ id: existing.id }).delete();
            await logAudit({
                actorId: req.user!.sub,
                actorRole: req.user!.role ?? null,
                action: 'office.delete',
                entity: 'Office',
                entityId: existing.id,
            });
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
