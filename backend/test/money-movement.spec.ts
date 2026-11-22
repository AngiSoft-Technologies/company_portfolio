import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listMoneyTypes, getMoneyType, moneyMovementSummary } from '../src/modules/billing/services/payments/moneyMovement';

/** The unified transaction catalogue must cover every local and international flow. */
const KEYS = [
  'PAYPAL_ENV', 'PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET',
  'PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYHERO_API_USERNAME', 'PAYHERO_API_PASSWORD', 'PAYHERO_CHANNEL_ID',
  'MPESA_ENV', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY',
  'MPESA_INITIATOR_NAME', 'MPESA_INITIATOR_PASSWORD', 'MPESA_INITIATOR_PUBLIC_KEY',
];
const saved: Record<string, string | undefined> = {};

describe('money movement catalogue', () => {
  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    for (const key of KEYS) delete process.env[key];
    Object.assign(process.env, {
      PAYPAL_ENV: 'sandbox',
      PAYPAL_SANDBOX_CLIENT_ID: 'pp-id', PAYPAL_SANDBOX_CLIENT_SECRET: 'pp-secret',
      PAYHERO_API_USERNAME: 'ph-user', PAYHERO_API_PASSWORD: 'ph-pass', PAYHERO_CHANNEL_ID: '10',
      MPESA_ENV: 'sandbox', MPESA_CONSUMER_KEY: 'mp-key', MPESA_CONSUMER_SECRET: 'mp-secret',
      MPESA_SHORTCODE: '174379', MPESA_PASSKEY: 'mp-passkey',
      MPESA_INITIATOR_NAME: 'api', MPESA_INITIATOR_PASSWORD: 'password',
      // A syntactically valid 1024-bit RSA public key is only needed for actual
      // payout calls; the catalogue checks presence, not cryptographic validity.
      MPESA_INITIATOR_PUBLIC_KEY: 'not-a-real-key',
    });
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('covers C2B, B2C, B2B, refunds, reversals and status', () => {
    const summary = moneyMovementSummary();
    expect(summary.flows).toEqual(['C2B', 'B2C', 'B2B', 'REFUND', 'REVERSAL', 'STATUS']);
    for (const flow of summary.flows) expect(summary.byFlow[flow]).toBeGreaterThan(0);
  });

  it('includes local Kenya and international rails', () => {
    const types = listMoneyTypes();
    expect(types.some((t) => t.id === 'MPESA_B2C' && t.region === 'Kenya')).toBe(true);
    expect(types.some((t) => t.id === 'MPESA_B2B' && t.region === 'Kenya')).toBe(true);
    expect(types.some((t) => t.id === 'PAYHERO_B2B_BANK' && t.region === 'Kenya')).toBe(true);
    expect(types.some((t) => t.id === 'PAYPAL_PAYOUT' && t.region === 'International')).toBe(true);
    expect(types.some((t) => t.id === 'PAYPAL_REFUND' && t.region === 'International')).toBe(true);
  });

  it('gates unavailable rails with a reason instead of hiding them', () => {
    delete process.env.PAYPAL_SANDBOX_CLIENT_ID;
    const paypal = listMoneyTypes().filter((t) => t.provider === 'PAYPAL');
    expect(paypal.length).toBeGreaterThan(0);
    expect(paypal.every((t) => !t.available && t.reason)).toBe(true);
    expect(getMoneyType('PAYPAL_PAYOUT')).toBeNull();
    expect(getMoneyType('PAYPAL_PAYOUT', true)?.reason).toMatch(/not configured/i);
  });

  it('exposes the PayHero wallet balance and top-up operations', () => {
    expect(getMoneyType('PAYHERO_BALANCE')?.flow).toBe('STATUS');
    expect(getMoneyType('PAYHERO_TOPUP')?.flow).toBe('B2B');
  });
});
