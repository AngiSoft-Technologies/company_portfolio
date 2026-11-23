import crypto from 'crypto';
import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';

/**
 * Short-lived, subject-bound proof of a *fresh* second factor.
 *
 * High-risk admin actions (payout approval, refunds, provider secret rotation,
 * delegated send-as grants) must not be authorised by a role or by the fact
 * that somebody completed MFA at login sometime last week. A client obtains a
 * claim only from `/v1/auth/mfa/step-up/verify`, which re-verifies an enrolled
 * factor, and echoes it on the `x-mfa-step-up` header for the protected call.
 *
 * The claim is a self-contained HMAC token (no Redis/DB read on the hot path),
 * so it keeps working when the cache is down. It is *not* a session token:
 * domain-separated, 5-minute TTL, bound to the authenticated subject, and
 * unusable as an access token or as a login ticket.
 */

export const MFA_STEP_UP_HEADER = 'x-mfa-step-up';
export const MFA_STEP_UP_CODE = 'MFA_STEP_UP_REQUIRED';

const CLAIM_PREFIX = 'mfs1';
const PURPOSE = 'mfa-step-up';
const STEP_UP_TTL_SECONDS = 5 * 60;
const MAX_CLOCK_SKEW_SECONDS = 30;

const STEP_UP_METHODS = ['TOTP', 'BACKUP', 'EMAIL', 'SMS', 'WHATSAPP', 'PASSKEY'] as const;
export type MfaStepUpMethod = (typeof STEP_UP_METHODS)[number];

export interface MfaStepUpPayload {
  v: 1;
  purpose: typeof PURPOSE;
  sub: string;
  method: MfaStepUpMethod;
  iat: number;
  exp: number;
  jti: string;
}

export interface MfaStepUpIssued {
  claim: string;
  expiresAt: string;
  jti: string;
}

export type MfaStepUpRequest = AuthRequest & {
  mfaStepUp?: { jti: string; method: MfaStepUpMethod; exp: number };
};

function claimSecret(): string {
  // Same secret source as the MFA service's OTP/ticket hashes. Never log it.
  const secret = process.env.MFA_HMAC_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('MFA_HMAC_SECRET or JWT_SECRET must be configured');
  return secret;
}

/** Sign a fully-formed claim. Used by issuance and by tests that forge edge cases. */
export function signMfaStepUpClaim(payload: MfaStepUpPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', claimSecret()).update(`${CLAIM_PREFIX}.${encoded}`).digest();
  return `${CLAIM_PREFIX}.${encoded}.${mac.toString('base64url')}`;
}

/** Issue a fresh claim after an enrolled factor has already been verified. */
export function issueMfaStepUpClaim(input: { sub: string; method: MfaStepUpMethod }): MfaStepUpIssued {
  if (!input.sub) throw new Error('A subject is required for an MFA step-up claim');
  const iat = Math.floor(Date.now() / 1000);
  const payload: MfaStepUpPayload = {
    v: 1,
    purpose: PURPOSE,
    sub: input.sub,
    method: input.method,
    iat,
    exp: iat + STEP_UP_TTL_SECONDS,
    jti: crypto.randomBytes(16).toString('base64url'),
  };
  return {
    claim: signMfaStepUpClaim(payload),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    jti: payload.jti,
  };
}

export type StepUpVerification =
  | { ok: true; payload: MfaStepUpPayload }
  | { ok: false; reason: 'malformed' | 'signature' | 'purpose' | 'subject' | 'expired' | 'not-yet-valid' | 'secret-missing' };

/**
 * Verify structure, signature, purpose, subject and lifetime. Fail closed on
 * every error path; `reason` is deliberately free of the presented token.
 */
export function verifyMfaStepUpClaim(token: string, expectedSubject: string): StepUpVerification {
  if (!expectedSubject) return { ok: false, reason: 'subject' };
  let secret: string;
  try {
    secret = claimSecret();
  } catch {
    return { ok: false, reason: 'secret-missing' };
  }
  if (typeof token !== 'string') return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== CLAIM_PREFIX || !parts[1] || !parts[2]) {
    return { ok: false, reason: 'malformed' };
  }

  const expectedMac = crypto.createHmac('sha256', secret).update(`${CLAIM_PREFIX}.${parts[1]}`).digest();
  let presentedMac: Buffer;
  try {
    presentedMac = Buffer.from(parts[2], 'base64url');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (presentedMac.length !== expectedMac.length || !crypto.timingSafeEqual(presentedMac, expectedMac)) {
    return { ok: false, reason: 'signature' };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return { ok: false, reason: 'malformed' };
  const payload = decoded as Partial<MfaStepUpPayload>;
  if (payload.v !== 1 || payload.purpose !== PURPOSE) return { ok: false, reason: 'purpose' };
  if (typeof payload.sub !== 'string' || payload.sub !== expectedSubject) return { ok: false, reason: 'subject' };
  if (typeof payload.method !== 'string' || !STEP_UP_METHODS.includes(payload.method as MfaStepUpMethod)) {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload.jti !== 'string' || payload.jti.length === 0) return { ok: false, reason: 'malformed' };
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number'
    || !Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) {
    return { ok: false, reason: 'malformed' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return { ok: false, reason: 'expired' };
  if (payload.iat > now + MAX_CLOCK_SKEW_SECONDS) return { ok: false, reason: 'not-yet-valid' };
  // A valid HMAC implies full trust in the issuer, but bound the lifetime too
  // so a mis-issued claim can never become a long-lived privilege.
  if (payload.exp - payload.iat > STEP_UP_TTL_SECONDS) return { ok: false, reason: 'malformed' };

  return { ok: true, payload: payload as MfaStepUpPayload };
}

function deny(res: Response) {
  return res.status(403).json({
    error: 'A recent MFA verification is required for this action',
    code: MFA_STEP_UP_CODE,
    requiredHeader: MFA_STEP_UP_HEADER,
  });
}

/**
 * Reject high-risk calls without a fresh claim. Must be stacked *after*
 * requireAuth/requireAccess, never as a substitute: a valid claim without the
 * underlying permission still cannot reach the handler.
 */
export function requireRecentMfa(req: AuthRequest, res: Response, next: NextFunction) {
  const subject = req.user?.sub;
  const token = req.get(MFA_STEP_UP_HEADER);
  if (!subject || !token) return deny(res);

  const result = verifyMfaStepUpClaim(token, subject);
  if (!result.ok) return deny(res);

  // Keep only non-secret metadata for downstream audit/telemetry.
  (req as MfaStepUpRequest).mfaStepUp = {
    jti: result.payload.jti,
    method: result.payload.method,
    exp: result.payload.exp,
  };
  return next();
}

/**
 * Connection PATCH/POST handlers also accept `secret` for key rotation. Require
 * step-up only for those high-risk payloads so ordinary metadata edits keep
 * working. The secret value itself is never read or logged.
 */
export function requireRecentMfaForSecretRotation(req: AuthRequest, res: Response, next: NextFunction) {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body.secret !== 'string' || body.secret.trim() === '') return next();
  return requireRecentMfa(req, res, next);
}
