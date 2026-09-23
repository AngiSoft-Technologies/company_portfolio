import { createWorker } from '../queue';
import prisma from '../db';
import { applyPaymentOutcome } from '../services/payments';
import * as payhero from '../services/payments/payheroService';
import * as paystack from '../services/payments/paystackService';

/** Age after which a PENDING row is considered reconcile-worthy (callbacks may have been missed). */
const RECONCILE_AFTER_MS = 2 * 60 * 1000;

function isPayHeroSuccess(status: any) {
    const s = String(status || '').toLowerCase();
    return s.includes('success') || s === 'paid' || s === 'complete';
}

function isPayHeroFailure(status: any) {
    const s = String(status || '').toLowerCase();
    return s.includes('fail') || s.includes('cancel') || s.includes('reject') || s.includes('timeout') || s.includes('revers');
}

export function startReconciliationWorker() {
    try {
        const worker = createWorker('reconciliation', async (job: any) => {
            console.log('Running reconciliation job');
            let count = 0;

            // ─── Stripe (unchanged): pull recent PaymentIntents ─────────────
            if (process.env.STRIPE_SECRET) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const Stripe = require('stripe');
                const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2024-11-15' });
                const end = new Date();
                const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const it = stripe.paymentIntents.list({ created: { gte: Math.floor(start.getTime() / 1000), lte: Math.floor(end.getTime() / 1000) }, limit: 100 });
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
            }

            // ─── PayHero: poll status of PENDING STK payments by reference ──
            if (payhero.isConfigured()) {
                const pending = await prisma.payment.findMany({
                    where: {
                        provider: 'PAYHERO',
                        status: 'PENDING',
                        reference: { not: null },
                        createdAt: { lt: new Date(Date.now() - RECONCILE_AFTER_MS) },
                    },
                    take: 50,
                    orderBy: { createdAt: 'asc' },
                });
                for (const payment of pending) {
                    try {
                        const status = await payhero.getTransactionStatus(payment.reference!);
                        if (isPayHeroSuccess(status.status) || status.success === true) {
                            await applyPaymentOutcome(prisma, {
                                provider: 'PAYHERO',
                                providerId: payment.providerId,
                                reference: payment.reference || undefined,
                                channelId: payment.channelId || undefined,
                                amount: status.amount || payment.amount,
                                currency: payment.currency,
                                status: 'SUCCEEDED',
                                metadata: { ...(payment.metadata as object || {}), reconciled: status.meta },
                                bookingId: payment.bookingId || undefined,
                                clientId: payment.clientId || undefined,
                            });
                            count++;
                        } else if (isPayHeroFailure(status.status)) {
                            await applyPaymentOutcome(prisma, {
                                provider: 'PAYHERO',
                                providerId: payment.providerId,
                                status: 'FAILED',
                                metadata: { ...(payment.metadata as object || {}), reconciled: status.meta },
                            });
                            count++;
                        }
                    } catch (err: any) {
                        console.warn('PayHero payment reconciliation skipped:', err?.message);
                    }
                }

                // ─── PayHero: settle PENDING payouts/top-ups by provider ref ──
                const pendingPayouts = await prisma.payout.findMany({
                    where: {
                        provider: 'PAYHERO',
                        status: 'PENDING',
                        createdAt: { lt: new Date(Date.now() - RECONCILE_AFTER_MS) },
                    },
                    take: 50,
                    orderBy: { createdAt: 'asc' },
                });
                for (const payout of pendingPayouts) {
                    const payoutRef = payout.providerReference || payout.reference;
                    if (!payoutRef) continue;
                    try {
                        const status = await payhero.getTransactionStatus(payoutRef);
                        if (isPayHeroSuccess(status.status)) {
                            await prisma.payout.update({
                                where: { id: payout.id },
                                data: { status: 'SUCCEEDED', completedAt: new Date(), metadata: { ...(payout.metadata as object || {}), reconciled: status.meta } },
                            });
                            count++;
                        } else if (isPayHeroFailure(status.status)) {
                            await prisma.payout.update({
                                where: { id: payout.id },
                                data: { status: 'FAILED', metadata: { ...(payout.metadata as object || {}), reconciled: status.meta } },
                            });
                            count++;
                        }
                    } catch (err: any) {
                        console.warn('PayHero payout reconciliation skipped:', err?.message);
                    }
                }
            }

            // ─── Paystack: verify PENDING card payments by reference ────────
            if (paystack.isConfigured()) {
                const pending = await prisma.payment.findMany({
                    where: {
                        provider: 'PAYSTACK',
                        status: 'PENDING',
                        reference: { not: null },
                        createdAt: { lt: new Date(Date.now() - RECONCILE_AFTER_MS) },
                    },
                    take: 50,
                    orderBy: { createdAt: 'asc' },
                });
                for (const payment of pending) {
                    try {
                        const txn = await paystack.verifyTransaction(payment.reference!);
                        if (txn?.status === 'success') {
                            await applyPaymentOutcome(prisma, {
                                provider: 'PAYSTACK',
                                providerId: payment.providerId,
                                reference: payment.reference || undefined,
                                amount: Number(txn.amount || 0) / 100 || payment.amount,
                                currency: String(txn.currency || payment.currency || 'KES').toUpperCase(),
                                status: 'SUCCEEDED',
                                metadata: { ...(payment.metadata as object || {}), reconciled: txn },
                                bookingId: payment.bookingId || undefined,
                                clientId: payment.clientId || undefined,
                            });
                            count++;
                        } else if (txn?.status === 'failed' || txn?.status === 'abandoned') {
                            if (txn.status === 'failed') {
                                await applyPaymentOutcome(prisma, {
                                    provider: 'PAYSTACK',
                                    providerId: payment.providerId,
                                    status: 'FAILED',
                                    metadata: { ...(payment.metadata as object || {}), reconciled: txn },
                                });
                                count++;
                            }
                        }
                    } catch (err: any) {
                        console.warn('Paystack reconciliation skipped:', err?.message);
                    }
                }
            }

            console.log('Reconciliation completed, processed', count, 'payments/payouts');
        });
        return worker;
    } catch (err) {
        console.warn('Reconciliation worker error:', err);
        return null;
    }
}