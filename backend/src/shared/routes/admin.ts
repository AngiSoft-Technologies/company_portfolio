import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../db';
import { ts, newId } from '../../prisma/db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireAccess } from '../middleware/roles';
import { logAudit } from '../services/audit';
import { listSlowRequests } from '../services/monitoring/performanceStore';

const ASSIGNABLE_ROLES = [
    'ADMIN', 'MANAGER', 'MARKETING', 'DEVELOPER', 'HR', 'STAFF',
    'CONTENT_CREATOR', 'BLOG_MANAGER',
] as const;

const employeeUpdateSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).nullable().optional(),
    role: z.enum(ASSIGNABLE_ROLES).optional(),
    bio: z.string().max(2000).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
}).strip();

export default function adminRouter(prisma: Db) {
    const router = Router();

    // All routes require authentication
    router.use(requireAuth);

    // Helper to check admin role
    const requireAdmin = (req: AuthRequest, res: any, next: any) => {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    };

    // Helper to check admin or staff role
    const requireAdminOrStaff = (req: AuthRequest, res: any, next: any) => {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING' && req.user?.role !== 'DEVELOPER') {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };

    // ========== AUDIT LOG (Phase 5.4 observability) ==========
    router.get('/audit-logs', requireAdmin, async (req, res) => {
        try {
            const { entity, action, actorId, page = '1', limit = '50' } = req.query;
            const where: Record<string, string> = {};
            if (entity) where.entity = String(entity);
            if (action) where.action = String(action);
            if (actorId) where.actorId = String(actorId);

            const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
            const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

            let query = prisma.orm.public.AuditLog;
            let countQuery = prisma.orm.public.AuditLog;
            if (Object.keys(where).length > 0) {
                query = query.where(where as any);
                countQuery = countQuery.where(where as any);
            }
            const [rows, total] = await Promise.all([
                query.orderBy((a: any) => a.createdAt.desc()).offset(skip).limit(take).all(),
                countQuery.count(),
            ]);
            res.json({ logs: rows, total, page: Number(page), limit: take });
        } catch (err) {
            res.status(500).json({ error: 'Failed to load audit logs' });
        }
    });

    // ========== SLOW REQUEST STORE (Phase 5.4 observability) ==========
    // Read-only view of the bounded in-memory ring buffer fed by the
    // `slow_request` middleware in app.ts. Reuses the canonical
    // `administration.audit` key (no new permission registry entry) with the
    // existing ADMIN/SUPER_ADMIN fallback. No DB reads, no mutations: this is
    // a live-process diagnostic, not a durable APM/slow-query store.
    router.get('/performance/slow-requests',
        requireAuth,
        requireAccess('administration.audit', ['ADMIN', 'SUPER_ADMIN']),
        (req, res) => {
            const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 250);
            res.json(listSlowRequests(limit));
        });

    // ========== CROSS-DEPARTMENT REPORTING (Phase 4.4) ==========
    // Aggregates pipeline, delivery, finance and satisfaction into one payload.
    // Row sets are small enough to aggregate in-process; every query is
    // projected to the fields actually used.
    router.get('/reports/overview', requireAdmin, async (req, res) => {
        try {
            const [leads, opportunities, projects, invoices, payments, testimonials, tickets] = await Promise.all([
                prisma.orm.public.Lead.select('id', 'status', 'stage', 'createdAt').all(),
                prisma.orm.public.Opportunity.select('id', 'stage', 'value', 'currency', 'createdAt').all(),
                prisma.orm.public.ClientProject.select('id', 'status', 'progress', 'createdAt', 'deliveredAt', 'completedAt').all(),
                prisma.orm.public.Invoice.select('id', 'status', 'total', 'amountPaid', 'balanceDue', 'currency').all(),
                prisma.orm.public.Payment.select('id', 'status', 'amount', 'currency', 'provider', 'createdAt').all(),
                prisma.orm.public.Testimonial.select('id', 'rating', 'confirmed', 'rejected', 'createdAt').all(),
                prisma.orm.public.SupportTicket.select('id', 'status', 'createdAt').all(),
            ]);

            const countBy = (rows: any[], key: string) =>
                rows.reduce<Record<string, number>>((acc, r) => {
                    const k = String(r[key] ?? 'unknown');
                    acc[k] = (acc[k] ?? 0) + 1;
                    return acc;
                }, {});

            const sumBy = (rows: any[], key: string) =>
                rows.reduce<Record<string, number>>((acc, r) => {
                    const cur = String(r.currency ?? 'KES');
                    acc[cur] = (acc[cur] ?? 0) + Number(r[key] ?? 0);
                    return acc;
                }, {});

            const confirmedRatings = testimonials.filter((t: any) => t.confirmed && !t.rejected && t.rating != null);
            const avgRating = confirmedRatings.length
                ? confirmedRatings.reduce((s: number, t: any) => s + Number(t.rating), 0) / confirmedRatings.length
                : null;

            const now = Date.now();
            const last30 = (rows: any[]) =>
                rows.filter((r) => r.createdAt && now - new Date(r.createdAt).getTime() < 30 * 86400_000).length;

            res.json({
                pipeline: {
                    leadsByStage: countBy(leads, 'stage'),
                    leadsByStatus: countBy(leads, 'status'),
                    opportunitiesByStage: countBy(opportunities, 'stage'),
                    opportunityValueByCurrency: sumBy(
                        opportunities.filter((o: any) => !['lost', 'rejected', 'closed_lost'].includes(String(o.stage ?? '').toLowerCase())),
                        'value',
                    ),
                    newLast30d: {
                        leads: last30(leads),
                        opportunities: last30(opportunities),
                        tickets: last30(tickets),
                    },
                },
                delivery: {
                    projectsByStatus: countBy(projects, 'status'),
                    avgProgress: projects.length
                        ? Math.round(projects.reduce((s: number, p: any) => s + Number(p.progress ?? 0), 0) / projects.length)
                        : 0,
                    deliveredLast30d: projects.filter((p: any) => p.deliveredAt && now - new Date(p.deliveredAt).getTime() < 30 * 86400_000).length,
                },
                finance: {
                    invoicesByStatus: countBy(invoices, 'status'),
                    invoicedByCurrency: sumBy(invoices, 'total'),
                    collectedByCurrency: sumBy(invoices, 'amountPaid'),
                    outstandingByCurrency: sumBy(invoices, 'balanceDue'),
                    paymentsByStatus: countBy(payments, 'status'),
                    paymentsByProvider: countBy(payments, 'provider'),
                    paymentVolumeByCurrency: sumBy(
                        payments.filter((p: any) => p.status === 'SUCCEEDED'),
                        'amount',
                    ),
                },
                satisfaction: {
                    testimonialsByRating: confirmedRatings.reduce<Record<string, number>>((acc, t: any) => {
                        const k = String(t.rating);
                        acc[k] = (acc[k] ?? 0) + 1;
                        return acc;
                    }, {}),
                    averageRating: avgRating === null ? null : Math.round(avgRating * 100) / 100,
                    confirmedTestimonials: confirmedRatings.length,
                    pendingModeration: testimonials.filter((t: any) => !t.confirmed && !t.rejected).length,
                    ticketsByStatus: countBy(tickets, 'status'),
                },
                generatedAt: new Date().toISOString(),
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to build reports overview' });
        }
    });

    // ========== DASHBOARD STATISTICS ==========
    router.get('/dashboard/stats', requireAdmin, async (req, res) => {
        try {
            const [
                totalBookings,
                pendingBookings,
                totalServices,
                totalProjects,
                totalStaff,
                totalClients,
                recentBookings
            ] = await Promise.all([
                prisma.orm.public.Booking.aggregate((a) => ({ n: a.count() })).then((r) => r.n),
                prisma.orm.public.Booking.where((b) => b.status.in(['SUBMITTED', 'UNDER_REVIEW'])).aggregate((a) => ({ n: a.count() })).then((r) => r.n),
                prisma.orm.public.Service.where({ published: true }).aggregate((a) => ({ n: a.count() })).then((r) => r.n),
                prisma.orm.public.Project.where({ published: true }).aggregate((a) => ({ n: a.count() })).then((r) => r.n),
                prisma.orm.public.Employee.where((e) => e.acceptedAt.isNotNull()).aggregate((a) => ({ n: a.count() })).then((r) => r.n),
                prisma.orm.public.Client.aggregate((a) => ({ n: a.count() })).then((r) => r.n),
                prisma.orm.public.Booking
                    .orderBy((b) => b.createdAt.desc())
                    .limit(5)
                    .include('client', (c) => c.select('name', 'email'))
                    .all(),
            ]);

            res.json({
                totalBookings,
                pendingBookings,
                totalServices,
                totalProjects,
                totalStaff,
                totalClients,
                recentBookings
            });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ========== BOOKINGS MANAGEMENT ==========
    router.get('/bookings', requireAdminOrStaff, async (req, res) => {
        try {
            const { status, page = '1', limit = '20' } = req.query;
            const skip = (Number(page) - 1) * Number(limit);

            const [bookings, total] = await Promise.all([
                (status
                    ? prisma.orm.public.Booking.where((b) => b.status.eq(status as any))
                    : prisma.orm.public.Booking)
                    .orderBy((b) => b.createdAt.desc())
                    .offset(skip)
                    .limit(Number(limit))
                    .include('client')
                    .include('assignedTo', (a) => a.select('id', 'firstName', 'lastName', 'email'))
                    .include('files')
                    .include('payments', (p) => p.orderBy((p2) => p2.createdAt.desc()))
                    .all(),
                (status
                    ? prisma.orm.public.Booking.where((b) => b.status.eq(status as any))
                    : prisma.orm.public.Booking)
                    .aggregate((a) => ({ n: a.count() })).then((r) => r.n),
            ]);

            res.json({ bookings, total, page: Number(page), limit: Number(limit) });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.get('/bookings/:id', requireAdminOrStaff, async (req, res) => {
        try {
            const booking = await prisma.orm.public.Booking
                .where({ id: req.params.id })
                .include('client')
                .include('assignedTo', (a) => a.select('id', 'firstName', 'lastName', 'email'))
                .include('files')
                .include('payments', (p) => p.orderBy((p2) => p2.createdAt.desc()))
                .include('notes', (n) => n.orderBy((n2) => n2.createdAt.desc()))
                .first();
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            res.json(booking);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ========== STAFF/EMPLOYEES MANAGEMENT ==========
    router.get('/employees', requireAdmin, async (req, res) => {
        try {
            const employees = await prisma.orm.public.Employee
                .select('id', 'firstName', 'lastName', 'email', 'phone', 'role', 'bio', 'avatarUrl', 'username', 'publicTitle', 'departmentId', 'positionId', 'acceptedAt', 'createdAt')
                .orderBy((e) => e.createdAt.desc())
                .all();
            res.json(employees);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.put('/employees/:id', requireAdmin, async (req: AuthRequest, res) => {
        const parsed = employeeUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
        }
        try {
            const target = await prisma.orm.public.Employee.where({ id: req.params.id }).first();
            if (!target) return res.status(404).json({ error: 'Employee not found' });
            // Only SUPER_ADMIN may change roles, and never their own role (lockout risk).
            if (parsed.data.role !== undefined) {
                if (req.user?.role !== 'SUPER_ADMIN') {
                    return res.status(403).json({ error: 'Only SUPER_ADMIN can change roles' });
                }
                if (req.params.id === req.user.sub) {
                    return res.status(403).json({ error: 'Cannot change your own role' });
                }
            }
            if ((target as any).role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Cannot modify a SUPER_ADMIN account' });
            }

            // Deny by default: only explicit, validated fields are written.
            const patch: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(parsed.data)) {
                if (value !== undefined) patch[key] = value;
            }
            const updated = await prisma.orm.public.Employee.where({ id: req.params.id }).update(patch as any);
            const employee = {
                id: (updated as any)?.id ?? target.id,
                firstName: (updated as any)?.firstName ?? (target as any).firstName,
                lastName: (updated as any)?.lastName ?? (target as any).lastName,
                email: (updated as any)?.email ?? (target as any).email,
                phone: (updated as any)?.phone ?? (target as any).phone,
                role: (updated as any)?.role ?? (target as any).role,
                bio: (updated as any)?.bio ?? (target as any).bio,
                avatarUrl: (updated as any)?.avatarUrl ?? (target as any).avatarUrl,
            };
            await logAudit({
                action: 'update_employee',
                entity: 'Employee',
                entityId: employee.id,
                actorId: req.user?.sub || null,
                actorRole: req.user?.role || null,
                meta: { fields: Object.keys(patch) },
            });
            res.json(employee);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Uploads live only in /v1/uploads/*, where keys, MIME types, owners and
    // destinations are validated and authorized. The former /v1/admin/upload/*
    // routes (direct upload, sign, confirm) bypassed those controls and were
    // removed.

    // ========== SETTINGS MANAGEMENT ==========
    router.get('/settings', requireAdmin, async (req, res) => {
        try {
            const settings = await prisma.orm.public.Setting.all();
            const settingsObj: Record<string, any> = {};
            settings.forEach((s) => {
                settingsObj[s.key] = s.value;
            });
            res.json(settingsObj);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.put('/settings/:key', requireAdmin, async (req, res) => {
        try {
            const { value } = req.body;
            const key = req.params.key;
            const setting = await prisma.transaction(async (tx) => {
                const existing = await tx.orm.public.Setting.where({ key }).first();
                if (existing) {
                    return tx.orm.public.Setting.where({ key }).update({ value });
                }
                return tx.orm.public.Setting.create({ key, value, updatedAt: ts() });
            });
            await logAudit({
                action: 'update_setting',
                entity: 'Setting',
                entityId: req.params.key,
                actorId: req.user?.sub || null,
                actorRole: req.user?.role || null
            });
            res.json(setting);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ========== NOTES FOR BOOKINGS ==========
    router.post('/bookings/:id/notes', requireAdminOrStaff, async (req, res) => {
        try {
            const { text } = req.body;
            const note = await prisma.orm.public.Note.create({
                id: newId(),
                bookingId: req.params.id,
                authorId: req.user?.sub ?? null,
                text
            });
            res.json(note);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
}
