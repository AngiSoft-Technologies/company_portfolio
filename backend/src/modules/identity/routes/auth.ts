import { Router } from 'express';
import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { and } from '@prisma/orm-postgres/orm-client';
import bcrypt from 'bcrypt';
import { signAccessToken, createRefreshToken, hashToken } from '../../../modules/identity/utils/token';
import { sendMail } from '../../../shared/services/email';
import { logAudit } from '../../../shared/services/audit';
import { suspiciousAuthEvent } from '../../../shared/services/monitor';
import { z } from 'zod';
import { AuthRequest, requireAuth, setRefreshCookie } from '../../../shared/middleware/auth';
import rateLimit from 'express-rate-limit';
import { generateSecret, generateOtpAuthUrl, verifyToken, generateBackupCodes, hashBackupCodes } from '../../../modules/identity/services/twofactor';
import { requireRoles } from '../../../shared/middleware/roles';
import zxcvbn from 'zxcvbn';
import { checkPasswordStrength } from '../../../modules/identity/utils/passwordPolicy';

const router = Router();

// per-account limiter (simple) - using email as key to avoid IPv6 issues
const accountLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 6,
    keyGenerator: (req) => req.body?.email || 'anonymous',
    message: { status: 429, message: 'Too many attempts' },
    validate: false  // Disable all validations to avoid IPv6 warning
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const login2FASchema = z.object({ email: z.string().email(), password: z.string().min(8), totp: z.string().optional() });
const refreshSchema = z.object({}); // refresh token will be read from cookie or body
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), password: z.string().min(8) });

router.post('/login', accountLimiter, async (req, res) => {
    const parsed = login2FASchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { email, password, totp } = parsed.data;
    const emp = await prisma.orm.public.Employee.where({ email }).first();
    if (!emp || !emp.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, emp.passwordHash);
    if (!ok) {
        await logAudit({ action: 'login_failed', entity: 'Employee', entityId: emp?.id || null, meta: { email } });
        suspiciousAuthEvent({ type: 'login_failed', ip: req.ip, email });
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // if 2FA enabled, verify TOTP or accept a one-time backup code
    if (emp.twoFactorEnabled) {
        if (!totp) return res.status(401).json({ error: '2FA required' });
        const valid = verifyToken(emp.twoFactorSecret || '', totp);
        if (!valid) {
            // try backup codes: find unused codes and compare with bcrypt
            const codes = await prisma.orm.public.TwoFactorBackupCode.where({ employeeId: emp.id, used: false }).all();
            let matchedCodeId: string | null = null;
            for (const c of codes) {
                const okCode = await bcrypt.compare(totp, c.codeHash);
                if (okCode) {
                    matchedCodeId = c.id;
                    break;
                }
            }
            if (!matchedCodeId) return res.status(401).json({ error: 'Invalid 2FA token' });
            // mark the backup code as used
            await prisma.orm.public.TwoFactorBackupCode.where({ id: matchedCodeId }).update({ used: true });
        }
    }

    const access = signAccessToken({ sub: emp.id, role: emp.role });
    const refresh = createRefreshToken();
    const refreshHash = hashToken(refresh);
    const expiresAt = ts(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ip = req.ip;
    const userAgent = req.get('user-agent') || undefined;
    const fingerprint = req.body.fingerprint || undefined;
    await prisma.orm.public.RefreshToken.create({ id: newId(), token: refreshHash, employeeId: emp.id, expiresAt, ip: ip ?? null, userAgent: userAgent ?? null, fingerprint: fingerprint ?? null });
    setRefreshCookie(res, refresh);

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

    const newToken = createRefreshToken();
    const newHash = hashToken(newToken);
    const expiresAt = ts(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ip = req.ip;
    const userAgent = req.get('user-agent') || undefined;
    const fingerprint = req.body.fingerprint || undefined;
    await prisma.orm.public.RefreshToken.create({ id: newId(), token: newHash, employeeId: emp.id, expiresAt, ip: ip ?? null, userAgent: userAgent ?? null, fingerprint: fingerprint ?? null });
    setRefreshCookie(res, newToken);

    const access = signAccessToken({ sub: emp.id, role: emp.role });
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
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ ok: true });
});

router.post('/revoke/:employeeId', requireAuth, requireRoles('ADMIN'), async (req, res) => {
    const { employeeId } = req.params;
    await prisma.orm.public.RefreshToken.where({ employeeId }).updateAll({ revoked: true });
    await logAudit({ action: 'revoke_tokens', entity: 'Employee', entityId: employeeId, actorId: req.user?.sub || null, actorRole: req.user?.role || null });
    res.json({ ok: true });
});

router.post('/forgot', async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { email } = parsed.data;
    const emp = await prisma.orm.public.Employee.where({ email }).first();
    if (!emp) return res.json({ ok: true }); // don't reveal
    const token = createRefreshToken();
    const expiry = ts(Date.now() + 1000 * 60 * 60); // 1 hour
    await prisma.orm.public.Employee.where({ id: emp.id }).update({ resetToken: token, resetExpiry: expiry });
    // send password reset email via Zoho SMTP
    await sendMail({ to: email, subject: 'Password reset', html: `<p>Reset here: ${process.env.FRONTEND_URL}/reset?token=${token}</p>`, purpose: 'noreply' });
    await logAudit({ action: 'forgot_password', entity: 'Employee', entityId: emp.id });
    res.json({ ok: true });
});

router.post('/reset', async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { token, password } = parsed.data;
    const emp = await prisma.orm.public.Employee.where({ resetToken: token }).first();
    if (!emp || !emp.resetExpiry || emp.resetExpiry < ts()) return res.status(400).json({ error: 'Invalid or expired token' });
    const pw = checkPasswordStrength(password);
    if (!pw.ok) return res.status(400).json({ error: 'Password too weak', feedback: pw.feedback });
    const hash = await bcrypt.hash(password, 10);
    await prisma.orm.public.Employee.where({ id: emp.id }).update({ passwordHash: hash, resetToken: null, resetExpiry: null });
    await prisma.orm.public.RefreshToken.where({ employeeId: emp.id }).deleteAndCount();
    await logAudit({ action: 'reset_password', entity: 'Employee', entityId: emp.id });
    res.json({ ok: true });
});

// Optional explicit backup-code verification endpoint
router.post('/2fa/backup/verify', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Missing params' });
    const emp = await prisma.orm.public.Employee.where({ email }).first();
    if (!emp) return res.status(404).json({ error: 'Unknown user' });
    const codes = await prisma.orm.public.TwoFactorBackupCode.where({ employeeId: emp.id, used: false }).all();
    let matchedId: string | null = null;
    for (const c of codes) {
        const ok = await bcrypt.compare(code, c.codeHash);
        if (ok) { matchedId = c.id; break; }
    }
    if (!matchedId) return res.status(400).json({ error: 'Invalid code' });
    await prisma.orm.public.TwoFactorBackupCode.where({ id: matchedId }).update({ used: true });
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
