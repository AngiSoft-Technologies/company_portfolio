import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

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

async function requireProjectAccess(prisma: PrismaClient, req: AuthRequest, projectId: string) {
    const project = await prisma.clientProject.findUnique({
        where: { id: projectId },
        include: { booking: true }
    });

    if (!project) return null;
    if (canManageAll(req.user?.role)) return project;
    if (project.ownerId === req.user?.sub || project.booking.assignedToId === req.user?.sub) return project;
    return false;
}

const projectInclude = {
    client: true,
    booking: true,
    owner: { select: { id: true, firstName: true, lastName: true, publicTitle: true, avatarUrl: true } },
    milestones: { orderBy: { sortOrder: 'asc' as const } },
    activities: { orderBy: { createdAt: 'desc' as const }, take: 30 },
    comments: { orderBy: { createdAt: 'desc' as const }, include: { author: { select: { id: true, firstName: true, lastName: true, publicTitle: true } } } },
    deliverables: { orderBy: { createdAt: 'desc' as const }, include: { files: true } },
    files: true
};

export default function clientProjectsRouter(prisma: PrismaClient) {
    const router = Router();
    router.use(requireAuth);

    router.get('/', async (req: AuthRequest, res) => {
        try {
            const query = listQuerySchema.parse(req.query);
            const where: any = {};
            if (query.status) where.status = query.status;
            if (query.clientId) where.clientId = query.clientId;
            if (query.assignedToMe === 'true' || !canManageAll(req.user?.role)) {
                where.OR = [
                    { ownerId: req.user?.sub },
                    { booking: { assignedToId: req.user?.sub } }
                ];
            }

            const projects = await prisma.clientProject.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: {
                    client: true,
                    booking: { select: { id: true, title: true, status: true, projectType: true, assignedToId: true } },
                    owner: { select: { id: true, firstName: true, lastName: true, publicTitle: true, avatarUrl: true } },
                    milestones: { orderBy: { sortOrder: 'asc' } },
                    activities: { orderBy: { createdAt: 'desc' }, take: 3 },
                    _count: { select: { comments: true, deliverables: true } }
                }
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

            const project = await prisma.clientProject.findUnique({ where: { id: req.params.id }, include: projectInclude });
            res.json({ project });
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
                ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
                ...(body.ownerId !== undefined ? { ownerId: body.ownerId } : {})
            };
            if (body.status === 'DELIVERED') data.deliveredAt = new Date();
            if (body.status === 'COMPLETED') data.completedAt = new Date();

            const project = await prisma.$transaction(async (tx) => {
                const updated = await tx.clientProject.update({ where: { id: req.params.id }, data });
                if (body.status === 'DELIVERED' || body.status === 'COMPLETED') {
                    await tx.booking.update({ where: { id: updated.bookingId }, data: { status: body.status } });
                } else if (body.status === 'ACTIVE') {
                    await tx.booking.update({ where: { id: updated.bookingId }, data: { status: 'IN_PROGRESS' } });
                }

                const activityType = body.status ? 'STATUS_CHANGED' : 'PROGRESS_UPDATED';
                await tx.projectActivity.create({
                    data: {
                        projectId: updated.id,
                        actorId: req.user?.sub || null,
                        type: activityType,
                        message: body.status ? `Project status changed to ${body.status}` : `Project progress updated to ${progress}%`,
                        visibleToClient: true,
                        meta: { status: body.status, progress }
                    }
                });

                return tx.clientProject.findUnique({ where: { id: req.params.id }, include: projectInclude });
            });

            await logAudit({ actorId: req.user?.sub, actorRole: req.user?.role, action: 'update_client_project', entity: 'ClientProject', entityId: req.params.id, meta: body });
            res.json({ project });
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
            const milestone = await prisma.projectMilestone.create({
                data: {
                    projectId: req.params.id,
                    title: body.title,
                    description: body.description,
                    status: body.status || 'TODO',
                    dueAt: body.dueAt ? new Date(body.dueAt) : null,
                    sortOrder: body.sortOrder || 0
                }
            });
            await prisma.projectActivity.create({ data: { projectId: req.params.id, actorId: req.user?.sub || null, type: 'MILESTONE_CREATED', message: `Milestone created: ${milestone.title}`, visibleToClient: true } });
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
            const existing = await prisma.projectMilestone.findFirst({ where: { id: req.params.milestoneId, projectId: req.params.id } });
            if (!existing) return res.status(404).json({ error: 'Milestone not found' });
            const milestone = await prisma.projectMilestone.update({
                where: { id: req.params.milestoneId },
                data: {
                    ...(body.title ? { title: body.title } : {}),
                    ...(body.description !== undefined ? { description: body.description } : {}),
                    ...(body.status ? { status: body.status, completedAt: body.status === 'COMPLETED' ? new Date() : null } : {}),
                    ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
                    ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {})
                }
            });
            await prisma.projectActivity.create({ data: { projectId: req.params.id, actorId: req.user?.sub || null, type: 'MILESTONE_UPDATED', message: `Milestone updated: ${milestone.title}`, visibleToClient: true, meta: body } });
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
            const comment = await prisma.projectComment.create({ data: { projectId: req.params.id, authorId: req.user?.sub || null, body: body.body, visibility: body.visibility } });
            await prisma.projectActivity.create({ data: { projectId: req.params.id, actorId: req.user?.sub || null, type: 'COMMENT_ADDED', message: body.visibility === 'CLIENT' ? 'New client-visible update added' : 'Internal project comment added', visibleToClient: body.visibility === 'CLIENT' } });
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
            const deliverable = await prisma.projectDeliverable.create({ data: { projectId: req.params.id, title: body.title, description: body.description, status: body.status || 'DRAFT', sharedAt: body.status === 'SHARED' ? new Date() : null } });
            await prisma.projectActivity.create({ data: { projectId: req.params.id, actorId: req.user?.sub || null, type: 'DELIVERABLE_ADDED', message: `Deliverable added: ${deliverable.title}`, visibleToClient: deliverable.status !== 'DRAFT' } });
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
            const existing = await prisma.projectDeliverable.findFirst({ where: { id: req.params.deliverableId, projectId: req.params.id } });
            if (!existing) return res.status(404).json({ error: 'Deliverable not found' });
            const deliverable = await prisma.projectDeliverable.update({
                where: { id: req.params.deliverableId },
                data: {
                    ...(body.title ? { title: body.title } : {}),
                    ...(body.description !== undefined ? { description: body.description } : {}),
                    ...(body.status ? { status: body.status, sharedAt: body.status === 'SHARED' ? new Date() : undefined, acceptedAt: body.status === 'ACCEPTED' ? new Date() : undefined } : {})
                }
            });
            await prisma.projectActivity.create({ data: { projectId: req.params.id, actorId: req.user?.sub || null, type: body.status === 'ACCEPTED' ? 'DELIVERABLE_ACCEPTED' : 'DELIVERABLE_ADDED', message: `Deliverable updated: ${deliverable.title}`, visibleToClient: deliverable.status !== 'DRAFT', meta: body } });
            res.json({ deliverable });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
