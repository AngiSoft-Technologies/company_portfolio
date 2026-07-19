import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission, requireRoles } from '../middleware/roles';
import prisma from '../db';

const createSchema = z.object({
    employeeId: z.string().optional(),
    name: z.string().min(1),
    issuer: z.string().min(1),
    year: z.number().nullable().optional(),
    url: z.string().nullable().optional()
});

const updateSchema = createSchema.partial();

export default function certificationsRouter() {
    const router = Router();

    const auditCertification = async (req: AuthRequest, action: string, entityId?: string) => {
        await prisma.auditLog.create({
            data: {
                actorId: req.user?.sub,
                actorRole: req.user?.role as Role | undefined,
                action,
                entity: 'Certification',
                entityId
            }
        }).catch(() => undefined);
    };

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (_req: AuthRequest, res) => {
        const certs = await prisma.certification.findMany({
            include: { employee: { select: { id: true, firstName: true, lastName: true, username: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(certs);
    });

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

    router.post('/', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const employeeId = parsed.data.employeeId && ['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN'].includes(req.user.role ?? '')
            ? parsed.data.employeeId
            : req.user.sub;
        const cert = await prisma.certification.create({
            data: { ...parsed.data, employeeId }
        });
        await auditCertification(req, 'certification.create', cert.id);
        res.status(201).json(cert);
    });

    router.put('/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const cert = await prisma.certification.findUnique({ where: { id: req.params.id } });
        if (!cert) return res.status(404).json({ error: 'Not found' });
        if (cert.employeeId !== req.user.sub && !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const updated = await prisma.certification.update({
            where: { id: req.params.id },
            data: parsed.data
        });
        await auditCertification(req, 'certification.update', updated.id);
        res.json(updated);
    });

    router.delete('/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const cert = await prisma.certification.findUnique({ where: { id: req.params.id } });
        if (!cert) return res.status(404).json({ error: 'Not found' });
        if (cert.employeeId !== req.user.sub && !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.certification.delete({ where: { id: req.params.id } });
        await auditCertification(req, 'certification.delete', req.params.id);
        res.json({ ok: true });
    });

    return router;
}
