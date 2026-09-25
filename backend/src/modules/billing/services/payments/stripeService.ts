import Stripe from 'stripe';
import prisma from '../../../../db';
import { ts, newId } from '../../../../prisma/db';

const stripeKey = process.env.STRIPE_SECRET || '';
let stripe: Stripe | null = null;
if (stripeKey) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    stripe = new Stripe(stripeKey, { apiVersion: '2024-11-15' } as any);
}

export async function createPaymentIntent(amount: number, currency = 'KES', metadata: Record<string, any> = {}) {
    if (!stripe) throw new Error('Stripe not configured');
    const intent = await stripe.paymentIntents.create({ amount: Math.round(amount * 100), currency, metadata });
    return intent;
}

export async function getPaymentIntent(id: string) {
    if (!stripe) throw new Error('Stripe not configured');
    return stripe.paymentIntents.retrieve(id);
}

export async function reconcilePaymentsWindow(start: Date, end: Date) {
    if (!stripe) throw new Error('Stripe not configured');
    // fetch payments from stripe and reconcile
    const results: any[] = [];
    const it = stripe.paymentIntents.list({ created: { gte: Math.floor(start.getTime() / 1000), lte: Math.floor(end.getTime() / 1000) }, limit: 100 });
    for await (const pi of it) {
        const providerId = pi.id;
        const existing = await prisma.orm.public.Payment.where({ providerId }).first().catch(() => null);
        const status = pi.status === 'succeeded' ? 'SUCCEEDED' : (pi.status === 'requires_payment_method' ? 'FAILED' : 'PENDING');
        const metadata = JSON.parse(JSON.stringify(pi));
        if (!existing) {
            // create a payment record to reconcile
            await prisma.orm.public.Payment.create({
                    id: newId(),
                    updatedAt: ts(),
                provider: 'STRIPE' as any,
                providerId,
                amount: (pi.amount_received || pi.amount || 0) / 100,
                currency: String(pi.currency || 'KES').toUpperCase(),
                status: status as any,
                metadata,
                bookingId: pi.metadata?.bookingId || null,
                clientId: null,
                reference: null,
                channelId: null,
            });
            results.push({ providerId, action: 'created' });
        } else {
            // update status if different
            if (existing.status !== status) {
                await prisma.orm.public.Payment.where({ id: existing.id }).update({ status: status as any, metadata });
                results.push({ providerId, action: 'updated', from: existing.status, to: status });
            }
        }
    }
    return results;
}
