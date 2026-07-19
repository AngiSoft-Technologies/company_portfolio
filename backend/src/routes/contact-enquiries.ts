import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';
import { gContactLimiter } from '../middleware/rateLimiter';
import prisma from '../db';

/**
 * Public contact-enquiry submission.
 *
 * The old contact form faked success with a client-side timeout. This route is
 * the real sink: it validates, persists a ContactEnquiry, and returns a
 * tracking reference only after the row is actually written. Frontend success
 * is shown strictly on response.ok.
 *
 * Anti-spam: a hidden honeypot field (must be empty), a client-furnished form
 * timestamp used to reject instant/bot submissions, plus a per-IP rate limiter.
 */

const ENQUIRY_TYPES = [
    'service',
    'product',
    'pricing',
    'support',
    'partnership',
    'careers',
    'general',
] as const;

const RESPONSE_METHODS = ['email', 'phone', 'whatsapp'] as const;

const MAX_MESSAGE = 5000;
const MIN_MESSAGE = 10;

const createSchema = z.object({
    name: z.string().trim().min(2, 'Please enter your name').max(120),
    email: z.string().trim().email('Enter a valid email address').max(160),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    preferredResponseMethod: z.enum(RESPONSE_METHODS).default('email'),

    enquiryType: z.enum(ENQUIRY_TYPES, {
        errorMap: () => ({ message: 'Choose an enquiry type' }),
    }),
    subject: z.string().trim().min(2, 'Add a short subject').max(160),
    message: z.string().trim().min(MIN_MESSAGE, 'Tell us a bit more (at least 10 characters)').max(MAX_MESSAGE),

    serviceId: z.string().optional().or(z.literal('')),
    serviceSlug: z.string().optional().or(z.literal('')),
    productId: z.string().optional().or(z.literal('')),
    productSlug: z.string().optional().or(z.literal('')),
    bookingReference: z.string().optional().or(z.literal('')),
    organisation: z.string().trim().max(160).optional().or(z.literal('')),

    source: z.string().optional().or(z.literal('')),
    sourcePath: z.string().optional().or(z.literal('')),

    // Honeypot + timing (not stored)
    company: z.string().optional().or(z.literal('')), // honeypot, must stay empty
    formStartedAt: z.number().optional(),
});

const generatePublicReference = () => {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `ANG-${year}-${rand}`;
};

function isSpam(payload: any): { spam: boolean; reason?: string } {
    if (payload.company && payload.company.length > 0) {
        return { spam: true, reason: 'honeypot' };
    }
    if (typeof payload.formStartedAt === 'number') {
        const elapsed = Date.now() - payload.formStartedAt;
        // Sub-second submissions are almost always bots.
        if (elapsed < 800) return { spam: true, reason: 'too_fast' };
    }
    return { spam: false };
}

function getClientIp(req: any): string {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string') return xff.split(',')[0].trim();
    return req.ip || 'unknown';
}

export default function contactEnquiriesRouter() {
    const router = Router();

    // Public submission
    router.post('/', gContactLimiter, async (req, res) => {
        try {
            const parsed = createSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: 'Validation failed',
                    fields: parsed.error.flatten().fieldErrors,
                });
            }
            const data = parsed.data;

            const spam = isSpam(data);
            if (spam.spam) {
                // Pretend success to waste bot time, but do not persist.
                return res.status(201).json({
                    enquiry: {
                        id: 'ignored',
                        publicReference: 'ANG-IGNORED',
                        status: 'spam',
                        createdAt: new Date().toISOString(),
                    },
                    message: 'Your enquiry has been received.',
                });
            }

            const publicReference = generatePublicReference();

            // Resolve service/product references by slug where provided.
            let serviceId: string | undefined = data.serviceId || undefined;
            let productId: string | undefined = data.productId || undefined;
            let bookingId: string | undefined;

            if (!serviceId && data.serviceSlug) {
                const svc = await prisma.service.findUnique({
                    where: { slug: data.serviceSlug },
                    select: { id: true },
                });
                serviceId = svc?.id;
            }
            if (!productId && data.productSlug) {
                const prd = await prisma.product.findUnique({
                    where: { slug: data.productSlug },
                    select: { id: true },
                });
                productId = prd?.id;
            }
            if (data.bookingReference) {
                const booking = await prisma.booking.findFirst({
                    where: { publicReference: data.bookingReference },
                    select: { id: true },
                });
                bookingId = booking?.id;
            }

            const enquiry = await prisma.contactEnquiry.create({
                data: {
                    publicReference,
                    name: data.name,
                    email: data.email,
                    phone: data.phone || null,
                    preferredResponseMethod: data.preferredResponseMethod,
                    enquiryType: data.enquiryType,
                    subject: data.subject,
                    message: data.message,
                    serviceId: serviceId || null,
                    productId: productId || null,
                    bookingId: bookingId || null,
                    bookingReference: data.bookingReference || null,
                    organisation: data.organisation || null,
                    source: data.source || null,
                    sourcePath: data.sourcePath || null,
                    status: 'new',
                    priority: data.enquiryType === 'support' ? 'high' : 'normal',
                },
            });

            return res.status(201).json({
                enquiry: {
                    id: enquiry.id,
                    publicReference: enquiry.publicReference,
                    status: enquiry.status,
                    createdAt: enquiry.createdAt,
                },
                message: 'Your enquiry has been received.',
            });
        } catch (err) {
            console.error('contact-enquiry submit error', err);
            return res.status(500).json({ error: 'Could not save your enquiry. Please try again.' });
        }
    });

    // Admin: list enquiries
    router.get('/', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (req: AuthRequest, res) => {
        const { status, search } = req.query;
        const where: any = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } },
                { subject: { contains: search as string, mode: 'insensitive' } },
                { publicReference: { contains: search as string, mode: 'insensitive' } },
            ];
        }
        const enquiries = await prisma.contactEnquiry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                service: { select: { id: true, title: true, slug: true } },
                product: { select: { id: true, name: true, slug: true } },
            },
        });
        res.json(enquiries);
    });

    // Admin: stats
    router.get('/stats', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (_req: AuthRequest, res) => {
        const [total, newCount, inReview] = await Promise.all([
            prisma.contactEnquiry.count(),
            prisma.contactEnquiry.count({ where: { status: 'new' } }),
            prisma.contactEnquiry.count({ where: { status: 'in_review' } }),
        ]);
        res.json({ total, new: newCount, inReview });
    });

    // Admin: single + update
    router.get('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (req: AuthRequest, res) => {
        const enquiry = await prisma.contactEnquiry.findUnique({
            where: { id: req.params.id },
            include: {
                service: { select: { id: true, title: true, slug: true } },
                product: { select: { id: true, name: true, slug: true } },
            },
        });
        if (!enquiry) return res.status(404).json({ error: 'Not found' });
        res.json(enquiry);
    });

    const adminUpdateSchema = z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedStaffId: z.string().nullable().optional(),
        respondedAt: z.string().nullable().optional(),
    });

    router.put('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (req: AuthRequest, res) => {
        const parsed = adminUpdateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const enquiry = await prisma.contactEnquiry.update({
                where: { id: req.params.id },
                data: {
                    ...parsed.data,
                    respondedAt: parsed.data.respondedAt ? new Date(parsed.data.respondedAt) : undefined,
                },
            });
            res.json(enquiry);
        } catch {
            res.status(404).json({ error: 'Not found' });
        }
    });

    return router;
}
