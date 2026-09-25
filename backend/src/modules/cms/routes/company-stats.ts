import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const createSchema = z.object({
    label: z.string().min(1),
    value: z.number(),
    suffix: z.string().default(''),
    valueType: z.string().default('plain'),
    prefix: z.string().default(''),
    useGrouping: z.boolean().nullable().optional(),
    icon: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    order: z.number().default(0),
    published: z.boolean().default(true)
});

const updateSchema = createSchema.partial();

export default function companyStatsRouter(prisma: Db = db) {
    const router = Router();

    router.get('/', asyncHandler(async (_req, res) => {
        const stats = await prisma.orm.public.CompanyStat
            .where({ published: true })
            .orderBy((s: any) => s.order.asc())
            .all();
        res.json(stats);
    }));

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'MARKETING', 'MANAGER'), asyncHandler(async (_req: AuthRequest, res) => {
        const stats = await prisma.orm.public.CompanyStat
            .orderBy((s: any) => s.order.asc())
            .all();
        res.json(stats);
    }));

    router.post('/', requireAuth, requireRoles('ADMIN', 'MARKETING'), asyncHandler(async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const stat = await prisma.orm.public.CompanyStat.create({
            id: newId(),
            updatedAt: ts(),
            label: parsed.data.label,
            value: parsed.data.value,
            suffix: parsed.data.suffix,
            valueType: parsed.data.valueType,
            prefix: parsed.data.prefix,
            useGrouping: parsed.data.useGrouping ?? null,
            icon: parsed.data.icon ?? null,
            description: parsed.data.description ?? null,
            order: parsed.data.order,
            published: parsed.data.published
        });
        res.status(201).json(stat);
    }));

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING'), asyncHandler(async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const stat = await prisma.orm.public.CompanyStat.where({ id: req.params.id }).update(payload);
        res.json(stat);
    }));

    router.delete('/:id', requireAuth, requireRoles('ADMIN'), asyncHandler(async (req: AuthRequest, res) => {
        await prisma.orm.public.CompanyStat.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    }));

    return router;
}
