import { getConfig } from '../../../shared/services/runtimeConfig';
import crypto from 'crypto';
import prisma from '../../../db';
import { newId, ts, tsMs } from '../../../prisma/db';
import { sendMailDirect } from '../../../shared/services/email';
import { generateBackupCodes, hashBackupCodes } from './twofactor';

export type MfaType = 'TOTP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PASSKEY' | 'BACKUP';

type EmployeeLike = {
  id: string;
  email: string;
  phone?: string | null;
  twoFactorEnabled: boolean;
  role?: string | null;
};

const OTP_TTL_MS = 5 * 60 * 1000;
const PASSKEY_TTL_MS = 5 * 60 * 1000;
const LOGIN_TICKET_TTL_MS = 5 * 60 * 1000;
/** Long enough to scan a QR and enroll a phone passkey, short enough to be safe. */
const SETUP_TICKET_TTL_MS = 15 * 60 * 1000;
const MAX_CHALLENGE_ATTEMPTS = 5;

function hmacSecret(): string {
  const secret = process.env.MFA_HMAC_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('MFA_HMAC_SECRET or JWT_SECRET must be configured');
  return secret;
}

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(code: string): string {
  return crypto.createHmac('sha256', hmacSecret()).update(code).digest('hex');
}

export function verifyOtpHash(hash: string | null, code: string): boolean {
  if (!hash || !/^\d{6}$/.test(code)) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = Buffer.from(hashOtp(code), 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Normalize to E.164 for SMS/WhatsApp gateways. */
function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return value.trim();
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  return `+${digits}`;
}

function otpMessage(code: string): string {
  return `Your AngiSoft verification code is ${code}. It expires in 5 minutes. If you did not request this, ignore this message.`;
}

async function sendSms(to: string, text: string): Promise<boolean> {
  const url = getConfig('SMS_GATEWAY_URL');
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getConfig('SMS_GATEWAY_TOKEN') ? { Authorization: `Bearer ${getConfig('SMS_GATEWAY_TOKEN')}` } : {}),
    },
    body: JSON.stringify({ to: normalizePhone(to), message: text, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`SMS gateway returned ${res.status}`);
  return true;
}

async function sendWhatsapp(to: string, code: string): Promise<boolean> {
  const token = (getConfig('WHATSAPP_ACCESS_TOKEN') || getConfig('WHATSAPP_ACCESS_TOKENS'));
  const phoneId = getConfig('WHATSAPP_PHONE_NUMBER_ID');
  const destination = normalizePhone(to);

  if (token && phoneId) {
    const version = getConfig('WHATSAPP_API_VERSION', 'v23.0');
    const templateName = getConfig('WHATSAPP_OTP_TEMPLATE_NAME');
    const language = getConfig('WHATSAPP_OTP_TEMPLATE_LANGUAGE', 'en');
    const body = templateName
      ? {
          messaging_product: 'whatsapp',
          to: destination,
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }],
          },
        }
      : {
          messaging_product: 'whatsapp',
          to: destination,
          type: 'text',
          text: { body: otpMessage(code), preview_url: false },
        };
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`WhatsApp API returned ${res.status}`);
    return true;
  }

  // Generic gateway fallback: same endpoint as SMS, tagged with a channel so
  // providers that support both can route accordingly.
  const url = getConfig('SMS_GATEWAY_URL');
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getConfig('SMS_GATEWAY_TOKEN') ? { Authorization: `Bearer ${getConfig('SMS_GATEWAY_TOKEN')}` } : {}),
    },
    body: JSON.stringify({ to: destination, message: otpMessage(code), text: otpMessage(code), channel: 'whatsapp' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`WhatsApp gateway returned ${res.status}`);
  return true;
}

export async function deliverOtp(method: 'EMAIL' | 'SMS' | 'WHATSAPP', to: string, code: string): Promise<void> {
  if (method === 'EMAIL') {
    await sendMailDirect({
      to,
      subject: 'Your AngiSoft verification code',
      purpose: 'noreply',
      title: 'Verify your identity',
      eyebrow: 'Account Security',
      preheader: 'Your one-time code expires in 5 minutes.',
      text: otpMessage(code),
      html: `<p style="margin:0 0 16px">Your AngiSoft verification code is <strong style="font-size:22px;letter-spacing:3px;color:#07142B">${code}</strong>.</p>
             <p style="margin:0;color:#64748B;font-size:13px">It expires in 5 minutes. If you did not request this, ignore this message — your account remains secure.</p>`,
    });
    return;
  }
  const sent = method === 'SMS' ? await sendSms(to, otpMessage(code)) : await sendWhatsapp(to, code);
  if (!sent) throw new Error(`${method} MFA is not configured on this server`);
}

export function availableFactors(employee: EmployeeLike): Array<{ type: MfaType; label: string; available: boolean }> {
  return [
    { type: 'TOTP', label: 'Authenticator app', available: true },
    { type: 'PASSKEY', label: 'Passkey / biometrics', available: true },
    { type: 'EMAIL', label: `Email (${employee.email})`, available: true },
    { type: 'SMS', label: employee.phone ? `SMS (${employee.phone})` : 'SMS (no phone on file)', available: !!employee.phone && !!getConfig('SMS_GATEWAY_URL') },
    {
      type: 'WHATSAPP',
      label: employee.phone ? `WhatsApp (${employee.phone})` : 'WhatsApp (no phone on file)',
      available: !!employee.phone && !!(getConfig('WHATSAPP_ACCESS_TOKEN') || getConfig('WHATSAPP_ACCESS_TOKENS') || getConfig('SMS_GATEWAY_URL')),
    },
    { type: 'BACKUP', label: 'Backup code', available: employee.twoFactorEnabled },
  ];
}

export function defaultDestination(employee: EmployeeLike, method: MfaType): string {
  if (method === 'EMAIL') return employee.email;
  if (method === 'SMS' || method === 'WHATSAPP') return employee.phone || '';
  return '';
}

/** Factors already enrolled for an employee, including legacy TOTP rows. */
export async function enrolledFactors(employee: EmployeeLike): Promise<MfaType[]> {
  const rows = await prisma.orm.public.MfaMethod.where({ employeeId: employee.id, enabled: true }).all();
  const types = new Set<MfaType>(rows.map((r) => r.type as MfaType));
  // Legacy 2FA users have twoFactorEnabled but no MfaMethod rows at all. Once
  // any modern factor exists, the legacy flag only means "backup codes ready".
  if (employee.twoFactorEnabled && rows.length === 0) types.add('TOTP');
  return [...types];
}

export async function createOtpChallenge(
  employee: EmployeeLike,
  method: 'EMAIL' | 'SMS' | 'WHATSAPP',
  destinationOverride?: string
): Promise<{ challengeId: string; destination: string; expiresAt: string }> {
  const destination = destinationOverride?.trim() || defaultDestination(employee, method);
  if (!destination) throw new Error(`No destination configured for ${method}`);
  const code = generateOtp();
  const challengeId = newId();
  const expiresAt = ts(Date.now() + OTP_TTL_MS);
  await prisma.orm.public.MfaChallenge.create({
    id: challengeId,
    employeeId: employee.id,
    method,
    destination,
    codeHash: hashOtp(code),
    expiresAt,
  });
  try {
    await deliverOtp(method, destination, code);
  } catch (err) {
    await prisma.orm.public.MfaChallenge.where({ id: challengeId }).deleteAndCount().catch(() => 0);
    throw err;
  }
  return { challengeId, destination, expiresAt };
}

function hashTicket(ticket: string): string {
  return crypto.createHash('sha256').update(ticket).digest('hex');
}

function toEmployeeLike(employee: {
  id: string;
  email: string;
  phone?: string | null;
  twoFactorEnabled: boolean;
  role?: string | null;
}): EmployeeLike {
  return {
    id: employee.id,
    email: employee.email,
    phone: employee.phone,
    twoFactorEnabled: employee.twoFactorEnabled,
    role: employee.role,
  };
}

async function createTicket(employee: EmployeeLike, method: 'LOGIN' | 'SETUP', ttlMs: number): Promise<string> {
  const ticket = crypto.randomBytes(24).toString('base64url');
  await prisma.orm.public.MfaChallenge.create({
    id: newId(),
    employeeId: employee.id,
    method,
    challenge: hashTicket(ticket),
    expiresAt: ts(Date.now() + ttlMs),
  });
  return ticket;
}

async function resolveTicket(ticket: string, method: 'LOGIN' | 'SETUP'): Promise<EmployeeLike | null> {
  if (!ticket) return null;
  const row = await prisma.orm.public.MfaChallenge.where({ challenge: hashTicket(ticket), method }).first();
  if (!row || row.consumedAt || tsMs(row.expiresAt) < Date.now()) return null;
  const employee = await prisma.orm.public.Employee.where({ id: row.employeeId }).first();
  return employee ? toEmployeeLike(employee) : null;
}

async function consumeTickets(employeeId: string, method: 'LOGIN' | 'SETUP'): Promise<void> {
  const tickets = await prisma.orm.public.MfaChallenge.where({ employeeId, method, consumedAt: null }).all();
  await Promise.all(tickets.map((t) => prisma.orm.public.MfaChallenge.where({ id: t.id }).update({ consumedAt: ts() })));
}

/**
 * Short-lived proof that the password factor succeeded. It lets the client
 * pick an MFA method without letting anyone trigger OTP sends for an arbitrary
 * email address.
 */
export async function createLoginTicket(employee: EmployeeLike): Promise<string> {
  return createTicket(employee, 'LOGIN', LOGIN_TICKET_TTL_MS);
}

export async function resolveLoginTicket(ticket: string): Promise<EmployeeLike | null> {
  return resolveTicket(ticket, 'LOGIN');
}

export async function consumeLoginTickets(employeeId: string): Promise<void> {
  return consumeTickets(employeeId, 'LOGIN');
}

/** Password-only proof used when an account has no factor yet. */
export async function createSetupTicket(employee: EmployeeLike): Promise<string> {
  return createTicket(employee, 'SETUP', SETUP_TICKET_TTL_MS);
}

export async function resolveSetupTicket(ticket: string): Promise<EmployeeLike | null> {
  return resolveTicket(ticket, 'SETUP');
}

export async function consumeSetupTickets(employeeId: string): Promise<void> {
  return consumeTickets(employeeId, 'SETUP');
}

export async function createPasskeyChallenge(
  employee: EmployeeLike,
  method: 'PASSKEY' | 'PASSKEY_REGISTER',
  challenge: string
): Promise<{ challengeId: string; expiresAt: string }> {
  const challengeId = newId();
  const expiresAt = ts(Date.now() + PASSKEY_TTL_MS);
  await prisma.orm.public.MfaChallenge.create({
    id: challengeId,
    employeeId: employee.id,
    method,
    challenge,
    expiresAt,
  });
  return { challengeId, expiresAt };
}

export async function getChallenge(id: string) {
  return prisma.orm.public.MfaChallenge.where({ id }).first();
}

export async function consumeChallenge(id: string): Promise<void> {
  await prisma.orm.public.MfaChallenge.where({ id }).update({ consumedAt: ts() });
}

export async function verifyOtpChallenge(
  id: string,
  code: string,
  expected?: { employeeId: string; method: 'EMAIL' | 'SMS' | 'WHATSAPP' }
): Promise<boolean> {
  const challenge = await getChallenge(id);
  if (!challenge || challenge.consumedAt || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) return false;
  if (expected && (challenge.employeeId !== expected.employeeId || challenge.method !== expected.method)) return false;
  if (tsMs(challenge.expiresAt) < Date.now()) return false;
  if (!verifyOtpHash(challenge.codeHash, code)) {
    await prisma.orm.public.MfaChallenge.where({ id }).update({ attempts: challenge.attempts + 1 });
    return false;
  }
  await consumeChallenge(id);
  return true;
}

export async function invalidateChallenge(id: string): Promise<void> {
  await prisma.orm.public.MfaChallenge.where({ id }).update({ attempts: MAX_CHALLENGE_ATTEMPTS });
}

/** Used by the passkey verifier: fetch a still-valid challenge without consuming it. */
export async function validPasskeyChallenge(
  id: string,
  method: 'PASSKEY' | 'PASSKEY_REGISTER',
  employeeId?: string
) {
  const challenge = await getChallenge(id);
  if (!challenge || challenge.method !== method || challenge.consumedAt) return null;
  if (employeeId && challenge.employeeId !== employeeId) return null;
  if (!challenge.challenge || tsMs(challenge.expiresAt) < Date.now() || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) return null;
  return challenge;
}

export async function upsertMfaMethod(
  employee: EmployeeLike,
  type: MfaType,
  label: string,
  destination = '',
  credentialId?: string
): Promise<void> {
  // Any enrolled factor satisfies the login gate; the legacy flag also makes
  // one-time backup codes available for passkey/OTP users.
  await prisma.orm.public.Employee.where({ id: employee.id }).update({
    twoFactorEnabled: true,
    mfaRequired: true,
  });
  if (type === 'TOTP' || credentialId) {
    const existing = credentialId
      ? await prisma.orm.public.MfaMethod.where({ credentialId }).first()
      : await prisma.orm.public.MfaMethod.where({ employeeId: employee.id, type }).first();
    if (existing) {
      await prisma.orm.public.MfaMethod.where({ id: existing.id }).update({
        label,
        destination,
        enabled: true,
        lastUsedAt: ts(),
      });
      return;
    }
  }
  await prisma.orm.public.MfaMethod.create({
    id: newId(),
    employeeId: employee.id,
    type,
    label,
    destination,
    ...(credentialId ? { credentialId } : {}),
    enabled: true,
    createdAt: ts(),
  });
}

export async function regenerateBackupCodes(employeeId: string): Promise<string[]> {
  const codes = generateBackupCodes();
  const hashes = await hashBackupCodes(codes);
  await prisma.orm.public.TwoFactorBackupCode.where({ employeeId }).deleteAndCount();
  await Promise.all(
    hashes.map((codeHash) =>
      prisma.orm.public.TwoFactorBackupCode.create({ id: newId(), employeeId, codeHash, used: false, createdAt: ts() })
    )
  );
  return codes;
}

export async function verifyBackupCode(employee: EmployeeLike, code: string): Promise<boolean> {
  const codes = await prisma.orm.public.TwoFactorBackupCode.where({ employeeId: employee.id, used: false }).all();
  for (const row of codes) {
    if (await bcryptCompare(code, row.codeHash)) {
      await prisma.orm.public.TwoFactorBackupCode.where({ id: row.id }).update({ used: true });
      return true;
    }
  }
  return false;
}

async function bcryptCompare(code: string, hash: string): Promise<boolean> {
  const bcrypt = (await import('bcrypt')).default;
  return bcrypt.compare(code, hash);
}
