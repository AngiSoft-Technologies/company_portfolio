import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { logAudit } from '../services/audit';
import multer from 'multer';
import { generatePresignedPutUrl } from '../services/storage/s3';

const upload = multer({ dest: 'uploads/' });

export default function adminRouter(prisma: PrismaClient) {
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
                prisma.booking.count(),
                prisma.booking.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
                prisma.service.count({ where: { published: true } }),
                prisma.project.count({ where: { published: true } }),
                prisma.employee.count({ where: { acceptedAt: { not: null } } }),
                prisma.client.count(),
                prisma.booking.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: { client: { select: { name: true, email: true } } }
                })
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
            const where: any = {};
            if (status) where.status = status;

            const [bookings, total] = await Promise.all([
                prisma.booking.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        client: true,
                        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
                        files: true,
                        payments: { orderBy: { createdAt: 'desc' } }
                    }
                }),
                prisma.booking.count({ where })
            ]);

            res.json({ bookings, total, page: Number(page), limit: Number(limit) });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/bookings/:id', requireAdminOrStaff, async (req, res) => {
        try {
            const booking = await prisma.booking.findUnique({
                where: { id: req.params.id },
                include: {
                    client: true,
                    assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
                    files: true,
                    payments: { orderBy: { createdAt: 'desc' } },
                    notes: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            res.json(booking);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== STAFF/EMPLOYEES MANAGEMENT ==========
    router.get('/employees', requireAdmin, async (req, res) => {
        try {
            const employees = await prisma.employee.findMany({
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    bio: true,
                    avatarUrl: true,
                    acceptedAt: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(employees);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/employees/:id', requireAdmin, async (req, res) => {
        try {
            const { firstName, lastName, email, phone, role, bio, avatarUrl } = req.body;
            const employee = await prisma.employee.update({
                where: { id: req.params.id },
                data: { firstName, lastName, email, phone, role, bio, avatarUrl },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    bio: true,
                    avatarUrl: true
                }
            });
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
            const fileRecord = await prisma.file.create({
                data: {
                    ownerType: ownerType || 'general',
                    ownerId: ownerId || undefined,
                    filename: file.originalname,
                    url: file.path,
                    mime: file.mimetype,
                    size: file.size,
                    uploadedBy: req.user?.sub || undefined
                }
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
            const file = await prisma.file.create({
                data: {
                    ownerType: ownerType || 'general',
                    ownerId: ownerId || undefined,
                    filename,
                    url,
                    mime: mime || 'application/octet-stream',
                    size: size || 0,
                    uploadedBy: req.user?.sub || undefined
                }
            });
            res.json({ file });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== SETTINGS MANAGEMENT ==========
    router.get('/settings', requireAdmin, async (req, res) => {
        try {
            const settings = await prisma.setting.findMany();
            const settingsObj: any = {};
            settings.forEach(s => {
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
            const setting = await prisma.setting.upsert({
                where: { key: req.params.key },
                update: { value },
                create: { key: req.params.key, value }
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
            const note = await prisma.note.create({
                data: {
                    bookingId: req.params.id,
                    authorId: req.user?.sub || undefined,
                    text
                }
            });
            res.json(note);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

