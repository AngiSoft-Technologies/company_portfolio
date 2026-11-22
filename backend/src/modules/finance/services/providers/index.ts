/**
 * Provider routing facade for the Finance Hub.
 *
 * All finance operations go through this module so capability checks, rail
 * selection and provider-specific adapters live in one place. Every action is
 * capability-gated; missing credentials produce a clear error before a network
 * call is attempted. Stripe/Paystack are legacy-only and are never routed.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { Db } from '../../../../db';
import { getConfig } from '../../../../shared/services/runtimeConfig';
import {
  capabilityReason,
  getProviderCapabilities,
  isCapabilityEnabled,
  listPayHeroChannels,
  normalizeProvider,
  type FinanceAction,
  type RailRegion,
} from '../capabilityMatrix';
import * as paypal from '../../../billing/services/payments/paypalService';
import * as paypalPayouts from '../../../billing/services/payments/paypalPayouts';
import * as payhero from '../../../billing/services/payments/payheroService';
import * as mpesa from '../../../billing/services/payments/mpesaService';
import * as daraja from '../../../billing/services/payments/darajaPayouts';
import * as pesaflow from './pesaflow';

export class FinanceProviderError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'FinanceProviderError';
  }
}

export interface RailSelection {
  provider: string;
  region: RailRegion;
  currency: string;
  settlementCurrency: string;
  channel?: string;
  channelId?: number;
  networkCode?: string;
  reason: string;
  metadata: Record<string, unknown>;
}

export interface SelectRailInput {
  currency?: string;
  country?: string;
  channel?: string;
  amount?: number | string | null;
  providerHint?: string;
  /** Capability to validate while selecting; defaults to collect. */
  action?: FinanceAction;
  originalCurrency?: string;
  originalAmount?: number | string | null;
}

const EAST_AFRICA_COUNTRIES = new Set(['KE', 'KEN', 'KENYA', 'TZ', 'TZA', 'TANZANIA', 'UG', 'UGA', 'UGANDA', 'RW', 'RWA', 'RWANDA', 'ET', 'ETH', 'ETHIOPIA']);
const EAST_AFRICA_CHANNEL = /m.?pesa|airtel|telco|operator|bank|sacco|paybill|wallet|mpesa_stk/i;

function upper(value: unknown, fallback = ''): string {
  return String(value || '').trim().toUpperCase() || fallback;
}

function payheroChannelFor(channel: string | undefined): { networkCode?: string; channelId?: number; channel?: string } {
  const value = String(channel || '').toLowerCase();
  const configuredChannels = listPayHeroChannels();
  const enabled = (id: string) => configuredChannels.some((item) => item.id === id && item.enabled);
  if (/airtel/.test(value)) {
    return {
      networkCode: enabled('AIRTEL_MONEY') ? getConfig('PAYHERO_MOBILE_NETWORK_CODE', 'airtel') : undefined,
      channelId: Number(getConfig('PAYHERO_AIRTEL_CHANNEL_ID') || 0) || undefined,
      channel: 'mobile',
    };
  }
  if (/telco|operator/.test(value)) {
    return {
      networkCode: enabled('TELCO') ? getConfig('PAYHERO_MOBILE_NETWORK_CODE', 'telco') : undefined,
      channelId: Number(getConfig('PAYHERO_TELCO_CHANNEL_ID') || 0) || undefined,
      channel: 'mobile',
    };
  }
  if (/bank|sacco|paybill/.test(value)) {
    return {
      networkCode: enabled('BANK_B2B') ? getConfig('PAYHERO_BANK_NETWORK_CODE') || undefined : undefined,
      channel: 'bank',
    };
  }
  return {
    networkCode: enabled('SAFARICOM_B2C') ? getConfig('PAYHERO_MOBILE_NETWORK_CODE', 'safaricom') : undefined,
    channelId: Number(getConfig('PAYHERO_CHANNEL_ID') || 0) || undefined,
    channel: 'mobile',
  };
}

/**
 * Encode the payment-rail policy:
 *   - Non-KES/international → PayPal, settling in PAYPAL_CURRENCY while the
 *     original invoice currency/amount is preserved in metadata.
 *   - KES / EA channels / EA countries → PayHero or Safaricom Daraja.
 *   - Legacy providers are never selected.
 */
export async function selectPaymentRail(prisma: Db, input: SelectRailInput): Promise<RailSelection> {
  const action = input.action || 'collect';
  const currency = upper(input.currency, 'KES');
  const country = upper(input.country, currency === 'KES' ? 'KE' : '');
  const channel = String(input.channel || '');
  // Non-KES is international by definition; a non-EA country is international
  // even when the invoice happens to be denominated in KES.
  const isInternational = currency !== 'KES' || Boolean(country && !EAST_AFRICA_COUNTRIES.has(country));
  const isEastAfrica = !isInternational && (
    currency === 'KES' && (!country || EAST_AFRICA_COUNTRIES.has(country) || EAST_AFRICA_CHANNEL.test(channel))
  );

  // Active finance accounts are advisory: they break ties between two ready
  // rails, but an account is not required to route a provider action.
  const accountProviders = new Set<string>();
  try {
    const accounts = await (prisma.orm.public.FinanceAccount
      .where({ status: 'ACTIVE' } as any)
      .select('provider')
      .all() as unknown as Promise<any[]>);
    for (const account of accounts || []) accountProviders.add(normalizeProvider(account.provider));
  } catch {
    // Absence of account data must not disable a configured rail.
  }

  const canUse = (provider: string) => isCapabilityEnabled(provider, action)
    && !getProviderCapabilities(provider).legacy;

  const baseMetadata: Record<string, unknown> = {
    routingPolicy: isInternational ? 'INTERNATIONAL_DEFAULT_PAYPAL' : 'EAST_AFRICA_DEFAULT_LOCAL_RAILS',
    requestedCurrency: currency,
    originalCurrency: input.originalCurrency || currency,
    originalAmount: input.originalAmount ?? input.amount ?? null,
    country: country || null,
    channel: channel || null,
  };

  if (input.providerHint && !canUse(normalizeProvider(input.providerHint))) {
    throw new FinanceProviderError(
      `Provider ${normalizeProvider(input.providerHint)} cannot be used for ${action}: ${capabilityReason(input.providerHint, action)}`,
      400,
    );
  }
  if (isInternational && input.providerHint && normalizeProvider(input.providerHint) !== 'PAYPAL') {
    throw new FinanceProviderError(
      'PayPal is the required rail for international/non-KES transactions',
      400,
    );
  }
  if (isEastAfrica && input.providerHint && ['PAYPAL', 'STRIPE', 'PAYSTACK'].includes(normalizeProvider(input.providerHint))) {
    throw new FinanceProviderError(
      'PayPal/Stripe/Paystack are not East Africa rails; use PayHero or Daraja',
      400,
    );
  }

  if (isInternational) {
    const provider = input.providerHint ? normalizeProvider(input.providerHint) : 'PAYPAL';
    if (!canUse(provider)) {
      throw new FinanceProviderError(
        `No configured international rail for ${action}: ${capabilityReason('PAYPAL', action)}`,
        503,
      );
    }
    // One authoritative currency helper: the same validation the Orders and
    // Payouts adapters use, so a misconfigured PAYPAL_CURRENCY fails at routing.
    let settlementCurrency: string;
    try {
      settlementCurrency = paypal.settlementCurrency();
    } catch (err: any) {
      throw new FinanceProviderError(
        `PayPal settlement currency is unavailable: ${String(err?.message || err).slice(0, 300)}`,
        503,
      );
    }
    return {
      provider,
      region: 'INTERNATIONAL',
      currency,
      settlementCurrency,
      reason: 'PayPal is the default international rail; original invoice currency/amount preserved in metadata',
      metadata: { ...baseMetadata, settlementCurrency },
    };
  }

  if (isEastAfrica) {
    const forced = input.providerHint ? normalizeProvider(input.providerHint) : null;
    const prefersDaraja = /safaricom|daraja|mpesa/i.test(channel);
    const candidates = forced
      ? [forced]
      : prefersDaraja
        ? ['MPESA', 'PAYHERO', 'PESAFLOW']
        : ['PAYHERO', 'MPESA', 'PESAFLOW'];
    // Prefer a rail that has a finance account configured, then capability.
    candidates.sort((a, b) => Number(accountProviders.has(b)) - Number(accountProviders.has(a)));
    const provider = candidates.find(canUse);
    if (!provider) {
      throw new FinanceProviderError(
        `No configured East Africa rail for ${action}. Configure PayHero or Daraja credentials.`,
        503,
      );
    }
    const channelInfo = provider === 'PAYHERO' ? payheroChannelFor(channel) : {};
    return {
      provider,
      region: 'EAST_AFRICA',
      currency: 'KES',
      settlementCurrency: 'KES',
      ...channelInfo,
      reason: forced
        ? `Provider hint ${provider} selected and capability-checked`
        : `${provider} selected as the configured East Africa rail`,
      metadata: {
        ...baseMetadata,
        settlementCurrency: 'KES',
        channelId: channelInfo.channelId ?? null,
        networkCode: channelInfo.networkCode ?? null,
      },
    };
  }

  throw new FinanceProviderError(`Unsupported currency/country combination: ${currency}/${country || 'unknown'}`, 400);
}

function gate(provider: unknown, action: FinanceAction): string {
  const key = normalizeProvider(provider);
  if (isCapabilityEnabled(key, action)) return key;
  throw new FinanceProviderError(
    `${key} does not support ${action}: ${capabilityReason(key, action)}`,
    400,
  );
}

function requireValue(value: unknown, message: string): string {
  const text = String(value || '').trim();
  if (!text) throw new FinanceProviderError(message, 400);
  return text;
}

export interface ProviderOperationInput {
  provider: string;
  reference: string;
  amount?: number | string;
  currency?: string;
  phone?: string;
  receiver?: string;
  recipientType?: string;
  channel?: string;
  channelId?: number;
  networkCode?: string;
  accountNumber?: string;
  shortcode?: string;
  commandId?: string;
  captureId?: string;
  transactionId?: string;
  batchId?: string;
  itemId?: string;
  refundId?: string;
  orderId?: string;
  reason?: string;
  description?: string;
  email?: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
  periodStart?: string;
  periodEnd?: string;
  financeAccountId?: string;
}

function amountNumber(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new FinanceProviderError('A positive amount is required', 400);
  }
  return amount;
}

/** Collect money (C2B) through the selected provider adapter. */
export async function collect(provider: unknown, input: ProviderOperationInput): Promise<any> {
  const key = gate(provider, 'collect');
  const reference = requireValue(input.reference, 'A reference is required');
  const amount = amountNumber(input.amount);
  const original = {
    originalCurrency: String(input.metadata?.originalCurrency || input.currency || 'KES'),
    originalAmount: input.metadata?.originalAmount ?? input.amount ?? null,
  };
  try {
    if (key === 'PAYPAL') {
      const result = await paypal.createOrder({
        amount,
        currency: input.currency,
        reference,
        description: input.description,
        email: input.email,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        invoiceId: String(input.metadata?.invoiceId || ''),
        bookingId: String(input.metadata?.bookingId || ''),
        clientId: String(input.metadata?.clientId || ''),
      });
      return {
        ...result,
        provider: key,
        settlementCurrency: result.currency,
        metadata: {
          ...(input.metadata || {}),
          ...original,
          settlementCurrency: result.currency,
        },
      };
    }
    if (key === 'PESAFLOW') {
      const result = await pesaflow.collect({
        reference,
        amount,
        currency: input.currency || pesaflow.currency(),
        phone: requireValue(input.phone, 'PesaFlow collect requires a phone number'),
        channel: input.channel,
        callbackUrl: getConfig('PESAFLOW_CALLBACK_URL') || undefined,
        metadata: input.metadata,
      });
      return { ...result, provider: key, metadata: { ...(input.metadata || {}), ...original } };
    }
    if (key === 'PAYHERO') {
      const channelInfo = payheroChannelFor(input.channel);
      const channelId = input.channelId ?? channelInfo.channelId;
      if (!channelId) {
        throw new FinanceProviderError(
          `PayHero channel is not configured for ${input.channel || 'default'}: ${capabilityReason('PAYHERO', 'collect')}`,
          503,
        );
      }
      const result = await payhero.initStkPush({
        phone: requireValue(input.phone, 'PayHero collect requires a phone number'),
        amount,
        reference,
        channelId,
        description: input.description,
      });
      return { ...result, provider: key, metadata: { ...(input.metadata || {}), ...original, channelId } };
    }
    if (key === 'MPESA') {
      const result = await mpesa.initStkPush({
        phone: requireValue(input.phone, 'Daraja collect requires a phone number'),
        amount,
        reference,
        description: input.description,
      });
      return { ...result, provider: key, metadata: { ...(input.metadata || {}), ...original } };
    }
    throw new FinanceProviderError(`No collect adapter for ${key}`, 400);
  } catch (err: any) {
    throw err instanceof FinanceProviderError
      ? err
      : new FinanceProviderError(`Collect failed via ${key}: ${String(err?.message || err).slice(0, 300)}`, 502);
  }
}

/** Refund a captured payment through the selected provider adapter. */
export async function refund(provider: unknown, input: ProviderOperationInput): Promise<any> {
  const key = gate(provider, 'refund');
  try {
    if (key === 'PAYPAL') {
      const settlementCurrency = paypal.settlementCurrency(input.currency);
      const result = await paypalPayouts.refundCapture({
        captureId: requireValue(input.captureId || input.reference, 'A PayPal captureId is required'),
        reference: requireValue(input.reference, 'A refund reference is required'),
        ...(input.amount !== undefined ? { amount: amountNumber(input.amount) } : {}),
        currency: settlementCurrency,
      });
      return {
        ...result,
        provider: key,
        settlementCurrency: result.currency || settlementCurrency,
        metadata: {
          ...(input.metadata || {}),
          originalCurrency: String(input.metadata?.originalCurrency || input.currency || settlementCurrency),
          originalAmount: input.metadata?.originalAmount ?? input.amount ?? null,
          settlementCurrency: result.currency || settlementCurrency,
        },
      };
    }
    if (key === 'PESAFLOW') {
      return {
        ...(await pesaflow.refund({
          reference: requireValue(input.reference, 'A PesaFlow reference is required'),
          amount: input.amount,
          currency: input.currency,
          reason: input.reason,
        })),
        provider: key,
      };
    }
    throw new FinanceProviderError(`No refund adapter for ${key}`, 400);
  } catch (err: any) {
    throw err instanceof FinanceProviderError
      ? err
      : new FinanceProviderError(`Refund failed via ${key}: ${String(err?.message || err).slice(0, 300)}`, 502);
  }
}

/** Execute an approved B2C/B2B payout through the selected provider adapter. */
export async function payout(
  provider: unknown,
  flow: 'B2C' | 'B2B',
  input: ProviderOperationInput,
): Promise<any> {
  const key = gate(provider, flow === 'B2B' ? 'payout_b2b' : 'payout_b2c');
  const reference = requireValue(input.reference, 'A payout reference is required');
  const amount = amountNumber(input.amount);
  const currency = upper(input.currency, 'KES');
  try {
    if (key === 'PAYPAL') {
      // The rail selection's settlement currency is authoritative; the
      // original invoice currency/amount stay in metadata for reconciliation.
      // Validating the passed value also rejects a KES payload before PayPal.
      const settlementCurrency = paypal.settlementCurrency(input.currency || undefined);
      const result = await paypalPayouts.createPayout({
        reference,
        emailSubject: input.description || 'AngiSoft payment',
        items: [{
          amount,
          currency: settlementCurrency,
          receiver: requireValue(input.receiver, 'A PayPal receiver is required'),
          recipientType: input.recipientType || 'EMAIL',
          note: input.description || 'AngiSoft payment',
          senderItemId: `${reference}-1`,
        }],
      });
      return {
        ...result,
        provider: key,
        settlementCurrency,
        metadata: {
          ...(input.metadata || {}),
          originalCurrency: String(input.metadata?.originalCurrency || currency),
          originalAmount: input.metadata?.originalAmount ?? amount,
          settlementCurrency,
        },
      };
    }
    if (key === 'PAYHERO') {
      const channelInfo = payheroChannelFor(input.channel || (flow === 'B2B' ? 'bank' : 'mobile'));
      const networkCode = requireValue(
        input.networkCode || channelInfo.networkCode,
        'A PayHero network code is required (configure PAYHERO_MOBILE_NETWORK_CODE or PAYHERO_BANK_NETWORK_CODE)',
      );
      const result = await payhero.withdraw({
        amount,
        reference,
        channel: flow === 'B2B' ? 'bank' : 'mobile',
        phone: input.phone || undefined,
        accountNumber: input.accountNumber || undefined,
        networkCode,
        description: input.description,
      });
      return { ...result, provider: key, metadata: { ...(input.metadata || {}), networkCode } };
    }
    if (key === 'MPESA') {
      if (flow === 'B2B') {
        const result = await daraja.b2bPayment({
          amount,
          partyB: requireValue(input.shortcode || input.accountNumber, 'A recipient shortcode is required'),
          commandId: (input.commandId || 'BusinessToBusinessTransfer') as any,
          remarks: input.description || 'AngiSoft supplier payment',
          originatorConversationId: reference,
        });
        return { ...result, provider: key };
      }
      const result = await daraja.b2cPayment({
        amount,
        phone: requireValue(input.phone, 'A recipient phone number is required'),
        commandId: (input.commandId || 'BusinessPayment') as any,
        remarks: input.description || 'AngiSoft payout',
        originatorConversationId: reference,
      });
      return { ...result, provider: key };
    }
    throw new FinanceProviderError(`No payout adapter for ${key}`, 400);
  } catch (err: any) {
    throw err instanceof FinanceProviderError
      ? err
      : new FinanceProviderError(`Payout failed via ${key}: ${String(err?.message || err).slice(0, 300)}`, 502);
  }
}

/** Reverse a completed M-Pesa transaction (Daraja only). */
export async function reversal(provider: unknown, input: ProviderOperationInput): Promise<any> {
  const key = gate(provider, 'reversal');
  if (key !== 'MPESA') throw new FinanceProviderError(`No reversal adapter for ${key}`, 400);
  const result = await daraja.reverseTransaction({
    transactionId: requireValue(input.transactionId || input.reference, 'A transactionId is required'),
    amount: amountNumber(input.amount),
    remarks: input.description || 'AngiSoft reversal',
    originatorConversationId: input.reference,
  });
  return { ...result, provider: key };
}

/** Live status lookup across configured adapters. */
export async function status(provider: unknown, input: ProviderOperationInput): Promise<any> {
  const key = gate(provider, 'status');
  try {
    if (key === 'PAYHERO') {
      return {
        provider: key,
        status: await payhero.getTransactionStatus(requireValue(input.reference, 'A reference is required')),
      };
    }
    if (key === 'MPESA') {
      return {
        provider: key,
        status: await daraja.queryTransactionStatus({
          transactionId: requireValue(input.transactionId || input.reference, 'A transactionId is required'),
        }),
      };
    }
    if (key === 'PESAFLOW') {
      return { provider: key, status: await pesaflow.status(requireValue(input.reference, 'A reference is required')) };
    }
    if (key === 'PAYPAL') {
      if (input.refundId) return { provider: key, status: await paypalPayouts.getRefund(input.refundId) };
      if (input.batchId) {
        return {
          provider: key,
          status: input.itemId
            ? await paypalPayouts.getPayoutItem(input.batchId, input.itemId)
            : await paypalPayouts.getPayout(input.batchId),
        };
      }
      return { provider: key, status: await paypal.getOrder(requireValue(input.orderId || input.reference, 'An orderId is required')) };
    }
    throw new FinanceProviderError(`No status adapter for ${key}`, 400);
  } catch (err: any) {
    throw err instanceof FinanceProviderError
      ? err
      : new FinanceProviderError(`Status lookup failed via ${key}: ${String(err?.message || err).slice(0, 300)}`, 502);
  }
}

/** Fetch settlements from providers that expose a settlement endpoint. */
export async function settlements(provider: unknown, input: Partial<ProviderOperationInput> = {}): Promise<any[]> {
  const key = gate(provider, 'settlement');
  if (key === 'PESAFLOW') {
    return pesaflow.settlements({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      financeAccountId: input.financeAccountId,
    });
  }
  if (key === 'PAYPAL' && input.reference) {
    const batch = await paypalPayouts.getPayout(input.reference);
    return batch ? [batch] : [];
  }
  throw new FinanceProviderError(`No settlement adapter for ${key}`, 400);
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Verify provider webhook signatures; legacy providers are rejected. */
export async function verifyWebhook(
  provider: unknown,
  rawBody: string | Buffer,
  headers: Record<string, any>,
): Promise<boolean> {
  const key = gate(provider, 'webhook');
  if (key === 'PAYPAL') return paypal.verifyWebhookSignature(headers, Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody));
  if (key === 'PESAFLOW') return pesaflow.verifyWebhookSignature(rawBody, headers);
  if (key === 'PAYHERO') {
    const expected = getConfig('PAYHERO_CALLBACK_TOKEN');
    const provided = String(headers?.['x-callback-token'] || headers?.['x-payhero-token'] || headers?.['token'] || '');
    return Boolean(expected && provided && constantTimeEquals(expected, provided));
  }
  if (key === 'MPESA') {
    const expected = getConfig('MPESA_CALLBACK_TOKEN');
    const provided = String(headers?.['x-callback-token'] || headers?.['token'] || '');
    return Boolean(expected && provided && constantTimeEquals(expected, provided));
  }
  if (key === 'GENERIC') return true;
  throw new FinanceProviderError(`No webhook verifier for ${key}`, 400);
}

/** HMAC helper used when a provider sends a raw shared-secret signature. */
export function hmacHex(secret: string, body: string | Buffer, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
  return createHmac(algorithm, secret).update(body).digest('hex');
}

export {
  capabilityReason,
  getProviderCapabilities,
  isCapabilityEnabled,
  listPayHeroChannels,
  normalizeProvider,
  pesaflow,
};
export type { FinanceAction };
