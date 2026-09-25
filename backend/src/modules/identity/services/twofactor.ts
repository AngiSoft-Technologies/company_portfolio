import { authenticator } from 'otplib';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export function generateSecret() {
    return authenticator.generateSecret();
}

export function generateOtpAuthUrl(secret: string, label: string, issuer = 'AngiSoft') {
    return authenticator.keyuri(label, issuer, secret);
}

export function verifyToken(secret: string, token: string) {
    try {
        return authenticator.check(token, secret);
    } catch (e) {
        return false;
    }
}

export function generateBackupCodes(count = 8) {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        codes.push(crypto.randomBytes(4).toString('hex'));
    }
    return codes;
}

export async function hashBackupCodes(codes: string[]) {
    const hashed = [] as string[];
    for (const c of codes) {
        const h = await bcrypt.hash(c, 10);
        hashed.push(h);
    }
    return hashed;
}
