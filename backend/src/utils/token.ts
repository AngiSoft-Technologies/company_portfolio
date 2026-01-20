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
const HS_SECRET = process.env.JWT_SECRET || 'dev_secret';

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
