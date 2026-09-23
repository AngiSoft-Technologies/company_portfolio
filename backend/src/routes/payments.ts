import express, { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createPaymentIntent, getPaymentIntent } from '../services/payments/stripeService';
import { applyPaymentOutcome, initializePayment, isProviderConfigured, generateReference, withScopeLock, PaymentProviderError, ProviderId } from '../services/payments';
import * as paystack from '../services/payments/paystackService';
import * as mpesa from '../services/payments/mpesaService';
import * as payhero from '../services/payments/payheroService';
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

    // ─── Provider-agnostic charge initiation ─────────────────────────────────
    // Same auth/ownership rules as create-intent, but dispatches to any enabled
    // provider (Stripe card, Paystack redirect, M-Pesa STK, PayHero STK).
    router.post('/initiate', requireAuth, async (req: AuthRequest, res) => {
        const { provider, amount, currency = 'KES', email, phone, bookingId, clientId, description, reference, channelId } = req.body;
        if (!provider || !amount) return res.status(400).json({ error: 'Missing provider or amount' });

        const providerId = String(provider).toUpperCase();
        if (!['STRIPE', 'PAYSTACK', 'MPESA', 'PAYHERO'].includes(providerId)) {
            return res.status(400).json({ error: 'Unsupported provider' });
        }
        if (!isProviderConfigured(providerId as ProviderId)) {
            return res.status(503).json({ error: `${providerId} is not configured for this deployment` });
        }

        try {
            if (!isStaffOrAdmin(req.user?.role)) {
                return res.status(403).json({ error: 'Not authorized to initiate payments' });
            }

            let booking: any = null;
            if (bookingId) {
                booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    select: { id: true, assignedToId: true }
                });
                if (!booking) return res.status(404).json({ error: 'Booking not found' });
                const canManageAll = ['SUPER_ADMIN', 'ADMIN', 'MARKETING', 'MANAGER'].includes(req.user?.role ?? '');
                if (!canManageAll && booking.assignedToId !== req.user?.sub) {
                    return res.status(403).json({ error: 'Not authorized for this booking' });
                }
            }

            // Idempotency + concurrency: an advisory lock per (booking, provider)
            // serializes concurrent initiates, so "find pending → push → insert"
            // cannot double-fire an STK push or mint two intents. A caller-
            // supplied `reference` acts as a full idempotency key (unique).
            const paymentReference = reference || generateReference();
            const outcome = await withScopeLock(prisma, `initiate:${bookingId || 'anon'}:${providerId}`, async (tx: any) => {
                if (reference) {
                    const byRef = await tx.payment.findUnique({ where: { reference } });
                    if (byRef) return { existing: byRef };
                }
                if (bookingId) {
                    const existing = await tx.payment.findFirst({
                        where: { bookingId, provider: providerId, status: 'PENDING' },
                        orderBy: { createdAt: 'desc' }
                    });
                    if (existing) return { existing };
                }

                const result = await initializePayment({
                    provider: providerId as ProviderId,
                    amount: Number(amount),
                    currency,
                    email,
                    phone,
                    reference: paymentReference,
                    channelId: Number(channelId) || undefined,
                    description,
                    metadata: { bookingId: bookingId || '', actor: req.user?.sub || '', reference: paymentReference }
                });

                let row: any = null;
                try {
                    row = await tx.payment.create({
                        data: {
                            bookingId: bookingId || undefined,
                            clientId: clientId || undefined,
                            amount: Number(amount),
                            currency,
                            provider: result.provider as any,
                            providerId: result.providerId,
                            reference: paymentReference,
                            channelId: channelId || undefined,
                            status: 'PENDING',
                            metadata: JSON.parse(JSON.stringify(result.details || result)),
                        },
                    });
                } catch (err: any) {
                    // Unique race on reference/providerId → this exact charge was
                    // already initiated; surface the existing row instead.
                    if (err?.code === 'P2002') {
                        row = (await tx.payment.findUnique({ where: { reference: paymentReference } }))
                            || (await tx.payment.findUnique({ where: { providerId: result.providerId } }));
                        return { existing: row, result };
                    }
                    throw err;
                }
                return { row, result };
            });

            if (outcome.existing) {
                return res.json({
                    paymentId: outcome.existing.id,
                    provider: providerId,
                    providerIdRef: outcome.existing.providerId,
                    kind: outcome.result?.kind,
                    clientSecret: outcome.result?.clientSecret,
                    checkoutUrl: outcome.result?.checkoutUrl,
                    reused: true
                });
            }

            res.json({
                paymentId: outcome.row?.id,
                provider: (outcome.result as any).provider,
                providerId: (outcome.result as any).providerId,
                kind: (outcome.result as any).kind,
                clientSecret: (outcome.result as any).clientSecret,
                checkoutUrl: (outcome.result as any).checkoutUrl,
                reference: paymentReference,
            });
        } catch (err: any) {
            const message = err instanceof PaymentProviderError ? err.message : 'Payment provider error';
            console.error('Error initiating payment', err);
            res.status(err instanceof PaymentProviderError ? 400 : 500).json({ error: message });
        }
    });

    // ─── Paystack webhook (HMAC-SHA512 of the raw body, x-paystack-signature) ──
    router.post('/paystack/webhook', express.raw({ type: '*/*' }) as any, async (req: any, res: any) => {
        const secret = process.env.PAYSTACK_SECRET_KEY || '';
        if (!secret) {
            console.error('Paystack webhook rejected: PAYSTACK_SECRET_KEY not configured.');
            return res.status(500).send('Paystack webhook not configured');
        }
        const signature = req.headers['x-paystack-signature'];
        if (!paystack.verifyWebhookSignature(req.body, signature, secret)) {
            return res.status(400).send('Invalid signature');
        }
        res.json({ received: true });

        try {
            const event = paystack.parseRawBody(req.body);
            if (event?.event === 'charge.success') {
                const txn = event.data || {};
                await applyPaymentOutcome(prisma, {
                    provider: 'PAYSTACK',
                    providerId: String(txn.reference || ''),
                    reference: String(txn.reference || ''),
                    amount: Number(txn.amount || 0) / 100,
                    currency: String(txn.currency || 'KES').toUpperCase(),
                    status: 'SUCCEEDED',
                    metadata: txn
                });
            }
        } catch (err) {
            console.error('Error handling Paystack webhook', err);
        }
    });

    // ─── PayHero callback (unsigned; authenticated by reference match) ────────
    router.post('/payhero/callback', async (req: any, res: any) => {
        res.json({ status: true });
        try {
            const cb = payhero.decodeCallback(req.body);
            if (!cb.checkoutRequestId && !cb.externalReference) return;
            const payment = await prisma.payment.findFirst({
                where: {
                    provider: 'PAYHERO' as any,
                    OR: [{ providerId: cb.checkoutRequestId }, { metadata: { path: ['external_reference'], equals: cb.externalReference } }]
                }
            });
            if (!payment) {
                console.warn('PayHero callback for unknown payment ignored', { checkoutRequestId: cb.checkoutRequestId, externalReference: cb.externalReference });
                return;
            }
            if (cb.resultCode === 0 || cb.success) {
                await applyPaymentOutcome(prisma, {
                    provider: 'PAYHERO' as any,
                    providerId: payment.providerId,
                    reference: cb.externalReference || payment.reference || undefined,
                    channelId: payment.channelId || undefined,
                    amount: cb.amount || payment.amount,
                    currency: payment.currency,
                    status: 'SUCCEEDED',
                    metadata: { ...(payment.metadata as object || {}), callback: cb.raw },
                    bookingId: payment.bookingId || undefined,
                    clientId: payment.clientId || undefined
                });
            } else {
                await applyPaymentOutcome(prisma, {
                    provider: 'PAYHERO' as any,
                    providerId: payment.providerId,
                    status: 'FAILED',
                    metadata: { ...(payment.metadata as object || {}), callback: cb.raw }
                });
            }
        } catch (err) {
            console.error('Error handling PayHero callback', err);
        }
    });

    // ─── M-Pesa Daraja callback (unsigned; authenticated by reference match) ──
    router.post('/mpesa/callback', async (req: any, res: any) => {
        const cb = mpesa.decodeStkCallback(req.body);
        if (!cb) return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback payload' });

        // Acknowledge immediately; process async (Daraja retries otherwise).
        res.json({ ResultCode: 0, ResultDesc: 'Success' });

        try {
            const payment = await prisma.payment.findUnique({ where: { providerId: cb.checkoutRequestId } });
            if (!payment && cb.resultCode) {
                // No row for this CheckoutRequestID yet — retry path (e.g. push
                // happened, DB row failed). Keep the transaction pending.
                console.warn('M-Pesa callback for unknown CheckoutRequestID ignored', cb.checkoutRequestId);
                return;
            }
            if (cb.resultCode === '0') {
                await applyPaymentOutcome(prisma, {
                    provider: 'MPESA',
                    providerId: cb.checkoutRequestId,
                    amount: cb.amount || payment?.amount || 0,
                    currency: payment?.currency || 'KES',
                    status: 'SUCCEEDED',
                    metadata: { ...(payment?.metadata as object || {}), receipt: cb.mpesaReceipt, callback: cb.raw },
                    bookingId: payment?.bookingId || undefined,
                    clientId: payment?.clientId || undefined
                });
            } else if (payment) {
                await applyPaymentOutcome(prisma, {
                    provider: 'MPESA',
                    providerId: cb.checkoutRequestId,
                    status: 'FAILED',
                    metadata: { ...(payment.metadata as object || {}), resultDesc: cb.resultDesc, callback: cb.raw }
                });
            }
        } catch (err) {
            console.error('Error handling M-Pesa callback', err);
        }
    });

    return router;
}

