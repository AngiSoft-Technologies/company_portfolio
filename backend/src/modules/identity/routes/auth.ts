import { Router } from 'express';
import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { and } from '@prisma/orm-postgres/orm-client';
import bcrypt from 'bcrypt';
import { createRefreshToken, hashToken } from '../../../modules/identity/utils/token';
import { sendMail } from '../../../shared/services/email';
import { logAudit } from '../../../shared/services/audit';
import { suspiciousAuthEvent } from '../../../shared/services/monitor';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import rateLimit from 'express-rate-limit';
import { generateSecret, generateOtpAuthUrl, verifyToken, generateBackupCodes, hashBackupCodes } from '../../../modules/identity/services/twofactor';
import { requireAccess } from '../../../shared/middleware/roles';
import zxcvbn from 'zxcvbn';
import { checkPasswordStrength } from '../../../modules/identity/utils/passwordPolicy';
import { availableFactors, createLoginTicket, createSetupTicket, enrolledFactors, verifyBackupCode } from '../services/mfa';
import { issueSession } from '../services/session';
import { ensureEmployeeEmail, findEmployeeByEmail, normalizeEmail } from '../services/employeeEmail';

const router = Router();

// Per-account limiter. Normalize the key so case/whitespace variants cannot
// be used to get fresh attempts.
const accountLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 6,
    keyGenerator: (req) => normalizeEmail(req.body?.email) || 'anonymous',
    message: { status: 429, message: 'Too many attempts' },
    validate: false, // Custom normalized key; app sits behind trusted Fly proxy.
});

const passwordResetRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    keyGenerator: (req) => `reset:${normalizeEmail(req.body?.email) || req.ip || 'anonymous'}`,
    message: { status: 429, message: 'Too many password reset requests' },
    validate: false,
});

const passwordResetConfirmLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => `reset-confirm:${req.ip || 'anonymous'}`,
    message: { status: 429, message: 'Too many password reset attempts' },
    validate: false,
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const login2FASchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totp: z.string().optional(),
  remember: z.boolean().optional(),
});
const refreshSchema = z.object({}); // refresh token will be read from cookie or body
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), password: z.string().min(8) });

router.post('/login', accountLimiter, async (req, res) => {
    const parsed = login2FASchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { password, totp, remember } = parsed.data;
    const email = normalizeEmail(parsed.data.email);
    const emp = await findEmployeeByEmail(prisma, email);
    if (!emp || !emp.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, emp.passwordHash);
    if (!ok) {
        await logAudit({ action: 'login_failed', entity: 'Employee', entityId: emp?.id || null, meta: { email } });
        suspiciousAuthEvent({ type: 'login_failed', ip: req.ip, email });
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const factors = await enrolledFactors(emp);
    const rememberSession = remember !== false;

    // Nobody reaches a dashboard with password only. TOTP is the preferred
    // first factor; a passkey (including a phone fingerprint) is the alternate.
    if (factors.length === 0) {
        const setupTicket = await createSetupTicket(emp);
        const all = availableFactors(emp);
        return res.status(200).json({
            mfaSetupRequired: true,
            setupTicket,
            methods: all.filter((f) => f.type === 'TOTP' || f.type === 'PASSKEY'),
            remember: rememberSession,
        });
    }

    // Browser clients use the ticket flow so the user can choose any enrolled
    // factor (TOTP, email/SMS/WhatsApp OTP, passkey, or a backup code).
    if (factors.length > 0 && !totp) {
        const loginTicket = await createLoginTicket(emp);
        const all = availableFactors(emp);
        const methods = all.filter((f) => factors.includes(f.type) || (f.type === 'BACKUP' && emp.twoFactorEnabled));
        return res.status(200).json({
            mfaRequired: true,
            loginTicket,
            methods,
            remember: rememberSession,
        });
    }

    // Backward compatibility: API clients may send a TOTP/backup code on the
    // first request. This still goes through the same factor checks.
    if (factors.length > 0) {
        let factorOk = false;
        if (totp && emp.twoFactorSecret) factorOk = verifyToken(emp.twoFactorSecret, totp);
        if (!factorOk && totp) factorOk = await verifyBackupCode(emp, totp);
        if (!factorOk) return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    const access = await issueSession(res, emp as any, rememberSession, {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        fingerprint: (req.body as any)?.fingerprint,
    });

    await ensureEmployeeEmail(prisma, emp.id, email, { isPrimary: emp.email === email, verified: true, source: 'login' }).catch(() => {});
    await logAudit({ action: 'login', entity: 'Employee', entityId: emp.id, actorId: emp.id, actorRole: emp.role });
    res.json({ accessToken: access });
});

// Refresh with rotation: read cookie or body, validate, create new refresh token, delete old one
router.post('/refresh', async (req, res) => {
    const incoming = req.cookies?.refreshToken || req.body.refreshToken;
    if (!incoming) return res.status(400).json({ error: 'Missing refresh token' });
    const incomingHash = hashToken(incoming);
    const current = await prisma.orm.public.RefreshToken.where({ token: incomingHash }).first();
    if (!current || current.revoked || current.expiresAt < ts()) return res.status(401).json({ error: 'Invalid refresh token' });
    const claimed = await prisma.orm.public.RefreshToken
        .where((r) => and(r.id.eq(current.id), r.revoked.eq(false), r.expiresAt.gt(ts())))
        .updateAndCount({ revoked: true });
    if (claimed !== 1) return res.status(401).json({ error: 'Invalid refresh token' });

    const emp = await prisma.orm.public.Employee.where({ id: current.employeeId }).first();
    if (!emp) return res.status(401).json({ error: 'Invalid token owner' });

    // Sessions predating this policy must not rehydrate into a dashboard.
    const factors = await enrolledFactors(emp);
    if (factors.length === 0) {
        await prisma.orm.public.RefreshToken.where({ employeeId: emp.id }).updateAll({ revoked: true });
        res.clearCookie('refreshToken', { path: '/v1/auth' });
        const setupTicket = await createSetupTicket(emp);
        const all = availableFactors(emp);
        return res.status(403).json({
            error: 'MFA setup required',
            mfaSetupRequired: true,
            setupTicket,
            methods: all.filter((f) => f.type === 'TOTP' || f.type === 'PASSKEY'),
            remember: current.remember ?? true,
        });
    }

    const access = await issueSession(res, emp as any, current.remember ?? true, {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        fingerprint: (req.body as any)?.fingerprint,
    });
    await logAudit({ action: 'refresh', entity: 'Employee', entityId: emp.id });
    res.json({ accessToken: access });
});

router.post('/logout', async (req, res) => {
    const incoming = req.cookies?.refreshToken || req.body.refreshToken;
    if (incoming) {
        await prisma.orm.public.RefreshToken.where({ token: hashToken(incoming) })
            .updateAndCount({ revoked: true })
            .catch(() => { });
    }
    res.clearCookie('refreshToken', { path: '/v1/auth' });
    res.json({ ok: true });
});

router.post('/revoke/:employeeId', requireAuth, requireAccess('staff.suspend', ['ADMIN']), async (req, res) => {
    const { employeeId } = req.params;
    await prisma.orm.public.RefreshToken.where({ employeeId }).updateAll({ revoked: true });
    await logAudit({ action: 'revoke_tokens', entity: 'Employee', entityId: employeeId, actorId: req.user?.sub || null, actorRole: req.user?.role || null });
    res.json({ ok: true });
});

router.post('/forgot', passwordResetRequestLimiter, async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const email = normalizeEmail(parsed.data.email);
    const emp = await findEmployeeByEmail(prisma, email);
    if (!emp) return res.json({ ok: true }); // don't reveal account existence
    const token = createRefreshToken();
    const tokenHash = hashToken(token);
    const expiry = ts(Date.now() + 1000 * 60 * 60); // 1 hour
    // Only the hash is stored; the emailed token is useless if the DB leaks.
    await prisma.orm.public.Employee.where({ id: emp.id }).update({ resetToken: tokenHash, resetExpiry: expiry });
    await sendMail({
        to: email,
        subject: 'Reset your AngiSoft password',
        purpose: 'noreply',
        title: 'Reset your password',
        eyebrow: 'Account Security',
        preheader: 'Your reset link expires in one hour.',
        cta: {
            label: 'Reset Password',
            url: `${process.env.FRONTEND_URL || 'https://admin.angisoft.co.ke'}/reset?token=${token}`,
        },
        html: `<p style="margin:0 0 16px">We received a request to reset your AngiSoft password.</p>
               <p style="margin:0;color:#64748B;font-size:13px">Use the button above to choose a new password. This link expires in one hour. If you didn't request it, you can safely ignore this email — your current password still works.</p>`,
    });
    await logAudit({ action: 'forgot_password', entity: 'Employee', entityId: emp.id });
    res.json({ ok: true });
});

router.post('/reset', passwordResetConfirmLimiter, async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { password } = parsed.data;
    const tokenHash = hashToken(parsed.data.token);
    const emp = await prisma.orm.public.Employee.where({ resetToken: tokenHash }).first();
    if (!emp || !emp.resetExpiry || emp.resetExpiry < ts()) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const pw = checkPasswordStrength(password);
    if (!pw.ok) return res.status(400).json({ error: 'Password too weak', feedback: pw.feedback });
    const hash = await bcrypt.hash(password, 10);
    // Atomic single-use claim: concurrent resets cannot both succeed.
    const claimed = await prisma.orm.public.Employee
        .where((e) => and(
            e.id.eq(emp.id),
            e.resetToken.eq(tokenHash),
            e.resetExpiry.gt(ts()),
        ))
        .updateAndCount({ passwordHash: hash, resetToken: null, resetExpiry: null });
    if (claimed !== 1) return res.status(400).json({ error: 'Invalid or expired token' });
    await prisma.orm.public.RefreshToken.where({ employeeId: emp.id }).deleteAndCount();
    await logAudit({ action: 'reset_password', entity: 'Employee', entityId: emp.id });
    res.json({ ok: true });
});

// 2FA enroll: generate secret and otpauth url
router.post('/2fa/enroll', requireAuth, async (req: AuthRequest, res) => {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const emp = await prisma.orm.public.Employee.where({ id: userId }).first();
    if (!emp) return res.status(404).json({ error: 'Unknown user' });
    const secret = generateSecret();
    const url = generateOtpAuthUrl(secret, emp.email);
    await prisma.orm.public.Employee.where({ id: emp.id }).update({ twoFactorSecret: secret });
    res.json({ otpauth_url: url });
});

// 2FA verify + enable
router.post('/2fa/verify', requireAuth, async (req: AuthRequest, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const emp = await prisma.orm.public.Employee.where({ id: req.user?.sub as string }).first();
    if (!emp || !emp.twoFactorSecret) return res.status(400).json({ error: 'No secret enrolled' });
    const ok = verifyToken(emp.twoFactorSecret, token);
    if (!ok) return res.status(400).json({ error: 'Invalid token' });
    const backupCodes = generateBackupCodes();
    const hashed = await hashBackupCodes(backupCodes);
    // store hashed backup codes in DB and enable 2FA
    const ops = hashed.map((h) => prisma.orm.public.TwoFactorBackupCode.create({ id: newId(), employeeId: emp.id, codeHash: h }));
    await Promise.all(ops);
    await prisma.orm.public.Employee.where({ id: emp.id }).update({ twoFactorEnabled: true });
    // return plain backup codes to user once (they must be saved externally)
    res.json({ ok: true, backupCodes });
});

// List sessions for authenticated user
router.get('/sessions', requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const sessions = await prisma.orm.public.RefreshToken
        .where({ employeeId: userId })
        .select('id', 'createdAt', 'ip', 'userAgent', 'fingerprint', 'expiresAt', 'revoked')
        .all();
    res.json({ sessions });
});

// Revoke a session by id (owner or admin)
router.post('/sessions/revoke/:id', requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    const sessionId = (req.params as any).id;
    const s = await prisma.orm.public.RefreshToken.where({ id: sessionId }).first();
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (s.employeeId !== userId && req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    await prisma.orm.public.RefreshToken.where({ id: sessionId }).update({ revoked: true });
    await logAudit({ action: 'revoke_session', entity: 'RefreshToken', entityId: sessionId, actorId: userId || null, actorRole: req.user?.role || null });
    res.json({ ok: true });
});

export default router;
