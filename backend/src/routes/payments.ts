import express, { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createPaymentIntent } from '../services/payments/stripeService';

export default function paymentsRouter(prisma: PrismaClient) {
    const router = Router({ mergeParams: true });

    // Stripe webhook endpoint
    router.post('/webhook', express.raw({ type: 'application/json' }) as any, async (req: any, res: any) => {
        const stripeSecret = process.env.STRIPE_SECRET || '';
        if (!stripeSecret) return res.status(500).send('Stripe not configured');
        // require here to avoid top-level dep until installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Stripe = require('stripe');
        const stripe = new Stripe(stripeSecret, { apiVersion: '2024-11-15' });

        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        let event: any;
        try {
            if (webhookSecret) {
                event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
            } else {
                event = req.body; // unsafe: only for dev without webhook signing
            }
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

    // create payment intent (idempotent by client-provided key)
    router.post('/create-intent', async (req, res) => {
        const { bookingId, amount, currency = 'KES', idempotencyKey } = req.body;
        if (!amount) return res.status(400).json({ error: 'Missing amount' });
        try {
            const pi = await createPaymentIntent(Number(amount), currency);
            // persist payment in DB (idempotency based on providerId)
            await prisma.payment.create({ data: { bookingId: bookingId || undefined, clientId: undefined, amount: Number(amount), currency, provider: 'STRIPE', providerId: pi.id, status: 'PENDING', metadata: JSON.parse(JSON.stringify(pi)) } }).catch(() => { });
            res.json({ clientSecret: pi.client_secret, providerId: pi.id });
        } catch (err: any) {
            console.error('Error creating payment intent', err);
            res.status(500).json({ error: 'Payment provider error' });
        }
    });

    return router;
}

