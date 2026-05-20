import { Router, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import prisma from '../db';
import { generatePresignedPutUrl } from '../services/storage/s3';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = Router();
const maxUploadSize = 50 * 1024 * 1024;
const allowedMimeTypes = [
    'application/pdf',
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain'
];
const ownerTypes = ['booking', 'client_project', 'project_deliverable', 'project_comment', 'employee', 'employee_document', 'general'] as const;
const signedUploadKeys = new Map<string, number>();
const documentMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'text/plain'
];
const imageMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const adminUploadRoles = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'CONTENT_CREATOR', 'DEVELOPER'];
const documentAdminRoles = ['SUPER_ADMIN', 'ADMIN', 'HR'];

const signSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string(),
    size: z.coerce.number().int().positive().max(maxUploadSize).optional(),
    ownerType: z.enum(ownerTypes).default('general'),
    ownerId: z.string().optional()
});

const confirmSchema = z.object({
    key: z.string().min(1),
    filename: z.string().min(1),
    mime: z.string().optional(),
    size: z.coerce.number().int().nonnegative().max(maxUploadSize).optional(),
    ownerType: z.enum(ownerTypes).default('general'),
    ownerId: z.string().optional()
});


function safeFilename(filename: string) {
    const parsed = path.parse(filename);
    const name = parsed.name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'upload';
    const ext = parsed.ext.replace(/[^a-z0-9.]+/gi, '').slice(0, 12);
    return `${name}${ext}`;
}

function isAdminUploadRole(role?: string) {
    return Boolean(role && adminUploadRoles.includes(role));
}

function isDocumentAdminRole(role?: string) {
    return Boolean(role && documentAdminRoles.includes(role));
}

function safePathSegment(value?: string) {
    if (!value) return undefined;
    const segment = value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return segment || undefined;
}

function safeOwnerId(value?: string) {
    if (!value) return undefined;
    return safePathSegment(value) === value ? value : undefined;
}

function uploadScope(req: AuthRequest, ownerId?: string) {
    return safePathSegment(ownerId) || safePathSegment(req.user?.sub) || 'general';
}

function isPathInside(childPath: string, parentPath: string) {
    const relative = path.relative(parentPath, childPath);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
}

function localStorage(relativeRoot: string, allowedTypes: string[], maxSize: number) {
    return multer({
        storage: multer.diskStorage({
            destination: (req: AuthRequest, file, cb) => {
                const ownerType = ownerTypes.includes(req.body.ownerType) ? req.body.ownerType : 'general';
                const scope = uploadScope(req, req.body.ownerId);
                const uploadRoot = path.resolve(process.cwd(), 'uploads', relativeRoot);
                const directory = path.resolve(uploadRoot, ownerType, scope);
                if (!isPathInside(directory, uploadRoot)) {
                    cb(new Error('Invalid upload destination'), '');
                    return;
                }
                ensureDir(directory);
                cb(null, directory);
            },
            filename: (_req, file, cb) => {
                cb(null, `${crypto.randomUUID()}-${safeFilename(file.originalname)}`);
            }
        }),
        limits: { fileSize: maxSize },
        fileFilter: (_req, file, cb) => {
            if (!allowedTypes.includes(file.mimetype)) {
                cb(new Error('File type not allowed'));
                return;
            }
            cb(null, true);
        }
    });
}

function multerErrorHandler(err: any, _req: AuthRequest, res: any, next: any) {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message || 'Upload failed' });
}

function publicUploadUrl(filePath: string) {
    const relative = path.relative(path.resolve(process.cwd(), 'uploads/public'), filePath).split(path.sep).join('/');
    return `/uploads/public/${relative}`;
}

function privateDownloadUrl(fileId: string) {
    return `/api/uploads/files/${fileId}/download`;
}

async function createLocalFile(req: AuthRequest, visibility: 'public' | 'private', category?: string) {
    if (!req.file) throw new Error('No file uploaded');
    const ownerType = (ownerTypes.includes(req.body.ownerType) ? req.body.ownerType : 'general') as typeof ownerTypes[number];
    const ownerId = safeOwnerId(req.body.ownerId);
    const url = visibility === 'public' ? publicUploadUrl(req.file.path) : '';

    const file = await prisma.file.create({
        data: {
            ownerType,
            ownerId,
            filename: req.file.originalname,
            url,
            mime: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user?.sub || undefined,
            metadata: {
                storage: 'local',
                visibility,
                category: category || req.body.category || (visibility === 'public' ? 'image' : 'document'),
                path: req.file.path
            },
            ...(ownerType === 'client_project' ? { clientProjectId: ownerId } : {}),
            ...(ownerType === 'project_deliverable' ? { deliverableId: ownerId } : {}),
            ...(ownerType === 'project_comment' ? { commentId: ownerId } : {})
        }
    });

    if (visibility === 'private') {
        return prisma.file.update({
            where: { id: file.id },
            data: { url: privateDownloadUrl(file.id) }
        });
    }

    return file;
}
async function canDownloadFile(req: AuthRequest, file: any) {
    if (isDocumentAdminRole(req.user?.role)) return true;
    if (file.uploadedBy && file.uploadedBy === req.user?.sub) return true;
    if (file.ownerType === 'employee_document' || file.ownerType === 'employee') {
        return file.ownerId === req.user?.sub;
    }
    if (file.ownerType === 'general') return false;
    return canAttachToOwner(req, file.ownerType, file.ownerId || undefined);
}

const imageUpload = localStorage('public/images', imageMimeTypes, 5 * 1024 * 1024);
const documentUpload = localStorage('private/documents', documentMimeTypes, 10 * 1024 * 1024);

async function canAttachToOwner(req: AuthRequest, ownerType: typeof ownerTypes[number], ownerId?: string) {
    if (isAdminUploadRole(req.user?.role)) return true;
    if (ownerType === 'general') return true;
    if (!ownerId) return false;

    if (ownerType === 'employee' || ownerType === 'employee_document') {
        return ownerId === req.user?.sub;
    }

    if (ownerType === 'booking') {
        const booking = await prisma.booking.findUnique({ where: { id: ownerId } });
        return booking?.assignedToId === req.user?.sub;
    }

    if (ownerType === 'client_project') {
        const project = await prisma.clientProject.findUnique({
            where: { id: ownerId },
            include: { booking: true }
        });
        return project?.ownerId === req.user?.sub || project?.booking.assignedToId === req.user?.sub;
    }

    if (ownerType === 'project_deliverable') {
        const deliverable = await prisma.projectDeliverable.findUnique({
            where: { id: ownerId },
            include: { project: { include: { booking: true } } }
        });
        return deliverable?.project.ownerId === req.user?.sub || deliverable?.project.booking.assignedToId === req.user?.sub;
    }

    if (ownerType === 'project_comment') {
        const comment = await prisma.projectComment.findUnique({
            where: { id: ownerId },
            include: { project: { include: { booking: true } } }
        });
        return comment?.project.ownerId === req.user?.sub || comment?.project.booking.assignedToId === req.user?.sub;
    }

    return false;
}

function buildStorageKey(ownerType: typeof ownerTypes[number], ownerId: string | undefined, filename: string, userId?: string) {
    const scope = ownerId || userId || 'general';
    return `${ownerType}/${scope}/${crypto.randomUUID()}-${safeFilename(filename)}`;
}

function publicUrlForKey(key: string) {
    const base = process.env.S3_PUBLIC_BASE_URL || '';
    if (!base) return `/${key}`;
    return `${base.replace(/\/+$/g, '')}/${key.replace(/^\/+/, '')}`;
}

router.post('/sign', requireAuth, async (req: AuthRequest, res) => {
    const parsed = signSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

    const { filename, contentType, ownerType, ownerId } = parsed.data;
    if (!allowedMimeTypes.includes(contentType)) return res.status(400).json({ error: 'File type not allowed' });
    if (!await canAttachToOwner(req, ownerType, ownerId)) return res.status(403).json({ error: 'Not allowed for this upload owner' });

    const key = buildStorageKey(ownerType, ownerId, filename, req.user?.sub);
    signedUploadKeys.set(key, Date.now() + 1000 * 60 * 15);
    try {
        const url = await generatePresignedPutUrl(key, contentType);
        res.json({ url, key });
    } catch (err: any) {
        console.error('Error generating presigned url', err);
        res.status(500).json({ error: 'Unable to generate upload url' });
    }
});

router.post('/confirm', requireAuth, async (req: AuthRequest, res) => {
    const parsed = confirmSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

    const { key, filename, mime, size, ownerType, ownerId } = parsed.data;
    if (mime && !allowedMimeTypes.includes(mime)) return res.status(400).json({ error: 'File type not allowed' });
    const signedExpiry = signedUploadKeys.get(key);
    if (!signedExpiry || signedExpiry < Date.now()) return res.status(400).json({ error: 'Upload key was not signed or has expired' });
    signedUploadKeys.delete(key);
    const expectedPrefix = `${ownerType}/${ownerId || req.user?.sub || 'general'}/`;
    if (!key.startsWith(expectedPrefix)) return res.status(400).json({ error: 'Upload key does not match owner scope' });
    if (!await canAttachToOwner(req, ownerType, ownerId)) return res.status(403).json({ error: 'Not allowed for this upload owner' });

    try {
        const url = publicUrlForKey(key);
        const file = await prisma.file.create({
            data: {
                ownerType,
                ownerId: ownerId || undefined,
                filename: safeFilename(filename),
                url,
                mime: mime || 'application/octet-stream',
                size: size || 0,
                uploadedBy: req.user?.sub || undefined,
                ...(ownerType === 'client_project' ? { clientProjectId: ownerId } : {}),
                ...(ownerType === 'project_deliverable' ? { deliverableId: ownerId } : {}),
                ...(ownerType === 'project_comment' ? { commentId: ownerId } : {})
            }
        });
        res.json({ file });
    } catch (err: any) {
        console.error('Error confirming upload', err);
        res.status(500).json({ error: 'Unable to confirm upload' });
    }
});

router.post('/local/image', requireAuth, imageUpload.single('file'), multerErrorHandler, async (req: AuthRequest, res: Response) => {
    const ownerType = (ownerTypes.includes(req.body.ownerType) ? req.body.ownerType : 'general') as typeof ownerTypes[number];
    const ownerId = safeOwnerId(req.body.ownerId);
    if (req.body.ownerId && !ownerId) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Invalid upload owner' });
    }
    if (!isAdminUploadRole(req.user?.role) && !await canAttachToOwner(req, ownerType, ownerId)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(403).json({ error: 'Not allowed for this upload owner' });
    }

    try {
        const file = await createLocalFile(req, 'public', req.body.category || 'image');
        res.json({ file, url: file.url });
    } catch (err: any) {
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('Error saving local image upload', err);
        res.status(500).json({ error: 'Unable to save image upload' });
    }
});

router.post('/local/document', requireAuth, documentUpload.single('file'), multerErrorHandler, async (req: AuthRequest, res: Response) => {
    const ownerType = (ownerTypes.includes(req.body.ownerType) ? req.body.ownerType : 'general') as typeof ownerTypes[number];
    const ownerId = safeOwnerId(req.body.ownerId);
    if (req.body.ownerId && !ownerId) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Invalid upload owner' });
    }
    if (!await canAttachToOwner(req, ownerType, ownerId)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(403).json({ error: 'Not allowed for this upload owner' });
    }

    try {
        const file = await createLocalFile(req, 'private', req.body.category || 'document');
        res.json({ file, url: file.url });
    } catch (err: any) {
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('Error saving local document upload', err);
        res.status(500).json({ error: 'Unable to save document upload' });
    }
});

router.get('/files/:fileId/download', requireAuth, async (req: AuthRequest, res) => {
    const file = await prisma.file.findUnique({ where: { id: req.params.fileId } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!await canDownloadFile(req, file)) return res.status(403).json({ error: 'Not allowed to download this file' });

    const metadata = file.metadata as { path?: string; visibility?: string } | null;
    const privateRoot = path.resolve(process.cwd(), 'uploads/private');
    const localPath = metadata?.path ? path.resolve(metadata.path) : null;
    if (!localPath || !isPathInside(localPath, privateRoot)) {
        return res.status(404).json({ error: 'Private file not found' });
    }

    res.download(localPath, file.filename);
});

export default function uploadsRouter() {
    return router;
}
