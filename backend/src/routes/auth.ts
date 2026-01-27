import { Router } from 'express';
import prisma from '../db';
import bcrypt from 'bcrypt';
import { signAccessToken, createRefreshToken, hashToken } from '../utils/token';
import { sendMail } from '../services/email';
import { logAudit } from '../services/audit';
import { suspiciousAuthEvent } from '../services/monitor';
import { z } from 'zod';
import { setRefreshCookie } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth';
import { generateSecret, generateOtpAuthUrl, verifyToken, generateBackupCodes, hashBackupCodes } from '../services/twofactor';
import zxcvbn from 'zxcvbn';
import { checkPasswordStrength } from '../utils/passwordPolicy';

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
    const emp = await prisma.employee.findUnique({ where: { email } });
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
            const codes = await prisma.twoFactorBackupCode.findMany({ where: { employeeId: emp.id, used: false } });
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
            await prisma.twoFactorBackupCode.update({ where: { id: matchedCodeId }, data: { used: true } });
        }
    }

    const access = signAccessToken({ sub: emp.id, role: emp.role });
    const refresh = createRefreshToken();
    const refreshHash = hashToken(refresh);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ip = req.ip;
    const userAgent = req.get('user-agent') || undefined;
    const fingerprint = req.body.fingerprint || undefined;
    await prisma.refreshToken.create({ data: { token: refreshHash, employeeId: emp.id, expiresAt, ip, userAgent, fingerprint } });
    setRefreshCookie(res, refresh);

    await logAudit({ action: 'login', entity: 'Employee', entityId: emp.id, actorId: emp.id, actorRole: emp.role });
    res.json({ accessToken: access });
});

// Refresh with rotation: read cookie or body, validate, create new refresh token, delete old one
router.post('/refresh', async (req, res) => {
    const incoming = req.cookies?.refreshToken || req.body.refreshToken;
    if (!incoming) return res.status(400).json({ error: 'Missing refresh token' });
    const incomingHash = hashToken(incoming);
    const r = await prisma.refreshToken.findUnique({ where: { token: incomingHash } });
    if (!r || r.expiresAt < new Date()) return res.status(401).json({ error: 'Invalid refresh token' });
    const emp = await prisma.employee.findUnique({ where: { id: r.employeeId } });
    if (!emp) return res.status(401).json({ error: 'Invalid token owner' });

    // rotate: delete old and issue new
    await prisma.refreshToken.delete({ where: { id: r.id } });
    const newToken = createRefreshToken();
    const newHash = hashToken(newToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ip = req.ip;
    const userAgent = req.get('user-agent') || undefined;
    const fingerprint = req.body.fingerprint || undefined;
    await prisma.refreshToken.create({ data: { token: newHash, employeeId: emp.id, expiresAt, ip, userAgent, fingerprint } });
    setRefreshCookie(res, newToken);

    const access = signAccessToken({ sub: emp.id, role: emp.role });
    await logAudit({ action: 'refresh', entity: 'Employee', entityId: emp.id });
    res.json({ accessToken: access });
});

router.post('/logout', async (req, res) => {
    const incoming = req.cookies?.refreshToken || req.body.refreshToken;
    if (incoming) {
        await prisma.refreshToken.deleteMany({ where: { token: hashToken(incoming) } }).catch(() => { });
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ ok: true });
});

router.post('/revoke/:employeeId', async (req, res) => {
    // Admin-only endpoint: should be protected by requireAuth + role check in production
    const { employeeId } = req.params;
    await prisma.refreshToken.deleteMany({ where: { employeeId } });
    await logAudit({ action: 'revoke_tokens', entity: 'Employee', entityId: employeeId, actorId: req.user?.sub || null, actorRole: req.user?.role || null });
    res.json({ ok: true });
});

router.post('/forgot', async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { email } = parsed.data;
    const emp = await prisma.employee.findUnique({ where: { email } });
    if (!emp) return res.json({ ok: true }); // don't reveal
    const token = createRefreshToken();
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await prisma.employee.update({ where: { id: emp.id }, data: { resetToken: token, resetExpiry: expiry } });
    // send via SendGrid if configured else nodemailer
    await sendMail({ to: email, subject: 'Password reset', html: `<p>Reset here: ${process.env.FRONTEND_URL}/reset?token=${token}</p>` });
    await logAudit({ action: 'forgot_password', entity: 'Employee', entityId: emp.id });
    res.json({ ok: true });
});

router.post('/reset', async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { token, password } = parsed.data;
    const emp = await prisma.employee.findFirst({ where: { resetToken: token } });
    if (!emp || !emp.resetExpiry || emp.resetExpiry < new Date()) return res.status(400).json({ error: 'Invalid or expired token' });
    const pw = checkPasswordStrength(password);
    if (!pw.ok) return res.status(400).json({ error: 'Password too weak', feedback: pw.feedback });
    const hash = await bcrypt.hash(password, 10);
    await prisma.employee.update({ where: { id: emp.id }, data: { passwordHash: hash, resetToken: null, resetExpiry: null } });
    await prisma.refreshToken.deleteMany({ where: { employeeId: emp.id } });
    await logAudit({ action: 'reset_password', entity: 'Employee', entityId: emp.id });
    res.json({ ok: true });
});

// Optional explicit backup-code verification endpoint
router.post('/2fa/backup/verify', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Missing params' });
    const emp = await prisma.employee.findUnique({ where: { email } });
    if (!emp) return res.status(404).json({ error: 'Unknown user' });
    const codes = await prisma.twoFactorBackupCode.findMany({ where: { employeeId: emp.id, used: false } });
    let matchedId: string | null = null;
    for (const c of codes) {
        const ok = await bcrypt.compare(code, c.codeHash);
        if (ok) { matchedId = c.id; break; }
    }
    if (!matchedId) return res.status(400).json({ error: 'Invalid code' });
    await prisma.twoFactorBackupCode.update({ where: { id: matchedId }, data: { used: true } });
    res.json({ ok: true });
});

// 2FA enroll: generate secret and otpauth url
router.post('/2fa/enroll', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    const emp = await prisma.employee.findUnique({ where: { email } });
    if (!emp) return res.status(404).json({ error: 'Unknown user' });
    const secret = generateSecret();
    const url = generateOtpAuthUrl(secret, email);
    // store secret temporarily (in production, mark as pending until verified)
    await prisma.employee.update({ where: { id: emp.id }, data: { twoFactorSecret: secret } });
    res.json({ otpauth_url: url });
});

// 2FA verify + enable
router.post('/2fa/verify', async (req, res) => {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ error: 'Missing params' });
    const emp = await prisma.employee.findUnique({ where: { email } });
    if (!emp || !emp.twoFactorSecret) return res.status(400).json({ error: 'No secret enrolled' });
    const ok = verifyToken(emp.twoFactorSecret, token);
    if (!ok) return res.status(400).json({ error: 'Invalid token' });
    const backupCodes = generateBackupCodes();
    const hashed = await hashBackupCodes(backupCodes);
    // store hashed backup codes in DB and enable 2FA
    const ops = hashed.map((h) => prisma.twoFactorBackupCode.create({ data: { employeeId: emp.id, codeHash: h } }));
    await Promise.all(ops);
    await prisma.employee.update({ where: { id: emp.id }, data: { twoFactorEnabled: true } });
    // return plain backup codes to user once (they must be saved externally)
    res.json({ ok: true, backupCodes });
});

// List sessions for authenticated user
router.get('/sessions', requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const sessions = await prisma.refreshToken.findMany({ where: { employeeId: userId }, select: { id: true, createdAt: true, ip: true, userAgent: true, fingerprint: true, expiresAt: true, revoked: true } });
    res.json({ sessions });
});

// Revoke a session by id (owner or admin)
router.post('/sessions/revoke/:id', requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    const sessionId = (req.params as any).id;
    const s = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (s.employeeId !== userId && req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    await prisma.refreshToken.update({ where: { id: sessionId }, data: { revoked: true } });
    await logAudit({ action: 'revoke_session', entity: 'RefreshToken', entityId: sessionId, actorId: userId || null, actorRole: req.user?.role || null });
    res.json({ ok: true });
});

export default router;
