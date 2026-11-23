import { Router, Request, Response, NextFunction } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { and } from '@prisma/orm-postgres/orm-client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { sendMail } from '../../../shared/services/email';
import { logAudit } from '../../../shared/services/audit';
import { issueCsrfCookie } from '../../../shared/middleware/csrf';
import { checkPasswordStrength } from '../../../modules/identity/utils/passwordPolicy';
import { createRefreshToken, hashToken, signAccessToken, verifyAccessToken } from '../../../modules/identity/utils/token';
import {
    initializePayment,
    isProviderConfigured,
    withScopeLock,
    generateReference,
    PaymentProviderError,
    type ProviderId,
} from '../../billing/services/payments';
import { toMoney } from '../../billing/utils/money';
import { resolvePaymentMethod } from '../../billing/services/payments/methods';
import { publicFormLimiter } from '../../../shared/middleware/rateLimiter';

interface ClientPortalRequest extends Request {
    client?: { sub: string; type: string };
}

const requestLinkSchema = z.object({ email: z.string().email() });
const sessionSchema = z.object({ token: z.string().min(20), remember: z.boolean().optional() });
const commentSchema = z.object({ body: z.string().min(1) });
const testimonialSchema = z.object({
    text: z.string().min(10).max(5000),
    rating: z.number().int().min(1).max(5).optional(),
    projectType: z.string().max(100).optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    remember: z.boolean().optional(),
});
const passwordSchema = z.object({ password: z.string().min(8).max(128) });

/** Password guessing is a different threat from magic-link spam: tighter, per account. */
const clientLoginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 8,
    keyGenerator: (req) => `${String(req.body?.email || '').trim().toLowerCase() || 'anonymous'}:${req.ip || 'unknown'}`,
    message: { error: 'Too many login attempts. Please wait a moment.' },
    validate: false,
});

function createPlainToken() {
    return crypto.randomBytes(32).toString('base64url');
}

// Client sessions use their own cookie and purpose so a client refresh token
// can never be replayed against the employee `/v1/auth/refresh` endpoint (and
// vice versa). `ClientAccessToken` already carries a hashed token, expiry and
// single-use markers, so no schema change is needed for rotating sessions.
const CLIENT_REFRESH_COOKIE = 'clientRefreshToken';
const CLIENT_REFRESH_PATH = '/v1/client-portal';
// Two purposes carry the "remember this device" choice across rotation
// without adding a column: a short browser-session cookie vs a 30-day cookie.
const CLIENT_REFRESH_PURPOSE = 'refresh';
const CLIENT_REFRESH_SESSION_PURPOSE = 'refresh_session';
const CLIENT_REFRESH_PURPOSES = [CLIENT_REFRESH_PURPOSE, CLIENT_REFRESH_SESSION_PURPOSE] as const;
const CLIENT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeClientEmail(email: string): string {
    return email.trim().toLowerCase();
}

function setClientRefreshCookie(res: Response, token: string, remember: boolean): void {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie(CLIENT_REFRESH_COOKIE, token, {
        httpOnly: true,
        secure,
        sameSite: 'strict',
        path: CLIENT_REFRESH_PATH,
        ...(remember ? { maxAge: CLIENT_REFRESH_TTL_MS } : {}),
    });
    // The shared API client reads this cookie and echoes it on mutations.
    issueCsrfCookie(res);
}

function clearClientRefreshCookie(res: Response): void {
    res.clearCookie(CLIENT_REFRESH_COOKIE, { path: CLIENT_REFRESH_PATH });
}

async function revokeClientRefreshSessions(prisma: Db, clientId: string): Promise<void> {
    for (const purpose of CLIENT_REFRESH_PURPOSES) {
        await prisma.orm.public.ClientAccessToken
            .where({ clientId, purpose })
            .updateAll({ revokedAt: ts() });
    }
}

/** Issue a short-lived client JWT plus a hashed, rotating refresh credential. */
async function issueClientSession(
    prisma: Db,
    res: Response,
    client: { id: string },
    remember: boolean,
    meta: { ip?: string; userAgent?: string } = {}
): Promise<string> {
    const accessToken = signAccessToken({ sub: client.id, type: 'client' });
    const refresh = createRefreshToken();
    await prisma.orm.public.ClientAccessToken.create({
        id: newId(),
        clientId: client.id,
        tokenHash: hashToken(refresh),
        purpose: remember ? CLIENT_REFRESH_PURPOSE : CLIENT_REFRESH_SESSION_PURPOSE,
        // A browser-session cookie still gets a bounded server-side expiry;
        // the cookie itself expires when the browser closes.
        expiresAt: ts(Date.now() + CLIENT_REFRESH_TTL_MS),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
    });
    setClientRefreshCookie(res, refresh, remember);
    return accessToken;
}

/** Look up a refresh token by hash. Magic-link tokens are never refresh tokens. */
async function findClientRefreshRow(prisma: Db, token: string): Promise<any | null> {
    const row = await prisma.orm.public.ClientAccessToken
        .where({ tokenHash: hashToken(token) })
        .first();
    return row && (CLIENT_REFRESH_PURPOSES as readonly string[]).includes(row.purpose) ? row : null;
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

    const requestLink = async (req: Request, res: Response) => {
        try {
            const { email } = requestLinkSchema.parse(req.body);
            const client = await prisma.orm.public.Client.where({ email: normalizeClientEmail(email) }).first();
            if (client) {
                const token = createPlainToken();
                const accessUrl = `${process.env.FRONTEND_URL || 'https://angisoft.co.ke'}/portal/access?token=${encodeURIComponent(token)}`;
                await prisma.orm.public.ClientAccessToken.create({
                    id: newId(),
                    clientId: client.id,
                    tokenHash: hashToken(token),
                    purpose: 'portal',
                    expiresAt: ts(Date.now() + 1000 * 60 * 30),
                    ip: req.ip ?? null,
                    userAgent: req.get('user-agent') || null
                });
                await sendMail({
                    to: client.email,
                    subject: 'Your secure AngiSoft client portal link',
                    purpose: 'noreply',
                    title: 'Your client portal link',
                    eyebrow: 'Client Portal Access',
                    preheader: 'Private link — expires in 30 minutes.',
                    cta: { label: 'Open Client Portal', url: accessUrl },
                    html: `<p style="margin:0 0 16px">Hello ${String(client.name || 'there').replace(/[<>&"]/g, '')},</p>
                           <p style="margin:0;color:#64748B;font-size:13px">Use the button above to access your AngiSoft project portal. The link expires in 30 minutes. If you didn't request it, ignore this email.</p>`,
                    text: `Open your AngiSoft client portal: ${accessUrl}`
                });
            }
            res.json({ ok: true });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    };

    // `/request` and `/verify` were used by an older web build; keep them as
    // aliases so a cached bundle cannot break a client's only access path.
    router.post('/request-link', publicFormLimiter, requestLink);
    router.post('/request', publicFormLimiter, requestLink);

    const createSession = async (req: Request, res: Response) => {
        try {
            const { token, remember } = sessionSchema.parse(req.body);
            const tokenHash = hashToken(token);
            const access = await prisma.orm.public.ClientAccessToken
                .where({ tokenHash, purpose: 'portal' })
                .first();
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
            // Magic-link sessions get the same rotating refresh cookie as
            // password sessions, so a page reload does not strand the client.
            const accessToken = await issueClientSession(prisma, res, { id: access.clientId }, remember !== false, {
                ip: req.ip,
                userAgent: req.get('user-agent') || undefined,
            });
            res.json({ accessToken });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    };

    router.post('/session', publicFormLimiter, createSession);
    router.post('/verify', publicFormLimiter, createSession);

    // ─── Password sessions (opt-in alternative to the magic link) ──────────
    // Clients are a separate identity domain from Employee staff: staff log in
    // at `/v1/auth/login`, clients at `/v1/client-portal/login`. Accepting staff
    // credentials here would mint a client token whose `sub` is not a Client id.

    router.post('/login', clientLoginLimiter, async (req, res) => {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'Email and password are required' });
        const { password, remember } = parsed.data;
        const email = normalizeClientEmail(parsed.data.email);
        // One generic failure message: do not disclose whether an email exists
        // or whether that account has chosen to use a password yet.
        const invalid = () => res.status(401).json({
            error: 'Invalid email or password. You can also request a secure link by email.',
        });
        const client = await prisma.orm.public.Client.where({ email }).first();
        if (!client?.passwordHash) return invalid();
        const ok = await bcrypt.compare(password, client.passwordHash);
        if (!ok) {
            await logAudit({ action: 'client_login_failed', entity: 'Client', entityId: client.id, meta: { email } });
            return invalid();
        }
        const accessToken = await issueClientSession(prisma, res, { id: client.id }, remember !== false, {
            ip: req.ip,
            userAgent: req.get('user-agent') || undefined,
        });
        await logAudit({ action: 'client_login', entity: 'Client', entityId: client.id, actorId: client.id });
        res.json({ accessToken, client: { id: client.id, name: client.name, email: client.email } });
    });

    /** Rotate the refresh credential. Reuse of an old token revokes the family. */
    router.post('/refresh', publicFormLimiter, async (req, res) => {
        const incoming = req.cookies?.[CLIENT_REFRESH_COOKIE] || req.body?.refreshToken;
        if (!incoming || typeof incoming !== 'string') {
            return res.status(401).json({ error: 'No client session to refresh' });
        }
        const existing = await findClientRefreshRow(prisma, incoming);
        if (!existing || !existing.clientId) return res.status(401).json({ error: 'Invalid client session' });
        if (existing.usedAt || existing.revokedAt || existing.expiresAt < ts()) {
            await revokeClientRefreshSessions(prisma, existing.clientId);
            clearClientRefreshCookie(res);
            return res.status(401).json({ error: 'Client session expired. Please sign in again.' });
        }
        const client = await prisma.orm.public.Client.where({ id: existing.clientId }).first();
        if (!client) return res.status(401).json({ error: 'Invalid client session' });
        const claimed = await prisma.orm.public.ClientAccessToken
            .where((a) => and(
                a.id.eq(existing.id),
                a.usedAt.isNull(),
                a.revokedAt.isNull(),
                a.expiresAt.gt(ts())
            ))
            .updateAndCount({ usedAt: ts(), revokedAt: ts() });
        if (claimed !== 1) {
            await revokeClientRefreshSessions(prisma, existing.clientId);
            clearClientRefreshCookie(res);
            return res.status(401).json({ error: 'Client session expired. Please sign in again.' });
        }
        const remember = existing.purpose === CLIENT_REFRESH_PURPOSE;
        const accessToken = await issueClientSession(prisma, res, { id: client.id }, remember, {
            ip: req.ip,
            userAgent: req.get('user-agent') || undefined,
        });
        res.json({ accessToken });
    });

    router.post('/logout', publicFormLimiter, async (req, res) => {
        const incoming = req.cookies?.[CLIENT_REFRESH_COOKIE] || req.body?.refreshToken;
        if (typeof incoming === 'string') {
            const row = await findClientRefreshRow(prisma, incoming);
            if (row?.clientId) await revokeClientRefreshSessions(prisma, row.clientId);
        }
        clearClientRefreshCookie(res);
        res.json({ ok: true });
    });

    /**
     * Set or replace a client password. Requires an existing client session, so
     * only someone who already controls the email link (or an active password
     * session) can enable password login for that account.
     */
    router.post('/password', requireClientAuth, async (req: ClientPortalRequest, res) => {
        const parsed = passwordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
        }
        const strength = checkPasswordStrength(parsed.data.password);
        if (!strength.ok) return res.status(400).json({ error: 'Password too weak', feedback: strength.feedback });
        const client = await prisma.orm.public.Client.where({ id: req.client!.sub }).first();
        if (!client) return res.status(404).json({ error: 'Client not found' });
        await prisma.orm.public.Client.where({ id: client.id }).update({ passwordHash: await bcrypt.hash(parsed.data.password, 10) });
        // Changing the credential invalidates every existing refresh session;
        // issue one fresh session so the current browser is not interrupted.
        await revokeClientRefreshSessions(prisma, client.id);
        const accessToken = await issueClientSession(prisma, res, { id: client.id }, true, {
            ip: req.ip,
            userAgent: req.get('user-agent') || undefined,
        });
        await logAudit({ action: 'client_password_set', entity: 'Client', entityId: client.id, actorId: client.id });
        res.json({ ok: true, accessToken });
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

    // Client-initiated invoice payment (PayPal redirect, PayHero STK, Safaricom
    // Daraja STK). The Payment row carries `metadata.invoiceId`, which
    // `applyPaymentOutcome` settles against the invoice on success (Phase 4.1).
    router.post('/invoices/:id/pay', requireClientAuth, async (req: ClientPortalRequest, res) => {
        try {
            const { provider, phone, method, returnUrl, cancelUrl } = req.body ?? {};
            // Online clients use the capability-gated method catalogue:
            // PayPal (wallet/cards/Google Pay/Apple Pay/APMs), PayHero
            // (M-Pesa/Airtel/telco) and Safaricom Daraja (M-Pesa STK).
            const methodDef = method ? resolvePaymentMethod(String(method)) : null;
            if (method && !methodDef) {
                const all = resolvePaymentMethod(String(method), true);
                return res.status(all ? 503 : 400).json({
                    error: all?.reason || `Unknown payment method: ${String(method)}`,
                });
            }
            const providerId = (methodDef?.provider || String(provider || '').toUpperCase()) as ProviderId;
            if (!['MPESA', 'PAYHERO', 'PAYPAL'].includes(providerId)) {
                return res.status(400).json({ error: 'Unsupported payment provider' });
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
            if (providerId === 'PAYPAL' && methodDef?.requiresEmail && !payEmail) {
                return res.status(400).json({ error: 'A customer email is required for this PayPal payment method' });
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
                if (dup) {
                    // A PayPal order is reusable: hand back its stored approval
                    // URL so a double-click resumes the same pending order
                    // instead of creating a second charge for one invoice.
                    const meta = (dup.metadata as any) || {};
                    const approve = String(
                        meta.approvalUrl
                        || meta.links?.find((l: any) => l.rel === 'approve' || l.rel === 'payer-action')?.href
                        || '',
                    );
                    return {
                        existing: dup,
                        result: dup.provider === 'PAYPAL' && approve
                            ? { provider: 'PAYPAL', kind: 'redirect', checkoutUrl: approve, providerId: dup.providerId }
                            : undefined,
                    };
                }

                const result = await initializePayment({
                    provider: providerId,
                    amount: balance,
                    currency: invoice.currency || 'KES',
                    email: payEmail || undefined,
                    phone: payPhone || undefined,
                    channelId: methodDef?.channelId,
                    reference: paymentReference,
                    description: `Invoice ${invoice.number || invoice.publicReference} — AngiSoft`,
                    returnUrl: returnUrl ? String(returnUrl) : undefined,
                    cancelUrl: cancelUrl ? String(cancelUrl) : undefined,
                    metadata: {
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.number,
                        method: methodDef?.id,
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
                        metadata: JSON.parse(JSON.stringify({
                            ...(result.details || {}),
                            invoiceId: invoice.id,
                            clientId: req.client!.sub,
                            method: methodDef?.id,
                            reference: paymentReference,
                        })),
                    });
                } catch {
                    row = (await tx.orm.public.Payment.where({ reference: paymentReference }).first())
                        || (await tx.orm.public.Payment.where({ providerId: result.providerId }).first());
                    return { existing: row, result };
                }
                return { row, result };
            });

            const result = (outcome as any).result;
            const existing = (outcome as any).existing;
            const existingMeta = (existing?.metadata as any) || {};
            res.json({
                paymentId: existing ? existing.id : (outcome as any).row?.id,
                provider: providerId,
                method: methodDef?.id,
                kind: result?.kind,
                checkoutUrl: result?.checkoutUrl,
                clientSecret: result?.clientSecret,
                // The buyer-return page needs both values to confirm a PayPal
                // order. They are only ever returned to the authenticated
                // client that initiated the payment.
                orderId: result?.kind === 'redirect' ? (result?.providerId || '') : undefined,
                reference: existing ? String(existingMeta.reference || paymentReference) : paymentReference,
                reused: Boolean(existing),
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
