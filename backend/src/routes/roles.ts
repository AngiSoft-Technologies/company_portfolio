import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission, requireRoles } from '../middleware/roles';
import prisma from '../db';
import { clearPermissionCache } from '../services/permissions';
import { clearEffectiveCache } from '../services/effectivePermissions';

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
        await prisma.auditLog.create({
            data: {
                actorId: req.user?.sub,
                actorRole: req.user?.role as Role | undefined,
                action,
                entity,
                entityId
            }
        }).catch(() => undefined);
    };

    router.get('/permissions', ...requireRoleAdmin, async (_req: AuthRequest, res) => {
        const permissions = await prisma.permission.findMany({ orderBy: { key: 'asc' } });
        res.json(permissions);
    });

    router.get('/', ...requireRoleAdmin, async (_req: AuthRequest, res) => {
        const roles = await prisma.appRole.findMany({
            include: { permissions: { include: { permission: true } }, _count: { select: { assignments: true } } },
            orderBy: { key: 'asc' }
        });
        res.json(roles.map((role) => ({
            ...role,
            permissions: role.permissions.map((rp) => rp.permission)
        })));
    });

    router.post('/', ...requireRoleManage, async (req: AuthRequest, res) => {
        const parsed = roleSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { permissionKeys, ...data } = parsed.data;
        const role = await prisma.appRole.create({ data });
        const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
        await prisma.rolePermission.createMany({
            data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
            skipDuplicates: true
        });
        await audit(req, 'role.create', 'AppRole', role.id);
        res.status(201).json(role);
    });

    router.put('/:id', ...requireRoleManage, async (req: AuthRequest, res) => {
        const parsed = roleSchema.partial({ key: true }).safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { permissionKeys, ...data } = parsed.data;
        const role = await prisma.appRole.update({ where: { id: req.params.id }, data });
        if (permissionKeys) {
            await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
            const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
            await prisma.rolePermission.createMany({
                data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
                skipDuplicates: true
            });
            clearPermissionCache();
            clearEffectiveCache();
        }
        await audit(req, 'role.update', 'AppRole', role.id);
        res.json(role);
    });

    router.post('/assignments', ...requireStaffAssign, async (req: AuthRequest, res) => {
        const parsed = assignmentSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const assignment = await prisma.employeeRoleAssignment.upsert({
            where: { employeeId_roleId: parsed.data },
            update: {},
            create: parsed.data
        });
        clearPermissionCache(parsed.data.employeeId);
        clearEffectiveCache(parsed.data.employeeId);
        await audit(req, 'role.assign', 'EmployeeRoleAssignment', assignment.id);
        res.status(201).json(assignment);
    });

    router.delete('/assignments/:id', ...requireStaffAssign, async (req: AuthRequest, res) => {
        const assignment = await prisma.employeeRoleAssignment.delete({ where: { id: req.params.id } });
        clearPermissionCache(assignment.employeeId);
        clearEffectiveCache(assignment.employeeId);
        await audit(req, 'role.unassign', 'EmployeeRoleAssignment', assignment.id);
        res.json({ ok: true });
    });

    return router;
}
