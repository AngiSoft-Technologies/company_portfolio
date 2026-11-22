import crypto from 'crypto';
import { emitToBooking, emitToStaff } from '../../../../shared/services/realtime';
import type { Db, Tx } from '../../../../db';
import { ts, newId } from '../../../../prisma/db';
import { createPaymentIntent } from './stripeService';
import * as paystack from './paystackService';
import * as mpesa from './mpesaService';
import * as payhero from './payheroService';
import * as paypal from './paypalService';
import { toMoney, type MoneyInput } from '../../utils/money';
import { recordInvoicePayment } from '../../../crm/services/invoices';
import { createNotification } from '../../../notifications/services/notifications';
import { recordProviderEvent } from '../../../../shared/services/providerEvents';
import { postLedgerEntry, resolveFinanceAccount, recordLedgerFailure } from '../../../finance/services/ledger';

/**
 * Payment gateway — one internal API, interchangeable providers, all feeding
 * the same `Payment` table (natural key: `provider` + provider-specific id).
 *
 * Providers:
 *   STRIPE   — card PaymentIntents (existing).          webhook: signed (constructEvent)
 *   PAYSTACK — card/mobile-money/bank/USSD redirect.    webhook: HMAC-SHA512 signed
 *   MPESA    — Safaricom Daraja STK Push.               callback: reference-matched (unsigned)
 *   PAYHERO  — M-Pesa STK + Kenyan bank/sacco paybills. callback: reference-matched (unsigned)
 *   PAYPAL   — PayPal wallet/cards/Pay Later via Orders v2. webhook: PayPal verify-signature API
 *
 * Reliability contracts (Prisma 8 edition):
 *   - Idempotency: `applyPaymentOutcome` upserts by providerId (unique), so
 *     re-delivered webhooks/callbacks/reconciliations are no-ops. Initiation
 *     is serialized per scope with a Postgres advisory lock so two concurrent
 *     staff requests cannot double-fire an STK push or mint two intents.
 *   - Concurrency: every multi-row write runs inside `db.transaction`; the
 *     unique guards above make the fast path race-free.
 *   - Every path is env-gated (`isConfigured()`) and fails closed.
 */

export type ProviderId = 'STRIPE' | 'PAYSTACK' | 'MPESA' | 'PAYHERO' | 'PAYPAL';

export interface InitPaymentArgs {
    provider: ProviderId;
    amount: number; // major units (KES)
    currency?: string;
    email?: string; // Paystack
    phone?: string; // MPESA / PayHero
    reference?: string; // optional; generated when absent
    channelId?: number; // PayHero channel override (defaults to env PAYHERO_CHANNEL_ID)
    description?: string;
    returnUrl?: string; // PayPal buyer-return URL (defaults to FRONTEND_URL/portal)
    cancelUrl?: string; // PayPal buyer-cancel URL
    metadata?: Record<string, unknown>;
}

export interface PaymentInitResult {
    provider: ProviderId;
    providerId: string; // unique provider-side reference (natural key)
    kind: 'card' | 'redirect' | 'stk';
    clientSecret?: string; // Stripe
    checkoutUrl?: string; // Paystack hosted checkout
    details?: any;
}

export class PaymentProviderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PaymentProviderError';
    }
}

export function isProviderConfigured(provider: ProviderId) {
    switch (provider) {
        case 'STRIPE': return Boolean(process.env.STRIPE_SECRET);
        case 'PAYSTACK': return paystack.isConfigured();
        case 'MPESA': return mpesa.isConfigured();
        case 'PAYHERO': return payhero.isConfigured();
        case 'PAYPAL': return paypal.isConfigured();
        default: return false;
    }
}

export function generateReference(prefix = 'ANG') {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Serialize an idempotency scope (e.g. `booking:abc:PAYHERO`) with a Postgres
 * advisory lock held for the duration of the transaction. Concurrent calls
 * with the same scope run one at a time, so a data-dependent "find pending —
 * initiate — insert" sequence cannot double-fire.
 */
export async function withScopeLock<T>(prisma: Db, scope: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const digest = crypto.createHash('sha256').update(`angplocks:${scope}`).digest();
    const key = BigInt.asIntN(64, digest.readBigInt64BE(0));
    return prisma.transaction(async (tx) => {
        // pg_advisory_xact_lock returns void — execute as a non-row plan; the
        // lock is held until this transaction commits or rolls back.
        const lock = prisma.raw.sql`SELECT pg_advisory_xact_lock(${key})`.affectedCount().build();
        await tx.execute(lock);
        return fn(tx);
    });
}

/** Prepare a payment with the chosen provider. Does NOT persist anything. */
export async function initializePayment(args: InitPaymentArgs): Promise<PaymentInitResult> {
    const amount = Number(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new PaymentProviderError('Invalid amount');
    }
    const reference = args.reference || generateReference();

    switch (args.provider) {
        case 'STRIPE': {
            const pi = await createPaymentIntent(amount, args.currency || 'KES', {
                bookingId: String(args.metadata?.bookingId || ''),
                actor: String(args.metadata?.actor || ''),
                idempotencyKey: reference
            });
            return { provider: 'STRIPE', providerId: pi.id, kind: 'card', clientSecret: pi.client_secret as string, details: pi };
        }
        case 'PAYSTACK': {
            if (!paystack.isConfigured()) throw new PaymentProviderError('Paystack not configured');
            if (!args.email) throw new PaymentProviderError('Paystack requires a customer email');
            const result = await paystack.initializeTransaction({
                email: args.email,
                amount,
                currency: args.currency || 'KES',
                reference,
                metadata: { ...(args.metadata || {}), bookingId: String(args.metadata?.bookingId || '') }
            });
            return { provider: 'PAYSTACK', providerId: result.reference, kind: 'redirect', checkoutUrl: result.authorizationUrl, details: result };
        }
        case 'MPESA': {
            if (!mpesa.isConfigured()) throw new PaymentProviderError('M-Pesa not configured');
            if (!args.phone) throw new PaymentProviderError('M-Pesa requires a phone number');
            const result = await mpesa.initStkPush({
                phone: args.phone,
                amount,
                reference,
                description: args.description
            });
            return { provider: 'MPESA', providerId: result.checkoutRequestId, kind: 'stk', details: result };
        }
        case 'PAYHERO': {
            if (!payhero.isConfigured()) throw new PaymentProviderError('PayHero not configured');
            if (!args.phone) throw new PaymentProviderError('PayHero requires a phone number');
            const result = await payhero.initStkPush({
                phone: args.phone,
                amount,
                reference,
                channelId: args.channelId,
                description: args.description
            });
            return { provider: 'PAYHERO', providerId: result.checkoutRequestId, kind: 'stk', details: result };
        }
        case 'PAYPAL': {
            if (!paypal.isConfigured()) throw new PaymentProviderError('PayPal not configured');
            const result = await paypal.createOrder({
                amount,
                currency: args.currency,
                reference,
                description: args.description,
                email: args.email,
                invoiceId: String(args.metadata?.invoiceId || ''),
                bookingId: String(args.metadata?.bookingId || ''),
                clientId: String(args.metadata?.clientId || ''),
                returnUrl: args.returnUrl,
                cancelUrl: args.cancelUrl,
            });
            return {
                provider: 'PAYPAL',
                providerId: result.orderId,
                kind: 'redirect',
                checkoutUrl: result.approvalUrl,
                details: result.details,
            };
        }
        default:
            throw new PaymentProviderError(`Unsupported payment provider: ${args.provider}`);
    }
}

export interface PaymentOutcomeInput {
    provider: ProviderId | string;
    providerId: string;
    amount?: MoneyInput;
    currency?: string;
    reference?: string;
    channelId?: string;
    status?: 'SUCCEEDED' | 'FAILED' | 'PENDING';
    metadata?: any;
    bookingId?: string;
    clientId?: string;
    invoiceId?: string;
}

/**
 * Idempotent outcome application. Runs in one transaction:
 *  - Upserts the `Payment` row by providerId (unique → re-deliveries are no-ops).
 *  - Flips the booking to DEPOSIT_PAID only on an actual PENDING→SUCCEEDED
 *    transition (never re-flips on repeats).
 * Emissions happen after commit so subscribers never see partial state.
 */
export async function applyPaymentOutcome(prisma: Db, input: PaymentOutcomeInput) {
    const status = input.status || 'SUCCEEDED';
    const meta = input.metadata ?? null;

    let payment: any;
    let depositActivated = false;
    let invoiceApplied = false;
    let transitioned = false;

    try {
        const outcome = await prisma.transaction(async (tx) => {
            const before = await tx.orm.public.Payment
                .where({ providerId: input.providerId })
                .first();

            let row: any = before;
            if (!before) {
                try {
                    row = await tx.orm.public.Payment.create({
                    id: newId(),
                    updatedAt: ts(),
                        provider: input.provider as any,
                        providerId: input.providerId,
                        amount: toMoney(input.amount ?? 0),
                        currency: input.currency || 'KES',
                        reference: input.reference ?? null,
                        channelId: input.channelId ?? null,
                        status,
                        metadata: meta,
                        bookingId: input.bookingId ?? null,
                        clientId: input.clientId ?? null,
                    });
                } catch {
                    row = await tx.orm.public.Payment
                        .where({ providerId: input.providerId })
                        .first();
                }
            } else if (before.status !== status) {
                const patch: Record<string, unknown> = { status, metadata: meta };
                if (input.reference && !before.reference) patch.reference = input.reference;
                if (input.channelId && !before.channelId) patch.channelId = input.channelId;
                row = await tx.orm.public.Payment.where({ id: before.id }).update(patch);
            }

            const invoiceId = input.invoiceId ?? meta?.invoiceId ?? meta?.metadata?.invoiceId ?? null;
            const transitioned = !before || before.status !== status;
            let invoiceApplied = false;
            if (status === 'SUCCEEDED' && transitioned && invoiceId && row) {
                try {
                    await recordInvoicePayment(tx as any, String(invoiceId), row.amount);
                    invoiceApplied = true;
                } catch (err: any) {
                    console.warn('Invoice settlement skipped', invoiceId, err?.message);
                }
            }

            const activate = status === 'SUCCEEDED' && row?.bookingId && transitioned;
            if (activate) {
                try {
                    await tx.orm.public.Booking.where({ id: row.bookingId })
                        .update({ depositPaidAt: ts(), status: 'DEPOSIT_PAID' as any });
                } catch {}
            }
            return { row, activate, invoiceApplied, transitioned };
        });
        payment = outcome.row;
        depositActivated = outcome.activate;
        invoiceApplied = outcome.invoiceApplied;
        transitioned = outcome.transitioned;
    } catch (err: any) {
        console.error('applyPaymentOutcome failed', err?.message);
        return null;
    }

    // Phase 7: idempotent provider event + ledger posting for finance observability.
    if (payment && transitioned) {
        try {
            const externalEventId = `${String(input.provider)}:${String(input.providerId)}:${status}`;
            const { event, deduped } = await recordProviderEvent(prisma, {
                provider: String(input.provider),
                domain: 'FINANCE',
                externalEventId,
                eventType: `payment.${status.toLowerCase()}`,
                signatureValid: true,
                payload: { input, paymentId: payment.id },
                status: 'PROCESSED',
            });
            if (!deduped) {
                const amount = toMoney(input.amount ?? payment.amount ?? 0);
                const account = await resolveFinanceAccount(prisma, String(input.provider), String(input.providerId));
                // Phase 7: idempotent ledger + FinanceTransaction posting. The
                // service records a ReconciliationItem and throws on failure;
                // never swallow a missing ledger entry.
                await postLedgerEntry(prisma, {
                    provider: String(input.provider),
                    externalRef: String(input.providerId),
                    entryType: 'PAYMENT',
                    direction: 'IN',
                    amount,
                    fee: 0,
                    currency: String(input.currency || payment.currency || 'KES'),
                    status,
                    financeAccountId: account?.id ?? null,
                    accountRef: account?.externalId ?? account?.id ?? null,
                    sourceType: payment.bookingId ? 'BOOKING' : (input.invoiceId ? 'INVOICE' : 'PAYMENT'),
                    sourceId: payment.bookingId || input.invoiceId || payment.id,
                    providerEventId: event.id,
                    metadata: { paymentId: payment.id, reference: payment.reference, bookingId: payment.bookingId, clientId: payment.clientId },
                });
            }
        } catch (err: any) {
            // Ledger posting failed after the provider settled; persist an
            // explicit exception instead of silently losing the money movement.
            console.error('Finance ledger posting failed', err?.message || err);
            if (!(err as any)?.exceptionRecorded) {
                await recordLedgerFailure(prisma, {
                    message: err?.message || 'Ledger posting failed',
                    error: err,
                    provider: String(input.provider),
                    externalRef: String(input.providerId),
                    amount: input.amount ?? payment.amount ?? 0,
                    currency: String(input.currency || payment.currency || 'KES'),
                    sourceType: 'PAYMENT',
                    sourceId: payment.id,
                }).catch(() => null);
            }
        }
    }

    if (status === 'SUCCEEDED' && payment?.bookingId) {
        setImmediate(() => {
            emitToBooking(payment.bookingId, 'booking:event', {
                bookingId: payment.bookingId,
                type: 'payment_received',
                title: 'Payment received',
                status: 'DEPOSIT_PAID',
            });
            emitToStaff('payment:status', {
                bookingId: payment.bookingId,
                status,
                amount: payment.amount,
                currency: payment.currency,
                providerId: payment.providerId,
                depositActivated,
            });
            // Notify the booking owner (fire-and-forget).
            void prisma.orm.public.Booking
                .where({ id: payment.bookingId })
                .select('id', 'assignedToId', 'publicReference', 'title')
                .first()
                .then((b: any) => {
                    if (b?.assignedToId) {
                        return createNotification(
                            b.assignedToId,
                            'payment.received',
                            `Payment received — ${b.publicReference || b.title}`,
                            `${payment.currency} ${payment.amount} via ${payment.providerId}.`,
                            '/bookings',
                            { bookingId: payment.bookingId, paymentId: payment.id }
                        );
                    }
                    return null;
                })
                .catch(() => undefined);
        });
    } else if (payment?.bookingId) {
        setImmediate(() => {
            emitToStaff('payment:status', {
                bookingId: payment.bookingId,
                status,
                amount: payment.amount,
                currency: payment.currency,
                providerId: payment.providerId,
            });
        });
    }

    if (invoiceApplied) {
        setImmediate(() => {
            emitToStaff('invoice:payment', {
                invoiceId: input.invoiceId ?? meta?.invoiceId ?? meta?.metadata?.invoiceId ?? null,
                paymentId: payment?.id,
                amount: payment?.amount,
                currency: payment?.currency,
                providerId: payment?.providerId,
            });
        });
    }

    return payment;
}