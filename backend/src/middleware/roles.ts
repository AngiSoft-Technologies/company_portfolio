import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { has as hasEffectivePermission } from '../services/effectivePermissions';

export function requireRoles(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (req.user?.role === 'SUPER_ADMIN') {
            return next();
        }
        if (!req.user?.role || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        return next();
    };
}

export function isRole(req: AuthRequest, roles: string[]) {
    return req.user?.role === 'SUPER_ADMIN' || (!!req.user?.role && roles.includes(req.user.role));
}

export function requirePermission(permission: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        if (await hasEffectivePermission({ employeeId: req.user.sub, systemRole: req.user.role }, permission)) return next();
        return res.status(403).json({ error: 'Not authorized' });
    };
}
