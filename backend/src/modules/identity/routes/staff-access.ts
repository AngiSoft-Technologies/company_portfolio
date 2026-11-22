/**
 * staff-access.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Backend half of Phase 3 (Admin Staff Access Management) of the AngiSoft
 * Admin/Staff Portal reconstruction.
 *
 * Exposes:
 *   - GET  /v1/admin/staff/:id/access   (read full access state for a staff member)
 *   - PUT  /v1/admin/staff/:id/access   (full assignment write)
 *   - CRUD for Department, Position, PermissionPreset under /v1/admin/*
 *
 * All endpoints require admin-level access through `requireAccess`: reads need
 * `staff.view`, writes need `staff.assign_permissions` /
 * `staff.assign_department` / `staff.assign_position`. Each call passes a
 * `['ADMIN', 'SUPER_ADMIN']` fallback so admins keep working while older
 * installs catch up with the canonical registry.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import prisma from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { and } from '@prisma/orm-postgres/orm-client';
import { clearPermissionCache } from '../../../modules/identity/services/permissions';
import { clearEffectiveCache, getEffectivePermissions } from '../../../modules/identity/services/effectivePermissions';
import { PERMISSIONS, canonicalKey } from '../../../modules/identity/services/permissionRegistry';

// ─── Permission catalogue ──────────────────────────────────────────────────
interface CatalogueEntry {
    key: string;
    display: string;
    description: string;
    group: string;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Derived from the canonical permission registry — the single source of
// truth. Previously this was a hand-maintained 49-entry copy that had
// already drifted from the keys the route guards actually check.
export const PERMISSION_CATALOGUE: CatalogueEntry[] = PERMISSIONS.map((p) => ({
    key: p.key,
    display: p.display,
    description: p.description,
    group: p.group,
    risk: p.risk,
}));

// ─── Validation schemas ────────────────────────────────────────────────────
const directPermissionSchema = z.object({
    key: z.string().min(1),
    effect: z.enum(['GRANT', 'DENY'])
});
// allow lowercase via transform for safety

const assignmentPayloadSchema = z.object({
    departmentId: z.string().nullable().optional(),
    positionId: z.string().nullable().optional(),
    seniorityLevel: z.string().nullable().optional(),
    publicTitle: z.string().nullable().optional(),
    directPermissions: z.array(directPermissionSchema).default([]),
    assignmentScopes: z
        .object({
            products: z.array(z.string()).default([]),
            projects: z.array(z.string()).default([]),
            bookings: z.array(z.string()).default([]),
            enquiries: z.array(z.string()).default([])
        })
        .default({})
});

const departmentSchema = z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional()
});

const positionSchema = z.object({
    departmentId: z.string().min(1),
    title: z.string().min(1),
    displayTitleTemplate: z.string().nullable().optional(),
    defaultPermissionKeys: z.array(z.string()).default([]),
    seniorityLevels: z.array(z.string()).default([])
});

const presetSchema = z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    permissionKeys: z.array(z.string()).default([])
});

// ─── Guard helpers ──────────────────────────────────────────────────────────
// Each guard accepts the canonical permission OR one of the fallback system
// roles. Stacking requireRoles + requirePermission would block any role that
// has not yet been granted the migrated key (see ANGISOFT_DIGITAL_HQ_PLAN.md
// Phase 1.2 — single permission registry).
const readGuard = [requireAuth, requireAccess('staff.view', ['ADMIN', 'SUPER_ADMIN'])];
// Writes for access: prefer assign_permissions but fall back to ADMIN/SUPER_ADMIN.
const writeAccessGuard = [requireAuth, requireAccess('staff.assign_permissions', ['ADMIN', 'SUPER_ADMIN'])];
// Department write
const deptWriteGuard = [requireAuth, requireAccess('staff.assign_department', ['ADMIN', 'SUPER_ADMIN'])];
// Position write
const positionWriteGuard = [requireAuth, requireAccess('staff.assign_position', ['ADMIN', 'SUPER_ADMIN'])];
// Preset write
const presetWriteGuard = [requireAuth, requireAccess('administration.roles', ['ADMIN', 'SUPER_ADMIN'])];

const asyncHandler =
    (fn: (req: AuthRequest, res: any, next: any) => Promise<any>) =>
    (req: AuthRequest, res: any, next: any) =>
        fn(req, res, next).catch(next);

export default function staffAccessRouter() {
    const router = Router();

    // ─── 1. GET staff access state ─────────────────────────────────────────
    router.get('/staff/:id/access', ...readGuard, asyncHandler(async (req: AuthRequest, res) => {
        const employeeId = req.params.id;

        const employee = await prisma.orm.public.Employee
            .where({ id: employeeId })
            .select('id', 'firstName', 'lastName', 'email', 'role', 'departmentId', 'positionId', 'seniorityLevel', 'publicTitle')
            .include('position', (p) => p.select('displayTitleTemplate'))
            .first();
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        // displayTitle is resolved on the client using positions[].displayTitleTemplate
        // plus the selected position title; expose publicTitle as the simplest fallback.
        const displayTitle = employee.publicTitle ?? null;

        const [departments, positions, presets, position] = await Promise.all([
            prisma.orm.public.Department.orderBy((d) => d.name.asc()).all(),
            prisma.orm.public.Position
                .orderBy((p) => p.title.asc())
                .select('id', 'departmentId', 'title', 'displayTitleTemplate', 'defaultPermissionKeys', 'seniorityLevels')
                .all(),
            prisma.orm.public.PermissionPreset
                .orderBy((p) => p.name.asc())
                .select('id', 'key', 'name', 'permissionKeys')
                .all(),
            employee.positionId
                ? prisma.orm.public.Position.where({ id: employee.positionId }).select('defaultPermissionKeys').first()
                : Promise.resolve(null)
        ]);

        // ── Current direct permissions ──
        const empPermRows = await prisma.orm.public.EmployeePermission
            .where({ employeeId })
            .select('permissionKey', 'effect')
            .all();
        const directPermissions = empPermRows.map((r) => ({
            key: r.permissionKey,
            effect: (r.effect === 'DENY' ? 'DENY' : 'GRANT') as 'GRANT' | 'DENY'
        }));

        // ── Role permissions (EmployeeRoleAssignment → AppRole → Permission) ──
        const roleAssignments = await prisma.orm.public.EmployeeRoleAssignment
            .where({ employeeId })
            .include('role', (role) => role.include('rolePermissions', (rp) => rp.include('permission')))
            .all();
        const rolePermissions: string[] = [];
        const seenRoles = new Set<string>();
        for (const assignment of roleAssignments as any[]) {
            for (const rp of assignment.role.rolePermissions) {
                const key = rp.permission?.key;
                if (key && !seenRoles.has(key)) {
                    seenRoles.add(key);
                    rolePermissions.push(key);
                }
            }
        }

        // ── Preset permissions (Position.defaultPermissionKeys) ──
        const presetPermissions: string[] = [...(position?.defaultPermissionKeys ?? [])];

        // ── Assignment scopes ──
        const [ptm, pe, bookings, enquiries] = await Promise.all([
            prisma.orm.public.ProductTeamMember.where({ employeeId }).select('productId').all(),
            prisma.orm.public.ProjectEmployee.where({ employeeId }).select('projectId').all(),
            prisma.orm.public.Booking.where({ assignedToId: employeeId }).select('id').all(),
            prisma.orm.public.ContactEnquiry.where({ assigneeId: employeeId }).select('id').all()
        ]);

        const assignmentScopes = {
            products: ptm.map((p) => p.productId),
            projects: pe.map((p) => p.projectId),
            bookings: bookings.map((b) => b.id),
            enquiries: enquiries.map((e) => e.id)
        };

        // ── Effective (computed by service) ──
        const effectiveMap = await getEffectivePermissions({ employeeId, systemRole: employee.role });
        const permissions = Array.from(effectiveMap.values()).map((p) => ({
            key: p.key,
            effect: p.effect,
            source: p.source
        }));
        // Assignment scope ids are pulled directly from the membership tables
        // (more reliable than scanning the collapsed effective source map).
        const assignedScopes = {
            products: ptm.map((p) => p.productId),
            projects: pe.map((p) => p.projectId),
            bookings: bookings.map((b) => b.id),
            enquiries: enquiries.map((e) => e.id)
        };

        return res.json({
            employee: {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`.trim(),
                email: employee.email,
                role: employee.role,
                departmentId: employee.departmentId,
                positionId: employee.positionId,
                seniorityLevel: employee.seniorityLevel,
                publicTitle: employee.publicTitle,
                displayTitle
            },
            departments: departments.map((d) => ({ id: d.id, key: d.key, name: d.name })),
            positions,
            presets,
            catalogs: PERMISSION_CATALOGUE,
            current: {
                identity: {
                    departmentId: employee.departmentId,
                    positionId: employee.positionId,
                    seniorityLevel: employee.seniorityLevel,
                    publicTitle: employee.publicTitle
                },
                directPermissions,
                rolePermissions,
                presetPermissions,
                assignmentScopes
            },
            effective: {
                permissions,
                assignedScopes
            }
        });
    }));

    // ─── 2. PUT staff access (full assignment write) ────────────────────────
    router.put('/staff/:id/access', ...writeAccessGuard, asyncHandler(async (req: AuthRequest, res) => {
        const employeeId = req.params.id;

        const employee = await prisma.orm.public.Employee.where({ id: employeeId }).select('id').first();
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const parsed = assignmentPayloadSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const body = parsed.data;

        // Validate department/position existence if provided.
        if (body.departmentId) {
            const dept = await prisma.orm.public.Department.where({ id: body.departmentId }).select('id').first();
            if (!dept) return res.status(400).json({ error: 'Invalid departmentId' });
        }
        if (body.positionId) {
            const pos = await prisma.orm.public.Position.where({ id: body.positionId }).select('id').first();
            if (!pos) return res.status(400).json({ error: 'Invalid positionId' });
        }

        // ── Identity update ──
        await prisma.orm.public.Employee.where({ id: employeeId }).update({
            departmentId: body.departmentId ?? null,
            positionId: body.positionId ?? null,
            seniorityLevel: body.seniorityLevel ?? null,
            publicTitle: body.publicTitle ?? null
        });

        // ── Direct permissions: replace ──
        // Keys are canonicalised on write so the table converges on the registry
        // vocabulary instead of accumulating aliases forever (legacy rows are
        // still readable via `canonicalKey()` in the resolver).
        const effect = (e: string): 'GRANT' | 'DENY' => (e === 'DENY' ? 'DENY' : 'GRANT');
        await prisma.orm.public.EmployeePermission.where({ employeeId }).deleteAndCount();
        const written = new Set<string>();
        if (body.directPermissions.length) {
            for (const dp of body.directPermissions) {
                const permissionKey = canonicalKey(dp.key);
                if (written.has(permissionKey)) continue;
                written.add(permissionKey);
                try {
                    await prisma.orm.public.EmployeePermission.create({
                        id: newId(),
                        employeeId,
                        permissionKey,
                        effect: effect(dp.effect),
                        grantedById: req.user?.sub ?? null
                    });
                } catch { /* skipDuplicates */ }
            }
        }

        // ── Product assignments: replace ──
        await prisma.orm.public.ProductTeamMember.where({ employeeId }).deleteAndCount();
        if (body.assignmentScopes.products.length) {
            for (const productId of body.assignmentScopes.products) {
                try {
                    await prisma.orm.public.ProductTeamMember.create({ id: newId(), employeeId, productId });
                } catch { /* skipDuplicates */ }
            }
        }

        // ── Project assignments: replace ──
        await prisma.orm.public.ProjectEmployee.where({ employeeId }).deleteAndCount();
        if (body.assignmentScopes.projects.length) {
            for (const projectId of body.assignmentScopes.projects) {
                try {
                    await prisma.orm.public.ProjectEmployee.create({ id: newId(), employeeId, projectId });
                } catch { /* skipDuplicates */ }
            }
        }

        // ── Booking assignments: set listed, clear previously-assigned-but-removed ──
        const bookingIds = body.assignmentScopes.bookings;
        await prisma.orm.public.Booking
            .where((b) => and(b.assignedToId.eq(employeeId), b.id.notIn(bookingIds)))
            .updateAll({ assignedToId: null });
        if (bookingIds.length) {
            await prisma.orm.public.Booking
                .where((b) => b.id.in(bookingIds))
                .updateAll({ assignedToId: employeeId });
        }

        // ── Enquiry assignments: same pattern ──
        const enquiryIds = body.assignmentScopes.enquiries;
        await prisma.orm.public.ContactEnquiry
            .where((e) => and(e.assigneeId.eq(employeeId), e.id.notIn(enquiryIds)))
            .updateAll({ assigneeId: null });
        if (enquiryIds.length) {
            await prisma.orm.public.ContactEnquiry
                .where((e) => e.id.in(enquiryIds))
                .updateAll({ assigneeId: employeeId });
        }

        // ── Bust caches ──
        clearEffectiveCache(employeeId);
        clearPermissionCache(employeeId);

        return res.json({ ok: true });
    }));

    // ─── 3. Departments CRUD ─────────────────────────────────────────────────
    router.get('/departments', ...readGuard, asyncHandler(async (_req: AuthRequest, res) => {
        const departments = await prisma.orm.public.Department
            .orderBy((d) => d.name.asc())
            .select('id', 'key', 'name', 'description')
            .all();
        res.json(departments);
    }));

    router.post('/departments', ...deptWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = departmentSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { description, ...data } = parsed.data;
        const dept = await prisma.orm.public.Department.create({
            id: newId(),
            updatedAt: ts(),
            key: data.key,
            name: data.name,
            description: description ?? null,
        });
        res.status(201).json(dept);
    }));

    router.put('/departments/:id', ...deptWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = departmentSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const { description, ...data } = parsed.data;
        const dept = await prisma.orm.public.Department.where({ id: req.params.id }).update({
            ...(data.key !== undefined ? { key: data.key } : {}),
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(description !== undefined ? { description } : {}),
        });
        res.json(dept);
    }));

    router.delete('/departments/:id', ...deptWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        await prisma.orm.public.Department.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    }));

    // ─── 4. Positions CRUD ──────────────────────────────────────────────────
    router.get('/positions', ...readGuard, asyncHandler(async (_req: AuthRequest, res) => {
        const positions = await prisma.orm.public.Position
            .orderBy((p) => p.title.asc())
            .select('id', 'departmentId', 'title', 'displayTitleTemplate', 'defaultPermissionKeys', 'seniorityLevels')
            .all();
        res.json(positions);
    }));

    router.post('/positions', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = positionSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const pos = await prisma.orm.public.Position.create({
            id: newId(),
            updatedAt: ts(),
            departmentId: parsed.data.departmentId,
            title: parsed.data.title,
            displayTitleTemplate: parsed.data.displayTitleTemplate ?? null,
            defaultPermissionKeys: parsed.data.defaultPermissionKeys,
            seniorityLevels: parsed.data.seniorityLevels,
        });
        res.status(201).json(pos);
    }));

    router.put('/positions/:id', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = positionSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const pos = await prisma.orm.public.Position.where({ id: req.params.id }).update({
            ...(parsed.data.departmentId !== undefined ? { departmentId: parsed.data.departmentId } : {}),
            ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
            ...(parsed.data.displayTitleTemplate !== undefined ? { displayTitleTemplate: parsed.data.displayTitleTemplate } : {}),
            ...(parsed.data.defaultPermissionKeys !== undefined ? { defaultPermissionKeys: parsed.data.defaultPermissionKeys } : {}),
            ...(parsed.data.seniorityLevels !== undefined ? { seniorityLevels: parsed.data.seniorityLevels } : {}),
        });
        res.json(pos);
    }));

    router.patch('/positions/:id', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = positionSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const pos = await prisma.orm.public.Position.where({ id: req.params.id }).update({
            ...(parsed.data.departmentId !== undefined ? { departmentId: parsed.data.departmentId } : {}),
            ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
            ...(parsed.data.displayTitleTemplate !== undefined ? { displayTitleTemplate: parsed.data.displayTitleTemplate } : {}),
            ...(parsed.data.defaultPermissionKeys !== undefined ? { defaultPermissionKeys: parsed.data.defaultPermissionKeys } : {}),
            ...(parsed.data.seniorityLevels !== undefined ? { seniorityLevels: parsed.data.seniorityLevels } : {}),
        });
        res.json(pos);
    }));

    router.delete('/positions/:id', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        await prisma.orm.public.Position.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    }));

    // ─── 5. Permission presets CRUD ─────────────────────────────────────────
    router.get('/permission-presets', ...readGuard, asyncHandler(async (_req: AuthRequest, res) => {
        const presets = await prisma.orm.public.PermissionPreset
            .orderBy((p) => p.name.asc())
            .select('id', 'key', 'name', 'description', 'permissionKeys')
            .all();
        res.json(presets);
    }));

    router.post('/permission-presets', ...presetWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = presetSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const preset = await prisma.orm.public.PermissionPreset.create({
            id: newId(),
            updatedAt: ts(),
            key: parsed.data.key,
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            permissionKeys: parsed.data.permissionKeys,
        });
        res.status(201).json(preset);
    }));

    router.put('/permission-presets/:id', ...presetWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = presetSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const preset = await prisma.orm.public.PermissionPreset.where({ id: req.params.id }).update({
            ...(parsed.data.key !== undefined ? { key: parsed.data.key } : {}),
            ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
            ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
            ...(parsed.data.permissionKeys !== undefined ? { permissionKeys: parsed.data.permissionKeys } : {}),
        });
        res.json(preset);
    }));

    router.delete('/permission-presets/:id', ...presetWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        await prisma.orm.public.PermissionPreset.where({ id: req.params.id }).delete();
        res.json({ ok: true });
    }));

    return router;
}
