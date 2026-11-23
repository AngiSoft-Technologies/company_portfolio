import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';

const createSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    assignedToId: z.string().nullable().optional()
});

const updateSchema = createSchema.partial().extend({
    status: z.string().optional()
});

const countOf = (query: any) => query.aggregate((a: any) => ({ n: a.count() })).then((r: any) => r.n);

export default function leadsRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth);

    router.get('/', requireAccess('leads.view', ['ADMIN', 'MARKETING']), async (req: AuthRequest, res) => {
        const { status, search } = req.query;
        let query: any = prisma.orm.public.Lead;
        if (status) query = query.where({ status: String(status) });
        if (search) {
            const pattern = `%${search}%`;
            query = query.where((l: any) => or(
                l.name.ilike(pattern),
                l.email.ilike(pattern)
            ));
        }
        const leads = await query
            .orderBy((l: any) => l.createdAt.desc())
            .all();
        res.json(leads);
    });

    router.get('/stats', requireAccess('leads.view', ['ADMIN', 'MARKETING']), async (req: AuthRequest, res) => {
        const total = await countOf(prisma.orm.public.Lead);
        const newCount = await countOf(prisma.orm.public.Lead.where({ status: 'new' }));
        const converted = await countOf(prisma.orm.public.Lead.where({ status: 'converted' }));
        res.json({ total, new: newCount, converted });
    });

    router.post('/', requireAccess('leads.create', ['ADMIN', 'MARKETING']), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        const lead = await prisma.orm.public.Lead.create({
            id: newId(),
            updatedAt: ts(),
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone ?? null,
            source: parsed.data.source ?? null,
            notes: parsed.data.notes ?? null,
            assignedToId: parsed.data.assignedToId ?? null
        });
        res.status(201).json(lead);
    });

    router.put('/:id', requireAccess('leads.update', ['ADMIN', 'MARKETING']), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const lead = await prisma.orm.public.Lead.where({ id: req.params.id }).update(payload);
        res.json(lead);
    });

    router.delete('/:id', requireAccess('leads.delete', ['ADMIN', 'MARKETING']), async (req: AuthRequest, res) => {
        await prisma.orm.public.Lead.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    });

    return router;
}
