import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import bcrypt from 'bcrypt';
import { checkPasswordStrength } from '../utils/passwordPolicy';

const upload = multer({ dest: 'uploads/' });

export default function staffDashboardRouter(prisma: PrismaClient) {
    const router = Router();

    // All routes require authentication
    router.use(requireAuth);

    // ========== GET CURRENT STAFF PROFILE ==========
    router.get('/profile', async (req: AuthRequest, res) => {
        try {
            const employee = await prisma.employee.findUnique({
                where: { id: req.user?.sub },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    bio: true,
                    avatarUrl: true,
                    username: true,
                    twoFactorEnabled: true,
                    createdAt: true,
                    acceptedAt: true
                }
            });
            if (!employee) return res.status(404).json({ error: 'Employee not found' });
            res.json(employee);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== UPDATE PROFILE ==========
    router.put('/profile', async (req: AuthRequest, res) => {
        try {
            const { firstName, lastName, phone, bio, avatarUrl, username } = req.body;
            const employee = await prisma.employee.update({
                where: { id: req.user?.sub },
                data: { firstName, lastName, phone, bio, avatarUrl, username },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    bio: true,
                    avatarUrl: true,
                    username: true
                }
            });
            res.json(employee);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== CHANGE PASSWORD ==========
    router.post('/profile/password', async (req: AuthRequest, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const employee = await prisma.employee.findUnique({
                where: { id: req.user?.sub },
                select: { passwordHash: true }
            });
            if (!employee || !employee.passwordHash) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            const valid = await bcrypt.compare(currentPassword, employee.passwordHash);
            if (!valid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            const pw = checkPasswordStrength(newPassword);
            if (!pw.ok) {
                return res.status(400).json({ error: 'Password too weak', feedback: pw.feedback });
            }

            const hash = await bcrypt.hash(newPassword, 10);
            await prisma.employee.update({
                where: { id: req.user?.sub },
                data: { passwordHash: hash }
            });

            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== UPLOAD AVATAR ==========
    router.post('/profile/avatar', upload.single('avatar'), async (req: AuthRequest, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No file uploaded' });

            const fileRecord = await prisma.file.create({
                data: {
                    ownerType: 'employee',
                    ownerId: req.user?.sub,
                    filename: file.originalname,
                    url: file.path,
                    mime: file.mimetype,
                    size: file.size,
                    uploadedBy: req.user?.sub
                }
            });

            // Update employee avatar
            await prisma.employee.update({
                where: { id: req.user?.sub },
                data: { avatarUrl: file.path }
            });

            res.json({ file: fileRecord, url: file.path });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== UPLOAD CV/DOCUMENT ==========
    router.post('/profile/documents', upload.single('document'), async (req: AuthRequest, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No file uploaded' });

            const { documentType } = req.body; // 'cv', 'portfolio', etc.

            const fileRecord = await prisma.file.create({
                data: {
                    ownerType: 'employee_document',
                    ownerId: req.user?.sub,
                    filename: file.originalname,
                    url: file.path,
                    mime: file.mimetype,
                    size: file.size,
                    uploadedBy: req.user?.sub
                }
            });

            res.json({ file: fileRecord, url: file.path });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== GET MY SERVICES ==========
    router.get('/services', async (req: AuthRequest, res) => {
        try {
            const services = await prisma.service.findMany({
                where: { authorId: req.user?.sub },
                orderBy: { createdAt: 'desc' }
            });
            res.json(services);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== GET MY PROJECTS ==========
    router.get('/projects', async (req: AuthRequest, res) => {
        try {
            const projects = await prisma.project.findMany({
                where: { authorId: req.user?.sub },
                orderBy: { createdAt: 'desc' }
            });
            res.json(projects);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== GET MY BLOG POSTS ==========
    router.get('/posts', async (req: AuthRequest, res) => {
        try {
            const posts = await prisma.blogPost.findMany({
                where: { authorId: req.user?.sub },
                orderBy: { createdAt: 'desc' }
            });
            res.json(posts);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ========== GET MY ASSIGNED BOOKINGS ==========
    router.get('/bookings', async (req: AuthRequest, res) => {
        try {
            const bookings = await prisma.booking.findMany({
                where: { assignedToId: req.user?.sub },
                include: {
                    client: true,
                    files: true,
                    payments: { orderBy: { createdAt: 'desc' } },
                    notes: { orderBy: { createdAt: 'desc' } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(bookings);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

