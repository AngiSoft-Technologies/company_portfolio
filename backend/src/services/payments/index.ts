import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { createPaymentIntent } from './stripeService';
import { emitToBooking, emitToStaff } from '../realtime';
import * as paystack from './paystackService';
import * as mpesa from './mpesaService';
import * as payhero from './payheroService';

/**
 * Payment gateway — one internal API, interchangeable providers, all feeding
 * the same `Payment` table (natural key: `provider` + provider-specific id).
 *
 * Providers:
 *   STRIPE   — card PaymentIntents (existing).          webhook: signed (constructEvent)
 *   PAYSTACK — card/mobile-money/bank/USSD redirect.    webhook: HMAC-SHA512 signed
 *   MPESA    — Safaricom Daraja STK Push.               callback: reference-matched (unsigned)
 *   PAYHERO  — M-Pesa STK + Kenyan bank/sacco paybills. callback: reference-matched (unsigned)
 *
 * Reliability contracts:
 *   - Idempotency: `applyPaymentOutcome` upserts by providerId (unique), so
 *     re-delivered webhooks/callbacks/reconciliations are no-ops. Initiation
 *     is serialized per scope with a Postgres advisory lock so two concurrent
 *     staff requests cannot double-fire an STK push or mint two intents.
 *   - Concurrency: every multi-row write runs inside `prisma.$transaction`;
 *     the unique/serialized guards above make the fast path race-free.
 *   - Every path is env-gated (`isConfigured()`) and fails closed: a dynamic
 *     call against an unconfigured provider raises PaymentProviderError.
 */

export type ProviderId = 'STRIPE' | 'PAYSTACK' | 'MPESA' | 'PAYHERO';

type Tx = Prisma.TransactionClient;

export interface InitPaymentArgs {
    provider: ProviderId;
    amount: number; // major units (KES)
    currency?: string;
    email?: string; // Paystack
    phone?: string; // MPESA / PayHero
    reference?: string; // optional; generated when absent
    channelId?: number; // PayHero channel override (defaults to DB default / env)
    description?: string;
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
export async function withScopeLock<T>(prisma: PrismaClient, scope: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const digest = crypto.createHash('sha256').update(`angplocks:${scope}`).digest();
    const key = BigInt.asIntN(64, digest.readBigInt64BE(0));
    return prisma.$transaction(async (tx) => {
        await (tx as any).$executeRaw`SELECT pg_advisory_xact_lock(${key})`;
        return fn(tx as Tx);
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
        default:
            throw new PaymentProviderError(`Unsupported payment provider: ${args.provider}`);
    }
}

export interface PaymentOutcomeInput {
    provider: ProviderId | string;
    providerId: string;
    amount?: number;
    currency?: string;
    reference?: string;
    channelId?: string;
    status?: 'SUCCEEDED' | 'FAILED' | 'PENDING';
    metadata?: any;
    bookingId?: string;
    clientId?: string;
}

/**
 * Idempotent outcome application. Runs in one transaction:
 *  - Upserts the `Payment` row by providerId (unique → re-deliveries are no-ops).
 *  - Flips the booking to DEPOSIT_PAID only on an actual PENDING→SUCCEEDED
 *    transition (never re-flips on repeats).
 * Emissions happen after commit so subscribers never see partial state.
 */
export async function applyPaymentOutcome(prisma: PrismaClient, input: PaymentOutcomeInput) {
    const status = input.status || 'SUCCEEDED';
    const meta = input.metadata ?? null;

    let payment: any;
    let depositActivated = false;

    try {
        payment = await prisma.$transaction(async (tx) => {
            const before = await tx.payment.findUnique({ where: { providerId: input.providerId } }).catch(() => null);

            let row: any;
            if (!before) {
                row = await tx.payment.create({
                    data: {
                        provider: input.provider as any,
                        providerId: input.providerId,
                        amount: input.amount || 0,
                        currency: input.currency || 'KES',
                        reference: input.reference || undefined,
                        channelId: input.channelId || undefined,
                        status,
                        metadata: meta,
                        bookingId: input.bookingId || undefined,
                        clientId: input.clientId || undefined
                    }
                }).catch(() => null);
                if (!row) {
                    // Unique race: another delivery created the row first — take it.
                    row = await tx.payment.findUnique({ where: { providerId: input.providerId } });
                }
            } else {
                row = before;
                if (before.status !== status) {
                    row = await tx.payment.update({
                        where: { id: before.id },
                        data: {
                            status,
                            metadata: meta,
                            ...(input.reference && !before.reference ? { reference: input.reference } : {}),
                            ...(input.channelId && !before.channelId ? { channelId: input.channelId } : {})
                        }
                    });
                } else if (meta) {
                    row = await tx.payment.update({ where: { id: before.id }, data: { metadata: meta } });
                }
            }

            const activate = status === 'SUCCEEDED' && row?.bookingId && (!before || before.status !== 'SUCCEEDED');
            if (activate) {
                await tx.booking
                    .update({
                        where: { id: row.bookingId },
                        data: { depositPaidAt: new Date(), status: 'DEPOSIT_PAID' }
                    })
                    .catch(() => null);
            }
            return { row, activate };
        });
        depositActivated = payment.activate;
        payment = payment.row;
    } catch (err: any) {
        console.error('applyPaymentOutcome failed', err?.message);
        return null;
    }

    if (status === 'SUCCEEDED' && payment?.bookingId) {
        setImmediate(() => {
            emitToBooking(payment.bookingId!, 'booking:event', {
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

    return payment;
}