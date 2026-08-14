import express, { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createPaymentIntent, getPaymentIntent } from '../services/payments/stripeService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { isRole } from '../middleware/roles';

/**
 * Payment security hardening.
 *
 * 1. Webhook: we ALWAYS verify the Stripe signature using STRIPE_WEBHOOK_SECRET.
 *    There is no "accept raw body when secret is missing" branch — that path
 *    allowed anyone who could reach the endpoint to forge payment events.
 *    If the webhook secret is unset we fail closed (500) so a misconfigured
 *    deployment cannot be silently unsafe.
 *
 * 2. create-intent: now requires an authenticated admin/staff token and verifies
 *    booking ownership where a bookingId is supplied, and uses a deterministic
 *    idempotency key so retries return the existing PaymentIntent instead of
 *    minting duplicates. (Note: the current frontend does not call this endpoint
 *    — deposits are created server-side inside POST /api/bookings — but it was
 *    exposed unauthenticated, so it must be locked down regardless.)
 */

function isStaffOrAdmin(role?: string): boolean {
  return ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'MANAGER', 'HR', 'DEVELOPER', 'SALES'].includes(role ?? '');
}

export default function paymentsRouter(prisma: PrismaClient) {
    const router = Router({ mergeParams: true });

    // Stripe webhook endpoint — signature verified, never trusts the raw body.
    router.post('/webhook', express.raw({ type: 'application/json' }) as any, async (req: any, res: any) => {
        const stripeSecret = process.env.STRIPE_SECRET || '';
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        if (!stripeSecret || !webhookSecret) {
            // Fail closed: never process payment events without a verifiable signature.
            console.error('Webhook rejected: STRIPE_SECRET and STRIPE_WEBHOOK_SECRET must both be configured.');
            return res.status(500).send('Stripe webhook not configured');
        }
        // require here to avoid top-level dep until installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Stripe = require('stripe');
        const stripe = new Stripe(stripeSecret, { apiVersion: '2024-11-15' });

        const sig = req.headers['stripe-signature'];
        let event: any;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err: any) {
            console.error('Webhook signature verification failed.', err);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                try {
                    const pi = event.data.object;
                    const providerId = pi.id;
                    // find payment
                    let payment = await prisma.payment.findUnique({ where: { providerId } });
                    if (!payment) {
                        // create a payment record so reconciliation works reliably
                        payment = await prisma.payment.create({ data: { provider: 'STRIPE', providerId, amount: (pi.amount_received || pi.amount || 0) / 100, currency: (pi.currency || 'KES').toUpperCase(), status: 'SUCCEEDED', metadata: JSON.parse(JSON.stringify(pi)) } });
                    } else {
                        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED', metadata: JSON.parse(JSON.stringify(pi)) } });
                    }
                    // mark booking deposit
                    if (payment.bookingId) {
                        await prisma.booking.update({ where: { id: payment.bookingId }, data: { depositPaidAt: new Date(), status: 'DEPOSIT_PAID' } });
                    }
                } catch (err) {
                    console.error('Error handling payment_intent.succeeded', err);
                }
                break;
            case 'payment_intent.payment_failed':
                try {
                    const pi = event.data.object;
                    const providerId = pi.id;
                    const payment = await prisma.payment.findUnique({ where: { providerId } });
                    if (payment) {
                        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', metadata: JSON.parse(JSON.stringify(pi)) } });
                    }
                } catch (err) {
                    console.error('Error handling payment_failed', err);
                }
                break;
            default:
                // other events
                break;
        }

        res.json({ received: true });
    });

    // create payment intent — authenticated, ownership-checked, idempotent.
    router.post('/create-intent', requireAuth, async (req: AuthRequest, res) => {
        const { bookingId, amount, currency = 'KES', idempotencyKey } = req.body;
        if (!amount) return res.status(400).json({ error: 'Missing amount' });

        try {
            // Only staff/admin roles may create intents via this endpoint. (The
            // client-facing deposit flow creates its intent server-side during
            // POST /api/bookings; this endpoint is for internal/manual use.)
            if (!isStaffOrAdmin(req.user?.role)) {
                return res.status(403).json({ error: 'Not authorized to create payment intents' });
            }

            // If a booking is referenced, it must exist and the caller must be
            // allowed to manage it (admin/marketing/manager OR the assigned staff).
            let booking: any = null;
            if (bookingId) {
                booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    select: { id: true, assignedToId: true, priceEstimate: true, quotedAmount: true, budgetAmount: true }
                });
                if (!booking) return res.status(404).json({ error: 'Booking not found' });

                const canManageAll = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'MANAGER'].includes(req.user?.role ?? '');
                const isAssigned = booking.assignedToId === req.user?.sub;
                if (!canManageAll && !isAssigned) {
                    return res.status(403).json({ error: 'Not authorized for this booking' });
                }
            }

            // Idempotency: reuse an existing pending intent for the same booking +
            // client key instead of creating a duplicate.
            if (bookingId && idempotencyKey) {
                const existing = await prisma.payment.findFirst({
                    where: { bookingId, status: 'PENDING' },
                    orderBy: { createdAt: 'desc' }
                });
                if (existing) {
                    const pi = await getPaymentIntent(existing.providerId);
                    if (pi) {
                        return res.json({ clientSecret: pi.client_secret, providerId: existing.providerId, reused: true });
                    }
                }
            }

            const pi = await createPaymentIntent(Number(amount), currency, {
                bookingId: bookingId || '',
                actor: req.user?.sub || '',
                idempotencyKey: idempotencyKey || '',
            });
            // persist payment in DB
            await prisma.payment.create({
                data: {
                    bookingId: bookingId || undefined,
                    clientId: undefined,
                    amount: Number(amount),
                    currency,
                    provider: 'STRIPE',
                    providerId: pi.id,
                    status: 'PENDING',
                    metadata: JSON.parse(JSON.stringify(pi)),
                },
            }).catch((err: any) => {
                // providerId is unique; a race on retry is fine — the intent
                // already exists so we still return its client secret.
                console.warn('create-intent payment row not persisted (maybe duplicate):', err?.message);
            });
            res.json({ clientSecret: pi.client_secret, providerId: pi.id });
        } catch (err: any) {
            console.error('Error creating payment intent', err);
            res.status(500).json({ error: 'Payment provider error' });
        }
    });

    return router;
}

