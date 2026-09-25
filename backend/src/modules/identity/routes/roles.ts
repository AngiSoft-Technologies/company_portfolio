import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission, requireRoles } from '../../../shared/middleware/roles';
import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { clearPermissionCache } from '../../../modules/identity/services/permissions';
import { clearEffectiveCache } from '../../../modules/identity/services/effectivePermissions';

const roleSchema = z.object({
    key: z.string().min(2),
    name: z.string().min(2),
    description: z.string().nullable().optional(),
    permissionKeys: z.array(z.string()).default([])
});

const assignmentSchema = z.object({
    employeeId: z.string().min(1),
    roleId: z.string().min(1)
});

export default function rolesRouter() {
    const router = Router();
    const requireRoleAdmin = [requireAuth, requireRoles('ADMIN')];
    const requireRoleManage = [requireAuth, requireRoles('ADMIN'), requirePermission('roles.manage')];
    const requireStaffAssign = [requireAuth, requireRoles('ADMIN'), requirePermission('staff.assign_permissions')];

    const audit = async (req: AuthRequest, action: string, entity: string, entityId?: string) => {
        await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: req.user?.sub ?? null,
            actorRole: (req.user?.role as any) ?? null,
            action,
            entity,
            entityId: entityId ?? null
        }).catch(() => undefined);
    };

    router.get('/permissions', ...requireRoleAdmin, async (_req: AuthRequest, res) => {
        const permissions = await prisma.orm.public.Permission.orderBy((p) => p.key.asc()).all();
        res.json(permissions);
    });

    router.get('/', ...requireRoleAdmin, async (_req: AuthRequest, res) => {
        const roles = await prisma.orm.public.AppRole
            .orderBy((r) => r.key.asc())
            .include('rolePermissions', (rp) => rp.include('permission'))
            .all();
        const counts = await prisma.orm.public.EmployeeRoleAssignment
            .groupBy('roleId')
            .aggregate((a) => ({ n: a.count() }));
        const countMap = new Map(counts.map((c: any) => [c.roleId, c.n]));
        res.json(roles.map((role: any) => {
            const { rolePermissions, ...rest } = role;
            return {
                ...rest,
                permissions: rolePermissions.map((rp: any) => rp.permission),
                _count: { assignments: countMap.get(role.id) ?? 0 }
            };
        }));
    });

    router.post('/', ...requireRoleManage, async (req: AuthRequest, res) => {
        const parsed = roleSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { permissionKeys, ...data } = parsed.data;
        const role = await prisma.orm.public.AppRole.create({
            id: newId(),
            updatedAt: ts(),
            key: data.key,
            name: data.name,
            description: data.description ?? null,
        });
        const permissions = await prisma.orm.public.Permission
            .where((p) => p.key.in(permissionKeys))
            .all();
        await prisma.transaction(async (tx) => {
            for (const permission of permissions) {
                try {
                    await tx.orm.public.RolePermission.create({ roleId: role.id, permissionId: permission.id });
                } catch { /* skipDuplicates */ }
            }
        });
        await audit(req, 'role.create', 'AppRole', role.id);
        res.status(201).json(role);
    });

    router.put('/:id', ...requireRoleManage, async (req: AuthRequest, res) => {
        const parsed = roleSchema.partial({ key: true }).safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { permissionKeys, ...data } = parsed.data;
        const role = await prisma.orm.public.AppRole.where({ id: req.params.id }).update({
            ...(data.key !== undefined ? { key: data.key } : {}),
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
        });
        if (permissionKeys) {
            await prisma.orm.public.RolePermission.where({ roleId: (role as any).id }).deleteAndCount();
            const permissions = await prisma.orm.public.Permission
                .where((p) => p.key.in(permissionKeys))
                .all();
            await prisma.transaction(async (tx) => {
                for (const permission of permissions) {
                    try {
                        await tx.orm.public.RolePermission.create({ roleId: (role as any).id, permissionId: permission.id });
                    } catch { /* skipDuplicates */ }
                }
            });
            clearPermissionCache();
            clearEffectiveCache();
        }
        await audit(req, 'role.update', 'AppRole', (role as any).id);
        res.json(role);
    });

    router.post('/assignments', ...requireStaffAssign, async (req: AuthRequest, res) => {
        const parsed = assignmentSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const assignment = await prisma.transaction(async (tx) => {
            const existing = await tx.orm.public.EmployeeRoleAssignment
                .where({ employeeId: parsed.data.employeeId, roleId: parsed.data.roleId })
                .first();
            if (existing) return existing;
            return tx.orm.public.EmployeeRoleAssignment.create({
                id: newId(),
                employeeId: parsed.data.employeeId,
                roleId: parsed.data.roleId,
            });
        });
        clearPermissionCache(parsed.data.employeeId);
        clearEffectiveCache(parsed.data.employeeId);
        await audit(req, 'role.assign', 'EmployeeRoleAssignment', assignment.id);
        res.status(201).json(assignment);
    });

    router.delete('/assignments/:id', ...requireStaffAssign, async (req: AuthRequest, res) => {
        const assignment = await prisma.orm.public.EmployeeRoleAssignment.where({ id: req.params.id }).delete();
        clearPermissionCache((assignment as any).employeeId);
        clearEffectiveCache((assignment as any).employeeId);
        await audit(req, 'role.unassign', 'EmployeeRoleAssignment', (assignment as any).id);
        res.json({ ok: true });
    });

    return router;
}
