import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PayPalPayoutError,
  createPayout,
  getPayout,
  getPayoutItem,
  getRefund,
  isConfigured,
  refundCapture,
} from '../src/modules/billing/services/payments/paypalPayouts';
import { resetTokenCacheForTests } from '../src/modules/billing/services/payments/paypalService';

/**
 * Unit tests for the PayPal outbound (Payouts v1 / Refunds v2) adapter.
 * Upstream HTTP and credentials are mocked — no network access is required.
 */

const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const validItem = {
  recipientType: 'EMAIL' as const,
  amount: 10,
  currency: 'USD',
  note: 'Invoice 12',
  receiver: 'freelancer@example.com',
  senderItemId: 'ITEM-1',
};

describe('PayPal payouts and refunds', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetTokenCacheForTests();
    process.env.PAYPAL_ENV = 'sandbox';
    process.env.PAYPAL_SANDBOX_CLIENT_ID = 'sandbox-id';
    process.env.PAYPAL_SANDBOX_CLIENT_SECRET = 'sandbox-secret';
    process.env.PAYPAL_CURRENCY = 'USD';

    fetchMock.mockImplementation(async (url: string, init: any) => {
      const u = String(url);
      if (u.includes('/v1/oauth2/token')) return json({ access_token: 'tok', expires_in: 3600 });
      if (u.endsWith('/v1/payments/payouts') && init?.method === 'POST') {
        return json({ batch_header: { payout_batch_id: 'BATCH-1', batch_status: 'PENDING' } }, 201);
      }
      if (u.includes('/v1/payments/payouts/') && u.endsWith('/payout-items/ITEM-1')) {
        return json({ payout_item_id: 'ITEM-1', status: 'SUCCESS' });
      }
      if (u.includes('/v1/payments/payouts/')) {
        return json({ batch_header: { payout_batch_id: 'BATCH-1', batch_status: 'PENDING' } });
      }
      if (u.includes('/refund') && init?.method === 'POST') {
        return json({
          id: 'REF-1',
          status: 'PENDING',
          amount: { value: '5.00', currency_code: 'USD' },
        }, 201);
      }
      if (u.includes('/v2/payments/refunds/')) return json({ id: 'REF-1', status: 'COMPLETED' });
      return json({}, 404);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYPAL_ENV;
    delete process.env.PAYPAL_SANDBOX_CLIENT_ID;
    delete process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    delete process.env.PAYPAL_LIVE_CLIENT_ID;
    delete process.env.PAYPAL_LIVE_CLIENT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_CURRENCY;
  });

  it('delegates the config gate to paypalService', () => {
    expect(isConfigured()).toBe(true);
    delete process.env.PAYPAL_SANDBOX_CLIENT_ID;
    delete process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(isConfigured()).toBe(false);
  });

  it('fails closed for every outbound operation without credentials', async () => {
    delete process.env.PAYPAL_SANDBOX_CLIENT_ID;
    delete process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;

    await expect(createPayout({ reference: 'PAY-1', items: [validItem] }))
      .rejects.toThrow(/not configured/);
    await expect(getPayout('BATCH-1')).rejects.toThrow(/not configured/);
    await expect(getPayoutItem('BATCH-1', 'ITEM-1')).rejects.toThrow(/not configured/);
    await expect(refundCapture({ captureId: 'CAP-1', reference: 'CASE-1' }))
      .rejects.toThrow(/not configured/);
    await expect(getRefund('REF-1')).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a payout batch with the expected payload and idempotency headers', async () => {
    const result = await createPayout({
      reference: 'PAY-REF-1',
      emailSubject: 'Your payment',
      emailMessage: 'Thank you.',
      items: [{ ...validItem, amount: 10, currency: 'usd' }],
    });

    expect(result.batchId).toBe('BATCH-1');
    expect(result.status).toBe('PENDING');

    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).endsWith('/v1/payments/payouts') && init?.method === 'POST',
    );
    expect(call).toBeTruthy();
    expect(String(call[0])).toBe('https://api-m.sandbox.paypal.com/v1/payments/payouts');
    expect(call[1].headers.Authorization).toBe('Bearer tok');
    expect(call[1].headers['PayPal-Request-Id']).toBe('PAY-REF-1-payout');
    expect(call[1].signal).toBeDefined();

    const body = JSON.parse(call[1].body);
    expect(body.sender_batch_header).toEqual({
      sender_batch_id: 'PAY-REF-1',
      email_subject: 'Your payment',
      email_message: 'Thank you.',
    });
    expect(body.items).toEqual([{
      recipient_type: 'EMAIL',
      amount: { value: '10.00', currency: 'USD' },
      note: 'Invoice 12',
      receiver: 'freelancer@example.com',
      sender_item_id: 'ITEM-1',
    }]);
  });

  it('derives a safe sender_batch_id from an unsafe reference', async () => {
    await createPayout({
      reference: 'PAY/2026 11:22',
      items: [{ ...validItem }],
    });

    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).endsWith('/v1/payments/payouts') && init?.method === 'POST',
    );
    const body = JSON.parse(call[1].body);
    expect(body.sender_batch_header.sender_batch_id).toBe('PAY-2026-11-22');
    expect(call[1].headers['PayPal-Request-Id']).toBe('PAY/2026 11:22-payout');
  });

  it('accepts snake_case item aliases', async () => {
    await createPayout({
      reference: 'PAY-2',
      items: [{
        recipient_type: 'PAYPAL_ACCOUNT_ID',
        amount: '7.5',
        currency: 'EUR',
        receiver: 'merchant@example.com',
        sender_item_id: 'ITEM-2',
      }],
    });

    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).endsWith('/v1/payments/payouts') && init?.method === 'POST',
    );
    expect(JSON.parse(call[1].body).items[0]).toEqual({
      recipient_type: 'PAYPAL_ACCOUNT_ID',
      amount: { value: '7.50', currency: 'EUR' },
      note: undefined,
      receiver: 'merchant@example.com',
      sender_item_id: 'ITEM-2',
    });
  });

  it('rejects invalid payout input before making any request', async () => {
    await expect(createPayout({ reference: '', items: [validItem] }))
      .rejects.toThrow(/idempotency reference/);
    await expect(createPayout({ reference: 'PAY-1', items: [] }))
      .rejects.toThrow(/at least one item/);
    await expect(createPayout({
      reference: 'PAY-1',
      items: [{ ...validItem, recipientType: 'BANK' }],
    })).rejects.toThrow(/recipient_type/);
    await expect(createPayout({
      reference: 'PAY-1',
      items: [{ ...validItem, amount: 0 }],
    })).rejects.toThrow(/positive amount/);
    await expect(createPayout({
      reference: 'PAY-1',
      items: [{ ...validItem, currency: 'KES' }],
    })).rejects.toThrow(/currency/);
    await expect(createPayout({
      reference: 'PAY-1',
      items: [validItem, { ...validItem }],
    })).rejects.toThrow(/Duplicate sender_item_id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refunds a captured payment with a partial amount and a distinct idempotency key', async () => {
    const result = await refundCapture({
      captureId: 'CAP-1',
      reference: 'CASE-9',
      amount: 5,
      currency: 'USD',
      note: 'Goodwill',
    });

    expect(result.refundId).toBe('REF-1');
    expect(result.status).toBe('PENDING');
    expect(result.amount).toBe('5.00');
    expect(result.currency).toBe('USD');

    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).includes('/refund') && init?.method === 'POST',
    );
    expect(call).toBeTruthy();
    expect(String(call[0])).toBe('https://api-m.sandbox.paypal.com/v2/payments/captures/CAP-1/refund');
    expect(call[1].headers['PayPal-Request-Id']).toBe('CASE-9-refund');
    expect(call[1].headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(call[1].body)).toEqual({
      amount: { value: '5.00', currency_code: 'USD' },
      note: 'Goodwill',
    });
  });

  it('sends an empty body for a full refund and validates refund input', async () => {
    await refundCapture({ captureId: 'CAP-1', reference: 'CASE-10' });

    const call = fetchMock.mock.calls.find(
      ([url, init]: any[]) => String(url).includes('/refund') && init?.method === 'POST',
    );
    expect(JSON.parse(call[1].body)).toEqual({});

    await expect(refundCapture({ captureId: 'CAP-1', reference: 'CASE-11', amount: -1 }))
      .rejects.toThrow(/positive amount/);
    await expect(refundCapture({ captureId: '', reference: 'CASE-12' }))
      .rejects.toThrow(/captureId/);
    await expect(refundCapture({ captureId: 'CAP-1', reference: '' }))
      .rejects.toThrow(/idempotency reference/);
  });

  it('looks up payouts, payout items and refunds with GET requests', async () => {
    const payout = await getPayout('BATCH-1');
    expect(payout.batch_header.payout_batch_id).toBe('BATCH-1');

    const item = await getPayoutItem('BATCH-1', 'ITEM-1');
    expect(item.payout_item_id).toBe('ITEM-1');

    const refund = await getRefund('REF-1');
    expect(refund.id).toBe('REF-1');

    const urls = fetchMock.mock.calls.map(([url]: any[]) => String(url));
    expect(urls).toContain('https://api-m.sandbox.paypal.com/v1/payments/payouts/BATCH-1');
    expect(urls).toContain('https://api-m.sandbox.paypal.com/v1/payments/payouts/BATCH-1/payout-items/ITEM-1');
    expect(urls).toContain('https://api-m.sandbox.paypal.com/v2/payments/refunds/REF-1');

    const lookups = fetchMock.mock.calls.filter(
      ([url]: any[]) => !String(url).includes('/v1/oauth2/token'),
    );
    expect(lookups.every(([, init]: any[]) => init?.method === 'GET')).toBe(true);
  });

  it('uses the live base URL in live mode', async () => {
    process.env.PAYPAL_ENV = 'live';
    process.env.PAYPAL_LIVE_CLIENT_ID = 'live-id';
    process.env.PAYPAL_LIVE_CLIENT_SECRET = 'live-secret';
    resetTokenCacheForTests();

    await getPayout('BATCH-1');
    const call = fetchMock.mock.calls.find(
      ([url]: any[]) => String(url).includes('/v1/payments/payouts/'),
    );
    expect(String(call[0])).toBe('https://api-m.paypal.com/v1/payments/payouts/BATCH-1');
  });

  it('surfaces upstream errors with status and without echoing credentials or raw bodies', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/v1/oauth2/token')) return json({ access_token: 'tok', expires_in: 3600 });
      return json({ details: [{ description: 'INSUFFICIENT_FUNDS' }], secret: 'sandbox-secret' }, 422);
    });

    await expect(getPayout('BATCH-1')).rejects.toMatchObject({
      name: 'PayPalPayoutError',
      status: 422,
      message: expect.stringContaining('INSUFFICIENT_FUNDS'),
    });

    try {
      await getPayout('BATCH-1');
    } catch (err) {
      expect(err).toBeInstanceOf(PayPalPayoutError);
      expect(String((err as Error).message)).not.toContain('sandbox-secret');
    }
  });

  it('does not echo non-JSON upstream error bodies', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/v1/oauth2/token')) return json({ access_token: 'tok', expires_in: 3600 });
      return new Response('sandbox-secret leaked', { status: 502 });
    });

    await expect(getRefund('REF-9')).rejects.toThrow(/HTTP 502/);
    try {
      await getRefund('REF-9');
    } catch (err) {
      expect(String((err as Error).message)).not.toContain('sandbox-secret');
    }
  });
});
