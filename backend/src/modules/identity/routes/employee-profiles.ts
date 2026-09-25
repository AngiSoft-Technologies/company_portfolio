import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission, requireRoles } from '../../../shared/middleware/roles';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';

const portfolioSchema = z.object({
    employeeId: z.string().optional(),
    title: z.string().min(1),
    slug: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    summary: z.string().min(1),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    projectUrl: z.string().nullable().optional(),
    repoUrl: z.string().nullable().optional(),
    techStack: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    published: z.boolean().default(true),
    order: z.number().default(0)
});

const statSchema = z.object({
    employeeId: z.string().optional(),
    label: z.string().min(1),
    value: z.number(),
    suffix: z.string().default(''),
    order: z.number().default(0),
    published: z.boolean().default(true)
});

export default function employeeProfilesRouter(prisma: Db = db) {
    const router = Router();

    const canManageEmployee = (req: AuthRequest, employeeId: string) => {
        return req.user?.sub === employeeId || ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'].includes(req.user?.role ?? '');
    };

    const audit = async (req: AuthRequest, action: string, entity: string, entityId?: string) => {
        await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: req.user?.sub ?? null,
            actorRole: (req.user?.role ?? null) as any,
            action,
            entity,
            entityId: entityId ?? null
        }).catch(() => undefined);
    };

    router.get('/portfolio/admin', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (_req: AuthRequest, res) => {
        const items = await prisma.orm.public.EmployeePortfolioItem
            .include('employee', (e: any) => e.select('id', 'firstName', 'lastName', 'username', 'email'))
            .orderBy([(i: any) => i.employeeId.asc(), (i: any) => i.order.asc()])
            .all();
        res.json(items);
    });

    router.get('/portfolio/:employeeId', async (req, res) => {
        const items = await prisma.orm.public.EmployeePortfolioItem
            .where({ employeeId: req.params.employeeId, published: true })
            .orderBy([
                (i: any) => i.featured.desc(),
                (i: any) => i.order.asc(),
                (i: any) => i.createdAt.desc()
            ])
            .all();
        res.json(items);
    });

    router.post('/portfolio', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const parsed = portfolioSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const employeeId = parsed.data.employeeId || req.user?.sub;
        if (!employeeId || !canManageEmployee(req, employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const item = await prisma.orm.public.EmployeePortfolioItem.create({
            id: newId(),
            updatedAt: ts(),
            employeeId,
            title: parsed.data.title,
            slug: parsed.data.slug ?? null,
            category: parsed.data.category ?? null,
            summary: parsed.data.summary,
            description: parsed.data.description ?? null,
            imageUrl: parsed.data.imageUrl ?? null,
            projectUrl: parsed.data.projectUrl ?? null,
            repoUrl: parsed.data.repoUrl ?? null,
            techStack: parsed.data.techStack,
            featured: parsed.data.featured,
            published: parsed.data.published,
            order: parsed.data.order
        });
        await audit(req, 'employeePortfolio.create', 'EmployeePortfolioItem', item.id);
        res.status(201).json(item);
    });

    router.put('/portfolio/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const item = await prisma.orm.public.EmployeePortfolioItem.where({ id: req.params.id }).first();
        if (!item) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, item.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const parsed = portfolioSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const updated = await prisma.orm.public.EmployeePortfolioItem.where({ id: item.id }).update(payload);
        await audit(req, 'employeePortfolio.update', 'EmployeePortfolioItem', updated?.id);
        res.json(updated);
    });

    router.delete('/portfolio/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const item = await prisma.orm.public.EmployeePortfolioItem.where({ id: req.params.id }).first();
        if (!item) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, item.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        await prisma.orm.public.EmployeePortfolioItem.where({ id: item.id }).delete();
        await audit(req, 'employeePortfolio.delete', 'EmployeePortfolioItem', item.id);
        res.json({ ok: true });
    });

    router.get('/stats/:employeeId', async (req, res) => {
        const stats = await prisma.orm.public.EmployeeProfileStat
            .where({ employeeId: req.params.employeeId, published: true })
            .orderBy((s: any) => s.order.asc())
            .all();
        res.json(stats);
    });

    router.post('/stats', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const parsed = statSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const employeeId = parsed.data.employeeId || req.user?.sub;
        if (!employeeId || !canManageEmployee(req, employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const stat = await prisma.orm.public.EmployeeProfileStat.create({
            id: newId(),
            updatedAt: ts(),
            employeeId,
            label: parsed.data.label,
            value: parsed.data.value,
            suffix: parsed.data.suffix,
            order: parsed.data.order,
            published: parsed.data.published
        });
        await audit(req, 'employeeProfileStat.create', 'EmployeeProfileStat', stat.id);
        res.status(201).json(stat);
    });

    router.put('/stats/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const stat = await prisma.orm.public.EmployeeProfileStat.where({ id: req.params.id }).first();
        if (!stat) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, stat.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const parsed = statSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const payload: any = {};
        for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v;
        const updated = await prisma.orm.public.EmployeeProfileStat.where({ id: stat.id }).update(payload);
        await audit(req, 'employeeProfileStat.update', 'EmployeeProfileStat', updated?.id);
        res.json(updated);
    });

    router.delete('/stats/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const stat = await prisma.orm.public.EmployeeProfileStat.where({ id: req.params.id }).first();
        if (!stat) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, stat.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        await prisma.orm.public.EmployeeProfileStat.where({ id: stat.id }).delete();
        await audit(req, 'employeeProfileStat.delete', 'EmployeeProfileStat', stat.id);
        res.json({ ok: true });
    });

    return router;
}
