import Stripe from 'stripe';
import prisma from '../../db';

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
    // fetch payments from stripe and reconcile
    const results: any[] = [];
    const it = stripe.paymentIntents.list({ created: { gte: Math.floor(start.getTime() / 1000), lte: Math.floor(end.getTime() / 1000) }, limit: 100 });
    for await (const pi of it) {
        // find existing payment
        const providerId = pi.id;
        const existing = await prisma.payment.findUnique({ where: { providerId } }).catch(() => null);
        if (!existing) {
            // create a payment record to reconcile
            await prisma.payment.create({ data: { provider: 'STRIPE', providerId, amount: (pi.amount_received || pi.amount || 0) / 100, currency: (pi.currency || 'KES').toUpperCase(), status: pi.status === 'succeeded' ? 'SUCCEEDED' : (pi.status === 'requires_payment_method' ? 'FAILED' : 'PENDING'), metadata: { raw: pi } } });
            results.push({ providerId, action: 'created' });
        } else {
            // update status if different
            const status = pi.status === 'succeeded' ? 'SUCCEEDED' : (pi.status === 'requires_payment_method' ? 'FAILED' : 'PENDING');
            if (existing.status !== status) {
                await prisma.payment.update({ where: { id: existing.id }, data: { status, metadata: { raw: pi } } });
                results.push({ providerId, action: 'updated', from: existing.status, to: status });
            }
        }
    }
    return results;
}
