import { Router } from 'express';
import { z } from 'zod';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { optionalAuth, requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess, requirePermission } from '../../../shared/middleware/roles';
import { has as hasPermission, isAssigned } from '../../identity/services/effectivePermissions';
import { projectsController } from '../../cms/controllers/projectsController';

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  images: z.array(z.string()).optional(),
  demoUrl: z.string().optional(),
  repoUrl: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  published: z.boolean().optional()
});

const updateSchema = createSchema.partial();

const projectActivitySchema = z.object({
  type: z.enum([
    'PROJECT_CREATED', 'STATUS_CHANGED', 'PROGRESS_UPDATED',
    'MILESTONE_CREATED', 'MILESTONE_UPDATED', 'COMMENT_ADDED',
    'FILE_UPLOADED', 'DELIVERABLE_ADDED', 'DELIVERABLE_ACCEPTED',
  ]).default('PROGRESS_UPDATED'),
  message: z.string().max(5000).default(''),
  meta: z.record(z.string(), z.unknown()).nullable().default(null),
  visibleToClient: z.boolean().default(true),
}).strict();

const teamAssignmentSchema = z.object({
  employeeId: z.string().min(1),
  role: z.enum(['MEMBER', 'LEAD', 'DEVELOPER', 'DESIGNER', 'REVIEWER']).default('MEMBER'),
}).strict();

export default function projectsRouter(prisma: Db = db) {
    const router = Router();

    const permCtx = (req: AuthRequest) =>
        req.user?.sub ? { employeeId: req.user.sub, systemRole: req.user.role } : null;

    router.get('/', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const includeAll = ctx ? await hasPermission(ctx, 'projects.manage') : false;
            const isDeveloper = ctx ? await hasPermission(ctx, 'projects.view') : false;
            const projects = await projectsController.list({
                where: includeAll ? {} : (isDeveloper ? { authorId: req.user?.sub } : { published: true })
            });
            res.json(projects);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ── Staff-scoped project routes (assigned team members) ──
    router.get('/staff', requireAuth, requirePermission('projects.update_assigned'), async (req: AuthRequest, res) => {
        const projects = await prisma.orm.public.Project
            .where((p: any) => p.projectEmployees.some((e: any) => e.employeeId.eq(req.user!.sub)))
            .orderBy((p: any) => p.createdAt.desc())
            .all();
        res.json(projects.map((p: any) => {
            const { _type, ...rest } = p;
            return { ...rest, type: _type };
        }));
    });

    router.get('/staff/:id', requireAuth, requirePermission('projects.update_assigned'), async (req: AuthRequest, res) => {
        const assigned = await isAssigned(
            { employeeId: req.user!.sub, systemRole: req.user!.role },
            'projects.update_assigned',
            { type: 'project', id: req.params.id },
        );
        if (!assigned) return res.status(403).json({ error: 'Not assigned to this project' });
        const project = await prisma.orm.public.Project.where({ id: req.params.id }).first();
        if (!project) return res.status(404).json({ error: 'Not found' });
        const { _type, ...rest } = project as any;
        res.json({ ...rest, type: _type });
    });

    router.put('/staff/:id', requireAuth, requirePermission('projects.update_assigned'), async (req: AuthRequest, res) => {
        const assigned = await isAssigned(
            { employeeId: req.user!.sub, systemRole: req.user!.role },
            'projects.update_assigned',
            { type: 'project', id: req.params.id },
        );
        if (!assigned) return res.status(403).json({ error: 'Not assigned to this project' });
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        const updated = await projectsController.update(req.params.id, parsed.data, req.user);
        res.json(updated);
    });

    router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const includeAll = ctx ? await hasPermission(ctx, 'projects.manage') : false;
            const isDeveloper = ctx ? await hasPermission(ctx, 'projects.view') : false;
            const project = await projectsController.get(req.params.id, {
                where: includeAll
                    ? {}
                    : (isDeveloper ? { authorId: req.user?.sub } : { published: true })
            });
            if (!project) return res.status(404).json({ error: 'Not found' });
            res.json(project);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/', requireAuth, requireAccess('projects.manage', ['ADMIN', 'MARKETING', 'DEVELOPER']), async (req: AuthRequest, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const created = await projectsController.create({
                ...parsed.data,
                authorId: req.user?.sub || undefined
            }, req.user);
            res.status(201).json(created);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.put('/:id', requireAuth, requirePermission('projects.update_assigned'), async (req: AuthRequest, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
        try {
            const ctx = permCtx(req);
            const canManageAll = ctx ? await hasPermission(ctx, 'projects.manage') : false;
            let authorized = canManageAll;
            if (!authorized) {
                const existing = await prisma.orm.public.Project.where({ id: req.params.id }).first();
                if (existing && existing.authorId === req.user?.sub) authorized = true;
            }
            if (!authorized) {
                const member = await prisma.orm.public.ProjectEmployee
                    .where({ projectId: req.params.id, employeeId: req.user!.sub })
                    .first();
                if (member) authorized = true;
            }
            if (!authorized) {
                return res.status(403).json({ error: 'Not authorized to update this project' });
            }
            const updated = await projectsController.update(req.params.id, parsed.data, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
        try {
            const ctx = permCtx(req);
            const canManageAll = ctx ? await hasPermission(ctx, 'projects.manage') : false;
            if (!canManageAll) {
                const existing = await prisma.orm.public.Project.where({ id: req.params.id }).first();
                if (!existing || existing.authorId !== req.user?.sub) {
                    return res.status(403).json({ error: 'Not authorized' });
                }
            }
            await projectsController.delete(req.params.id, req.user);
            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ── Project activity (progress) ──
    router.post('/:id/activity', requireAuth, requirePermission('projects.add_progress'), async (req: AuthRequest, res) => {
        const parsed = projectActivitySchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
        const existing = await prisma.orm.public.Project.where({ id: req.params.id }).first();
        if (!existing) return res.status(404).json({ error: 'Not found' });
        const assigned = await isAssigned(
            { employeeId: req.user!.sub, systemRole: req.user!.role },
            'projects.add_progress',
            { type: 'project', id: req.params.id, ownerIds: [existing.authorId] },
        );
        if (!assigned) {
            return res.status(403).json({ error: 'Not assigned to this project' });
        }
        const activity = await prisma.orm.public.ProjectActivity.create({
            id: newId(),
            portfolioProjectId: req.params.id,
            actorId: req.user?.sub ?? null,
            _type: parsed.data.type as any,
            message: parsed.data.message,
            meta: parsed.data.meta as any,
            visibleToClient: parsed.data.visibleToClient,
        });
        const { _type, ...rest } = activity as any;
        res.status(201).json({ ...rest, type: _type });
    });

    // ── Team assignment (admin / lead) ──
    router.post('/:id/team', requireAuth, requirePermission('projects.assign_team'), async (req: AuthRequest, res) => {
        const parsed = teamAssignmentSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
        const { employeeId, role } = parsed.data;
        const assignment = await prisma.transaction(async (tx) => {
            const existing = await tx.orm.public.ProjectEmployee
                .where({ projectId: req.params.id, employeeId })
                .first();
            if (existing) {
                return tx.orm.public.ProjectEmployee.where({ id: existing.id }).update({ role });
            }
            return tx.orm.public.ProjectEmployee.create({
                id: newId(),
                projectId: req.params.id,
                employeeId,
                role,
            });
        });
        res.status(201).json(assignment);
    });

    return router;
}
