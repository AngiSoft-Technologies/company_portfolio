import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requirePermission, requireRoles } from '../../../shared/middleware/roles';
import { gContactLimiter } from '../../../shared/middleware/rateLimiter';
import db, { type Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { or } from '@prisma/orm-postgres/orm-client';

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

const countOf = (query: any) => query.aggregate((a: any) => ({ n: a.count() })).then((r: any) => r.n);

export default function contactEnquiriesRouter(prisma: Db = db) {
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
                const svc = await prisma.orm.public.Service
                    .where({ slug: data.serviceSlug })
                    .select('id')
                    .first();
                serviceId = svc?.id;
            }
            if (!productId && data.productSlug) {
                const prd = await prisma.orm.public.Product
                    .where({ slug: data.productSlug })
                    .select('id')
                    .first();
                productId = prd?.id;
            }
            if (data.bookingReference) {
                const booking = await prisma.orm.public.Booking
                    .where({ publicReference: data.bookingReference })
                    .select('id')
                    .first();
                bookingId = booking?.id;
            }

            const enquiry = await prisma.orm.public.ContactEnquiry.create({
                id: newId(),
                updatedAt: ts(),
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
        let query: any = prisma.orm.public.ContactEnquiry;
        if (status) query = query.where({ status: String(status) });
        if (search) {
            const pattern = `%${search}%`;
            query = query.where((e: any) => or(
                e.name.ilike(pattern),
                e.email.ilike(pattern),
                e.subject.ilike(pattern),
                e.publicReference.ilike(pattern)
            ));
        }
        const enquiries = await query
            .orderBy((e: any) => e.createdAt.desc())
            .include('service', (sv: any) => sv.select('id', 'title', 'slug'))
            .include('product', (p: any) => p.select('id', 'name', 'slug'))
            .all();
        res.json(enquiries);
    });

    // Admin: stats
    router.get('/stats', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (_req: AuthRequest, res) => {
        const [total, newCount, inReview] = await Promise.all([
            countOf(prisma.orm.public.ContactEnquiry),
            countOf(prisma.orm.public.ContactEnquiry.where({ status: 'new' })),
            countOf(prisma.orm.public.ContactEnquiry.where({ status: 'in_review' })),
        ]);
        res.json({ total, new: newCount, inReview });
    });

    // Admin: single + update
    router.get('/:id', requireAuth, requireRoles('ADMIN', 'MARKETING', 'SALES'), async (req: AuthRequest, res) => {
        const enquiry = await prisma.orm.public.ContactEnquiry
            .where({ id: req.params.id })
            .include('service', (sv: any) => sv.select('id', 'title', 'slug'))
            .include('product', (p: any) => p.select('id', 'name', 'slug'))
            .first();
        if (!enquiry) return res.status(404).json({ error: 'Not found' });
        res.json(enquiry);
    });

    // Public-scoped admin list: ADMIN + SUPER_ADMIN only (raw ContactEnquiry rows, no
    // service/product includes). Used by the enquiry admin dashboard's raw view.
    router.get('/admin', requireAuth, requireRoles('ADMIN', 'SUPER_ADMIN'), async (_req: AuthRequest, res) => {
        const enquiries = await prisma.orm.public.ContactEnquiry
            .select('id', 'name', 'email', 'subject', 'message', 'enquiryType', 'status', 'assigneeId', 'createdAt')
            .orderBy((e: any) => e.createdAt.desc())
            .all();
        res.json(enquiries);
    });

    const adminUpdateSchema = z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedStaffId: z.string().nullable().optional(),
        respondedAt: z.string().nullable().optional(),
    });

    router.put('/:id', requireAuth, requirePermission('enquiries.respond'), async (req: AuthRequest, res) => {
        const parsed = adminUpdateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const existing = await prisma.orm.public.ContactEnquiry.where({ id: req.params.id }).first();
            if (!existing) return res.status(404).json({ error: 'Not found' });
            const isPrivileged = ['ADMIN', 'MARKETING', 'SALES', 'SUPER_ADMIN'].includes(req.user?.role ?? '');
            if (!isPrivileged && existing.assignedStaffId !== req.user?.sub) {
                return res.status(403).json({ error: 'Not assigned to this enquiry' });
            }
            const payload: any = {};
            for (const [k, v] of Object.entries(parsed.data)) {
                if (v === undefined) continue;
                payload[k] = v;
            }
            if (parsed.data.respondedAt) payload.respondedAt = ts(parsed.data.respondedAt);
            const enquiry = await prisma.orm.public.ContactEnquiry.where({ id: req.params.id }).update(payload);
            res.json(enquiry);
        } catch {
            res.status(404).json({ error: 'Not found' });
        }
    });

    return router;
}
