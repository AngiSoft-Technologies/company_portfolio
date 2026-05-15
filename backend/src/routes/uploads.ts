import { Router } from 'express';
import crypto from 'crypto';
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

async function canAttachToOwner(req: AuthRequest, ownerType: typeof ownerTypes[number], ownerId?: string) {
    if (req.user?.role === 'ADMIN' || req.user?.role === 'MARKETING') return true;
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

export default function uploadsRouter() {
    return router;
}
