import { Router } from 'express';
import type { Db } from '../../../db';
import { newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import multer from 'multer';
import bcrypt from 'bcrypt';
import { checkPasswordStrength } from '../../../modules/identity/utils/passwordPolicy';
import { getEffectivePermissions } from '../../../modules/identity/services/effectivePermissions';
import { PERMISSION_CATALOGUE } from './staff-access';

const upload = multer({ dest: 'uploads/' });

const profileSelectFields = [
    'id',
    'firstName',
    'lastName',
    'email',
    'phone',
    'role',
    'bio',
    'avatarUrl',
    'username',
    'publicTitle',
    'publicSummary',
    'location',
    'websiteUrl',
    'linkedinUrl',
    'twitterUrl',
    'githubUrl',
    'skills',
    'specialties',
    'publicEmail',
    'publicPhone',
    'profilePublished',
    'profileOrder',
    'twoFactorEnabled',
    'createdAt',
    'acceptedAt',
] as const;

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

const metadataObject = (value: any) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
};

/** Project a full Employee row down to the profile-select shape (P7 `select`). */
const projectProfile = (row: any) => ({
    id: row?.id,
    firstName: row?.firstName,
    lastName: row?.lastName,
    email: row?.email,
    phone: row?.phone,
    role: row?.role,
    bio: row?.bio,
    avatarUrl: row?.avatarUrl,
    username: row?.username,
    publicTitle: row?.publicTitle,
    publicSummary: row?.publicSummary,
    location: row?.location,
    websiteUrl: row?.websiteUrl,
    linkedinUrl: row?.linkedinUrl,
    twitterUrl: row?.twitterUrl,
    githubUrl: row?.githubUrl,
    skills: row?.skills,
    specialties: row?.specialties,
    publicEmail: row?.publicEmail,
    publicPhone: row?.publicPhone,
    profilePublished: row?.profilePublished,
    profileOrder: row?.profileOrder,
    twoFactorEnabled: row?.twoFactorEnabled,
    createdAt: row?.createdAt,
    acceptedAt: row?.acceptedAt,
});

export default function staffDashboardRouter(prisma: Db) {
    const router = Router();

    router.use(requireAuth);

    // Effective permissions projection for the staff dashboard widget matrix.
    router.get('/permissions', async (req: AuthRequest, res) => {
        try {
            const employeeId = req.user?.sub;
            if (!employeeId) return res.status(401).json({ error: 'Not authenticated' });
            const result = await getEffectivePermissions({ employeeId, systemRole: req.user?.role });
            // A key is "granted" only if its highest-precedence effect is GRANT
            // (DENY entries also live in the map but must be excluded).
            const granted: string[] = [];
            for (const [key, perm] of result.entries()) {
                if (perm.effect === 'GRANT') granted.push(key);
            }
            const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || granted.includes('*');
            const permissions = isSuperAdmin
                ? PERMISSION_CATALOGUE.map((entry) => entry.key)
                : granted.filter((key) => key !== '*');
            res.json({ permissions, isSuperAdmin });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/profile', async (req: AuthRequest, res) => {
        try {
            const employee = await prisma.orm.public.Employee
                .where({ id: req.user?.sub as string })
                .select(...profileSelectFields)
                .first();
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

            const updated = await prisma.orm.public.Employee.where({ id: req.user?.sub as string }).update({
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
            });
            res.json(projectProfile(updated));
        } catch (err: any) {
            if (err.code === 'P2002' || err.code === '23505') {
                return res.status(409).json({ error: 'Username is already in use' });
            }
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/profile/password', async (req: AuthRequest, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const employee = await prisma.orm.public.Employee
                .where({ id: req.user?.sub as string })
                .select('passwordHash')
                .first();
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
            await prisma.orm.public.Employee.where({ id: req.user?.sub as string }).update({ passwordHash: hash });

            res.json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/profile/avatar', upload.single('avatar'), async (req: AuthRequest, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No file uploaded' });

            const fileRecord = await prisma.orm.public.File.create({
                id: newId(),
                ownerType: 'employee',
                ownerId: req.user?.sub ?? null,
                filename: file.originalname,
                url: file.path,
                mime: file.mimetype,
                size: file.size,
                uploadedBy: req.user?.sub ?? null,
            });

            await prisma.orm.public.Employee.where({ id: req.user?.sub as string }).update({
                avatarUrl: file.path,
            });

            res.json({ file: fileRecord, url: file.path });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/profile/documents', async (req: AuthRequest, res) => {
        try {
            const documents = await prisma.orm.public.File
                .where({ ownerType: 'employee_document', ownerId: req.user?.sub as string })
                .orderBy((f) => f.createdAt.desc())
                .all();
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

            const fileRecord = await prisma.orm.public.File.create({
                id: newId(),
                ownerType: 'employee_document',
                ownerId: req.user?.sub ?? null,
                filename: file.originalname,
                url: file.path,
                mime: file.mimetype,
                size: file.size,
                uploadedBy: req.user?.sub ?? null,
                metadata: {
                    documentType,
                    label: label || file.originalname,
                    public: isPublic === true || isPublic === 'true',
                },
            });

            res.json({ file: fileRecord, url: file.path });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/profile/documents/:fileId', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.File
                .where({ id: req.params.fileId })
                .where({ ownerType: 'employee_document', ownerId: req.user?.sub as string })
                .first();
            if (!existing) return res.status(404).json({ error: 'Document not found' });

            const { documentType, label, isPublic } = req.body;
            const existingMetadata = metadataObject(existing.metadata);
            const file = await prisma.orm.public.File.where({ id: existing.id }).update({
                metadata: {
                    ...existingMetadata,
                    documentType: documentType || existingMetadata.documentType || 'document',
                    label: label || existingMetadata.label || existing.filename,
                    public: isPublic === true || isPublic === 'true',
                },
            });
            res.json(file);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/profile/documents/:fileId', async (req: AuthRequest, res) => {
        try {
            const existing = await prisma.orm.public.File
                .where({ id: req.params.fileId })
                .where({ ownerType: 'employee_document', ownerId: req.user?.sub as string })
                .first();
            if (!existing) return res.status(404).json({ error: 'Document not found' });
            await prisma.orm.public.File.where({ id: existing.id }).delete();
            res.status(204).send();
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/services', async (req: AuthRequest, res) => {
        try {
            const services = await prisma.orm.public.Service
                .where({ authorId: req.user?.sub as string })
                .orderBy((s) => s.createdAt.desc())
                .all();
            res.json(services);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/projects', async (req: AuthRequest, res) => {
        try {
            const projects = await prisma.orm.public.Project
                .where({ authorId: req.user?.sub as string })
                .orderBy((p) => p.createdAt.desc())
                .all();
            res.json(projects);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/posts', async (req: AuthRequest, res) => {
        try {
            const posts = await prisma.orm.public.BlogPost
                .where({ authorId: req.user?.sub as string })
                .orderBy((p) => p.createdAt.desc())
                .all();
            res.json(posts);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/bookings', async (req: AuthRequest, res) => {
        try {
            const bookings = await prisma.orm.public.Booking
                .where({ assignedToId: req.user?.sub as string })
                .include('client')
                .include('files')
                .include('payments', (p) => p.orderBy((p2) => p2.createdAt.desc()))
                .include('notes', (n) => n.orderBy((n2) => n2.createdAt.desc()))
                .orderBy((b) => b.createdAt.desc())
                .all();
            res.json(bookings);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
