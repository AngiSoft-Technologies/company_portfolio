import { Router } from 'express';
import prisma from '../db';
import { generatePresignedPutUrl } from '../services/storage/s3';
import { z } from 'zod';

const router = Router();

const signSchema = z.object({ key: z.string(), contentType: z.string().optional(), size: z.number().optional() });

router.post('/sign', async (req, res) => {
    const parsed = signSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { key, contentType } = parsed.data;
    try {
        const url = await generatePresignedPutUrl(key, contentType || 'application/octet-stream');
        res.json({ url, key });
    } catch (err: any) {
        console.error('Error generating presigned url', err);
        res.status(500).json({ error: 'Unable to generate upload url' });
    }
});

// confirm: client calls this after successful upload to persist metadata
const confirmSchema = z.object({ key: z.string(), filename: z.string(), mime: z.string().optional(), size: z.number().optional(), ownerType: z.string().optional(), ownerId: z.string().optional() });

router.post('/confirm', async (req, res) => {
    const parsed = confirmSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { key, filename, mime, size, ownerType, ownerId } = parsed.data;
    try {
        const url = `${process.env.S3_PUBLIC_BASE_URL || ''}/${key}`.replace(/\\/g, '/');
        const f = await prisma.file.create({ data: { ownerType: ownerType || 'booking', ownerId: ownerId || undefined, filename, url, mime: mime || 'application/octet-stream', size: size || 0, uploadedBy: req.user?.sub || undefined } });
        res.json({ file: f });
    } catch (err: any) {
        console.error('Error confirming upload', err);
        res.status(500).json({ error: 'Unable to confirm upload' });
    }
});

export default function uploadsRouter() {
    return router;
}
