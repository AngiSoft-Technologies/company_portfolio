import { Router } from 'express';
import { PrismaClient, BookingStatus } from '@prisma/client';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/roles';
import { createClientProjectFromBooking } from '../services/clientProjects';
import { logAudit } from '../services/audit';
import { generatePublicReference, generateTrackingToken } from '../services/bookingReference';
import { logBookingEvent, BOOKING_EVENT_TYPES, EVENT_VISIBILITY } from '../services/bookingEvents';
// stripe types may not be available until dependency is installed; keep runtime require below

const upload = multer({ dest: 'uploads/' });

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
function serializeBooking(booking: any, opts: SerializeOpts = {}) {
    const events = (booking.events ?? []).filter((e: any) =>
        opts.includeInternal ? true : e.visibility === EVENT_VISIBILITY.CUSTOMER
    );
    return {
        ...booking,
        events,
        availableActions: availableActions(booking.currentStage),
        stageProgress: {
            order: STAGE_ORDER,
            currentIndex: STAGE_ORDER.indexOf(booking.currentStage as (typeof STAGE_ORDER)[number]),
        },
    };
}

// Resolve a booking for a customer by public reference + token (guest) or email
// (authenticated/known). Never leak existence on bad token.
async function fetchBookingForCustomer(
    prisma: PrismaClient,
    publicReference: string,
    auth: { token?: string; email?: string }
) {
    const booking = await prisma.booking.findUnique({
        where: { publicReference },
        include: {
            client: { select: { id: true, name: true, email: true, phone: true } },
            files: {
                orderBy: { createdAt: 'desc' },
                select: { id: true, filename: true, url: true, mime: true, size: true, createdAt: true },
            },
            payments: {
                orderBy: { createdAt: 'desc' },
                select: { id: true, status: true, amount: true, currency: true, provider: true, createdAt: true },
            },
            events: { orderBy: { createdAt: 'asc' } },
            assignedTo: {
                select: { id: true, firstName: true, lastName: true, publicTitle: true, avatarUrl: true },
            },
            clientProject: { select: { id: true, title: true, status: true, progress: true, updatedAt: true } },
        },
    });
    if (!booking) return null;

    const tokenOk = auth.token && booking.trackingToken === auth.token;
    const emailOk = auth.email && booking.client.email.toLowerCase() === auth.email.toLowerCase();
    if (!tokenOk && !emailOk) return null;
    return booking;
}

export default function bookingsRouter(prisma: PrismaClient) {
    const router = Router();

    // Helper: verify the caller may mutate an assigned booking.
    // Allowed if the caller is an admin/manager (bookings.view_all) OR is the
    // assigned staff member AND holds bookings.update_assigned.
    const canMutateBooking = (req: any, booking: any): boolean => {
        const role: string | undefined = req.user?.role;
        const isAdminView = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'MANAGER', 'HR'].includes(role ?? '')
            || (role ?? '') === 'ADMIN';
        if (isAdminView) return true;
        return Boolean(booking.assignedToId && booking.assignedToId === req.user?.sub);
    };

    // POST /api/bookings - create booking (workflow-seeded) with optional files
    // and optionally create a Stripe PaymentIntent for deposit.
    router.post('/', upload.array('files', 5), async (req, res) => {
        try {
            const {
                name, email, phone, title, description, projectType, details,
                depositRequired, depositAmount, currency,
                // workflow fields
                source, sourcePath, referrerEntityType, referrerEntityId,
                serviceSlug, serviceTitle, packageSlug, packageTitle,
                productSlug, productTitle, requestEntityType, requestEntityId,
                requestEntitySlug, requestType, desiredOutcome, preferredTimeline,
                preferredDate, budgetAmount, quotedAmount, quotedCurrency, pricingType,
            } = req.body;
            if (!email || !title) return res.status(400).json({ error: 'Email and title required' });

            const safeSource = SOURCE_VALUES.includes(source) ? source : 'direct';
            const numericBudget = budgetAmount != null ? Number(budgetAmount) : null;
            const numericQuote = quotedAmount != null ? Number(quotedAmount) : null;

            // upsert client
            let client = await prisma.client.findUnique({ where: { email } });
            if (!client) {
                client = await prisma.client.create({ data: { name: name || '', email, phone } });
            }

            const [publicReference, trackingToken] = await Promise.all([
                generatePublicReference(prisma),
                Promise.resolve(generateTrackingToken()),
            ]);

            const booking = await prisma.$transaction(async (tx) => {
                const created = await tx.booking.create({
                    data: {
                        clientId: client.id,
                        title,
                        description: description || '',
                        projectType: projectType || 'OTHER',
                        details: details ? JSON.parse(details) : null,
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
                        preferredDate: preferredDate ? new Date(preferredDate) : null,
                        budgetAmount: numericBudget,
                        currency: currency || 'KES',
                        quotedAmount: numericQuote,
                        quotedCurrency: quotedCurrency || null,
                        pricingType: pricingType || null,
                        submittedAt: new Date(),
                    },
                });

                // save files metadata
                const files = req.files as Express.Multer.File[];
                if (files && files.length) {
                    for (const f of files) {
                        await tx.file.create({
                            data: {
                                ownerType: 'booking', ownerId: created.id,
                                filename: f.originalname, url: f.path, mime: f.mimetype, size: f.size,
                            },
                        });
                    }
                }

                // initial workflow event (atomic with the booking)
                await logBookingEvent(tx, {
                    bookingId: created.id,
                    type: BOOKING_EVENT_TYPES.BOOKING_SUBMITTED,
                    title: 'Booking submitted',
                    description: `Booking "${title}" was submitted from ${safeSource}.`,
                    stage: 'request_submitted',
                    status: 'SUBMITTED',
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'client',
                    actorId: client.id,
                    metadata: { source: safeSource },
                });

                return created;
            });

            // If deposit requested, create Stripe PaymentIntent + Payment record.
            if (depositRequired && depositAmount) {
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
                await prisma.payment.create({
                    data: {
                        bookingId: booking.id,
                        clientId: client.id,
                        amount: Number(depositAmount),
                        currency: curr,
                        provider: 'STRIPE',
                        providerId: paymentIntent.id,
                        status: 'PENDING',
                        metadata: { raw: paymentIntent },
                    },
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
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    });

    // GET /api/bookings/reference/:publicReference - canonical customer progress view
    router.get('/reference/:publicReference', async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token, email });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            res.json(serializeBooking(booking));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bookings/my - list bookings for a client by email (history)
    router.get('/my', async (req, res) => {
        try {
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : '';
            if (!email) return res.status(401).json({ error: 'Email verification required' });
            const bookings = await prisma.booking.findMany({
                where: { client: { email } },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    publicReference: true,
                    title: true,
                    serviceTitle: true,
                    productTitle: true,
                    status: true,
                    currentStage: true,
                    source: true,
                    createdAt: true,
                    updatedAt: true,
                    submittedAt: true,
                    events: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, title: true, createdAt: true, type: true } },
                },
            });
            res.json(bookings.map((b) => ({
                ...b,
                latestUpdate: b.events[0] || null,
            })));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bookings/reference/:publicReference/events - customer-visible timeline
    router.get('/reference/:publicReference/events', async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token, email });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const events = (booking.events ?? []).filter((e: any) => e.visibility === EVENT_VISIBILITY.CUSTOMER);
            res.json(events);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/bookings/reference/:publicReference/messages - customer note
    router.post('/reference/:publicReference/messages', async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token, email });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const { message } = req.body;
            if (!message) return res.status(400).json({ error: 'Message required' });
            await logBookingEvent(prisma, {
                bookingId: booking.id,
                type: BOOKING_EVENT_TYPES.CUSTOMER_REPLIED,
                title: 'Customer message',
                description: message,
                stage: booking.currentStage,
                status: booking.status,
                visibility: EVENT_VISIBILITY.CUSTOMER,
                actorType: 'client',
                actorId: booking.client.id,
            });
            res.status(201).json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/bookings/reference/:publicReference/files - upload additional file
    router.post('/reference/:publicReference/files', upload.array('files', 5), async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token, email });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const files = req.files as Express.Multer.File[];
            if (!files || !files.length) return res.status(400).json({ error: 'No files provided' });
            const created: any[] = [];
            for (const f of files) {
                const rec = await prisma.file.create({
                    data: { ownerType: 'booking', ownerId: booking.id, filename: f.originalname, url: f.path, mime: f.mimetype, size: f.size },
                });
                await logBookingEvent(prisma, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.FILE_UPLOADED,
                    title: 'File uploaded',
                    description: f.originalname,
                    stage: booking.currentStage,
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'client',
                    actorId: booking.client.id,
                });
                created.push(rec);
            }
            res.status(201).json({ files: created });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/bookings/reference/:publicReference/actions - run a supported customer action
    router.post('/reference/:publicReference/actions', async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token, email });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const { action } = req.body;
            const allowed = availableActions(booking.currentStage);
            if (!allowed.includes(action)) {
                return res.status(400).json({ error: 'Action not permitted at this stage', allowed });
            }
            const updated = await applyCustomerAction(prisma, booking, action, req.body);
            res.json(serializeBooking(updated));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PATCH /api/bookings/reference/:publicReference/cancel - customer cancels (if allowed)
    router.patch('/reference/:publicReference/cancel', async (req, res) => {
        try {
            const token = typeof req.query.token === 'string' ? req.query.token : undefined;
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : undefined;
            const booking = await fetchBookingForCustomer(prisma, req.params.publicReference, { token, email });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!['request_submitted', 'requirements_review', 'clarification_needed', 'scope_and_quotation', 'awaiting_confirmation', 'scheduled', 'in_progress'].includes(booking.currentStage)) {
                return res.status(409).json({ error: 'Booking cannot be cancelled at this stage' });
            }
            const updated = await prisma.$transaction(async (tx) => {
                const b = await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: 'CANCELLED', currentStage: 'cancelled' },
                });
                await logBookingEvent(tx, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.BOOKING_CANCELLED,
                    title: 'Booking cancelled',
                    stage: 'cancelled',
                    status: 'CANCELLED',
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'client',
                    actorId: booking.client.id,
                });
                return b;
            });
            res.json(serializeBooking(updated));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bookings/staff - bookings assigned to the current staff member
    router.get('/staff', requireAuth, async (req: AuthRequest, res) => {
        try {
            const bookings = await prisma.booking.findMany({
                where: { assignedToId: req.user?.sub },
                orderBy: { createdAt: 'desc' },
                include: {
                    client: { select: { id: true, name: true, email: true } },
                    events: { orderBy: { createdAt: 'asc' } },
                },
            });
            res.json(bookings);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bookings/:id - legacy public lookup by internal id + email (kept for backward compatibility)
    router.get('/:id', async (req, res) => {
        try {
            const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : '';
            if (!email) return res.status(401).json({ error: 'Email verification required' });
            const booking = await prisma.booking.findUnique({
                where: { id: req.params.id },
                include: {
                    client: true,
                    files: true,
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        select: { id: true, status: true, amount: true, currency: true, createdAt: true },
                    },
                    events: { orderBy: { createdAt: 'asc' } },
                    assignedTo: {
                        select: { id: true, firstName: true, lastName: true, publicTitle: true, avatarUrl: true },
                    },
                    clientProject: { select: { id: true, title: true, status: true, progress: true, updatedAt: true } },
                },
            });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (booking.client.email.toLowerCase() !== email) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            res.json(serializeBooking(booking));
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/bookings/:id/review - Admin review booking (accept/reject)
    router.post('/:id/review', requireAuth, requirePermission('bookings.update_assigned'), async (req, res) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const { action, priceEstimate, assignedToId, notes } = req.body;
            const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!canMutateBooking(req, booking)) return res.status(403).json({ error: 'Not assigned to this booking' });

            let status = booking.status as BookingStatus;
            if (action === 'accept') status = 'ACCEPTED';
            else if (action === 'reject') status = 'REJECTED';

            const updated = await prisma.$transaction(async (tx) => {
                const reviewed = await tx.booking.update({
                    where: { id: req.params.id },
                    data: {
                        status,
                        priceEstimate: priceEstimate ? Number(priceEstimate) : booking.priceEstimate,
                        assignedToId: assignedToId || booking.assignedToId,
                    },
                    include: {
                        client: true,
                        assignedTo: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        },
                        clientProject: true,
                    },
                });

                if (notes) {
                    await tx.note.create({
                        data: { bookingId: booking.id, authorId: req.user?.sub || null, text: notes },
                    });
                }
                await logBookingEvent(tx, {
                    bookingId: booking.id,
                    type: action === 'accept' ? BOOKING_EVENT_TYPES.STAGE_CHANGED : BOOKING_EVENT_TYPES.BOOKING_CANCELLED,
                    title: action === 'accept' ? 'Booking accepted' : 'Booking rejected',
                    stage: action === 'accept' ? 'awaiting_confirmation' : 'rejected',
                    status,
                    visibility: EVENT_VISIBILITY.STAFF,
                    actorType: 'staff',
                    actorId: req.user?.sub || null,
                });

                if (action === 'accept') {
                    await createClientProjectFromBooking(tx, booking.id, req.user?.sub || null);
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

            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Admin workflow endpoints ──────────────────────────────
    // GET /api/bookings/admin - all bookings (admin/marketing)
    router.get('/admin', requireAuth, async (req, res) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const bookings = await prisma.booking.findMany({
                orderBy: { createdAt: 'desc' },
                include: { client: { select: { id: true, name: true, email: true } }, events: { orderBy: { createdAt: 'asc' } } },
            });
            res.json(bookings);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PATCH /api/bookings/admin/:id/stage - safe stage transition (admin)
    router.patch('/admin/:id/stage', requireAuth, requirePermission('bookings.update_assigned'), async (req, res) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const { stage } = req.body;
            const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!canMutateBooking(req, booking)) return res.status(403).json({ error: 'Not assigned to this booking' });
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
            const updated = await prisma.$transaction(async (tx) => {
                const b = await tx.booking.update({ where: { id: booking.id }, data: { currentStage: stage } });
                await logBookingEvent(tx, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.STAGE_CHANGED,
                    title: `Stage changed to ${stage}`,
                    stage,
                    status: b.status,
                    visibility: EVENT_VISIBILITY.CUSTOMER,
                    actorType: 'staff',
                    actorId: req.user?.sub || null,
                });
                return b;
            });
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PATCH /api/bookings/admin/:id/status - status change (admin) with stage sync
    router.patch('/admin/:id/status', requireAuth, requirePermission('bookings.update_assigned'), async (req, res) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const { status } = req.body as { status: BookingStatus };
            if (!Object.values(BookingStatus).includes(status)) {
                return res.status(400).json({ error: 'Unknown status', allowed: Object.values(BookingStatus) });
            }
            const booking0 = await prisma.booking.findUnique({ where: { id: req.params.id } });
            if (!booking0) return res.status(404).json({ error: 'Booking not found' });
            if (!canMutateBooking(req, booking0)) return res.status(403).json({ error: 'Not assigned to this booking' });
            const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            const mappedStage = STATUS_TO_STAGE[status] ?? booking.currentStage;
            const updated = await prisma.$transaction(async (tx) => {
                const b = await tx.booking.update({
                    where: { id: booking.id },
                    data: { status, currentStage: mappedStage },
                });
                await logBookingEvent(tx, {
                    bookingId: booking.id,
                    type: BOOKING_EVENT_TYPES.STAGE_CHANGED,
                    title: `Status changed to ${status}`,
                    stage: mappedStage,
                    status,
                    visibility: EVENT_VISIBILITY.STAFF,
                    actorType: 'staff',
                    actorId: req.user?.sub || null,
                });
                return b;
            });
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/bookings/admin/:id/events - admin adds an event
    router.post('/admin/:id/events', requireAuth, requirePermission('bookings.update_assigned'), async (req, res) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const { type, title, description, visibility, stage } = req.body;
            if (!type || !title) return res.status(400).json({ error: 'type and title required' });
            const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            if (!canMutateBooking(req, booking)) return res.status(403).json({ error: 'Not assigned to this booking' });
            await logBookingEvent(prisma, {
                bookingId: booking.id,
                type,
                title,
                description: description ?? null,
                stage: stage ?? booking.currentStage,
                status: booking.status,
                visibility: visibility ?? EVENT_VISIBILITY.STAFF,
                actorType: 'staff',
                actorId: req.user?.sub || null,
            });
            res.status(201).json({ ok: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

// Apply a customer action within a transaction, recording the workflow event.
async function applyCustomerAction(prisma: PrismaClient, booking: any, action: string, body: any) {
    return prisma.$transaction(async (tx) => {
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
        const b = await tx.booking.update({ where: { id: booking.id }, data });
        await logBookingEvent(tx, {
            bookingId: booking.id,
            type: eventType,
            title,
            stage,
            status: b.status,
            visibility: EVENT_VISIBILITY.CUSTOMER,
            actorType: 'client',
            actorId: booking.client.id,
        });
        return prisma.booking.findUnique({
            where: { id: booking.id },
            include: { events: { orderBy: { createdAt: 'asc' } }, client: true, files: true, payments: true },
        });
    });
}
