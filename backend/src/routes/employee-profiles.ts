import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission, requireRoles } from '../middleware/roles';
import prisma from '../db';

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

export default function employeeProfilesRouter() {
    const router = Router();

    const canManageEmployee = (req: AuthRequest, employeeId: string) => {
        return req.user?.sub === employeeId || ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'].includes(req.user?.role ?? '');
    };

    const audit = async (req: AuthRequest, action: string, entity: string, entityId?: string) => {
        await prisma.auditLog.create({
            data: {
                actorId: req.user?.sub,
                actorRole: req.user?.role as Role | undefined,
                action,
                entity,
                entityId
            }
        }).catch(() => undefined);
    };

    router.get('/portfolio/admin', requireAuth, requireRoles('ADMIN', 'HR', 'MANAGER'), async (_req: AuthRequest, res) => {
        const items = await prisma.employeePortfolioItem.findMany({
            include: { employee: { select: { id: true, firstName: true, lastName: true, username: true, email: true } } },
            orderBy: [{ employeeId: 'asc' }, { order: 'asc' }]
        });
        res.json(items);
    });

    router.get('/portfolio/:employeeId', async (req, res) => {
        const items = await prisma.employeePortfolioItem.findMany({
            where: { employeeId: req.params.employeeId, published: true },
            orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }]
        });
        res.json(items);
    });

    router.post('/portfolio', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const parsed = portfolioSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const employeeId = parsed.data.employeeId || req.user?.sub;
        if (!employeeId || !canManageEmployee(req, employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const item = await prisma.employeePortfolioItem.create({ data: { ...parsed.data, employeeId } });
        await audit(req, 'employeePortfolio.create', 'EmployeePortfolioItem', item.id);
        res.status(201).json(item);
    });

    router.put('/portfolio/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const item = await prisma.employeePortfolioItem.findUnique({ where: { id: req.params.id } });
        if (!item) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, item.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const parsed = portfolioSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const updated = await prisma.employeePortfolioItem.update({ where: { id: item.id }, data: parsed.data });
        await audit(req, 'employeePortfolio.update', 'EmployeePortfolioItem', updated.id);
        res.json(updated);
    });

    router.delete('/portfolio/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const item = await prisma.employeePortfolioItem.findUnique({ where: { id: req.params.id } });
        if (!item) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, item.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        await prisma.employeePortfolioItem.delete({ where: { id: item.id } });
        await audit(req, 'employeePortfolio.delete', 'EmployeePortfolioItem', item.id);
        res.json({ ok: true });
    });

    router.get('/stats/:employeeId', async (req, res) => {
        const stats = await prisma.employeeProfileStat.findMany({
            where: { employeeId: req.params.employeeId, published: true },
            orderBy: { order: 'asc' }
        });
        res.json(stats);
    });

    router.post('/stats', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const parsed = statSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const employeeId = parsed.data.employeeId || req.user?.sub;
        if (!employeeId || !canManageEmployee(req, employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const stat = await prisma.employeeProfileStat.create({ data: { ...parsed.data, employeeId } });
        await audit(req, 'employeeProfileStat.create', 'EmployeeProfileStat', stat.id);
        res.status(201).json(stat);
    });

    router.put('/stats/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const stat = await prisma.employeeProfileStat.findUnique({ where: { id: req.params.id } });
        if (!stat) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, stat.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        const parsed = statSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const updated = await prisma.employeeProfileStat.update({ where: { id: stat.id }, data: parsed.data });
        await audit(req, 'employeeProfileStat.update', 'EmployeeProfileStat', updated.id);
        res.json(updated);
    });

    router.delete('/stats/:id', requireAuth, requirePermission('profile.update_own'), async (req: AuthRequest, res) => {
        const stat = await prisma.employeeProfileStat.findUnique({ where: { id: req.params.id } });
        if (!stat) return res.status(404).json({ error: 'Not found' });
        if (!canManageEmployee(req, stat.employeeId)) return res.status(403).json({ error: 'Not authorized' });
        await prisma.employeeProfileStat.delete({ where: { id: stat.id } });
        await audit(req, 'employeeProfileStat.delete', 'EmployeeProfileStat', stat.id);
        res.json({ ok: true });
    });

    return router;
}
