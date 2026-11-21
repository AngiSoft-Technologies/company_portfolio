import { Router } from 'express';
import prisma from '../../../db';
import { AuthRequest, requireAuth } from '../../../shared/middleware/auth';
import { logAudit } from '../../../shared/services/audit';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  availableFactors,
  consumeLoginTickets,
  consumeSetupTickets,
  createOtpChallenge,
  createSetupTicket,
  defaultDestination,
  enrolledFactors,
  invalidateChallenge,
  regenerateBackupCodes,
  resolveLoginTicket,
  resolveSetupTicket,
  verifyOtpChallenge,
  verifyBackupCode,
  upsertMfaMethod,
} from '../services/mfa';
import {
  authenticationOptions,
  registrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from '../services/webauthn';
import { generateOtpAuthUrl, generateSecret, verifyToken } from '../services/twofactor';
import { issueSession } from '../services/session';

const router = Router();

const mfaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.body?.loginTicket || req.body?.setupTicket || req.ip || 'anonymous',
  message: { error: 'Too many MFA attempts' },
  validate: false,
});

const startSchema = z.object({
  loginTicket: z.string().min(10),
  method: z.enum(['TOTP', 'EMAIL', 'SMS', 'WHATSAPP', 'PASSKEY', 'BACKUP']),
});

const verifySchema = z.object({
  loginTicket: z.string().min(10),
  method: z.enum(['TOTP', 'EMAIL', 'SMS', 'WHATSAPP', 'PASSKEY', 'BACKUP']),
  challengeId: z.string().optional(),
  code: z.string().optional(),
  assertion: z.any().optional(),
  remember: z.boolean().optional(),
});

const setupTicketSchema = z.object({
  setupTicket: z.string().min(10),
  remember: z.boolean().optional(),
});

/** Start a second-factor challenge after a successful password check. */
router.post('/start', mfaLimiter, async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { loginTicket, method } = parsed.data;
  const employee = await resolveLoginTicket(loginTicket);
  if (!employee) return res.status(401).json({ error: 'Login session expired. Sign in again.' });

  const factors = await enrolledFactors(employee);
  if (!factors.includes(method) && method !== 'BACKUP') {
    return res.status(400).json({ error: `${method} is not enrolled for this account` });
  }

  if (method === 'TOTP' || method === 'BACKUP') {
    return res.json({ method, challengeId: null, message: method === 'TOTP' ? 'Enter your authenticator code' : 'Enter an unused backup code' });
  }
  if (method === 'PASSKEY') {
    const options = await authenticationOptions(employee);
    if (!options) return res.status(400).json({ error: 'No passkey is enrolled for this account' });
    return res.json({ method, ...options });
  }

  try {
    // Never trust a client-supplied destination at login: a password holder
    // must not be able to redirect the code to an email/phone they control.
    const enrolled = await prisma.orm.public.MfaMethod.where({
      employeeId: employee.id,
      type: method,
      enabled: true,
    }).first();
    const destination = enrolled?.destination || defaultDestination(employee, method);
    const challenge = await createOtpChallenge(employee, method, destination);
    return res.json({ method, challengeId: challenge.challengeId, destination: challenge.destination, expiresAt: challenge.expiresAt });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

/** Complete login after any enrolled second factor succeeds. */
router.post('/verify', mfaLimiter, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const { loginTicket, method, challengeId, code, assertion, remember } = parsed.data;
  const employee = await resolveLoginTicket(loginTicket);
  if (!employee) return res.status(401).json({ error: 'Login session expired. Sign in again.' });

  let verified = false;
  if (method === 'TOTP') {
    const row = await prisma.orm.public.Employee.where({ id: employee.id }).first();
    verified = !!code && !!row?.twoFactorSecret && employee.twoFactorEnabled && verifyToken(row.twoFactorSecret!, code);
  } else if (method === 'BACKUP') {
    verified = !!code && (await verifyBackupCode(employee, code));
  } else if (method === 'EMAIL' || method === 'SMS' || method === 'WHATSAPP') {
    verified =
      !!challengeId &&
      !!code &&
      (await verifyOtpChallenge(challengeId, code, { employeeId: employee.id, method }));
  } else if (method === 'PASSKEY') {
    verified = !!challengeId && !!assertion && Boolean(await verifyAuthentication(employee, challengeId, assertion));
  }

  if (!verified) {
    if (challengeId && method !== 'PASSKEY') await invalidateChallenge(challengeId).catch(() => undefined);
    await logAudit({ action: 'mfa_failed', entity: 'Employee', entityId: employee.id, meta: { method } });
    return res.status(401).json({ error: 'Invalid or expired verification code' });
  }

  await consumeLoginTickets(employee.id);
  const access = await issueSession(
    res,
    employee as any,
    !!remember,
    { ip: req.ip, userAgent: req.get('user-agent') || undefined, fingerprint: (req.body as any)?.fingerprint }
  );
  await logAudit({ action: 'mfa_verified', entity: 'Employee', entityId: employee.id, actorId: employee.id, actorRole: employee.role, meta: { method } });
  res.json({ accessToken: access, mfaVerified: true });
});

// ─── First-time setup (password ticket only — no dashboard access yet) ───

router.post('/setup/totp/start', mfaLimiter, async (req, res) => {
  const parsed = setupTicketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const employee = await resolveSetupTicket(parsed.data.setupTicket);
  if (!employee) return res.status(401).json({ error: 'Setup session expired. Sign in again.' });
  const secret = generateSecret();
  await prisma.orm.public.Employee.where({ id: employee.id }).update({ twoFactorSecret: secret });
  res.json({ secret, otpauthUrl: generateOtpAuthUrl(secret, employee.email) });
});

router.post('/setup/totp/confirm', mfaLimiter, async (req, res) => {
  const parsed = setupTicketSchema.extend({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const employee = await resolveSetupTicket(parsed.data.setupTicket);
  if (!employee) return res.status(401).json({ error: 'Setup session expired. Sign in again.' });
  const row = await prisma.orm.public.Employee.where({ id: employee.id }).first();
  if (!row?.twoFactorSecret || !verifyToken(row.twoFactorSecret, parsed.data.code)) {
    return res.status(400).json({ error: 'Invalid authenticator code' });
  }
  await upsertMfaMethod(employee, 'TOTP', 'Authenticator app');
  const backupCodes = await regenerateBackupCodes(employee.id);
  await consumeSetupTickets(employee.id);
  const access = await issueSession(res, employee as any, parsed.data.remember !== false, {
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
  });
  await logAudit({ action: 'mfa_setup_complete', entity: 'Employee', entityId: employee.id, actorId: employee.id, actorRole: employee.role, meta: { method: 'TOTP' } });
  res.json({ accessToken: access, backupCodes, mfaVerified: true });
});

router.post('/setup/passkey/options', mfaLimiter, async (req, res) => {
  const parsed = setupTicketSchema.extend({ linkPhone: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const employee = await resolveSetupTicket(parsed.data.setupTicket);
  if (!employee) return res.status(401).json({ error: 'Setup session expired. Sign in again.' });
  res.json(await registrationOptions(employee as any, !!parsed.data.linkPhone));
});

router.post('/setup/passkey/verify', mfaLimiter, async (req, res) => {
  const parsed = setupTicketSchema.extend({
    challengeId: z.string().min(1),
    response: z.any(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const employee = await resolveSetupTicket(parsed.data.setupTicket);
  if (!employee) return res.status(401).json({ error: 'Setup session expired. Sign in again.' });
  const registered = await verifyRegistration(employee as any, parsed.data.challengeId, parsed.data.response);
  if (!registered) return res.status(400).json({ error: 'Passkey verification failed' });
  await upsertMfaMethod(employee, 'PASSKEY', 'Passkey / biometrics', '', registered.credentialId);
  const backupCodes = await regenerateBackupCodes(employee.id);
  await consumeSetupTickets(employee.id);
  const access = await issueSession(res, employee as any, parsed.data.remember !== false, {
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
  });
  await logAudit({ action: 'mfa_setup_complete', entity: 'Employee', entityId: employee.id, actorId: employee.id, actorRole: employee.role, meta: { method: 'PASSKEY' } });
  res.json({ accessToken: access, backupCodes, mfaVerified: true });
});

// ─── Enrollment / management (requires an existing session) ──────────────

router.get('/status', requireAuth, async (req: AuthRequest, res) => {
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee) return res.status(404).json({ error: 'Unknown user' });
  const factors = await enrolledFactors(employee);
  if (factors.length === 0) {
    const setupTicket = await createSetupTicket(employee);
    const all = availableFactors(employee);
    return res.json({
      enrolled: false,
      required: true,
      methods: all.filter((f) => f.type === 'TOTP' || f.type === 'PASSKEY'),
      setupTicket,
      remember: true,
    });
  }
  res.json({ enrolled: true, required: false, methods: factors });
});

router.get('/methods', requireAuth, async (req: AuthRequest, res) => {
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee) return res.status(404).json({ error: 'Unknown user' });
  const rows = await prisma.orm.public.MfaMethod.where({ employeeId: employee.id }).all();
  const backupCount = await prisma.orm.public.TwoFactorBackupCode.where({ employeeId: employee.id, used: false }).all();
  res.json({
    enrolled: rows.map((row) => ({ id: row.id, type: row.type, label: row.label, destination: row.destination, lastUsedAt: row.lastUsedAt })),
    legacyTotp: employee.twoFactorEnabled && !rows.some((row) => row.type === 'TOTP'),
    backupCodesRemaining: backupCount.length,
    available: availableFactors(employee),
  });
});

router.post('/totp/start', requireAuth, async (req: AuthRequest, res) => {
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee) return res.status(404).json({ error: 'Unknown user' });
  const secret = generateSecret();
  await prisma.orm.public.Employee.where({ id: employee.id }).update({ twoFactorSecret: secret });
  res.json({ secret, otpauthUrl: generateOtpAuthUrl(secret, employee.email) });
});

router.post('/totp/confirm', requireAuth, async (req: AuthRequest, res) => {
  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee?.twoFactorSecret) return res.status(400).json({ error: 'Start TOTP enrollment first' });
  if (!verifyToken(employee.twoFactorSecret, code)) return res.status(400).json({ error: 'Invalid code' });
  await upsertMfaMethod(employee, 'TOTP', 'Authenticator app');
  const backupCodes = await regenerateBackupCodes(employee.id);
  await logAudit({ action: 'mfa_enroll', entity: 'Employee', entityId: employee.id, actorId: employee.id, meta: { method: 'TOTP' } });
  res.json({ ok: true, backupCodes });
});

router.post('/otp/start', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ method: z.enum(['EMAIL', 'SMS', 'WHATSAPP']), destination: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee) return res.status(404).json({ error: 'Unknown user' });
  try {
    const challenge = await createOtpChallenge(employee, parsed.data.method, parsed.data.destination);
    res.json({ ok: true, challengeId: challenge.challengeId, destination: challenge.destination });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/otp/confirm', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ method: z.enum(['EMAIL', 'SMS', 'WHATSAPP']), challengeId: z.string(), code: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee) return res.status(404).json({ error: 'Unknown user' });
  const otpChallenge = await prisma.orm.public.MfaChallenge.where({ id: parsed.data.challengeId }).first();
  if (!otpChallenge || otpChallenge.method !== parsed.data.method || otpChallenge.employeeId !== employee.id) {
    return res.status(400).json({ error: 'Invalid challenge' });
  }
  if (!(await verifyOtpChallenge(parsed.data.challengeId, parsed.data.code, {
    employeeId: employee.id,
    method: parsed.data.method,
  }))) return res.status(400).json({ error: 'Invalid code' });
  await upsertMfaMethod(employee, parsed.data.method, parsed.data.method, otpChallenge.destination || '');
  await logAudit({ action: 'mfa_enroll', entity: 'Employee', entityId: employee.id, actorId: employee.id, meta: { method: parsed.data.method } });
  res.json({ ok: true });
});

router.post('/passkey/options', requireAuth, async (req: AuthRequest, res) => {
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee) return res.status(404).json({ error: 'Unknown user' });
  const linkPhone = (req.body as { linkPhone?: boolean })?.linkPhone === true;
  res.json(await registrationOptions(employee as any, linkPhone));
});

router.post('/passkey/verify', requireAuth, async (req: AuthRequest, res) => {
  const { challengeId, response: assertion } = req.body as { challengeId?: string; response?: any };
  if (!challengeId || !assertion) return res.status(400).json({ error: 'Missing challenge or response' });
  const employee = await prisma.orm.public.Employee.where({ id: req.user!.sub }).first();
  if (!employee) return res.status(404).json({ error: 'Unknown user' });
  const result = await verifyRegistration(employee, challengeId, assertion);
  if (!result) return res.status(400).json({ error: 'Passkey verification failed' });
  await upsertMfaMethod(employee, 'PASSKEY', 'Passkey / biometrics', '', result.credentialId);
  await logAudit({ action: 'mfa_enroll', entity: 'Employee', entityId: employee.id, actorId: employee.id, meta: { method: 'PASSKEY' } });
  res.json({ ok: true });
});

router.delete('/method/:id', requireAuth, async (req: AuthRequest, res) => {
  const method = await prisma.orm.public.MfaMethod.where({ id: req.params.id }).first();
  if (!method || method.employeeId !== req.user!.sub) return res.status(404).json({ error: 'Method not found' });
  await prisma.orm.public.MfaMethod.where({ id: method.id }).update({ enabled: false });
  if (method.type === 'PASSKEY' && method.credentialId) {
    await prisma.orm.public.WebAuthnCredential.where({ credentialId: method.credentialId }).deleteAndCount();
  }
  const remaining = await prisma.orm.public.MfaMethod.where({ employeeId: method.employeeId, enabled: true }).all();
  if (!remaining.length) await prisma.orm.public.Employee.where({ id: method.employeeId }).update({ twoFactorEnabled: false });
  await logAudit({ action: 'mfa_remove', entity: 'MfaMethod', entityId: method.id, actorId: req.user!.sub, meta: { type: method.type } });
  res.json({ ok: true });
});

router.post('/backup-codes/regenerate', requireAuth, async (req: AuthRequest, res) => {
  const codes = await regenerateBackupCodes(req.user!.sub);
  await logAudit({ action: 'mfa_backup_regenerate', entity: 'Employee', entityId: req.user!.sub, actorId: req.user!.sub });
  res.json({ backupCodes: codes });
});

export default router;
