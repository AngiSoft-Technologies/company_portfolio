import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as paypal from '../src/modules/billing/services/payments/paypalService';
import { selectPaymentRail } from '../src/modules/finance/services/providers';

/**
 * Unit tests for the PayPal Orders v2 adapter. Upstream HTTP is mocked; no
 * network calls or credentials are required. See docs/PAYPAL_INTEGRATION.md.
 */

const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const webhookHeaders = {
  'paypal-transmission-id': 'trx-1',
  'paypal-transmission-time': '2026-11-22T00:00:00Z',
  'paypal-cert-url': 'https://api.paypal.com/cert.pem',
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-transmission-sig': 'signature',
};

describe('PayPal adapter', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    paypal.resetTokenCacheForTests();
    process.env.PAYPAL_ENV = 'sandbox';
    process.env.PAYPAL_SANDBOX_CLIENT_ID = 'sandbox-id';
    process.env.PAYPAL_SANDBOX_CLIENT_SECRET = 'sandbox-secret';
    process.env.PAYPAL_WEBHOOK_ID = 'WH-TEST';
    process.env.PAYPAL_CURRENCY = 'USD';
    fetchMock.mockImplementation(async (url: string, init: any) => {
      const u = String(url);
      if (u.includes('/v1/oauth2/token')) return json({ access_token: 'tok', expires_in: 3600 });
      if (u.endsWith('/v2/checkout/orders') && init?.method === 'POST') {
        return json({
          id: 'ORDER-1',
          status: 'CREATED',
          links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1' }],
        });
      }
      if (u.includes('/capture') && init?.method === 'POST') {
        return json({
          id: 'ORDER-1',
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{
                id: 'CAP-1',
                status: 'COMPLETED',
                amount: { value: '42.50', currency_code: 'USD' },
              }],
            },
          }],
          payer: { email_address: 'buyer@example.com' },
        });
      }
      if (u.includes('/v1/notifications/verify-webhook-signature')) {
        return json({ verification_status: 'SUCCESS' });
      }
      return json({}, 404);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is configured from sandbox credentials only in sandbox mode', () => {
    expect(paypal.isConfigured()).toBe(true);
    expect(paypal.paypalEnvironment()).toBe('sandbox');
    delete process.env.PAYPAL_SANDBOX_CLIENT_ID;
    delete process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(paypal.isConfigured()).toBe(false);
  });

  it('never uses sandbox credentials in live mode', () => {
    process.env.PAYPAL_ENV = 'live';
    delete process.env.PAYPAL_LIVE_CLIENT_ID;
    delete process.env.PAYPAL_LIVE_CLIENT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(paypal.isConfigured()).toBe(false);
  });

  it('re-fetches the OAuth token when credentials rotate within the same environment', async () => {
    let tokenCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/v1/oauth2/token')) {
        tokenCalls += 1;
        return json({ access_token: `tok-${tokenCalls}`, expires_in: 3600 });
      }
      return json({}, 404);
    });

    expect(await paypal.getAccessToken()).toBe('tok-1');
    expect(await paypal.getAccessToken()).toBe('tok-1'); // cached
    expect(tokenCalls).toBe(1);

    // Rotate the client secret without changing the environment. A stale token
    // must never survive a credential rotation.
    process.env.PAYPAL_SANDBOX_CLIENT_SECRET = 'rotated-secret';
    expect(await paypal.getAccessToken()).toBe('tok-2');
    expect(tokenCalls).toBe(2);
  });

  it('validates the configured settlement currency and rejects KES explicitly', () => {
    expect(paypal.settlementCurrency()).toBe('USD');
    expect(paypal.settlementCurrency('EUR')).toBe('EUR');
    expect(paypal.settlementCurrency('CNY')).toBe('CNY');
    // KES is never converted at a 1:1 rate into a PayPal currency.
    expect(() => paypal.settlementCurrency('KES')).toThrow(/KES is not a PayPal settlement currency/);
    const configured = process.env.PAYPAL_CURRENCY;
    process.env.PAYPAL_CURRENCY = 'KES';
    try {
      expect(() => paypal.settlementCurrency()).toThrow(/PAYPAL_CURRENCY=KES is not a PayPal settlement currency/);
    } finally {
      process.env.PAYPAL_CURRENCY = configured;
    }
  });

  it('formats zero-decimal currencies without fractional amounts', () => {
    expect(paypal.formatPayPalAmount('JPY', 100)).toBe('100');
    expect(paypal.formatPayPalAmount('HUF', 500)).toBe('500');
    expect(paypal.formatPayPalAmount('TWD', 80)).toBe('80');
    expect(() => paypal.formatPayPalAmount('JPY', 100.5)).toThrow(/zero-decimal/);
    expect(paypal.formatPayPalAmount('USD', 42.5)).toBe('42.50');
  });

  it('sends whole-number amounts for zero-decimal PayPal orders', async () => {
    await paypal.createOrder({ amount: 100, currency: 'JPY', reference: 'INV-JPY' });
    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).endsWith('/v2/checkout/orders') && init?.method === 'POST',
    );
    expect(JSON.parse(call[1].body).purchase_units[0].amount).toEqual({ currency_code: 'JPY', value: '100' });
  });

  it('keeps PayPal-Request-Id header-safe and bounded', () => {
    expect(paypal.paypalRequestId('INV-ABC', '-capture')).toBe('INV-ABC-capture');
    expect(paypal.paypalRequestId('INV\nABC')).toBe('INV-ABC');
    const long = paypal.paypalRequestId('X'.repeat(80), '-payout');
    expect(long).toHaveLength(38);
    expect(long).toMatch(/-[a-f0-9]{8}$/);
    expect(paypal.paypalRequestId('X'.repeat(80), '-payout')).toBe(long);
  });

  it('creates a CAPTURE order with a server-held amount and idempotency header', async () => {
    const result = await paypal.createOrder({
      amount: 42.5,
      currency: 'EUR',
      reference: 'INV-ABC',
      description: 'Invoice 12',
    });

    expect(result.orderId).toBe('ORDER-1');
    expect(result.approvalUrl).toContain('ORDER-1');
    expect(result.currency).toBe('EUR');
    expect(result.details.originalCurrency).toBe('EUR');
    expect(result.details.originalAmount).toBe(42.5);

    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).endsWith('/v2/checkout/orders') && init?.method === 'POST',
    );
    expect(call).toBeTruthy();
    expect(call[1].headers['PayPal-Request-Id']).toBe('INV-ABC');
    expect(call[1].headers.Authorization).toBe('Bearer tok');

    const body = JSON.parse(call[1].body);
    expect(body.intent).toBe('CAPTURE');
    expect(body.purchase_units[0].amount).toEqual({ currency_code: 'EUR', value: '42.50' });
    expect(body.purchase_units[0].invoice_id).toBe('INV-ABC');
    expect(body.payment_source.paypal.experience_context.user_action).toBe('PAY_NOW');
  });

  it('settles in the configured currency when no supported method currency is requested', async () => {
    const result = await paypal.createOrder({ amount: 42.5, reference: 'INV-DEF' });
    expect(result.currency).toBe('USD');
    expect(result.details.originalCurrency).toBe('USD');
    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).endsWith('/v2/checkout/orders') && init?.method === 'POST',
    );
    expect(JSON.parse(call[1].body).purchase_units[0].amount).toEqual({ currency_code: 'USD', value: '42.50' });
  });

  it('refuses to create an order for a KES invoice', async () => {
    fetchMock.mockClear();
    await expect(paypal.createOrder({ amount: 42.5, currency: 'KES', reference: 'INV-KES' }))
      .rejects.toThrow(/KES is not a PayPal settlement currency/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('captures with a distinct idempotency key and parses the capture', async () => {
    const capture = await paypal.captureOrder('ORDER-1', 'INV-ABC');
    expect(capture.captureId).toBe('CAP-1');
    expect(capture.status).toBe('COMPLETED');
    expect(capture.amount).toBe('42.50');
    expect(capture.currency).toBe('USD');
    expect(capture.payerEmail).toBe('buyer@example.com');

    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).includes('/capture') && init?.method === 'POST',
    );
    expect(call[1].headers['PayPal-Request-Id']).toBe('INV-ABC-capture');
  });

  it('fails closed when the webhook id is missing', async () => {
    delete process.env.PAYPAL_WEBHOOK_ID;
    await expect(paypal.verifyWebhookSignature(webhookHeaders, Buffer.from('{}')))
      .rejects.toThrow(/not configured/);
  });

  it('rejects webhooks with missing PayPal headers', async () => {
    expect(await paypal.verifyWebhookSignature({}, Buffer.from('{}'))).toBe(false);
  });

  it('verifies a webhook through the PayPal API', async () => {
    expect(await paypal.verifyWebhookSignature(webhookHeaders, Buffer.from('{"id":"EVENT-1"}'))).toBe(true);
    const call = fetchMock.mock.calls.find(
      ([url]: any[]) => String(url).includes('/v1/notifications/verify-webhook-signature'),
    );
    const body = JSON.parse(call[1].body);
    expect(body.webhook_id).toBe('WH-TEST');
    expect(body.webhook_event.id).toBe('EVENT-1');
  });

  it('extracts the order id from a capture webhook resource', () => {
    expect(paypal.orderIdFromCaptureEvent({
      supplementary_data: { related_ids: { order_id: 'ORDER-1' } },
    })).toBe('ORDER-1');
  });
});

/**
 * Rail policy is pure routing: the Prisma handle is mocked so no database or
 * provider call is made. Credentials are env stubs only — no real secrets.
 */
describe('selectPaymentRail policy', () => {
  const KEYS = [
    'PAYPAL_ENV', 'PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET',
    'PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET',
    'PAYPAL_CURRENCY', 'PAYPAL_WEBHOOK_ID',
    'PAYHERO_API_USERNAME', 'PAYHERO_API_PASSWORD', 'PAYHERO_CHANNEL_ID',
    'MPESA_ENV', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY',
    'STRIPE_SECRET', 'PAYSTACK_SECRET_KEY',
    'PESAFLOW_API_KEY', 'PESAFLOW_API_SECRET', 'PESAFLOW_BASE_URL',
  ];
  const saved: Record<string, string | undefined> = {};
  const db = {
    orm: {
      public: {
        FinanceAccount: {
          where: () => ({ select: () => ({ all: async () => [] }) }),
        },
      },
    },
  } as any;

  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    for (const key of KEYS) delete process.env[key];
    Object.assign(process.env, {
      PAYPAL_ENV: 'sandbox',
      PAYPAL_SANDBOX_CLIENT_ID: 'pp-id',
      PAYPAL_SANDBOX_CLIENT_SECRET: 'pp-secret',
      PAYPAL_CURRENCY: 'USD',
      PAYPAL_WEBHOOK_ID: 'WH-TEST',
      PAYHERO_API_USERNAME: 'ph-user',
      PAYHERO_API_PASSWORD: 'ph-pass',
      PAYHERO_CHANNEL_ID: '10',
      MPESA_ENV: 'sandbox',
      MPESA_CONSUMER_KEY: 'mp-key',
      MPESA_CONSUMER_SECRET: 'mp-secret',
      MPESA_SHORTCODE: '174379',
      MPESA_PASSKEY: 'mp-passkey',
      STRIPE_SECRET: 'sk-test',
      PAYSTACK_SECRET_KEY: 'pk-test',
    });
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('routes non-KES / non-East-Africa money to PayPal in the validated settlement currency', async () => {
    const selection = await selectPaymentRail(db, {
      currency: 'EUR', country: 'US', amount: 100, originalCurrency: 'EUR', originalAmount: 100,
    });
    expect(selection.provider).toBe('PAYPAL');
    expect(selection.region).toBe('INTERNATIONAL');
    expect(selection.settlementCurrency).toBe('USD');
    expect(selection.metadata.originalCurrency).toBe('EUR');
    expect(selection.metadata.originalAmount).toBe(100);
    expect(selection.metadata.routingPolicy).toBe('INTERNATIONAL_DEFAULT_PAYPAL');
  });

  it('routes KES / East-Africa money to PayHero or M-Pesa', async () => {
    const local = await selectPaymentRail(db, {
      currency: 'KES', country: 'KE', channel: 'bank', amount: 500,
    });
    expect(local.provider).toBe('PAYHERO');
    expect(local.region).toBe('EAST_AFRICA');
    expect(local.settlementCurrency).toBe('KES');

    const mpesa = await selectPaymentRail(db, {
      currency: 'KES', country: 'KE', channel: 'mpesa_stk', amount: 500,
    });
    expect(mpesa.provider).toBe('MPESA');
    expect(mpesa.settlementCurrency).toBe('KES');
  });

  it('rejects hints that conflict with the rail policy', async () => {
    await expect(selectPaymentRail(db, {
      currency: 'EUR', country: 'US', amount: 10, providerHint: 'PAYHERO',
    })).rejects.toThrow(/PayPal is the required rail/);

    await expect(selectPaymentRail(db, {
      currency: 'KES', country: 'KE', amount: 10, providerHint: 'PAYPAL',
    })).rejects.toThrow(/not East Africa rails/);

    await expect(selectPaymentRail(db, {
      currency: 'EUR', country: 'US', amount: 10, providerHint: 'STRIPE',
    })).rejects.toThrow(/cannot be used/);
  });

  it('never selects a legacy provider even when it is configured', async () => {
    const international = await selectPaymentRail(db, { currency: 'GBP', country: 'GB', amount: 10 });
    const local = await selectPaymentRail(db, { currency: 'KES', country: 'KE', amount: 10 });
    expect(['STRIPE', 'PAYSTACK']).not.toContain(international.provider);
    expect(['STRIPE', 'PAYSTACK']).not.toContain(local.provider);
  });

  it('fails closed when PAYPAL_CURRENCY is KES', async () => {
    process.env.PAYPAL_CURRENCY = 'KES';
    await expect(selectPaymentRail(db, { currency: 'EUR', country: 'US', amount: 10 }))
      .rejects.toThrow(/not a PayPal settlement currency/);
  });
});
