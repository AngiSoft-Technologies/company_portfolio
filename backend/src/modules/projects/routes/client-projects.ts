import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import { logAudit } from '../../../shared/services/audit';

const listQuerySchema = z.object({
    status: z.string().optional(),
    assignedToMe: z.string().optional(),
    clientId: z.string().optional()
});

const updateProjectSchema = z.object({
    status: z.enum(['PLANNING', 'ACTIVE', 'PAUSED', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    ownerId: z.string().nullable().optional()
});

const milestoneSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().nullable().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED']).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    sortOrder: z.coerce.number().int().optional()
});

const createMilestoneSchema = milestoneSchema.extend({
    title: z.string().min(2)
});

const commentSchema = z.object({
    body: z.string().min(1),
    visibility: z.enum(['INTERNAL', 'CLIENT']).default('CLIENT')
});

const deliverableSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().nullable().optional(),
    status: z.enum(['DRAFT', 'SHARED', 'ACCEPTED', 'REVISION_REQUESTED']).optional()
});

const createDeliverableSchema = deliverableSchema.extend({
    title: z.string().min(2)
});

function canManageAll(role?: string) {
    return role === 'ADMIN';
}

async function requireProjectAccess(prisma: Db, req: AuthRequest, projectId: string) {
    const project = await prisma.orm.public.ClientProject
        .where({ id: projectId })
        .include('booking')
        .first();

    if (!project) return null;
    if (canManageAll(req.user?.role)) return project;
    if (project.ownerId === req.user?.sub || (project as any).booking.assignedToId === req.user?.sub) return project;
    return false;
}

/** Rename P8's `_type` field back to the P7 wire name `type`. */
const serializeActivity = (a: any) => {
    const { _type, ...rest } = a;
    return { ...rest, type: _type };
};

/** Map P8 relation keys back onto the P7 response shape (milestones/activities/...). */
const serializeProject = (project: any) => {
    const { projectMilestones, projectActivities, projectComments, projectDeliverables, ...rest } = project ?? {};
    return {
        ...rest,
        milestones: projectMilestones ?? [],
        activities: (projectActivities ?? []).map(serializeActivity),
        comments: projectComments ?? [],
        deliverables: projectDeliverables ?? [],
    };
};

export default function clientProjectsRouter(prisma: Db) {
    const router = Router();
    router.use(requireAuth);

    router.get('/', async (req: AuthRequest, res) => {
        try {
            const query = listQuerySchema.parse(req.query);
            let q: any = prisma.orm.public.ClientProject;
            if (query.status) q = q.where((p: any) => p.status.eq(query.status));
            if (query.clientId) q = q.where((p: any) => p.clientId.eq(query.clientId));
            if (query.assignedToMe === 'true' || !canManageAll(req.user?.role)) {
                q = q.where((p: any) => or(p.ownerId.eq(req.user?.sub), p.booking.some((b: any) => b.assignedToId.eq(req.user?.sub))));
            }
            const rows = await q
                .orderBy((p: any) => p.updatedAt.desc())
                .include('client')
                .include('booking', (b: any) => b.select('id', 'title', 'status', 'projectType', 'assignedToId'))
                .include('owner', (o: any) => o.select('id', 'firstName', 'lastName', 'publicTitle', 'avatarUrl'))
                .include('projectMilestones', (m: any) => m.orderBy((m2: any) => m2.sortOrder.asc()))
                .include('projectActivities', (a: any) => a.where({ visibleToClient: true }).orderBy((a2: any) => a2.createdAt.desc()).limit(3))
                .all();

            const [commentCounts, deliverableCounts] = await Promise.all([
                prisma.orm.public.ProjectComment.groupBy('projectId').aggregate((a) => ({ n: a.count() })),
                prisma.orm.public.ProjectDeliverable.groupBy('projectId').aggregate((a) => ({ n: a.count() })),
            ]);
            const ccMap = new Map(commentCounts.map((r: any) => [r.projectId, r.n]));
            const dcMap = new Map(deliverableCounts.map((r: any) => [r.projectId, r.n]));

            const projects = rows.map((row: any) => {
                const { projectMilestones, projectActivities, ...rest } = row;
                return {
                    ...rest,
                    milestones: projectMilestones ?? [],
                    activities: (projectActivities ?? []).map(serializeActivity),
                    _count: { comments: ccMap.get(row.id) ?? 0, deliverables: dcMap.get(row.id) ?? 0 },
                };
            });

            res.json({ projects });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.get('/:id', async (req: AuthRequest, res) => {
        try {
            const access = await requireProjectAccess(prisma, req, req.params.id);
            if (access === null) return res.status(404).json({ error: 'Project not found' });
            if (access === false) return res.status(403).json({ error: 'Not allowed' });

            const project = await prisma.orm.public.ClientProject
                .where({ id: req.params.id })
                .include('client')
                .include('booking', (b) => b.select('id', 'title', 'status', 'projectType', 'assignedToId'))
                .include('owner', (o) => o.select('id', 'firstName', 'lastName', 'publicTitle', 'avatarUrl'))
                .include('projectMilestones', (m) => m.orderBy((m2: any) => m2.sortOrder.asc()))
                .include('projectActivities', (a) => a.orderBy((a2: any) => a2.createdAt.desc()).limit(30))
                .include('projectComments', (c) => c
                    .orderBy((c2: any) => c2.createdAt.desc())
                    .include('author', (au) => au.select('id', 'firstName', 'lastName', 'publicTitle')))
                .include('projectDeliverables', (d) => d
                    .orderBy((d2: any) => d2.createdAt.desc())
                    .include('files'))
                .include('files')
                .first();
            res.json({ project: serializeProject(project) });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.patch('/:id', async (req: AuthRequest, res) => {
        try {
            const access = await requireProjectAccess(prisma, req, req.params.id);
            if (access === null) return res.status(404).json({ error: 'Project not found' });
            if (access === false) return res.status(403).json({ error: 'Not allowed' });

            const body = updateProjectSchema.parse(req.body);
            const progress = body.status === 'COMPLETED' ? 100 : body.progress;
            const data: any = {
                ...(body.status ? { status: body.status } : {}),
                ...(progress !== undefined ? { progress } : {}),
                ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? ts(body.dueAt) : null } : {}),
                ...(body.ownerId !== undefined ? { ownerId: body.ownerId } : {})
            };
            if (body.status === 'DELIVERED') data.deliveredAt = ts();
            if (body.status === 'COMPLETED') data.completedAt = ts();

            const project = await prisma.transaction(async (tx) => {
                const updated = await tx.orm.public.ClientProject.where({ id: req.params.id }).update(data);
                if (body.status === 'DELIVERED' || body.status === 'COMPLETED') {
                    await tx.orm.public.Booking.where({ id: (updated as any).bookingId }).update({ status: body.status as any });
                } else if (body.status === 'ACTIVE') {
                    await tx.orm.public.Booking.where({ id: (updated as any).bookingId }).update({ status: 'IN_PROGRESS' as any });
                }

                const activityType = body.status ? 'STATUS_CHANGED' : 'PROGRESS_UPDATED';
                await tx.orm.public.ProjectActivity.create({
                    id: newId(),
                    _type: activityType as any,
                    clientProjectId: (updated as any).id,
                    actorId: req.user?.sub || null,
                    message: body.status ? `Project status changed to ${body.status}` : `Project progress updated to ${progress}%`,
                    visibleToClient: true,
                    meta: { status: body.status ?? null, progress: progress ?? null } as any
                });

                return tx.orm.public.ClientProject
                    .where({ id: req.params.id })
                    .include('client')
                    .include('booking', (b) => b.select('id', 'title', 'status', 'projectType', 'assignedToId'))
                    .include('owner', (o) => o.select('id', 'firstName', 'lastName', 'publicTitle', 'avatarUrl'))
                    .include('projectMilestones', (m) => m.orderBy((m2: any) => m2.sortOrder.asc()))
                    .include('projectActivities', (a) => a.orderBy((a2: any) => a2.createdAt.desc()).limit(30))
                    .include('projectComments', (c) => c
                        .orderBy((c2: any) => c2.createdAt.desc())
                        .include('author', (au) => au.select('id', 'firstName', 'lastName', 'publicTitle')))
                    .include('projectDeliverables', (d) => d
                        .orderBy((d2: any) => d2.createdAt.desc())
                        .include('files'))
                    .include('files')
                    .first();
            });

            await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role, action: 'update_client_project', entity: 'ClientProject', entityId: req.params.id, meta: body });
            res.json({ project: serializeProject(project) });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/milestones', async (req: AuthRequest, res) => {
        try {
            const access = await requireProjectAccess(prisma, req, req.params.id);
            if (access === null) return res.status(404).json({ error: 'Project not found' });
            if (access === false) return res.status(403).json({ error: 'Not allowed' });
            const body = createMilestoneSchema.parse(req.body);
            const milestone = await prisma.orm.public.ProjectMilestone.create({
                id: newId(),
                updatedAt: ts(),
                projectId: req.params.id,
                title: body.title,
                description: body.description ?? null,
                status: (body.status || 'TODO') as any,
                dueAt: body.dueAt ? ts(body.dueAt) : null,
                sortOrder: body.sortOrder || 0
            });
            await prisma.orm.public.ProjectActivity.create({
                id: newId(),
                _type: 'MILESTONE_CREATED' as any,
                clientProjectId: req.params.id,
                actorId: req.user?.sub || null,
                message: `Milestone created: ${milestone.title}`,
                visibleToClient: true
            });
            res.status(201).json({ milestone });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.patch('/:id/milestones/:milestoneId', async (req: AuthRequest, res) => {
        try {
            const access = await requireProjectAccess(prisma, req, req.params.id);
            if (access === null) return res.status(404).json({ error: 'Project not found' });
            if (access === false) return res.status(403).json({ error: 'Not allowed' });
            const body = milestoneSchema.parse(req.body);
            const existing = await prisma.orm.public.ProjectMilestone
                .where({ id: req.params.milestoneId })
                .where({ projectId: req.params.id })
                .first();
            if (!existing) return res.status(404).json({ error: 'Milestone not found' });
            const milestone = await prisma.orm.public.ProjectMilestone.where({ id: req.params.milestoneId }).update({
                ...(body.title ? { title: body.title } : {}),
                ...(body.description !== undefined ? { description: body.description } : {}),
                ...(body.status ? { status: body.status as any, completedAt: body.status === 'COMPLETED' ? ts() : null } : {}),
                ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? ts(body.dueAt) : null } : {}),
                ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {})
            });
            if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
            await prisma.orm.public.ProjectActivity.create({
                id: newId(),
                _type: 'MILESTONE_UPDATED' as any,
                clientProjectId: req.params.id,
                actorId: req.user?.sub || null,
                message: `Milestone updated: ${milestone.title}`,
                visibleToClient: true,
                meta: body as any
            });
            res.json({ milestone });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/comments', async (req: AuthRequest, res) => {
        try {
            const access = await requireProjectAccess(prisma, req, req.params.id);
            if (access === null) return res.status(404).json({ error: 'Project not found' });
            if (access === false) return res.status(403).json({ error: 'Not allowed' });
            const body = commentSchema.parse(req.body);
            const comment = await prisma.orm.public.ProjectComment.create({
                id: newId(),
                updatedAt: ts(),
                projectId: req.params.id,
                authorId: req.user?.sub || null,
                body: body.body,
                visibility: body.visibility
            });
            await prisma.orm.public.ProjectActivity.create({
                id: newId(),
                _type: 'COMMENT_ADDED' as any,
                clientProjectId: req.params.id,
                actorId: req.user?.sub || null,
                message: body.visibility === 'CLIENT' ? 'New client-visible update added' : 'Internal project comment added',
                visibleToClient: body.visibility === 'CLIENT'
            });
            res.status(201).json({ comment });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/:id/deliverables', async (req: AuthRequest, res) => {
        try {
            const access = await requireProjectAccess(prisma, req, req.params.id);
            if (access === null) return res.status(404).json({ error: 'Project not found' });
            if (access === false) return res.status(403).json({ error: 'Not allowed' });
            const body = createDeliverableSchema.parse(req.body);
            const deliverable = await prisma.orm.public.ProjectDeliverable.create({
                id: newId(),
                updatedAt: ts(),
                projectId: req.params.id,
                title: body.title,
                description: body.description ?? null,
                status: (body.status || 'DRAFT') as any,
                sharedAt: body.status === 'SHARED' ? ts() : null
            });
            await prisma.orm.public.ProjectActivity.create({
                id: newId(),
                _type: 'DELIVERABLE_ADDED' as any,
                clientProjectId: req.params.id,
                actorId: req.user?.sub || null,
                message: `Deliverable added: ${deliverable.title}`,
                visibleToClient: deliverable.status !== 'DRAFT'
            });
            res.status(201).json({ deliverable });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.patch('/:id/deliverables/:deliverableId', async (req: AuthRequest, res) => {
        try {
            const access = await requireProjectAccess(prisma, req, req.params.id);
            if (access === null) return res.status(404).json({ error: 'Project not found' });
            if (access === false) return res.status(403).json({ error: 'Not allowed' });
            const body = deliverableSchema.parse(req.body);
            const existing = await prisma.orm.public.ProjectDeliverable
                .where({ id: req.params.deliverableId })
                .where({ projectId: req.params.id })
                .first();
            if (!existing) return res.status(404).json({ error: 'Deliverable not found' });
            const deliverable = await prisma.orm.public.ProjectDeliverable.where({ id: req.params.deliverableId }).update({
                ...(body.title ? { title: body.title } : {}),
                ...(body.description !== undefined ? { description: body.description } : {}),
                ...(body.status ? {
                    status: body.status as any,
                    sharedAt: body.status === 'SHARED' ? ts() : undefined,
                    acceptedAt: body.status === 'ACCEPTED' ? ts() : undefined
                } : {})
            });
            if (!deliverable) return res.status(404).json({ error: 'Deliverable not found' });
            await prisma.orm.public.ProjectActivity.create({
                id: newId(),
                _type: (body.status === 'ACCEPTED' ? 'DELIVERABLE_ACCEPTED' : 'DELIVERABLE_ADDED') as any,
                clientProjectId: req.params.id,
                actorId: req.user?.sub || null,
                message: `Deliverable updated: ${deliverable.title}`,
                visibleToClient: deliverable.status !== 'DRAFT',
                meta: body as any
            });
            res.json({ deliverable });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
