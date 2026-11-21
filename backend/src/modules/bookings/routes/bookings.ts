import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { has as hasPermission } from '../../identity/services/effectivePermissions';
import { requireAccess } from '../../../shared/middleware/roles';
import { createClientProjectFromBooking } from '../../../modules/projects/services/clientProjects';
import { logAudit } from '../../../shared/services/audit';
import { generatePublicReference, generateTrackingToken } from '../../../modules/bookings/services/bookingReference';
import { logBookingEvent, BOOKING_EVENT_TYPES, EVENT_VISIBILITY } from '../../../modules/bookings/services/bookingEvents';
import { toMoney } from '../../billing/utils/money';
import { createNotification } from '../../notifications/services/notifications';
import { publicFormLimiter } from '../../../shared/middleware/rateLimiter';
import { sendMail } from '../../../shared/services/email';
import { signBookingAccessToken, verifyBookingAccessToken } from '../../identity/utils/token';
// stripe types may not be available until dependency is installed; keep runtime require below

const BOOKING_UPLOAD_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => {
        if (BOOKING_UPLOAD_MIME_TYPES.has(file.mimetype)) cb(null, true);
        else cb(new Error('Unsupported file type'));
    },
});
const bookingUpload = (req: any, res: any, next: any) =>
    upload.array('files', 5)(req, res, (err: any) =>
        err ? res.status(400).json({ error: 'Upload failed' }) : next());

const stripeSecret = process.env.STRIPE_SECRET || '';
let stripe: any = null;
if (stripeSecret) {
    // require at runtime so CI/dev can install stripe when needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    stripe = new Stripe(stripeSecret, { apiVersion: '2024-11-15' });
}

// ─── Allowed booking source values (validated server-side) ─────
export const SOURCE_VALUES = [
    'direct',
    'services-list',
    'service-detail',
    'pricing',
    'product-detail',
    'contact',
    'custom-cta',
    'repeat-booking',
] as const;

const PROJECT_TYPES = [
    'SOFTWARE', 'DATA_ANALYSIS', 'CYBER_SERVICE', 'ADVERTISING',
    'INTERNET_SERVICE', 'ENTERTAINMENT', 'RESUME', 'DOCUMENT_EDIT',
    'REPORT', 'OTHER',
] as const;

const optionalMoney = z.preprocess(
    (value) => value === '' || value === null || value === undefined ? undefined : Number(value),
    z.number().finite().nonnegative().optional(),
);
const optionalBoolean = z.preprocess(
    (value) => value === true || value === 'true' || value === '1' ? true
        : value === false || value === 'false' || value === '0' ? false : undefined,
    z.boolean().optional(),
);
const optionalDate = z.preprocess(
    (value) => value === '' || value === null || value === undefined ? undefined : value,
    z.string().max(50).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date').optional(),
);

/** Allowlist for public booking submission. Unknown fields are stripped, never persisted. */
const publicBookingSchema = z.object({
    name: z.string().max(200).optional().default(''),
    email: z.string().email().max(254),
    phone: z.string().max(50).optional().default(''),
    title: z.string().min(1).max(300),
    description: z.string().max(20000).optional().default(''),
    projectType: z.string().max(50).optional(),
    details: z.unknown().optional(),
    depositRequired: optionalBoolean,
    depositAmount: optionalMoney,
    currency: z.string().min(3).max(3).optional().default('KES'),
    source: z.enum(SOURCE_VALUES).optional().default('direct'),
    sourcePath: z.string().max(500).optional(),
    referrerEntityType: z.string().max(50).optional(),
    referrerEntityId: z.string().max(100).optional(),
    serviceSlug: z.string().max(200).optional(),
    serviceTitle: z.string().max(300).optional(),
    packageSlug: z.string().max(200).optional(),
    packageTitle: z.string().max(300).optional(),
    productSlug: z.string().max(200).optional(),
    productTitle: z.string().max(300).optional(),
    requestEntityType: z.string().max(50).optional(),
    requestEntityId: z.string().max(100).optional(),
    requestEntitySlug: z.string().max(200).optional(),
    requestType: z.string().max(100).optional(),
    desiredOutcome: z.string().max(5000).optional(),
    preferredTimeline: z.string().max(200).optional(),
    preferredDate: optionalDate,
    budgetAmount: optionalMoney,
    quotedAmount: optionalMoney,
    quotedCurrency: z.string().min(3).max(3).optional(),
    pricingType: z.string().max(50).optional(),
}).strip();

const customerMessageSchema = z.object({
    message: z.string().min(1).max(5000),
}).strict();

const customerActionSchema = z.object({
    action: z.string().min(1).max(60),
}).passthrough();

const reviewSchema = z.object({
    action: z.enum(['accept', 'reject']),
    priceEstimate: optionalMoney,
    assignedToId: z.string().max(100).optional(),
    notes: z.string().max(5000).optional(),
}).strict();

const adminEventSchema = z.object({
    type: z.enum(Object.values(BOOKING_EVENT_TYPES) as [string, ...string[]]),
    title: z.string().min(1).max(300),
    description: z.string().max(5000).optional(),
    stage: z.string().max(60).optional(),
    visibility: z.enum([EVENT_VISIBILITY.CUSTOMER, EVENT_VISIBILITY.STAFF, EVENT_VISIBILITY.INTERNAL])
        .default(EVENT_VISIBILITY.STAFF),
}).strict();

// ─── Stage machine ────────────────────────────────────────────
// Machine stage values mirror the frontend's canonical workflow order.
export const STAGE_ORDER = [
    'request_submitted',
    'requirements_review',
    'clarification_needed',
    'scope_and_quotation',
    'awaiting_confirmation',
    'scheduled',
    'in_progress',
    'customer_review',
    'completed',
] as const;

// Allowed forward/valid transitions. 'cancelled' is reachable from most
// active stages via the cancel action. Reject anything else with 409.
export const STAGE_FLOW: Record<string, string[]> = {
    request_submitted: ['requirements_review', 'cancelled'],
    requirements_review: ['clarification_needed', 'scope_and_quotation', 'rejected', 'cancelled'],
    clarification_needed: ['requirements_review', 'scope_and_quotation', 'cancelled'],
    scope_and_quotation: ['awaiting_confirmation', 'cancelled'],
    awaiting_confirmation: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['customer_review', 'cancelled'],
    customer_review: ['completed', 'changes_requested'],
    changes_requested: ['in_progress'],
    completed: [],
    cancelled: [],
    rejected: [],
};

function isLegalStageTransition(from: string, to: string): boolean {
    if (from === to) return true; // no-op allowed
    return Boolean(STAGE_FLOW[from]?.includes(to));
}

// P7's BookingStatus enum, now a local literal union (the contract stores the
// same values in the live native enum).
const BOOKING_STATUSES = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'ACCEPTED',
    'REJECTED',
    'TERMS_ACCEPTED',
    'DEPOSIT_PAID',
    'IN_PROGRESS',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
] as const;
type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Map a BookingStatus enum to the machine stage when an admin changes status.
const STATUS_TO_STAGE: Partial<Record<BookingStatus, string>> = {
    SUBMITTED: 'request_submitted',
    UNDER_REVIEW: 'requirements_review',
    ACCEPTED: 'awaiting_confirmation',
    REJECTED: 'rejected',
    TERMS_ACCEPTED: 'scheduled',
    DEPOSIT_PAID: 'scheduled',
    IN_PROGRESS: 'in_progress',
    DELIVERED: 'customer_review',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Customer-visible actions derived from current stage (server-authoritative).
const STAGE_ACTIONS: Record<string, string[]> = {
    request_submitted: ['UPLOAD_FILES'],
    requirements_review: ['UPLOAD_FILES', 'RESPOND_TO_CLARIFICATION'],
    clarification_needed: ['UPLOAD_FILES', 'RESPOND_TO_CLARIFICATION'],
    scope_and_quotation: ['UPLOAD_FILES'],
    awaiting_confirmation: ['ACCEPT_QUOTATION', 'DECLINE_QUOTATION', 'UPLOAD_FILES'],
    scheduled: ['UPLOAD_FILES', 'CANCEL_BOOKING'],
    in_progress: ['UPLOAD_FILES', 'REQUEST_CHANGES', 'CANCEL_BOOKING'],
    customer_review: ['CONFIRM_DELIVERY', 'REQUEST_CHANGES'],
    changes_requested: ['UPLOAD_FILES'],
    completed: [],
    cancelled: [],
    rejected: [],
};

function availableActions(stage: string): string[] {
    return STAGE_ACTIONS[stage] ?? [];
}

// Fields a customer is allowed to read when serializing a booking.
interface SerializeOpts {
    includeInternal?: boolean;
}

/** Rename P8's `_type` field back to the P7 wire name `type` on booking events. */
const serializeEvent = (e: any) => {
    const { _type, ...rest } = e;
    return { ...rest, type: _type };
};

/** Replace the P8 `bookingEvents` relation key with the P7 wire name `events`. */
const withEvents = (booking: any) => {
    const { bookingEvents, ...rest } = booking ?? {};
    return { ...rest, events: (bookingEvents ?? []).map(serializeEvent) };
};

function serializeBooking(booking: any, opts: SerializeOpts = {}) {
    const { trackingToken, ...withoutTrackingToken } = booking ?? {};
    const base = withEvents(withoutTrackingToken);
    const events = (base.events ?? []).filter((e: any) =>
        opts.includeInternal ? true : e.visibility === EVENT_VISIBILITY.CUSTOMER
    );
    return {
        ...base,
        ...(opts.includeInternal ? { trackingToken } : {}),
        events,
        availableActions: availableActions(booking.currentStage),
        stageProgress: {
            order: STAGE_ORDER,
            currentIndex: STAGE_ORDER.indexOf(booking.currentStage as (typeof STAGE_ORDER)[number]),
        },
    };
}

const MAX_BOOKING_DETAILS_BYTES = 32 * 1024;
const MAX_BOOKING_DETAILS_DEPTH = 6;
const MAX_BOOKING_DETAILS_NODES = 500;
const UNSAFE_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Bounded JSON deserialization for the public booking form. Accepts a JSON
 * string or an already-parsed object, rejects prototype-pollution keys and
 * caps depth/size so malformed input cannot turn into a 500 or persist junk.
 */
function parseBookingDetails(raw: unknown): Record<string, unknown> | null {
    if (raw === undefined || raw === null || raw === '') return null;
    let value: unknown = raw;
    if (typeof raw === 'string') {
        if (Buffer.byteLength(raw, 'utf8') > MAX_BOOKING_DETAILS_BYTES) {
            throw new Error('Booking details are too large');
        }
        value = JSON.parse(raw);
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Booking details must be a JSON object');
    }
    let nodes = 0;
    const walk = (node: unknown, depth: number): void => {
        if (depth > MAX_BOOKING_DETAILS_DEPTH) throw new Error('Booking details are too deeply nested');
        if (++nodes > MAX_BOOKING_DETAILS_NODES) throw new Error('Booking details contain too many fields');
        if (Array.isArray(node)) {
            node.forEach((item) => walk(item, depth + 1));
            return;
        }
        if (node && typeof node === 'object') {
            for (const [key, child] of Object.entries(node)) {
                if (UNSAFE_JSON_KEYS.has(key)) throw new Error('Unsafe booking details key');
                walk(child, depth + 1);
            }
        }
    };
    walk(value, 0);
    return value as Record<string, unknown>;
}

// Resolve a booking for a customer by public reference + short-lived access
// token. Email alone is never proof of control. Never leak existence on bad
// token.
async function fetchBookingForCustomer(
    prisma: Db,
    publicReference: string,
    auth: { token?: string }
) {
    const booking = await prisma.orm.public.Booking
        .where({ publicReference })
        .include('client', (c) => c.select('id', 'name', 'email', 'phone'))
        .include('files', (f) => f
            .orderBy((f2) => f2.createdAt.desc())
            .select('id', 'filename', 'url', 'mime', 'size', 'createdAt'))
        .include('payments', (p) => p
            .orderBy((p2) => p2.createdAt.desc())
            .select('id', 'status', 'amount', 'currency', 'provider', 'createdAt'))
        .include('bookingEvents', (e) => e.orderBy((e2) => e2.createdAt.asc()))
        .include('assignedTo', (a) => a.select('id', 'firstName', 'lastName', 'publicTitle', 'avatarUrl'))
        .include('clientProject', (cp) => cp.select('id', 'title', 'status', 'progress', 'updatedAt'))
        .first();
    if (!booking) return null;

    // The contract models Booking.clientProject as 1:N; P7 (and the wire
    // format) treat it as to-one — take the first row.
    const normalized = booking as any;
    normalized.clientProject = normalized.clientProject?.[0] ?? null;

    const rawTokenOk = Boolean(auth.token && booking.trackingToken === auth.token);
    const signed = auth.token ? verifyBookingAccessToken(auth.token) : null;
    const signedTokenOk = Boolean(signed
        && signed.bookingId === booking.id
        && signed.publicReference === publicReference);
    if (!rawTokenOk && !signedTokenOk) return null;
    return booking;
}

export default function bookingsRouter(prisma: Db) {
    const router = Router();

    // Helper: verify the caller may mutate an assigned booking.
    // Allowed if the caller is an admin/manager (bookings.view_all) OR is the
    // assigned staff member AND holds bookings.update_assigned.
    const canMutateBooking = async (req: any, booking: any): Promise<boolean> => {
        const role: string | undefined = req.user?.role;
        if (['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'MANAGER', 'HR'].includes(role ?? '')) return true;
        if (req.user?.sub) {
            const ctx = { employeeId: req.user.sub, systemRole: role };
            if (await hasPermission(ctx, 'bookings.view_all')) return true;
        }
        return Boolean(booking.assignedToId && booking.assignedToId === req.user?.sub);
    };

    // POST /api/bookings - create booking (workflow-seeded) with optional files
    // and optionally create a Stripe PaymentIntent for deposit.
    router.post('/', publicFormLimiter, bookingUpload, async (req, res) => {
        try {
            const parsed = publicBookingSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });
            const b = parsed.data;
            const email = b.email.trim().toLowerCase();
            const safeSource = b.source;
            const safeProjectType = PROJECT_TYPES.includes(b.projectType as any)
                ? b.projectType : 'OTHER';
            const currency = b.currency?.trim().toUpperCase() || 'KES';
            const depositAmount = b.depositAmount;
            const budgetMoney = b.budgetAmount != null ? toMoney(b.budgetAmount) : undefined;
            const quoteMoney = b.quotedAmount != null ? toMoney(b.quotedAmount) : undefined;
            const {
                name, phone, title, description, sourcePath,
                referrerEntityType, referrerEntityId,
                serviceSlug, serviceTitle, packageSlug, packageTitle,
                productSlug, productTitle, requestEntityType, requestEntityId,
                requestEntitySlug, requestType, desiredOutcome, preferredTimeline,
                preferredDate, quotedCurrency, pricingType,
            } = b;
            let safeDetails: Record<string, unknown> | null;
            try {
                safeDetails = parseBookingDetails(b.details);
            } catch {
                return res.status(400).json({ error: 'Invalid booking details' });
            }

            // upsert client
            let client = await prisma.orm.public.Client.where({ email }).first();
            if (!client) {
                client = await prisma.orm.public.Client.create({
                    id: newId(),
                    updatedAt: ts(),
                    name: name || '',
                    email,
                    phone: phone ?? null,
                });
            }

            const [publicReference, trackingToken] = await Promise.all([
                generatePublicReference(prisma as any),
                Promise.resolve(generateTrackingToken()),
            ]);

            const booking = await prisma.transaction(async (tx) => {
                const created = await tx.orm.public.Booking.create({
                    id: newId(),
                    updatedAt: ts(),
                    clientId: client!.id,
                    title,
                    description: description || '',
                    projectType: safeProjectType as any,
                    details: safeDetails as any,
                    status: 'SUBMITTED',
                    // workflow enrichment
                    publicReference,
                    trackingToken,
                    currentStage: 'request_submitted',
                    source: safeSource,
                    sourcePath: sourcePath || null,
                    referrerEntityType: referrerEntityType || null,
                    referrerEntityId: referrerEntityId || null,
                    serviceSlug: serviceSlug || null,
                    serviceTitle: serviceTitle || null,
                    packageSlug: packageSlug || null,
                    packageTitle: packageTitle || null,
                    productSlug: productSlug || null,
                    productTitle: productTitle || null,
                    requestEntityType: requestEntityType || null,
                    requestEntityId: requestEntityId || null,
                    requestEntitySlug: requestEntitySlug || null,
                    requestType: requestType || null,
                    desiredOutcome: desiredOutcome || null,
                    preferredTimeline: preferredTimeline || null,
                    preferredDate: preferredDate ? ts(preferredDate) : null,
                    budgetAmount: budgetMoney,
                    currency: currency || 'KES',
                    quotedAmount: quoteMoney,
                    quotedCurrency: quotedCurrency || null,
                    pricingType: pricingType || null,
                    submittedAt: ts(),
                });

                // save files metadata
                const files = req.files as Express.Multer.File[];
                if (files && files.length) {
                    for (const f of files) {
                        await tx.orm.public.File.create({
                            id: newId(),
                            ownerType: 'booking', ownerId: created.id,
                            filename: f.originalname, url: f.path, mime: f.mimetype, size: f.size,
                        });
                    }
                }

                // initial workflow event (atomic with the booking)
                await logBookingEvent(tx as any, {
                    bookingId: created.id,
                    type: BOOKING_EVENT_TYPES.BOOKING_SUBMITTED,
                    title: 'Booking submitted',
                    description: `Booking "${title}" was submitted from ${safeSource}.`,
                    stage: 'request_submitted',
                    status: 'SUBMITTED',
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'client',
                    actorId: client!.id,
                    metadata: { source: safeSource },
                } as any);

                return created;
            });

            // If deposit requested, create Stripe PaymentIntent + Payment record.
            if (b.depositRequired && depositAmount) {
                const amount = Math.round(Number(depositAmount) * 100);
                const curr = currency || 'KES';
                if (!stripe) return res.status(500).json({ error: 'Payment provider not configured' });
                const paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: curr.toLowerCase(),
                    metadata: { bookingId: booking.id, clientEmail: client.email },
                    description: `Deposit for booking ${booking.id}`,
                    automatic_payment_methods: { enabled: true },
                });
                await prisma.orm.public.Payment.create({
                    id: newId(),
                    updatedAt: ts(),
                    bookingId: booking.id,
                    clientId: client.id,
                    amount: toMoney(depositAmount),
                    currency: curr,
                    provider: 'STRIPE' as any,
                    providerId: paymentIntent.id,
                    status: 'PENDING' as any,
                    metadata: { raw: paymentIntent },
                });
                return res.status(201).json({
                    message: 'Booking created',
                    bookingId: booking.id,
                    clientSecret: paymentIntent.client_secret,
                    booking: {
                        id: booking.id,
                        publicReference: booking.publicReference,
                        status: booking.status,
                        currentStage: booking.currentStage,
                        createdAt: booking.createdAt,
                    },
                    trackingPath: `/bookings/${booking.publicReference}`,
                    trackingToken: booking.trackingToken,
                    paymentRequired: true,
                    paymentContext: { clientSecret: paymentIntent.client_secret, provider: 'STRIPE', amount: Number(depositAmount), currency: curr },
                });
            }

            res.status(201).json({
                message: 'Booking created',
                bookingId: booking.id,
                booking: {
                    id: booking.id,
                    publicReference: booking.publicReference,
                    status: booking.status,
                    currentStage: booking.currentStage,
                    createdAt: booking.createdAt,
                },
                trackingPath: `/bookings/${booking.publicReference}`,
                trackingToken: booking.trackingToken,
                paymentRequired: false,
                paymentContext: null,
            });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Send a short-lived signed access link to the email on the booking.
    // Always returns the same response so references cannot be enumerated.
    router.post('/reference/:publicReference/access/request', publicFormLimiter, async (req, res) => {
        const parsed = z.object({ email: z.string().email() }).strict().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'Valid email required' });
        try {
            const email = parsed.data.email.trim().toLowerCase();
            const booking = await prisma.orm.public.Booking
                .where({ publicReference: req.params.publicReference })
                .include('client', (c) => c.select('id', 'email'))
                .first();
            const clientEmail = (booking as any)?.client?.email?.toLowerCase?.();
            if (booking && clientEmail === email) {
                const token = signBookingAccessToken(booking.id, booking.publicReference);
                const link = `${process.env.FRONTEND_URL || ''}/bookings/${encodeURIComponent(booking.publicReference)}?token=${encodeURIComponent(token)}`;
                await sendMail({
                    to: email,
                    subject: 'Your secure AngiSoft booking tracking link',
                    html: `<p>Use this private link to view and manage booking ${booking.publicReference}. It expires in 30 minutes.</p><p><a href="${link}">Open booking</a></p><p>If you did not request this, ignore the email.</p>`,
                    text: `Your secure booking link: ${link}`,
                    purpose: 'noreply',
                });
                await logAudit({ action: 'booking_access_link', entity: 'Booking', entityId: booking.id });
            }
            res.json({ ok: true });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // GET /api/bookings/reference/:publicReference - canonical customer progress view
    router.get('/reference/:publicReference', async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            res.json(serializeBooking(booking));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Email-only booking enumeration was removed. Customers use the signed
    // tracking link from /reference/:publicReference/access/request instead.

    // GET /api/bookings/reference/:publicReference/events - customer-visible timeline
    router.get('/reference/:publicReference/events', async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const events = ((booking as any).bookingEvents ?? [])
                .map(serializeEvent)
                .filter((e: any) => e.visibility === EVENT_VISIBILITY.CUSTOMER);
            res.json(events);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // POST /api/bookings/reference/:publicReference/messages - customer note
    router.post('/reference/:publicReference/messages', publicFormLimiter, async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const parsed = customerMessageSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Invalid message' });
            const { message } = parsed.data;
            await logBookingEvent(prisma as any, {
                bookingId: booking.id,
                type: BOOKING_EVENT_TYPES.CUSTOMER_REPLIED,
                title: 'Customer message',
                description: message,
                stage: booking.currentStage,
                status: booking.status,
                visibility: EVENT_VISIBILITY.CUSTOMER,
                actorType: 'client',
                actorId: booking.client?.id ?? null,
            } as any);
            res.status(201).json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // POST /api/bookings/reference/:publicReference/files - upload additional file
    router.post('/reference/:publicReference/files', publicFormLimiter, bookingUpload, async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const files = req.files as Express.Multer.File[];
            if (!files || !files.length) return res.status(400).json({ error: 'No files provided' });
            const created: any[] = [];
            for (const f of files) {
                const rec = await prisma.orm.public.File.create({
                    id: newId(),
                    ownerType: 'booking', ownerId: booking.id, filename: f.originalname, url: f.path, mime: f.mimetype, size: f.size,
                });
                await logBookingEvent(prisma as any, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.FILE_UPLOADED,
                    title: 'File uploaded',
                    description: f.originalname,
                    stage: booking.currentStage,
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'client',
                    actorId: (booking as any).client.id,
                } as any);
                created.push(rec);
            }
            res.status(201).json({ files: created });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // POST /api/bookings/reference/:publicReference/actions - run a supported customer action
    router.post('/reference/:publicReference/actions', publicFormLimiter, async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const parsed = customerActionSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Invalid action' });
            const { action } = parsed.data;
            const allowed = availableActions(booking.currentStage);
            if (!allowed.includes(action)) {
                return res.status(400).json({ error: 'Action not permitted at this stage', allowed });
            }
            const updated = await applyCustomerAction(prisma, booking, action, req.body);
            res.json(serializeBooking(updated));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // PATCH /api/bookings/reference/:publicReference/cancel - customer cancels (if allowed)
    router.patch('/reference/:publicReference/cancel', publicFormLimiter, async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!['request_submitted', 'requirements_review', 'clarification_needed', 'scope_and_quotation', 'awaiting_confirmation', 'scheduled', 'in_progress'].includes(booking.currentStage)) {
                return res.status(409).json({ error: 'Booking cannot be cancelled at this stage' });
            }
            const updated = await prisma.transaction(async (tx) => {
                const b = await tx.orm.public.Booking.where({ id: booking.id })
                    .update({ status: 'CANCELLED' as any, currentStage: 'cancelled' });
                await logBookingEvent(tx as any, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.BOOKING_CANCELLED,
                    title: 'Booking cancelled',
                    stage: 'cancelled',
                    status: 'CANCELLED',
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'client',
                    actorId: (booking as any).client.id,
                } as any);
                return b;
            });
            res.json(serializeBooking(updated));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // GET /api/bookings/staff - bookings assigned to the current staff member
    router.get('/staff', requireAuth, async (req: AuthRequest, res) => {
        try {
            const bookings = await prisma.orm.public.Booking
                .where({ assignedToId: req.user?.sub })
                .orderBy((b) => b.createdAt.desc())
                .include('client', (c) => c.select('id', 'name', 'email'))
                .include('bookingEvents', (e) => e.orderBy((e2) => e2.createdAt.asc()))
                .all();
            res.json(bookings.map((b: any) => withEvents(b)));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // ─── Admin workflow endpoints ──────────────────────────────
    // GET /api/bookings/admin - all bookings (admin/marketing)
    router.get('/admin', requireAuth, requireAccess('bookings.view_all', ['ADMIN', 'MARKETING']), async (req, res) => {
        try {
            const bookings = await prisma.orm.public.Booking
                .orderBy((b) => b.createdAt.desc())
                .include('client', (c) => c.select('id', 'name', 'email'))
                .include('bookingEvents', (e) => e.orderBy((e2) => e2.createdAt.asc()))
                .all();
            res.json(bookings.map((b: any) => withEvents(b)));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Legacy lookup by internal id + email was removed: internal ids are
    // guessable and email is self-asserted. Use the signed reference link.

    // POST /api/bookings/:id/review - Admin review booking (accept/reject)
    router.post('/:id/review', requireAuth, requireAccess('bookings.update_assigned', ['ADMIN', 'MARKETING']), async (req, res) => {
        try {
            const parsed = reviewSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });
            const { action, priceEstimate, assignedToId, notes } = parsed.data;
            const booking = await prisma.orm.public.Booking.where({ id: req.params.id }).first();
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!await canMutateBooking(req, booking)) return res.status(403).json({ error: 'Not assigned to this booking' });

            let status = booking.status as BookingStatus;
            if (action === 'accept') status = 'ACCEPTED';
            else if (action === 'reject') status = 'REJECTED';

            const updated = await prisma.transaction(async (tx) => {
                const reviewed = await tx.orm.public.Booking
                    .where({ id: req.params.id })
                    .include('client')
                    .include('assignedTo', (a) => a.select('id', 'firstName', 'lastName', 'email'))
                    .include('clientProject')
                    .update({
                        status: status as any,
                        priceEstimate: priceEstimate ? toMoney(priceEstimate) : booking.priceEstimate,
                        assignedToId: assignedToId || booking.assignedToId,
                    });

                if (notes) {
                    await tx.orm.public.Note.create({
                        id: newId(),
                        bookingId: booking.id,
                        authorId: req.user?.sub || null,
                        text: notes,
                    });
                }
                await logBookingEvent(tx as any, {
                    bookingId: booking.id,
                    type: action === 'accept' ? BOOKING_EVENT_TYPES.STAGE_CHANGED : BOOKING_EVENT_TYPES.BOOKING_CANCELLED,
                    title: action === 'accept' ? 'Booking accepted' : 'Booking rejected',
                    stage: action === 'accept' ? 'awaiting_confirmation' : 'rejected',
                    status,
                    visibility: EVENT_VISIBILITY.STAFF,
                    actorType: 'staff',
                    actorId: req.user?.sub || null,
                } as any);

                if (action === 'accept') {
                    await createClientProjectFromBooking(tx as any, booking.id, req.user?.sub || null);
                }
                return reviewed;
            });

            await logAudit({
                actorId: req.user?.sub || null,
                actorRole: req.user?.role || null,
                action: action === 'accept' ? 'accept_booking' : 'reject_booking',
                entity: 'Booking',
                entityId: booking.id,
                meta: { status, assignedToId: assignedToId || booking.assignedToId },
            });

            (updated as any).clientProject = (updated as any).clientProject?.[0] ?? null;
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // PATCH /api/bookings/admin/:id/stage - safe stage transition (admin)
    router.patch('/admin/:id/stage', requireAuth, requireAccess('bookings.change_stage', ['ADMIN', 'MARKETING']), async (req, res) => {
        try {
            const { stage } = req.body;
            const booking = await prisma.orm.public.Booking.where({ id: req.params.id }).first();
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!await canMutateBooking(req, booking)) return res.status(403).json({ error: 'Not assigned to this booking' });
            if (!STAGE_ORDER.includes(stage as (typeof STAGE_ORDER)[number]) && !['rejected', 'cancelled'].includes(stage)) {
                return res.status(400).json({ error: 'Unknown stage', allowed: STAGE_ORDER });
            }
            if (!isLegalStageTransition(booking.currentStage, stage)) {
                return res.status(409).json({
                    error: 'Illegal stage transition',
                    from: booking.currentStage,
                    to: stage,
                    allowed: STAGE_FLOW[booking.currentStage],
                });
            }
            const updated = await prisma.transaction(async (tx) => {
                const b = await tx.orm.public.Booking.where({ id: booking.id }).update({ currentStage: stage });
                await logBookingEvent(tx as any, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.STAGE_CHANGED,
                    title: `Stage changed to ${stage}`,
                    stage,
                    status: (b as any).status,
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'staff',
                    actorId: req.user?.sub || null,
                } as any);
                return b;
            });
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // PATCH /api/bookings/admin/:id/status - status change (admin) with stage sync
    router.patch('/admin/:id/status', requireAuth, requireAccess('bookings.update_assigned', ['ADMIN', 'MARKETING']), async (req, res) => {
        try {
            const { status } = req.body as { status: BookingStatus };
            if (!(BOOKING_STATUSES as readonly string[]).includes(status)) {
                return res.status(400).json({ error: 'Unknown status', allowed: BOOKING_STATUSES });
            }
            const booking0 = await prisma.orm.public.Booking.where({ id: req.params.id }).first();
            if (!booking0) return res.status(404).json({ error: 'Booking not found' });
            if (!await canMutateBooking(req, booking0)) return res.status(403).json({ error: 'Not assigned to this booking' });
            const booking = await prisma.orm.public.Booking.where({ id: req.params.id }).first();
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const mappedStage = STATUS_TO_STAGE[status] ?? booking.currentStage;
            const updated = await prisma.transaction(async (tx) => {
                const b = await tx.orm.public.Booking.where({ id: booking.id })
                    .update({ status: status as any, currentStage: mappedStage });
                await logBookingEvent(tx as any, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.STAGE_CHANGED,
                    title: `Status changed to ${status}`,
                    stage: mappedStage,
                    status,
                    visibility: EVENT_VISIBILITY.STAFF,
                    actorType: 'staff',
                    actorId: req.user?.sub || null,
                } as any);
                return b;
            });
            // Notify the assigned staff member of the status change (fire-and-forget).
            if (booking.assignedToId && booking.status !== status) {
                void createNotification(
                    booking.assignedToId,
                    'booking.status',
                    `Booking ${booking.publicReference || booking.id}: ${status.replace(/_/g, ' ')}`,
                    `${booking.title} moved to ${status.replace(/_/g, ' ')}.`,
                    '/bookings',
                    { bookingId: booking.id, status }
                ).catch(() => undefined);
            }
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // POST /api/bookings/admin/:id/events - admin adds an event
    router.post('/admin/:id/events', requireAuth, requireAccess('bookings.add_progress', ['ADMIN', 'MARKETING']), async (req, res) => {
        try {
            const parsed = adminEventSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });
            const { type, title, description, visibility, stage } = parsed.data;
            const booking = await prisma.orm.public.Booking.where({ id: req.params.id }).first();
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!await canMutateBooking(req, booking)) return res.status(403).json({ error: 'Not assigned to this booking' });
            await logBookingEvent(prisma as any, {
                bookingId: booking.id,
                type,
                title,
                description: description ?? null,
                stage: stage ?? booking.currentStage,
                status: booking.status,
                visibility: visibility ?? EVENT_VISIBILITY.STAFF,
                actorType: 'staff',
                actorId: req.user?.sub || null,
            } as any);
            res.status(201).json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
}

// Apply a customer action within a transaction, recording the workflow event.
async function applyCustomerAction(prisma: Db, booking: any, action: string, body: any) {
    return prisma.transaction(async (tx) => {
        let data: any = {};
        let eventType: string = BOOKING_EVENT_TYPES.PROGRESS_UPDATED;
        let title = action;
        let stage = booking.currentStage;
        switch (action) {
            case 'ACCEPT_QUOTATION':
                stage = 'scheduled';
                eventType = BOOKING_EVENT_TYPES.QUOTATION_ACCEPTED;
                title = 'Quotation accepted';
                break;
            case 'DECLINE_QUOTATION':
                stage = 'scope_and_quotation';
                eventType = BOOKING_EVENT_TYPES.QUOTATION_REJECTED;
                title = 'Quotation declined';
                break;
            case 'REQUEST_CHANGES':
                stage = 'changes_requested';
                eventType = BOOKING_EVENT_TYPES.CHANGES_REQUESTED;
                title = 'Changes requested';
                break;
            case 'CONFIRM_DELIVERY':
                stage = 'completed';
                eventType = BOOKING_EVENT_TYPES.BOOKING_COMPLETED;
                title = 'Delivery confirmed';
                break;
            default:
                eventType = BOOKING_EVENT_TYPES.PROGRESS_UPDATED;
        }
        data.currentStage = stage;
        const b = await tx.orm.public.Booking.where({ id: booking.id }).update(data);
        await logBookingEvent(tx as any, {
            bookingId: booking.id,
            type: eventType,
            title,
            stage,
            status: (b as any).status,
            visibility: EVENT_VISIBILITY.CUSTOMER,
            actorType: 'client',
            actorId: booking.client.id,
        } as any);
        return prisma.orm.public.Booking
            .where({ id: booking.id })
            .include('bookingEvents', (e) => e.orderBy((e2) => e2.createdAt.asc()))
            .include('client')
            .include('files')
            .include('payments')
            .first();
    });
}
