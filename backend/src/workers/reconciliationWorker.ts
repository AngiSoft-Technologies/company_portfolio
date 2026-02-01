import { createWorker } from '../queue';
import prisma from '../db';

export function startReconciliationWorker() {
    try {
        const worker = createWorker('reconciliation', async (job: any) => {
            console.log('Running reconciliation job');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const Stripe = require('stripe');
            const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2024-11-15' });
            const end = new Date();
            const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const it = stripe.paymentIntents.list({ created: { gte: Math.floor(start.getTime() / 1000), lte: Math.floor(end.getTime() / 1000) }, limit: 100 });
            let count = 0;
            for await (const pi of it) {
                const providerId = pi.id;
                const existing = await prisma.payment.findUnique({ where: { providerId } });
                if (!existing) {
                    await prisma.payment.create({ data: { provider: 'STRIPE', providerId, amount: (pi.amount_received || pi.amount || 0) / 100, currency: (pi.currency || 'KES').toUpperCase(), status: pi.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING', metadata: JSON.parse(JSON.stringify(pi)) } });
                    count++;
                } else {
                    const status = pi.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING';
                    if (existing.status !== status) {
                        await prisma.payment.update({ where: { id: existing.id }, data: { status, metadata: JSON.parse(JSON.stringify(pi)) } });
                        count++;
                    }
                }
            }
            console.log('Reconciliation completed, processed', count, 'payments');
        });
        return worker;
    } catch (err) {
        console.warn('Reconciliation worker error:', err);
        return null;
    }
}
