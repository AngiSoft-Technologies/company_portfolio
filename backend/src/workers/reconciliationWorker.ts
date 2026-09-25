import { createWorker } from '../queue';
import prisma from '../db';
import { ts } from '../prisma/db';
import { applyPaymentOutcome } from '../modules/billing/services/payments';
import * as payhero from '../modules/billing/services/payments/payheroService';
import * as paystack from '../modules/billing/services/payments/paystackService';

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
                    const existing = await prisma.orm.public.Payment.where({ providerId }).first();
                    const status = pi.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING';
                    const metadata = JSON.parse(JSON.stringify(pi));
                    if (!existing) {
                        await prisma.orm.public.Payment.create({
                            id: crypto.randomUUID(),
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
                        count++;
                    } else if (existing.status !== status) {
                        await prisma.orm.public.Payment.where({ id: existing.id }).update({ status: status as any, metadata });
                        count++;
                    }
                }
            }

            // ─── PayHero: poll status of PENDING STK payments by reference ──
            if (payhero.isConfigured()) {
                const cutoff = ts(Date.now() - RECONCILE_AFTER_MS);
                const pending = await prisma.orm.public.Payment
                    .where((p) => p.provider.eq('PAYHERO'))
                    .where((p) => p.status.eq('PENDING'))
                    .where((p) => p.reference.isNotNull())
                    .where((p) => p.createdAt.lt(cutoff))
                    .orderBy((p) => p.createdAt.asc())
                    .limit(50)
                    .all();
                for (const payment of pending as any[]) {
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
                const pendingPayouts = await prisma.orm.public.Payout
                    .where((p) => p.provider.eq('PAYHERO'))
                    .where((p) => p.status.eq('PENDING'))
                    .where((p) => p.createdAt.lt(cutoff))
                    .orderBy((p) => p.createdAt.asc())
                    .limit(50)
                    .all();
                for (const payout of pendingPayouts as any[]) {
                    const payoutRef = payout.providerReference || payout.reference;
                    if (!payoutRef) continue;
                    try {
                        const status = await payhero.getTransactionStatus(payoutRef);
                        if (isPayHeroSuccess(status.status)) {
                            await prisma.orm.public.Payout.where({ id: payout.id }).update({
                                status: 'SUCCEEDED',
                                completedAt: ts(),
                                metadata: { ...(payout.metadata as object || {}), reconciled: status.meta },
                            });
                            count++;
                        } else if (isPayHeroFailure(status.status)) {
                            await prisma.orm.public.Payout.where({ id: payout.id }).update({
                                status: 'FAILED',
                                metadata: { ...(payout.metadata as object || {}), reconciled: status.meta },
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
                const cutoff = ts(Date.now() - RECONCILE_AFTER_MS);
                const pending = await prisma.orm.public.Payment
                    .where((p) => p.provider.eq('PAYSTACK'))
                    .where((p) => p.status.eq('PENDING'))
                    .where((p) => p.reference.isNotNull())
                    .where((p) => p.createdAt.lt(cutoff))
                    .orderBy((p) => p.createdAt.asc())
                    .limit(50)
                    .all();
                for (const payment of pending as any[]) {
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
                        } else if (txn?.status === 'failed') {
                            await applyPaymentOutcome(prisma, {
                                provider: 'PAYSTACK',
                                providerId: payment.providerId,
                                status: 'FAILED',
                                metadata: { ...(payment.metadata as object || {}), reconciled: txn },
                            });
                            count++;
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