import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const createSchema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    htmlBody: z.string().optional(),
    status: z.string().default('draft'),
    scheduledAt: z.string().datetime().nullable().optional()
});

const updateSchema = createSchema.partial();

const countOf = (query: any) => query.aggregate((a: any) => ({ n: a.count() })).then((r: any) => r.n);

export default function newslettersRouter(prisma: Db = db) {
    const router = Router();
    router.use(requireAuth, requireRoles('ADMIN', 'MARKETING'));

    router.get('/', async (req: AuthRequest, res) => {
        const newsletters = await prisma.orm.public.Newsletter
            .orderBy((n: any) => n.createdAt.desc())
            .all();
        res.json(newsletters);
    });

    router.get('/stats', async (req: AuthRequest, res) => {
        const total = await countOf(prisma.orm.public.Newsletter);
        const sent = await countOf(prisma.orm.public.Newsletter.where({ status: 'sent' }));
        const totalSubscribers = await countOf(
            prisma.orm.public.Subscriber.where((s: any) => s.unsubscribedAt.isNull())
        );
        res.json({ total, sent, totalSubscribers });
    });

    router.post('/', async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const newsletter = await prisma.orm.public.Newsletter.create({
            id: newId(),
            subject: parsed.data.subject,
            body: parsed.data.body,
            htmlBody: parsed.data.htmlBody ?? null,
            status: parsed.data.status,
            scheduledAt: parsed.data.scheduledAt ? ts(parsed.data.scheduledAt) : null,
            authorId: req.user?.sub ?? null
        });
        res.status(201).json(newsletter);
    });

    router.put('/:id', async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) {
            if (v === undefined) continue;
            payload[k] = k === 'scheduledAt' ? (v != null ? ts(v as string) : null) : v;
        }
        const newsletter = await prisma.orm.public.Newsletter.where({ id: req.params.id }).update(payload);
        res.json(newsletter);
    });

    router.post('/:id/send', async (req: AuthRequest, res) => {
        const newsletter = await prisma.orm.public.Newsletter.where({ id: req.params.id }).first();
        if (!newsletter) return res.status(404).json({ error: 'Not found' });
        const subscribers = await prisma.orm.public.Subscriber
            .where({ confirmed: true })
            .where((s: any) => s.unsubscribedAt.isNull())
            .all();
        const updated = await prisma.orm.public.Newsletter.where({ id: req.params.id }).update({
            status: 'sent',
            sentAt: ts(),
            recipientCount: subscribers.length
        });
        res.json({ newsletter: updated, recipientCount: subscribers.length });
    });

    router.delete('/:id', async (req: AuthRequest, res) => {
        await prisma.orm.public.Newsletter.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    });

    return router;
}
