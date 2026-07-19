/**
 * staff-access.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Backend half of Phase 3 (Admin Staff Access Management) of the AngiSoft
 * Admin/Staff Portal reconstruction.
 *
 * Exposes:
 *   - GET  /api/admin/staff/:id/access   (read full access state for a staff member)
 *   - PUT  /api/admin/staff/:id/access   (full assignment write)
 *   - CRUD for Department, Position, PermissionPreset under /api/admin/*
 *
 * All endpoints require admin-level access: reads use `requirePermission`
 * (staff.view) and writes use staff.assign_permissions / staff.assign_department
 * / staff.assign_position, with a `requireRoles('ADMIN','SUPER_ADMIN')` fallback
 * so admins can operate during the permission-key transition.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission, requireRoles } from '../middleware/roles';
import prisma from '../db';
import { clearPermissionCache } from '../services/permissions';
import { clearEffectiveCache, getEffectivePermissions } from '../services/effectivePermissions';

// ─── Permission catalogue (hardcoded; mirrors the Phase 3 audit) ───────────
interface CatalogueEntry {
    key: string;
    display: string;
    description: string;
    group: string;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const PERMISSION_CATALOGUE: CatalogueEntry[] = [
    // Profile
    { key: 'profile.view', display: 'View Profile', description: 'View personal staff profile', group: 'Profile', risk: 'LOW' },
    { key: 'profile.edit', display: 'Edit Profile', description: 'Edit own staff profile', group: 'Profile', risk: 'LOW' },
    { key: 'profile.manage', display: 'Manage Profiles', description: 'Manage all staff profiles', group: 'Profile', risk: 'MEDIUM' },

    // Staff
    { key: 'staff.view', display: 'View Staff', description: 'View staff directory', group: 'Staff', risk: 'LOW' },
    { key: 'staff.invite', display: 'Invite Staff', description: 'Invite new staff members', group: 'Staff', risk: 'HIGH' },
    { key: 'staff.assign_permissions', display: 'Assign Permissions', description: 'Assign permissions/departments/positions', group: 'Staff', risk: 'HIGH' },
    { key: 'staff.assign_department', display: 'Assign Department', description: 'Assign staff department', group: 'Staff', risk: 'HIGH' },
    { key: 'staff.assign_position', display: 'Assign Position', description: 'Assign staff position', group: 'Staff', risk: 'HIGH' },
    { key: 'staff.suspend', display: 'Suspend Staff', description: 'Suspend/revoke staff access', group: 'Staff', risk: 'HIGH' },

    // Publications
    { key: 'publications.view_own', display: 'View Own Publications', description: 'View own blog/publications', group: 'Publications', risk: 'LOW' },
    { key: 'publications.update_own', display: 'Edit Own Publications', description: 'Edit own blog/publications', group: 'Publications', risk: 'LOW' },
    { key: 'publications.view', display: 'View Publications', description: 'View all publications', group: 'Publications', risk: 'LOW' },
    { key: 'publications.manage', display: 'Manage Publications', description: 'Create/edit/delete any publication', group: 'Publications', risk: 'MEDIUM' },
    { key: 'publications.publish', display: 'Publish Publications', description: 'Publish/unpublish publications', group: 'Publications', risk: 'MEDIUM' },

    // Services
    { key: 'services.view', display: 'View Services', description: 'View services', group: 'Services', risk: 'LOW' },
    { key: 'services.manage', display: 'Manage Services', description: 'Create/edit/delete services', group: 'Services', risk: 'MEDIUM' },

    // Products
    { key: 'products.view', display: 'View Products', description: 'View products', group: 'Products', risk: 'LOW' },
    { key: 'products.view_assigned', display: 'View Assigned Products', description: 'View assigned products', group: 'Products', risk: 'LOW' },
    { key: 'products.update_assigned', display: 'Update Assigned Products', description: 'Update assigned products', group: 'Products', risk: 'MEDIUM' },
    { key: 'products.manage', display: 'Manage Products', description: 'Full product management', group: 'Products', risk: 'MEDIUM' },

    // Pricing
    { key: 'pricing.view', display: 'View Pricing', description: 'View pricing', group: 'Pricing', risk: 'LOW' },
    { key: 'pricing.manage', display: 'Manage Pricing', description: 'Edit pricing', group: 'Pricing', risk: 'MEDIUM' },

    // Bookings
    { key: 'bookings.view', display: 'View Bookings', description: 'View all bookings', group: 'Bookings', risk: 'LOW' },
    { key: 'bookings.view_assigned', display: 'View Assigned Bookings', description: 'View assigned bookings', group: 'Bookings', risk: 'LOW' },
    { key: 'bookings.update_assigned', display: 'Update Assigned Bookings', description: 'Update assigned bookings', group: 'Bookings', risk: 'MEDIUM' },
    { key: 'bookings.add_progress', display: 'Add Booking Progress', description: 'Add progress to assigned bookings', group: 'Bookings', risk: 'MEDIUM' },
    { key: 'bookings.message_customer', display: 'Message Customer', description: 'Message customers on bookings', group: 'Bookings', risk: 'MEDIUM' },
    { key: 'bookings.manage', display: 'Manage Bookings', description: 'Full booking management', group: 'Bookings', risk: 'MEDIUM' },

    // Enquiries
    { key: 'enquiries.view', display: 'View Enquiries', description: 'View all enquiries', group: 'Enquiries', risk: 'LOW' },
    { key: 'enquiries.view_assigned', display: 'View Assigned Enquiries', description: 'View assigned enquiries', group: 'Enquiries', risk: 'LOW' },
    { key: 'enquiries.respond', display: 'Respond to Enquiries', description: 'Respond to assigned enquiries', group: 'Enquiries', risk: 'MEDIUM' },
    { key: 'enquiries.close', display: 'Close Enquiries', description: 'Close assigned enquiries', group: 'Enquiries', risk: 'MEDIUM' },
    { key: 'enquiries.manage', display: 'Manage Enquiries', description: 'Full enquiry management', group: 'Enquiries', risk: 'MEDIUM' },

    // Reviews
    { key: 'reviews.view', display: 'View Reviews', description: 'View testimonials/reviews', group: 'Reviews', risk: 'LOW' },
    { key: 'reviews.manage', display: 'Manage Reviews', description: 'Moderate reviews/testimonials', group: 'Reviews', risk: 'MEDIUM' },

    // Media
    { key: 'media.view', display: 'View Media', description: 'View media library', group: 'Media', risk: 'LOW' },
    { key: 'media.upload', display: 'Upload Media', description: 'Upload media', group: 'Media', risk: 'LOW' },
    { key: 'media.manage', display: 'Manage Media', description: 'Manage media library', group: 'Media', risk: 'MEDIUM' },

    // Page Content
    { key: 'page_content.view', display: 'View Page Content', description: 'View page content', group: 'Page Content', risk: 'LOW' },
    { key: 'page_content.manage', display: 'Manage Page Content', description: 'Edit page content/sections', group: 'Page Content', risk: 'MEDIUM' },

    // Projects
    { key: 'projects.view', display: 'View Projects', description: 'View all projects', group: 'Projects', risk: 'LOW' },
    { key: 'projects.view_assigned', display: 'View Assigned Projects', description: 'View assigned projects', group: 'Projects', risk: 'LOW' },
    { key: 'projects.update_assigned', display: 'Update Assigned Projects', description: 'Update assigned projects', group: 'Projects', risk: 'MEDIUM' },
    { key: 'projects.manage', display: 'Manage Projects', description: 'Full project management', group: 'Projects', risk: 'MEDIUM' },

    // Analytics
    { key: 'analytics.view', display: 'View Analytics', description: 'View analytics dashboards', group: 'Analytics', risk: 'LOW' },

    // Administration
    { key: 'administration.settings', display: 'Edit Settings', description: 'Edit site/administration settings', group: 'Administration', risk: 'HIGH' },
    { key: 'administration.audit', display: 'View Audit Logs', description: 'View audit logs', group: 'Administration', risk: 'MEDIUM' },
    { key: 'administration.roles', display: 'Manage Roles', description: 'Manage roles/presets', group: 'Administration', risk: 'HIGH' },
    { key: 'administration.impersonate', display: 'Impersonate Users', description: 'Impersonate users', group: 'Administration', risk: 'HIGH' },
];

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
// Reads: prefer requirePermission('staff.view') but fall back to ADMIN/SUPER_ADMIN.
const readGuard = [requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), requirePermission('staff.view')];
// Writes for access: prefer assign_permissions but fall back to ADMIN/SUPER_ADMIN.
const writeAccessGuard = [requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), requirePermission('staff.assign_permissions')];
// Department write
const deptWriteGuard = [requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), requirePermission('staff.assign_department')];
// Position write
const positionWriteGuard = [requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), requirePermission('staff.assign_position')];
// Preset write
const presetWriteGuard = [requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), requirePermission('administration.roles')];

const asyncHandler =
    (fn: (req: AuthRequest, res: any, next: any) => Promise<any>) =>
    (req: AuthRequest, res: any, next: any) =>
        fn(req, res, next).catch(next);

export default function staffAccessRouter() {
    const router = Router();

    // ─── 1. GET staff access state ─────────────────────────────────────────
    router.get('/staff/:id/access', ...readGuard, asyncHandler(async (req: AuthRequest, res) => {
        const employeeId = req.params.id;

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                departmentId: true,
                positionId: true,
                seniorityLevel: true,
                publicTitle: true,
                positionRef: { select: { displayTitleTemplate: true } }
            }
        });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        // displayTitle is resolved on the client using positions[].displayTitleTemplate
        // plus the selected position title; expose publicTitle as the simplest fallback.
        const displayTitle = employee.publicTitle ?? null;

        const [departments, positions, presets, position] = await Promise.all([
            prisma.department.findMany({ orderBy: { name: 'asc' } }),
            prisma.position.findMany({
                orderBy: { title: 'asc' },
                select: {
                    id: true,
                    departmentId: true,
                    title: true,
                    displayTitleTemplate: true,
                    defaultPermissionKeys: true,
                    seniorityLevels: true
                }
            }),
            prisma.permissionPreset.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, key: true, name: true, permissionKeys: true }
            }),
            employee.positionId
                ? prisma.position.findUnique({ where: { id: employee.positionId }, select: { defaultPermissionKeys: true } })
                : Promise.resolve(null)
        ]);

        // ── Current direct permissions ──
        const empPermRows = await prisma.employeePermission.findMany({
            where: { employeeId },
            select: { permissionKey: true, effect: true }
        });
        const directPermissions = empPermRows.map((r) => ({
            key: r.permissionKey,
            effect: (r.effect === 'DENY' ? 'DENY' : 'GRANT') as 'GRANT' | 'DENY'
        }));

        // ── Role permissions (EmployeeRoleAssignment → AppRole → Permission) ──
        const roleAssignments = await prisma.employeeRoleAssignment.findMany({
            where: { employeeId },
            include: { role: { include: { permissions: { include: { permission: true } } } } }
        });
        const rolePermissions: string[] = [];
        const seenRoles = new Set<string>();
        for (const assignment of roleAssignments) {
            for (const rp of assignment.role.permissions) {
                const key = rp.permission?.key;
                if (key && !seenRoles.has(key)) {
                    seenRoles.add(key);
                    rolePermissions.push(key);
                }
            }
        }

        // ── Preset permissions (Position.defaultPermissionKeys) ──
        const presetPermissions: string[] = position?.defaultPermissionKeys ?? [];

        // ── Assignment scopes ──
        const [ptm, pe, bookings, enquiries] = await Promise.all([
            prisma.productTeamMember.findMany({ where: { employeeId }, select: { productId: true } }),
            prisma.projectEmployee.findMany({ where: { employeeId }, select: { projectId: true } }),
            prisma.booking.findMany({ where: { assignedToId: employeeId }, select: { id: true } }),
            prisma.contactEnquiry.findMany({ where: { assigneeId: employeeId }, select: { id: true } })
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

        const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const parsed = assignmentPayloadSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const body = parsed.data;

        // Validate department/position existence if provided.
        if (body.departmentId) {
            const dept = await prisma.department.findUnique({ where: { id: body.departmentId }, select: { id: true } });
            if (!dept) return res.status(400).json({ error: 'Invalid departmentId' });
        }
        if (body.positionId) {
            const pos = await prisma.position.findUnique({ where: { id: body.positionId }, select: { id: true } });
            if (!pos) return res.status(400).json({ error: 'Invalid positionId' });
        }

        // ── Identity update ──
        await prisma.employee.update({
            where: { id: employeeId },
            data: {
                departmentId: body.departmentId ?? null,
                positionId: body.positionId ?? null,
                seniorityLevel: body.seniorityLevel ?? null,
                publicTitle: body.publicTitle ?? null
            }
        });

        // ── Direct permissions: replace ──
        const effect = (e: string): 'GRANT' | 'DENY' => (e === 'DENY' ? 'DENY' : 'GRANT');
        await prisma.employeePermission.deleteMany({ where: { employeeId } });
        if (body.directPermissions.length) {
            await prisma.employeePermission.createMany({
                data: body.directPermissions.map((dp) => ({
                    employeeId,
                    permissionKey: dp.key,
                    effect: effect(dp.effect),
                    grantedById: req.user?.sub
                })),
                skipDuplicates: true
            });
        }

        // ── Product assignments: replace ──
        await prisma.productTeamMember.deleteMany({ where: { employeeId } });
        if (body.assignmentScopes.products.length) {
            await prisma.productTeamMember.createMany({
                data: body.assignmentScopes.products.map((productId) => ({ employeeId, productId })),
                skipDuplicates: true
            });
        }

        // ── Project assignments: replace ──
        await prisma.projectEmployee.deleteMany({ where: { employeeId } });
        if (body.assignmentScopes.projects.length) {
            await prisma.projectEmployee.createMany({
                data: body.assignmentScopes.projects.map((projectId) => ({ employeeId, projectId })),
                skipDuplicates: true
            });
        }

        // ── Booking assignments: set listed, clear previously-assigned-but-removed ──
        const bookingIds = body.assignmentScopes.bookings;
        await prisma.booking.updateMany({
            where: { assignedToId: employeeId, id: { notIn: bookingIds } },
            data: { assignedToId: null }
        });
        if (bookingIds.length) {
            await prisma.booking.updateMany({
                where: { id: { in: bookingIds } },
                data: { assignedToId: employeeId }
            });
        }

        // ── Enquiry assignments: same pattern ──
        const enquiryIds = body.assignmentScopes.enquiries;
        await prisma.contactEnquiry.updateMany({
            where: { assigneeId: employeeId, id: { notIn: enquiryIds } },
            data: { assigneeId: null }
        });
        if (enquiryIds.length) {
            await prisma.contactEnquiry.updateMany({
                where: { id: { in: enquiryIds } },
                data: { assigneeId: employeeId }
            });
        }

        // ── Bust caches ──
        clearEffectiveCache(employeeId);
        clearPermissionCache(employeeId);

        return res.json({ ok: true });
    }));

    // ─── 3. Departments CRUD ─────────────────────────────────────────────────
    router.get('/departments', ...readGuard, asyncHandler(async (_req: AuthRequest, res) => {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, key: true, name: true, description: true }
        });
        res.json(departments);
    }));

    router.post('/departments', ...deptWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = departmentSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const dept = await prisma.department.create({ data: parsed.data });
        res.status(201).json(dept);
    }));

    router.put('/departments/:id', ...deptWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = departmentSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const dept = await prisma.department.update({ where: { id: req.params.id }, data: parsed.data });
        res.json(dept);
    }));

    router.delete('/departments/:id', ...deptWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        await prisma.department.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }));

    // ─── 4. Positions CRUD ──────────────────────────────────────────────────
    router.get('/positions', ...readGuard, asyncHandler(async (_req: AuthRequest, res) => {
        const positions = await prisma.position.findMany({
            orderBy: { title: 'asc' },
            select: {
                id: true,
                departmentId: true,
                title: true,
                displayTitleTemplate: true,
                defaultPermissionKeys: true,
                seniorityLevels: true
            }
        });
        res.json(positions);
    }));

    router.post('/positions', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = positionSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const pos = await prisma.position.create({ data: parsed.data });
        res.status(201).json(pos);
    }));

    router.put('/positions/:id', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = positionSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const pos = await prisma.position.update({ where: { id: req.params.id }, data: parsed.data });
        res.json(pos);
    }));

    router.patch('/positions/:id', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = positionSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const pos = await prisma.position.update({ where: { id: req.params.id }, data: parsed.data });
        res.json(pos);
    }));

    router.delete('/positions/:id', ...positionWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        await prisma.position.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }));

    // ─── 5. Permission presets CRUD ─────────────────────────────────────────
    router.get('/permission-presets', ...readGuard, asyncHandler(async (_req: AuthRequest, res) => {
        const presets = await prisma.permissionPreset.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, key: true, name: true, description: true, permissionKeys: true }
        });
        res.json(presets);
    }));

    router.post('/permission-presets', ...presetWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = presetSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const preset = await prisma.permissionPreset.create({ data: parsed.data });
        res.status(201).json(preset);
    }));

    router.put('/permission-presets/:id', ...presetWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        const parsed = presetSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        const preset = await prisma.permissionPreset.update({ where: { id: req.params.id }, data: parsed.data });
        res.json(preset);
    }));

    router.delete('/permission-presets/:id', ...presetWriteGuard, asyncHandler(async (req: AuthRequest, res) => {
        await prisma.permissionPreset.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }));

    return router;
}
