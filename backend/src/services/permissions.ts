import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

const permissionCache = new Map<string, { permissions: Set<string>; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function getEmployeePermissions(employeeId: string, enumRole?: string) {
    const cacheKey = `${employeeId}:${enumRole || ''}`;
    const cached = permissionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;

    const assignments = await prisma.employeeRoleAssignment.findMany({
        where: { employeeId },
        include: {
            role: {
                include: { permissions: { include: { permission: true } } }
            }
        }
    });

    const permissions = new Set<string>();
    for (const assignment of assignments) {
        for (const rolePermission of assignment.role.permissions) {
            permissions.add(rolePermission.permission.key);
        }
    }

    if (enumRole === 'SUPER_ADMIN') permissions.add('*');
    permissionCache.set(cacheKey, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
    return permissions;
}

export async function hasPermission(employeeId: string, permission: string, enumRole?: string) {
    const permissions = await getEmployeePermissions(employeeId, enumRole);
    return permissions.has('*') || permissions.has(permission);
}

export function requirePermission(permission: string) {
    return async (req: AuthRequest, res: any, next: any) => {
        if (!req.user?.sub) return res.status(401).json({ error: 'Not authenticated' });
        if (await hasPermission(req.user.sub, permission, req.user.role)) return next();
        return res.status(403).json({ error: 'Not authorized' });
    };
}

export function clearPermissionCache(employeeId?: string) {
    if (!employeeId) {
        permissionCache.clear();
        return;
    }
    for (const key of permissionCache.keys()) {
        if (key.startsWith(`${employeeId}:`)) permissionCache.delete(key);
    }
}
