import { Router, Request, Response, NextFunction } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { and } from '@prisma/orm-postgres/orm-client';
import crypto from 'crypto';
import { z } from 'zod';
import { sendMail } from '../../../shared/services/email';
import { hashToken, signAccessToken, verifyAccessToken } from '../../../modules/identity/utils/token';

interface ClientPortalRequest extends Request {
    client?: { sub: string; type: string };
}

const requestLinkSchema = z.object({ email: z.string().email() });
const sessionSchema = z.object({ token: z.string().min(20) });
const commentSchema = z.object({ body: z.string().min(1) });

function createPlainToken() {
    return crypto.randomBytes(32).toString('base64url');
}

function requireClientAuth(req: ClientPortalRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing authorization' });
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Invalid authorization' });
    try {
        const payload: any = verifyAccessToken(token);
        if (payload.type !== 'client') return res.status(401).json({ error: 'Invalid client token' });
        req.client = { sub: payload.sub, type: payload.type };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/** Rename P8's `_type` field back to the P7 wire name `type`. */
const serializeActivity = (a: any) => {
    const { _type, ...rest } = a;
    return { ...rest, type: _type };
};

/** Map P8 relation keys back onto the P7 response shape. */
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

export default function clientPortalRouter(prisma: Db) {
    const router = Router();

    router.post('/request-link', async (req, res) => {
        try {
            const { email } = requestLinkSchema.parse(req.body);
            const client = await prisma.orm.public.Client.where({ email: email.toLowerCase() }).first();
            if (client) {
                const token = createPlainToken();
                const accessUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/access?token=${encodeURIComponent(token)}`;
                await prisma.orm.public.ClientAccessToken.create({
                    id: newId(),
                    clientId: client.id,
                    tokenHash: hashToken(token),
                    expiresAt: ts(Date.now() + 1000 * 60 * 30),
                    ip: req.ip ?? null,
                    userAgent: req.get('user-agent') || null
                });
                await sendMail({
                    to: client.email,
                    subject: 'Your secure AngiSoft client portal link',
                    purpose: 'noreply',
                    html: `<p>Hello ${client.name || 'there'},</p><p>Use this secure link to access your AngiSoft project portal. It expires in 30 minutes.</p><p><a href="${accessUrl}">Open client portal</a></p>`,
                    text: `Open your AngiSoft client portal: ${accessUrl}`
                });
            }
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/session', async (req, res) => {
        try {
            const { token } = sessionSchema.parse(req.body);
            const tokenHash = hashToken(token);
            const access = await prisma.orm.public.ClientAccessToken.where({ tokenHash }).first();
            if (!access || access.usedAt || access.revokedAt || access.expiresAt < ts()) {
                return res.status(401).json({ error: 'Invalid or expired portal token' });
            }
            const claimed = await prisma.orm.public.ClientAccessToken
                .where((a) => and(
                    a.id.eq(access.id),
                    a.usedAt.isNull(),
                    a.revokedAt.isNull(),
                    a.expiresAt.gt(ts())
                ))
                .updateAndCount({ usedAt: ts() });
            if (claimed !== 1) return res.status(401).json({ error: 'Invalid or expired portal token' });
            const accessToken = signAccessToken({ sub: access.clientId, type: 'client' });
            res.json({ accessToken });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.get('/bookings', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const rows = await prisma.orm.public.Booking
            .where({ clientId: req.client!.sub })
            .orderBy((b) => b.createdAt.desc())
            .select('id', 'title', 'description', 'projectType', 'status', 'createdAt', 'updatedAt')
            .include('clientProject', (cp) => cp
                .select('id', 'title', 'status', 'progress', 'updatedAt')
                .include('projectMilestones', (m) => m.orderBy((m2: any) => m2.sortOrder.asc()).limit(4)))
            .all();
        const bookings = rows.map((b: any) => {
            const { clientProject, ...rest } = b;
            const project = clientProject?.[0];
            const { projectMilestones, ...cpRest } = project ?? {};
            return {
                ...rest,
                clientProject: project ? { ...cpRest, milestones: projectMilestones ?? [] } : null,
            };
        });
        res.json({ bookings });
    });

    router.get('/projects/:id', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const project = await prisma.orm.public.ClientProject
            .where({ id: req.params.id })
            .where({ clientId: req.client!.sub })
            .include('booking', (b) => b.select('id', 'title', 'status', 'projectType', 'createdAt', 'updatedAt'))
            .include('owner', (o) => o.select('id', 'firstName', 'lastName', 'publicTitle', 'avatarUrl'))
            .include('projectMilestones', (m) => m.orderBy((m2: any) => m2.sortOrder.asc()))
            .include('projectActivities', (a) => a.where({ visibleToClient: true }).orderBy((a2: any) => a2.createdAt.desc()).limit(50))
            .include('projectComments', (c) => c
                .where({ visibility: 'CLIENT' })
                .orderBy((c2: any) => c2.createdAt.desc())
                .include('author', (au) => au.select('id', 'firstName', 'lastName', 'publicTitle', 'avatarUrl')))
            .include('projectDeliverables', (d) => d
                .where((d2: any) => d2.status.neq('DRAFT'))
                .orderBy((d3: any) => d3.createdAt.desc())
                .include('files'))
            .first();
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json({ project: serializeProject(project) });
    });

    router.post('/projects/:id/comments', requireClientAuth, async (req: ClientPortalRequest, res) => {
        try {
            const body = commentSchema.parse(req.body);
            const project = await prisma.orm.public.ClientProject
                .where({ id: req.params.id })
                .where({ clientId: req.client!.sub })
                .first();
            if (!project) return res.status(404).json({ error: 'Project not found' });
            const comment = await prisma.orm.public.ProjectComment.create({
                id: newId(),
                updatedAt: ts(),
                projectId: project.id,
                clientId: req.client!.sub,
                body: body.body,
                visibility: 'CLIENT'
            });
            await prisma.orm.public.ProjectActivity.create({
                id: newId(),
                _type: 'COMMENT_ADDED' as any,
                clientProjectId: project.id,
                message: 'Client added a comment',
                visibleToClient: true
            });
            res.status(201).json({ comment });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
