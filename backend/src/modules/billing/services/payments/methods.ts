import { getConfig } from '../../../../shared/services/runtimeConfig';
/**
 * Client-facing payment method catalogue.
 *
 * Only three gateways are exposed to online clients:
 *   PAYPAL  — wallet, cards (Visa/Mastercard/Amex/Discover), Google Pay,
 *             Apple Pay, Pay Later/Venmo and PayPal's other local methods.
 *   PAYHERO — Lipa na M-Pesa STK, Airtel Money and telco/operator wallets.
 *   MPESA   — Safaricom Daraja Lipa na M-Pesa STK push (direct).
 *
 * Every entry is capability-gated: the dashboard shows the full catalogue but
 * a method can only be initiated if its gateway is configured on this
 * deployment. No credentials or secrets are ever returned to the browser.
 */

import type { ProviderId } from './index';
import * as paypal from './paypalService';
import * as payhero from './payheroService';
import * as mpesa from './mpesaService';

export type PaymentMethodId =
  | 'PAYPAL'
  | 'CARD'
  | 'GOOGLE_PAY'
  | 'APPLE_PAY'
  | 'PAY_LATER'
  | 'IDEAL'
  | 'BANCONTACT'
  | 'BLIK'
  | 'EPS'
  | 'PRZELEWY24'
  | 'TRUSTLY'
  | 'ALIPAY'
  | 'OXXO'
  | 'MPESA_STK'
  | 'MPESA_DARAJA'
  | 'AIRTEL_MONEY'
  | 'TELCO';

export type PaymentMethodGroup = 'Wallet' | 'Card' | 'Mobile money' | 'Operator' | 'Bank' | 'Voucher' | 'Pay later';

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  group: PaymentMethodGroup;
  provider: ProviderId;
  kind: 'redirect' | 'stk';
  brands?: string[];
  note?: string;
  available: boolean;
  reason?: string;
  requiresPhone?: boolean;
  requiresEmail?: boolean;
  /** PayHero channel id override for method-specific money channels. */
  channelId?: number;
}

function channelFromEnv(name: string): number | undefined {
  const raw = getConfig(name).trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

/**
 * Resolve a method id to the gateway that should originate the charge.
 * Returns null for unknown/disabled methods so route handlers fail closed.
 */
export function resolvePaymentMethod(id: string, includeUnavailable = false): PaymentMethod | null {
  return listPaymentMethods().find((m) => m.id === id && (includeUnavailable || m.available)) || null;
}

export function listPaymentMethods(): PaymentMethod[] {
  const paypalReady = paypal.isConfigured();
  const payheroReady = payhero.isConfigured();
  const darajaReady = mpesa.isConfigured();
  const payheroChannel = channelFromEnv('PAYHERO_CHANNEL_ID');
  const airtelChannel = channelFromEnv('PAYHERO_AIRTEL_CHANNEL_ID') || payheroChannel;
  const telcoChannel = channelFromEnv('PAYHERO_TELCO_CHANNEL_ID') || payheroChannel;

  const pp = (m: Omit<PaymentMethod, 'provider' | 'available' | 'reason'>): PaymentMethod => ({
    ...m,
    provider: 'PAYPAL',
    available: paypalReady,
    reason: paypalReady ? undefined : 'PayPal is not configured on this deployment',
  });

  const ph = (m: Omit<PaymentMethod, 'provider' | 'available' | 'reason'>): PaymentMethod => ({
    ...m,
    provider: 'PAYHERO',
    available: payheroReady,
    reason: payheroReady ? undefined : 'PayHero is not configured on this deployment',
  });

  return [
    pp({
      id: 'PAYPAL', label: 'PayPal', group: 'Wallet', kind: 'redirect',
      note: 'Pay with your PayPal balance, linked bank or card.', requiresEmail: true,
    }),
    pp({
      id: 'CARD', label: 'Credit or debit card', group: 'Card', kind: 'redirect',
      brands: ['Visa', 'Mastercard', 'American Express', 'Discover'],
      note: 'Visa, Mastercard, Amex and Discover — choose “Pay with card” on PayPal’s secure checkout.',
      requiresEmail: true,
    }),
    pp({
      id: 'GOOGLE_PAY', label: 'Google Pay', group: 'Wallet', kind: 'redirect',
      note: 'Shown to eligible buyers on supported devices in PayPal checkout.', requiresEmail: true,
    }),
    pp({
      id: 'APPLE_PAY', label: 'Apple Pay', group: 'Wallet', kind: 'redirect',
      note: 'Shown to eligible buyers on supported Apple devices in PayPal checkout.', requiresEmail: true,
    }),
    pp({
      id: 'PAY_LATER', label: 'Pay Later', group: 'Pay later', kind: 'redirect',
      note: 'Instalments where supported by PayPal in your country.', requiresEmail: true,
    }),
    pp({ id: 'IDEAL', label: 'iDEAL', group: 'Bank', kind: 'redirect', note: 'Netherlands bank redirect via PayPal.', requiresEmail: true }),
    pp({ id: 'BANCONTACT', label: 'Bancontact', group: 'Card', kind: 'redirect', note: 'Belgian card payment via PayPal.', requiresEmail: true }),
    pp({ id: 'BLIK', label: 'BLIK', group: 'Bank', kind: 'redirect', note: 'Polish bank redirect via PayPal.', requiresEmail: true }),
    pp({ id: 'EPS', label: 'eps', group: 'Bank', kind: 'redirect', note: 'Austrian bank redirect via PayPal.', requiresEmail: true }),
    pp({ id: 'PRZELEWY24', label: 'Przelewy24', group: 'Bank', kind: 'redirect', note: 'Polish bank redirect via PayPal.', requiresEmail: true }),
    pp({ id: 'TRUSTLY', label: 'Trustly', group: 'Bank', kind: 'redirect', note: 'European bank redirect via PayPal.', requiresEmail: true }),
    pp({ id: 'ALIPAY', label: 'Alipay', group: 'Wallet', kind: 'redirect', note: 'Chinese wallet via PayPal.', requiresEmail: true }),
    pp({ id: 'OXXO', label: 'OXXO', group: 'Voucher', kind: 'redirect', note: 'Mexican voucher payment via PayPal.', requiresEmail: true }),
    {
      id: 'MPESA_STK', label: 'Lipa na M-Pesa (STK push)', group: 'Mobile money',
      provider: 'PAYHERO', kind: 'stk', requiresPhone: true,
      available: payheroReady && Boolean(payheroChannel),
      reason: payheroReady ? 'No PayHero channel configured' : 'PayHero is not configured on this deployment',
      channelId: payheroChannel,
      note: 'You will get an STK prompt on your phone — enter your M-Pesa PIN.',
    },
    {
      id: 'MPESA_DARAJA', label: 'M-Pesa STK (Safaricom direct)', group: 'Mobile money',
      provider: 'MPESA', kind: 'stk', requiresPhone: true,
      available: darajaReady,
      reason: darajaReady ? undefined : 'Daraja is not configured on this deployment',
      note: 'Direct Safaricom Lipa na M-Pesa STK push.',
    },
    {
      id: 'AIRTEL_MONEY', label: 'Airtel Money', group: 'Mobile money',
      provider: 'PAYHERO', kind: 'stk', requiresPhone: true,
      available: payheroReady && Boolean(airtelChannel),
      reason: payheroReady ? 'No Airtel Money channel configured' : 'PayHero is not configured on this deployment',
      channelId: airtelChannel,
      note: 'Approve the prompt on your Airtel Money line.',
    },
    {
      id: 'TELCO', label: 'Telco / operator billing', group: 'Operator',
      provider: 'PAYHERO', kind: 'stk', requiresPhone: true,
      available: payheroReady && Boolean(telcoChannel),
      reason: payheroReady ? 'No telco channel configured' : 'PayHero is not configured on this deployment',
      channelId: telcoChannel,
      note: 'Charge through your mobile network operator where supported.',
    },
  ];
}

/** Capability summary used by the dashboard to render the picker. */
export function paymentMethodCapabilities() {
  const methods = listPaymentMethods();
  return {
    providers: {
      PAYPAL: paypal.isConfigured(),
      PAYHERO: payhero.isConfigured(),
      MPESA: mpesa.isConfigured(),
    },
    paypal: {
      enabled: paypal.isConfigured(),
      environment: getConfig('PAYPAL_ENV') === 'live' ? 'live' : 'sandbox',
      currency: getConfig('PAYPAL_CURRENCY', 'USD').toUpperCase(),
    },
    methods,
  };
}
