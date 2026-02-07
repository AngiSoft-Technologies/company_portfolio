import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requireRoles(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.role || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        return next();
    };
}

export function isRole(req: AuthRequest, roles: string[]) {
    return !!req.user?.role && roles.includes(req.user.role);
}
