import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const createSchema = z.object({
    name: z.string().min(1),
    issuer: z.string().min(1),
    year: z.number().nullable().optional(),
    url: z.string().nullable().optional()
});

const updateSchema = createSchema.partial();

export default function certificationsRouter() {
    const router = Router();

    router.get('/my', requireAuth, async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const certs = await prisma.certification.findMany({
            where: { employeeId: req.user.sub },
            orderBy: { createdAt: 'desc' }
        });
        res.json(certs);
    });

    router.get('/staff/:employeeId', async (req, res) => {
        const certs = await prisma.certification.findMany({
            where: { employeeId: req.params.employeeId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(certs);
    });

    router.post('/', requireAuth, async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const cert = await prisma.certification.create({
            data: { ...parsed.data, employeeId: req.user.sub }
        });
        res.status(201).json(cert);
    });

    router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const cert = await prisma.certification.findUnique({ where: { id: req.params.id } });
        if (!cert) return res.status(404).json({ error: 'Not found' });
        if (cert.employeeId !== req.user.sub && !['ADMIN', 'HR'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const updated = await prisma.certification.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        res.json(updated);
    });

    router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const cert = await prisma.certification.findUnique({ where: { id: req.params.id } });
        if (!cert) return res.status(404).json({ error: 'Not found' });
        if (cert.employeeId !== req.user.sub && !['ADMIN', 'HR'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.certification.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    });

    return router;
}
