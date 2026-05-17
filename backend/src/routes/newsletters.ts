import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    htmlBody: z.string().optional(),
    status: z.string().default('draft'),
    scheduledAt: z.string().datetime().nullable().optional()
});

const updateSchema = createSchema.partial();

export default function newslettersRouter() {
    const router = Router();
    router.use(requireAuth, requireRoles('ADMIN', 'MARKETING'));

    router.get('/', async (req: AuthRequest, res) => {
        const newsletters = await prisma.newsletter.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(newsletters);
    });

    router.get('/stats', async (req: AuthRequest, res) => {
        const total = await prisma.newsletter.count();
        const sent = await prisma.newsletter.count({ where: { status: 'sent' } });
        const totalSubscribers = await prisma.subscriber.count({ where: { unsubscribedAt: null } });
        res.json({ total, sent, totalSubscribers });
    });

    router.post('/', async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const newsletter = await prisma.newsletter.create({
            data: { ...parsed.data, authorId: req.user?.sub }
        });
        res.status(201).json(newsletter);
    });

    router.put('/:id', async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const newsletter = await prisma.newsletter.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(newsletter);
    });

    router.post('/:id/send', async (req: AuthRequest, res) => {
        const newsletter = await prisma.newsletter.findUnique({ where: { id: req.params.id } });
        if (!newsletter) return res.status(404).json({ error: 'Not found' });
        const subscribers = await prisma.subscriber.findMany({
            where: { confirmed: true, unsubscribedAt: null }
        });
        const updated = await prisma.newsletter.update({
            where: { id: req.params.id },
            data: { status: 'sent', sentAt: new Date(), recipientCount: subscribers.length }
        });
        res.json({ newsletter: updated, recipientCount: subscribers.length });
    });

    router.delete('/:id', async (req: AuthRequest, res) => {
        await prisma.newsletter.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
