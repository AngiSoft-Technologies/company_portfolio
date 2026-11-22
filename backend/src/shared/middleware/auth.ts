import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../modules/identity/utils/token';
import { issueCsrfCookie } from './csrf';

export interface AuthRequest extends Request {
    user?: { sub: string; role?: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const h = req.headers.authorization;
    if (!h) return res.status(401).json({ error: 'Missing authorization' });
    const parts = h.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid authorization' });
    try {
        const payload: any = verifyAccessToken(parts[1]);
        // Client-portal and booking tokens use the same signer but must never
        // authenticate an employee/admin route.
        if (payload?.type && payload.type !== 'employee') {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        req.user = { sub: payload.sub, role: payload.role };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const h = req.headers.authorization;
    if (!h) return next();
    const parts = h.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid authorization' });
    }
    try {
        const payload: any = verifyAccessToken(parts[1]);
        // Client-portal and booking tokens use the same signer but must never
        // authenticate an employee/admin route.
        if (payload?.type && payload.type !== 'employee') {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        req.user = { sub: payload.sub, role: payload.role };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export function setRefreshCookie(res: Response, token: string, remember = true) {
    const secure = process.env.NODE_ENV === 'production';
    // "Remember this device" controls cookie lifetime. Without it the refresh
    // credential is a browser-session cookie; with it, 30 days. The refresh
    // endpoint uses `current.remember` so the choice survives rotation.
    const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : undefined;
    res.cookie('refreshToken', token, { httpOnly: true, secure, sameSite: 'strict', path: '/v1/auth', ...(maxAge ? { maxAge } : {}) });
    // Double-submit CSRF token: readable by JS, echoed back as x-csrf-token.
    // (Fully enforced once the frontend migrates to cookie-based sessions;
    // today the app authenticates via the Authorization header, which is
    // already immune to CSRF.)
    issueCsrfCookie(res);
}
