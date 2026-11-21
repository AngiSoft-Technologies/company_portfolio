import { Router } from 'express';
import type { Db } from '../../db';
import { ts, newId } from '../../prisma/db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import multer from 'multer';
import { generatePresignedPutUrl } from '../../modules/files/services/storage/s3';

const upload = multer({ dest: 'uploads/' });

export default function adminRouter(prisma: Db) {
    const router = Router();

    // All routes require authentication
    router.use(requireAuth);

    // Helper to check admin role
    const requireAdmin = (req: AuthRequest, res: any, next: any) => {
        if (req.user?.role !== 'ADMIN') {
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
            res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/employees/:id', requireAdmin, async (req, res) => {
        try {
            const { firstName, lastName, email, phone, role, bio, avatarUrl } = req.body;
            const updated = await prisma.orm.public.Employee.where({ id: req.params.id }).update({
                firstName,
                lastName,
                email,
                phone,
                role: role as any,
                bio,
                avatarUrl,
            });
            const employee = {
                id: (updated as any)?.id,
                firstName: (updated as any)?.firstName,
                lastName: (updated as any)?.lastName,
                email: (updated as any)?.email,
                phone: (updated as any)?.phone,
                role: (updated as any)?.role,
                bio: (updated as any)?.bio,
                avatarUrl: (updated as any)?.avatarUrl
            };
            await logAudit({
                action: 'update_employee',
                entity: 'Employee',
                entityId: employee.id,
                actorId: req.user?.sub || null,
                actorRole: req.user?.role || null
            });
            res.json(employee);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== FILE UPLOADS ==========
    router.post('/upload', requireAdminOrStaff, upload.single('file'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No file uploaded' });

            // File validation
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                return res.status(400).json({ error: 'File size exceeds 10MB limit' });
            }

            // Validate file type based on category
            const { ownerType, ownerId, category } = req.body;
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

            if (category === 'avatar' || category === 'image' || category === 'logo') {
                if (!allowedImageTypes.includes(file.mimetype)) {
                    return res.status(400).json({ error: 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP' });
                }
            }
            if (category === 'cv' || category === 'document') {
                if (!allowedDocTypes.includes(file.mimetype) && !allowedImageTypes.includes(file.mimetype)) {
                    return res.status(400).json({ error: 'Invalid document type. Allowed: PDF, DOC, DOCX, or images' });
                }
            }

            // For now, save to local uploads (in production, use S3/R2)
            const fileRecord = await prisma.orm.public.File.create({
                id: newId(),
                ownerType: ownerType || 'general',
                ownerId: ownerId || null,
                filename: file.originalname,
                url: file.path,
                mime: file.mimetype,
                size: file.size,
                uploadedBy: req.user?.sub || null
            });

            res.json({ file: fileRecord, url: file.path });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/upload/sign', requireAdminOrStaff, async (req, res) => {
        try {
            const { key, contentType, category } = req.body;
            const url = await generatePresignedPutUrl(key, contentType || 'application/octet-stream');
            res.json({ url, key });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/upload/confirm', requireAdminOrStaff, async (req, res) => {
        try {
            const { key, filename, mime, size, ownerType, ownerId, category } = req.body;
            const url = `${process.env.S3_PUBLIC_BASE_URL || ''}/${key}`.replace(/\\/g, '/');
            const file = await prisma.orm.public.File.create({
                id: newId(),
                ownerType: ownerType || 'general',
                ownerId: ownerId || null,
                filename,
                url,
                mime: mime || 'application/octet-stream',
                size: size || 0,
                uploadedBy: req.user?.sub || null
            });
            res.json({ file });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

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
            res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
