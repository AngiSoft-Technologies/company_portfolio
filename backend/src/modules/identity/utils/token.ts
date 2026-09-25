import jwt, { Secret, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';

// Support RS256 when PRIVATE_KEY / PUBLIC_KEY are provided (PEM) or via KMS. Otherwise fall back to HS256 with JWT_SECRET
const KMS_PROVIDER = process.env.JWT_KMS || undefined; // e.g. 'aws' or 'gcp'
let PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || undefined;
let PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || undefined;

// KMS fetch stub: in production implement fetching private/public keys from KMS
async function fetchKeysFromKmsIfNeeded() {
    if (!KMS_PROVIDER) return;
    // placeholder: implement AWS KMS or Google KMS fetch here
    // For now, we keep using env PEM keys if present.
    return;
}

// attempt synchronous fetch placeholder (no-op) — real implementation should be async during startup
void fetchKeysFromKmsIfNeeded();

// ─── JWT secret hardening ──────────────────────────────────────────────────
// Refuse to run in production with a missing or known-insecure HS256 secret.
// A fallback secret means anyone who reads the source can forge admin tokens.
const KNOWN_WEAK_SECRETS = new Set([
  'dev_secret',
  'supersecretkey',
  'your-super-secret-jwt-key-min-32-characters',
  '',
]);

function resolveHsSecret(): string {
  const raw = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  if (!raw || KNOWN_WEAK_SECRETS.has(raw)) {
    // In dev we allow a throwaway secret so the app can be run locally, but we
    // never want that to silently reach production.
    if (isProduction) {
      throw new Error(
        'JWT_SECRET is missing or set to a known-insecure placeholder. ' +
        'Set a strong, random JWT_SECRET (>= 32 chars) before running in production.'
      );
    }
    return 'dev_insecure_only_secret_do_not_use_in_prod_0123456789';
  }
  if (isProduction && raw.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  return raw;
}

const HS_SECRET: string = resolveHsSecret();

export function signAccessToken(payload: object) {
    if (PRIVATE_KEY) {
        const key: Secret = PRIVATE_KEY as Secret;
        const opts: SignOptions = { algorithm: 'RS256', expiresIn: ACCESS_EXPIRES } as SignOptions;
        return jwt.sign(payload as any, key, opts);
    }
    const key: Secret = HS_SECRET as Secret;
    const opts: SignOptions = { algorithm: 'HS256', expiresIn: ACCESS_EXPIRES } as SignOptions;
    return jwt.sign(payload as any, key, opts);
}

export function verifyAccessToken(token: string) {
    if (PUBLIC_KEY) return jwt.verify(token, PUBLIC_KEY as Secret, { algorithms: ['RS256'] } as VerifyOptions);
    return jwt.verify(token, HS_SECRET as Secret, { algorithms: ['HS256'] } as VerifyOptions);
}

export function createRefreshToken() {
    return uuidv4();
}

export function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
