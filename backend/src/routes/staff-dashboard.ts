import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import bcrypt from 'bcrypt';
import { checkPasswordStrength } from '../utils/passwordPolicy';

const upload = multer({ dest: 'uploads/' });

const profileSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    role: true,
    bio: true,
    avatarUrl: true,
    username: true,
    publicTitle: true,
    publicSummary: true,
    location: true,
    websiteUrl: true,
    linkedinUrl: true,
    twitterUrl: true,
    githubUrl: true,
    skills: true,
    specialties: true,
    publicEmail: true,
    publicPhone: true,
    profilePublished: true,
    profileOrder: true,
    twoFactorEnabled: true,
    createdAt: true,
    acceptedAt: true,
};

const normalizeStringArray = (value: unknown) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
};

const normalizeOptionalUrl = (value: unknown) => {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    try {
        return new URL(text).toString();
    } catch {
        throw new Error('Invalid URL');
    }
};

const normalizeUsername = (value: unknown) => {
    if (!value) return null;
    const username = String(value).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(username)) {
        throw new Error('Username must be 3-40 characters and contain only letters, numbers, underscores, or hyphens');
    }
    return username;
};

const metadataObject = (value: Prisma.JsonValue | null | undefined) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
};

export default function staffDashboardRouter(prisma: PrismaClient) {
    const router = Router();

    router.use(requireAuth);

    router.get('/profile', async (req: AuthRequest, res) => {
        try {
            const employee = await prisma.employee.findUnique({
                where: { id: req.user?.sub },
                select: profileSelect,
            });
            if (!employee) return res.status(404).json({ error: 'Employee not found' });
            res.json(employee);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/profile', async (req: AuthRequest, res) => {
        try {
            const {
                firstName,
                lastName,
                phone,
                bio,
                avatarUrl,
                username,
                publicTitle,
                publicSummary,
                location,
                websiteUrl,
                linkedinUrl,
                twitterUrl,
                githubUrl,
                skills,
                specialties,
                publicEmail,
                publicPhone,
                profilePublished,
            } = req.body;

            const employee = await prisma.employee.update({
                where: { id: req.user?.sub },
                data: {
                    firstName,
                    lastName,
                    phone,
                    bio,
                    avatarUrl,
                    username: normalizeUsername(username),
                    publicTitle,
                    publicSummary,
                    location,
                    websiteUrl: normalizeOptionalUrl(websiteUrl),
                    linkedinUrl: normalizeOptionalUrl(linkedinUrl),
                    twitterUrl: normalizeOptionalUrl(twitterUrl),
                    githubUrl: normalizeOptionalUrl(githubUrl),
                    skills: normalizeStringArray(skills),
                    specialties: normalizeStringArray(specialties),
                    publicEmail,
                    publicPhone,
                    profilePublished: profilePublished !== false,
                },
                select: profileSelect,
            });
            res.json(employee);
        } catch (err: any) {
            if (err.code === 'P2002') {
                return res.status(409).json({ error: 'Username is already in use' });
            }
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/profile/password', async (req: AuthRequest, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const employee = await prisma.employee.findUnique({
                where: { id: req.user?.sub },
                select: { passwordHash: true },
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
                data: { passwordHash: hash },
            });

            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

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
                    uploadedBy: req.user?.sub,
                },
            });

            await prisma.employee.update({
                where: { id: req.user?.sub },
                data: { avatarUrl: file.path },
            });

            res.json({ file: fileRecord, url: file.path });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/profile/documents', async (req: AuthRequest, res) => {
        try {
            const documents = await prisma.file.findMany({
                where: {
                    ownerType: 'employee_document',
                    ownerId: req.user?.sub,
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json(documents);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/profile/documents', upload.single('document'), async (req: AuthRequest, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No file uploaded' });

            const { documentType = 'document', label, isPublic } = req.body;

            const fileRecord = await prisma.file.create({
                data: {
                    ownerType: 'employee_document',
                    ownerId: req.user?.sub,
                    filename: file.originalname,
                    url: file.path,
                    mime: file.mimetype,
                    size: file.size,
                    uploadedBy: req.user?.sub,
                    metadata: {
                        documentType,
                        label: label || file.originalname,
                        public: isPublic === true || isPublic === 'true',
                    },
                },
            });

            res.json({ file: fileRecord, url: file.path });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/profile/documents/:fileId', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.file.findFirst({
                where: {
                    id: req.params.fileId,
                    ownerType: 'employee_document',
                    ownerId: req.user?.sub,
                },
            });
            if (!existing) return res.status(404).json({ error: 'Document not found' });

            const { documentType, label, isPublic } = req.body;
            const existingMetadata = metadataObject(existing.metadata);
            const file = await prisma.file.update({
                where: { id: existing.id },
                data: {
                    metadata: {
                        ...existingMetadata,
                        documentType: documentType || existingMetadata.documentType || 'document',
                        label: label || existingMetadata.label || existing.filename,
                        public: isPublic === true || isPublic === 'true',
                    },
                },
            });
            res.json(file);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/profile/documents/:fileId', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.file.findFirst({
                where: {
                    id: req.params.fileId,
                    ownerType: 'employee_document',
                    ownerId: req.user?.sub,
                },
            });
            if (!existing) return res.status(404).json({ error: 'Document not found' });
            await prisma.file.delete({ where: { id: existing.id } });
            res.status(204).send();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/services', async (req: AuthRequest, res) => {
        try {
            const services = await prisma.service.findMany({
                where: { authorId: req.user?.sub },
                orderBy: { createdAt: 'desc' },
            });
            res.json(services);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/projects', async (req: AuthRequest, res) => {
        try {
            const projects = await prisma.project.findMany({
                where: { authorId: req.user?.sub },
                orderBy: { createdAt: 'desc' },
            });
            res.json(projects);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/posts', async (req: AuthRequest, res) => {
        try {
            const posts = await prisma.blogPost.findMany({
                where: { authorId: req.user?.sub },
                orderBy: { createdAt: 'desc' },
            });
            res.json(posts);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/bookings', async (req: AuthRequest, res) => {
        try {
            const bookings = await prisma.booking.findMany({
                where: { assignedToId: req.user?.sub },
                include: {
                    client: true,
                    files: true,
                    payments: { orderBy: { createdAt: 'desc' } },
                    notes: { orderBy: { createdAt: 'desc' } },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json(bookings);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
