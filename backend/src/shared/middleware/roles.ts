import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { has as hasEffectivePermission, isDenied } from '../../modules/identity/services/effectivePermissions';

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

/**
 * Access control that accepts EITHER the granular permission OR one of the
 * fallback system roles.
 *
 * The repository is mid-migration from hardcoded `requireRoles(...)` to the
 * canonical effective-permission resolver (`ANGISOFT_DIGITAL_HQ_PLAN.md`
 * Phase 1.2). Stacking `requireRoles(...)` **and** `requirePermission(...)`
 * on the same route locks out every role that has not yet been granted the
 * migrated key — e.g. an `ADMIN` whose seeded rows predate `staff.view`.
 * This helper keeps the migration safe: migrated users pass by permission,
 * everyone else passes by role until the registry catches up.
 */
export function requireAccess(permission: string, fallbackRoles: string[] = []) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });

        const ctx = { employeeId: req.user.sub, systemRole: req.user.role };

        // An explicit DENY is final. It must not be rescued by the role
        // fallback below, or "DENY always wins" (plan §5.3) would be a lie for
        // every route that still carries a fallback role.
        if (await isDenied(ctx, permission)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // SUPER_ADMIN's wildcard already evaluates to true here; the explicit
        // check above is what stops a SUPER_ADMIN who has been denied the key.
        if (await hasEffectivePermission(ctx, permission)) return next();

        const role = req.user?.role;
        if (role && fallbackRoles.includes(role)) return next();

        return res.status(403).json({ error: 'Not authorized' });
    };
}
