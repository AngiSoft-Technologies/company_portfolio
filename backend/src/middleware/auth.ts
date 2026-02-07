import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';

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
        req.user = { sub: payload.sub, role: payload.role };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export function setRefreshCookie(res: Response, token: string) {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', token, { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth', maxAge: 30 * 24 * 60 * 60 * 1000 });
}
