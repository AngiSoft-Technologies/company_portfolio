import { Router, Request, Response, NextFunction } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { and } from '@prisma/orm-postgres/orm-client';
import crypto from 'crypto';
import { z } from 'zod';
import { sendMail } from '../../../shared/services/email';
import { hashToken, signAccessToken, verifyAccessToken } from '../../../modules/identity/utils/token';
import {
    initializePayment,
    isProviderConfigured,
    withScopeLock,
    generateReference,
    PaymentProviderError,
    type ProviderId,
} from '../../billing/services/payments';
import { toMoney } from '../../billing/utils/money';
import { publicFormLimiter } from '../../../shared/middleware/rateLimiter';

interface ClientPortalRequest extends Request {
    client?: { sub: string; type: string };
}

const requestLinkSchema = z.object({ email: z.string().email() });
const sessionSchema = z.object({ token: z.string().min(20) });
const commentSchema = z.object({ body: z.string().min(1) });
const testimonialSchema = z.object({
    text: z.string().min(10).max(5000),
    rating: z.number().int().min(1).max(5).optional(),
    projectType: z.string().max(100).optional()
});

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

    router.post('/request-link', publicFormLimiter, async (req, res) => {
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

    router.post('/session', publicFormLimiter, async (req, res) => {
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

    router.get('/profile', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const client = await prisma.orm.public.Client
            .where({ id: req.client!.sub })
            .select('id', 'name', 'email', 'phone', 'org', 'location', 'avatarUrl', 'verified', 'createdAt')
            .first();
        if (!client) return res.status(404).json({ error: 'Client not found' });
        res.json({ client });
    });

    router.get('/projects', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const projects = await prisma.orm.public.ClientProject
            .where({ clientId: req.client!.sub })
            .orderBy((p) => p.updatedAt.desc())
            .select('id', 'title', 'status', 'progress', 'startedAt', 'dueAt', 'deliveredAt', 'completedAt', 'updatedAt', 'createdAt')
            .include('booking', (b) => b.select('id', 'title', 'status', 'projectType'))
            .include('projectMilestones', (m) => m.orderBy((m2: any) => m2.sortOrder.asc()).limit(5))
            .all();
        res.json({ projects });
    });

    router.get('/quotes', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const quotes = await prisma.orm.public.Quote
            .where({ clientId: req.client!.sub })
            .where((q) => q.status.neq('draft'))
            .orderBy((q) => q.createdAt.desc())
            .select('id', 'publicReference', 'number', 'status', 'subtotal', 'discount', 'tax', 'total', 'currency', 'validUntil', 'issuedAt', 'acceptedAt', 'notes', 'createdAt')
            .all();
        res.json({ quotes });
    });

    router.get('/invoices', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const invoices = await prisma.orm.public.Invoice
            .where({ clientId: req.client!.sub })
            .where((i) => i.status.neq('draft'))
            .orderBy((i) => i.createdAt.desc())
            .select('id', 'publicReference', 'number', 'status', 'subtotal', 'tax', 'total', 'amountPaid', 'balanceDue', 'currency', 'issuedAt', 'dueAt', 'paidAt', 'notes', 'createdAt')
            .all();
        res.json({ invoices });
    });

    // Client-initiated invoice payment (M-Pesa STK / PayHero / Paystack
    // redirect). The Payment row carries `metadata.invoiceId`, which
    // `applyPaymentOutcome` settles against the invoice on success (Phase 4.1).
    router.post('/invoices/:id/pay', requireClientAuth, async (req: ClientPortalRequest, res) => {
        try {
            const { provider, phone } = req.body ?? {};
            const providerId = String(provider || '').toUpperCase() as ProviderId;
            if (!['MPESA', 'PAYHERO', 'PAYSTACK'].includes(providerId)) {
                return res.status(400).json({ error: 'Unsupported provider — use MPESA, PAYHERO or PAYSTACK' });
            }
            if (!isProviderConfigured(providerId)) {
                return res.status(503).json({ error: `${providerId} is not configured for this deployment` });
            }

            const invoice = await prisma.orm.public.Invoice
                .where({ id: req.params.id })
                .where({ clientId: req.client!.sub })
                .first();
            if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
            if (['draft', 'void', 'paid'].includes(String(invoice.status))) {
                return res.status(409).json({ error: `Invoice cannot be paid (status: ${invoice.status})` });
            }
            const balance = Number(invoice.balanceDue ?? 0);
            if (!Number.isFinite(balance) || balance <= 0) {
                return res.status(409).json({ error: 'Invoice has no balance due' });
            }

            const client = await prisma.orm.public.Client
                .where({ id: req.client!.sub })
                .select('id', 'name', 'email', 'phone')
                .first();
            const payPhone = String(phone || client?.phone || '').trim();
            const payEmail = String(client?.email || '').trim();
            if ((providerId === 'MPESA' || providerId === 'PAYHERO') && !payPhone) {
                return res.status(400).json({ error: 'A phone number is required for mobile money payment' });
            }
            if (providerId === 'PAYSTACK' && !payEmail) {
                return res.status(400).json({ error: 'A customer email is required for Paystack' });
            }

            const paymentReference = generateReference('INV');
            const outcome = await withScopeLock(prisma, `invoice-pay:${invoice.id}`, async (tx) => {
                // Dedupe: an existing PENDING payment for this invoice wins.
                const pending = await tx.orm.public.Payment
                    .where({ clientId: req.client!.sub })
                    .where((p: any) => p.status.eq('PENDING'))
                    .orderBy((p: any) => p.createdAt.desc())
                    .limit(20)
                    .all();
                const dup = pending.find((p: any) => (p.metadata as any)?.invoiceId === invoice.id);
                if (dup) return { existing: dup };

                const result = await initializePayment({
                    provider: providerId,
                    amount: balance,
                    currency: invoice.currency || 'KES',
                    email: payEmail || undefined,
                    phone: payPhone || undefined,
                    reference: paymentReference,
                    description: `Invoice ${invoice.number || invoice.publicReference} — AngiSoft`,
                    metadata: {
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.number,
                        actor: 'client',
                        clientId: req.client!.sub,
                        reference: paymentReference,
                    },
                });

                let row: any = null;
                try {
                    row = await tx.orm.public.Payment.create({
                        id: newId(),
                        updatedAt: ts(),
                        clientId: req.client!.sub,
                        amount: toMoney(balance),
                        currency: invoice.currency || 'KES',
                        provider: result.provider as any,
                        providerId: result.providerId,
                        reference: paymentReference,
                        status: 'PENDING' as any,
                        metadata: JSON.parse(JSON.stringify({ ...(result.details || {}), invoiceId: invoice.id })),
                    });
                } catch {
                    row = (await tx.orm.public.Payment.where({ reference: paymentReference }).first())
                        || (await tx.orm.public.Payment.where({ providerId: result.providerId }).first());
                    return { existing: row, result };
                }
                return { row, result };
            });

            const result = (outcome as any).result;
            if ((outcome as any).existing) {
                return res.json({
                    paymentId: (outcome as any).existing.id,
                    provider: providerId,
                    kind: result?.kind,
                    checkoutUrl: result?.checkoutUrl,
                    clientSecret: result?.clientSecret,
                    reused: true,
                });
            }

            res.json({
                paymentId: (outcome as any).row?.id,
                provider: (outcome as any).result.provider,
                kind: (outcome as any).result.kind,
                checkoutUrl: (outcome as any).result.checkoutUrl,
                clientSecret: (outcome as any).result.clientSecret,
                reference: paymentReference,
            });
        } catch (err: any) {
            const message = err instanceof PaymentProviderError ? err.message : 'Payment provider error';
            console.error('Client invoice payment failed', err);
            res.status(err instanceof PaymentProviderError ? 400 : 500).json({ error: message });
        }
    });

    router.post('/testimonials', requireClientAuth, async (req: ClientPortalRequest, res) => {
        try {
            const body = testimonialSchema.parse(req.body);
            const client = await prisma.orm.public.Client
                .where({ id: req.client!.sub })
                .select('id', 'name', 'org')
                .first();
            if (!client) return res.status(404).json({ error: 'Client not found' });
            const testimonial = await prisma.orm.public.Testimonial.create({
                id: newId(),
                updatedAt: ts(),
                name: client.name,
                company: client.org ?? null,
                text: body.text,
                rating: body.rating ?? null,
                projectType: body.projectType ?? null,
                confirmed: false
            });
            res.status(201).json({ testimonial });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    });

    router.get('/notifications', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const notifications = await prisma.orm.public.Notification
            .where({ userId: req.client!.sub })
            .where({ userType: 'client' })
            .orderBy((n: any) => n.createdAt.desc())
            .limit(50)
            .all();
        res.json({ notifications });
    });

    router.post('/notifications/mark-read', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const { ids } = req.body ?? {};
        if (Array.isArray(ids) && ids.length > 0) {
            for (const id of ids.slice(0, 100)) {
                await prisma.orm.public.Notification
                    .where({ id: String(id), userId: req.client!.sub })
                    .where({ userType: 'client' })
                    .update({ read: true });
            }
        } else {
            await prisma.orm.public.Notification
                .where({ userId: req.client!.sub })
                .where({ userType: 'client' })
                .where({ read: false })
                .update({ read: true });
        }
        res.json({ ok: true });
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
