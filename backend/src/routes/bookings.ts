import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
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

export default function bookingsRouter(prisma: PrismaClient) {
    const router = Router();

    // POST /api/bookings - create booking with optional files and optionally create a Stripe PaymentIntent for deposit
    router.post('/', upload.array('files', 5), async (req, res) => {
        try {
            const { name, email, phone, title, description, projectType, details, depositRequired, depositAmount, currency } = req.body;
            if (!email || !title) return res.status(400).json({ error: 'Email and title required' });
            // upsert client
            let client = await prisma.client.findUnique({ where: { email } });
            if (!client) {
                client = await prisma.client.create({ data: { name: name || '', email, phone } });
            }
            const booking = await prisma.booking.create({
                data: {
                    clientId: client.id,
                    title,
                    description: description || '',
                    projectType: projectType || 'OTHER',
                    details: details ? JSON.parse(details) : null,
                    status: 'SUBMITTED'
                }
            });
            // save files metadata
            const files = req.files as Express.Multer.File[];
            if (files && files.length) {
                for (const f of files) {
                    await prisma.file.create({ data: { ownerType: 'booking', ownerId: booking.id, filename: f.originalname, url: f.path, mime: f.mimetype, size: f.size } });
                }
            }

            // If deposit requested, create Stripe PaymentIntent and a Payment record with PENDING status
            if (depositRequired && depositAmount) {
                const amount = Math.round(Number(depositAmount) * 100); // amount in cents
                const curr = currency || 'KES';
                if (!stripe) return res.status(500).json({ error: 'Payment provider not configured' });
                const paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: curr.toLowerCase(),
                    metadata: { bookingId: booking.id, clientEmail: client.email },
                    description: `Deposit for booking ${booking.id}`,
                    automatic_payment_methods: { enabled: true }
                });

                // Create Payment record in DB
                await prisma.payment.create({
                    data: {
                        bookingId: booking.id,
                        clientId: client.id,
                        amount: Number(depositAmount),
                        currency: curr,
                        provider: 'STRIPE',
                        providerId: paymentIntent.id,
                        status: 'PENDING',
                        metadata: { raw: paymentIntent }
                    }
                });

                return res.status(201).json({ message: 'Booking created', bookingId: booking.id, clientSecret: paymentIntent.client_secret });
            }

            // TODO: send notification/email to admins
            res.status(201).json({ message: 'Booking created', bookingId: booking.id });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    });

    // GET /api/bookings/:id - Get booking details (public, by booking ID or email)
    router.get('/:id', async (req, res) => {
        try {
            const { email } = req.query;
            const booking = await prisma.booking.findUnique({
                where: { id: req.params.id },
                include: {
                    client: true,
                    files: true,
                    payments: {
                        orderBy: { createdAt: 'desc' }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });
            // Optional: verify email matches if provided
            if (email && booking.client.email !== email) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            res.json(booking);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/bookings/:id/review - Admin review booking (accept/reject)
    router.post('/:id/review', requireAuth, async (req, res) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MARKETING') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const { action, priceEstimate, assignedToId, notes } = req.body;
            const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
            if (!booking) return res.status(404).json({ error: 'Booking not found' });

            let status = booking.status;
            if (action === 'accept') {
                status = 'ACCEPTED';
            } else if (action === 'reject') {
                status = 'REJECTED';
            }

            const updated = await prisma.booking.update({
                where: { id: req.params.id },
                data: {
                    status,
                    priceEstimate: priceEstimate ? Number(priceEstimate) : booking.priceEstimate,
                    assignedToId: assignedToId || booking.assignedToId
                },
                include: {
                    client: true,
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            });

            // Add note if provided
            if (notes) {
                await prisma.note.create({
                    data: {
                        bookingId: booking.id,
                        authorId: req.user?.sub || null,
                        text: notes
                    }
                });
            }

            // TODO: Send email to client about status change
            res.json(updated);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
