import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listPaymentMethods, resolvePaymentMethod, paymentMethodCapabilities } from '../src/modules/billing/services/payments/methods';

/**
 * Capability catalogue tests. Only PayPal, PayHero and Daraja are offered to
 * online clients; every method must be capability-gated and never leak config.
 */

const KEYS = [
  'PAYPAL_ENV', 'PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET',
  'PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET', 'PAYPAL_CURRENCY',
  'PAYHERO_API_USERNAME', 'PAYHERO_API_PASSWORD', 'PAYHERO_CHANNEL_ID',
  'PAYHERO_AIRTEL_CHANNEL_ID', 'PAYHERO_TELCO_CHANNEL_ID',
  'MPESA_ENV', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY',
];

const saved: Record<string, string | undefined> = {};

describe('payment method catalogue', () => {
  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    for (const key of KEYS) delete process.env[key];
    Object.assign(process.env, {
      PAYPAL_ENV: 'sandbox',
      PAYPAL_SANDBOX_CLIENT_ID: 'pp-id',
      PAYPAL_SANDBOX_CLIENT_SECRET: 'pp-secret',
      PAYPAL_CURRENCY: 'USD',
      PAYHERO_API_USERNAME: 'ph-user',
      PAYHERO_API_PASSWORD: 'ph-pass',
      PAYHERO_CHANNEL_ID: '10',
      PAYHERO_AIRTEL_CHANNEL_ID: '11',
      PAYHERO_TELCO_CHANNEL_ID: '12',
      MPESA_ENV: 'sandbox',
      MPESA_CONSUMER_KEY: 'mp-key',
      MPESA_CONSUMER_SECRET: 'mp-secret',
      MPESA_SHORTCODE: '174379',
      MPESA_PASSKEY: 'mp-passkey',
    });
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('offers PayPal, PayHero and Daraja methods only', () => {
    const providers = new Set(listPaymentMethods().map((m) => m.provider));
    expect([...providers].sort()).toEqual(['MPESA', 'PAYHERO', 'PAYPAL']);
    expect(listPaymentMethods().some((m) => m.id === 'PAYSTACK' || m.id === 'STRIPE')).toBe(false);
  });

  it('includes the methods the client dashboard needs', () => {
    const ids = listPaymentMethods().map((m) => m.id);
    for (const id of ['PAYPAL', 'CARD', 'GOOGLE_PAY', 'APPLE_PAY', 'MPESA_STK', 'AIRTEL_MONEY', 'TELCO', 'MPESA_DARAJA']) {
      expect(ids).toContain(id);
    }
  });

  it('marks all methods available when all three gateways are configured', () => {
    expect(listPaymentMethods().every((m) => m.available)).toBe(true);
  });

  it('disables a gateway’s methods when its credentials are removed', () => {
    delete process.env.PAYPAL_SANDBOX_CLIENT_ID;
    const paypalMethods = listPaymentMethods().filter((m) => m.provider === 'PAYPAL');
    expect(paypalMethods.length).toBeGreaterThan(0);
    expect(paypalMethods.every((m) => !m.available)).toBe(true);
    expect(paypalMethods[0].reason).toMatch(/not configured/i);
    expect(resolvePaymentMethod('PAYPAL')).toBeNull();
    expect(resolvePaymentMethod('PAYPAL', true)?.reason).toMatch(/not configured/i);
  });

  it('disables PayHero-specific channels when no channel id is set', () => {
    delete process.env.PAYHERO_AIRTEL_CHANNEL_ID;
    delete process.env.PAYHERO_CHANNEL_ID;
    const airtel = resolvePaymentMethod('AIRTEL_MONEY', true)!;
    expect(airtel.available).toBe(false);
    expect(airtel.reason).toMatch(/channel/i);
  });

  it('never reuses the primary M-Pesa channel for Airtel or telco methods', () => {
    delete process.env.PAYHERO_AIRTEL_CHANNEL_ID;
    delete process.env.PAYHERO_TELCO_CHANNEL_ID;
    const methods = listPaymentMethods();
    const mpesa = methods.find((m) => m.id === 'MPESA_STK')!;
    const airtel = methods.find((m) => m.id === 'AIRTEL_MONEY')!;
    const telco = methods.find((m) => m.id === 'TELCO')!;
    expect(mpesa.available).toBe(true);
    expect(mpesa.channelId).toBe(10);
    expect(airtel.available).toBe(false);
    expect(telco.available).toBe(false);
    expect(airtel.channelId).toBeUndefined();
    expect(telco.channelId).toBeUndefined();
    expect(resolvePaymentMethod('AIRTEL_MONEY')).toBeNull();
    expect(resolvePaymentMethod('TELCO')).toBeNull();
  });

  it('never exposes secrets in the capability payload', () => {
    const payload = JSON.stringify(paymentMethodCapabilities());
    expect(payload).not.toContain('pp-secret');
    expect(payload).not.toContain('ph-pass');
    expect(payload).not.toContain('mp-secret');
  });
});
