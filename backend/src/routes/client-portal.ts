import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { z } from 'zod';
import { sendMail } from '../services/email';
import { hashToken, signAccessToken, verifyAccessToken } from '../utils/token';

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

const clientProjectInclude = {
    booking: { select: { id: true, title: true, status: true, projectType: true, createdAt: true, updatedAt: true } },
    owner: { select: { id: true, firstName: true, lastName: true, publicTitle: true, avatarUrl: true } },
    milestones: { orderBy: { sortOrder: 'asc' as const } },
    activities: { where: { visibleToClient: true }, orderBy: { createdAt: 'desc' as const }, take: 50 },
    comments: {
        where: { visibility: 'CLIENT' as const },
        orderBy: { createdAt: 'desc' as const },
        include: { author: { select: { id: true, firstName: true, lastName: true, publicTitle: true, avatarUrl: true } } }
    },
    deliverables: { where: { status: { not: 'DRAFT' as const } }, orderBy: { createdAt: 'desc' as const }, include: { files: true } }
};

export default function clientPortalRouter(prisma: PrismaClient) {
    const router = Router();

    router.post('/request-link', async (req, res) => {
        try {
            const { email } = requestLinkSchema.parse(req.body);
            const client = await prisma.client.findUnique({ where: { email: email.toLowerCase() } });
            if (client) {
                const token = createPlainToken();
                const accessUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/access?token=${encodeURIComponent(token)}`;
                await prisma.clientAccessToken.create({
                    data: {
                        clientId: client.id,
                        tokenHash: hashToken(token),
                        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
                        ip: req.ip,
                        userAgent: req.get('user-agent') || null
                    }
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
            const access = await prisma.clientAccessToken.findUnique({ where: { tokenHash } });
            if (!access || access.usedAt || access.revokedAt || access.expiresAt < new Date()) {
                return res.status(401).json({ error: 'Invalid or expired portal token' });
            }
            const claimed = await prisma.clientAccessToken.updateMany({
                where: { id: access.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
                data: { usedAt: new Date() }
            });
            if (claimed.count !== 1) return res.status(401).json({ error: 'Invalid or expired portal token' });
            const accessToken = signAccessToken({ sub: access.clientId, type: 'client' });
            res.json({ accessToken });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.get('/bookings', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const bookings = await prisma.booking.findMany({
            where: { clientId: req.client!.sub },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                projectType: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                clientProject: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        progress: true,
                        updatedAt: true,
                        milestones: { orderBy: { sortOrder: 'asc' }, take: 4 }
                    }
                }
            }
        });
        res.json({ bookings });
    });

    router.get('/projects/:id', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const project = await prisma.clientProject.findFirst({
            where: { id: req.params.id, clientId: req.client!.sub },
            include: clientProjectInclude
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json({ project });
    });

    router.post('/projects/:id/comments', requireClientAuth, async (req: ClientPortalRequest, res) => {
        try {
            const body = commentSchema.parse(req.body);
            const project = await prisma.clientProject.findFirst({ where: { id: req.params.id, clientId: req.client!.sub } });
            if (!project) return res.status(404).json({ error: 'Project not found' });
            const comment = await prisma.projectComment.create({
                data: {
                    projectId: project.id,
                    clientId: req.client!.sub,
                    body: body.body,
                    visibility: 'CLIENT'
                }
            });
            await prisma.projectActivity.create({
                data: {
                    clientProjectId: project.id,
                    type: 'COMMENT_ADDED',
                    message: 'Client added a comment',
                    visibleToClient: true
                }
            });
            res.status(201).json({ comment });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    return router;
}
