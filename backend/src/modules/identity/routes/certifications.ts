import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission, requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const createSchema = z.object({
    employeeId: z.string().optional(),
    name: z.string().min(1),
    issuer: z.string().min(1),
    year: z.number().nullable().optional(),
    url: z.string().nullable().optional()
});

const updateSchema = createSchema.partial();

export default function certificationsRouter(prisma: Db = db) {
    const router = Router();

    const auditCertification = async (req: AuthRequest, action: string, entityId?: string) => {
        await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: req.user?.sub ?? null,
            actorRole: (req.user?.role ?? null) as any,
            action,
            entity: 'Certification',
            entityId: entityId ?? null
        }).catch(() => undefined);
    };

    router.get('/admin', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (_req: AuthRequest, res) => {
        const certs = await prisma.orm.public.Certification
            .include('employee', (e: any) => e.select('id', 'firstName', 'lastName', 'username', 'email'))
            .orderBy((c: any) => c.createdAt.desc())
            .all();
        res.json(certs);
    });

    router.get('/my', requireAuth, async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const certs = await prisma.orm.public.Certification
            .where({ employeeId: req.user.sub })
            .orderBy((c: any) => c.createdAt.desc())
            .all();
        res.json(certs);
    });

    router.get('/staff/:employeeId', async (req, res) => {
        const certs = await prisma.orm.public.Certification
            .where({ employeeId: req.params.employeeId })
            .orderBy((c: any) => c.createdAt.desc())
            .all();
        res.json(certs);
    });

    router.post('/', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const employeeId = parsed.data.employeeId && ['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN'].includes(req.user.role ?? '')
            ? parsed.data.employeeId
            : req.user.sub;
        const cert = await prisma.orm.public.Certification.create({
            id: newId(),
            updatedAt: ts(),
            employeeId,
            name: parsed.data.name,
            issuer: parsed.data.issuer,
            year: parsed.data.year ?? null,
            url: parsed.data.url ?? null
        });
        await auditCertification(req, 'certification.create', cert.id);
        res.status(201).json(cert);
    });

    router.put('/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const cert = await prisma.orm.public.Certification.where({ id: req.params.id }).first();
        if (!cert) return res.status(404).json({ error: 'Not found' });
        if (cert.employeeId !== req.user.sub && !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const updated = await prisma.orm.public.Certification.where({ id: req.params.id }).update(payload);
        await auditCertification(req, 'certification.update', updated?.id);
        res.json(updated);
    });

    router.delete('/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        const cert = await prisma.orm.public.Certification.where({ id: req.params.id }).first();
        if (!cert) return res.status(404).json({ error: 'Not found' });
        if (cert.employeeId !== req.user.sub && !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role ?? '')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.orm.public.Certification.where({ id: req.params.id }).delete();
        await auditCertification(req, 'certification.delete', req.params.id);
        res.json({ ok: true });
    });

    return router;
}
