import { describe, expect, it } from 'vitest';
import {
  reviewPayHeroEvents,
  summarizePayHeroReview,
} from '../src/modules/finance/services/payheroReconciliation';

const callback = (overrides: Record<string, any> = {}) => ({
  response: {
    CheckoutRequestID: 'CHECKOUT-1',
    ExternalReference: 'INV-1001',
    MpesaReceiptNumber: 'QK7XYZ1234',
    ResultCode: 0,
    ResultDesc: 'Success',
    Status: 'success',
    Amount: 1500,
    ...overrides,
  },
});

const payment = (overrides: Record<string, any> = {}) => ({
  id: 'pay-1',
  providerId: 'CHECKOUT-1',
  reference: 'INV-1001',
  amount: '1500.00',
  currency: 'KES',
  status: 'SUCCEEDED',
  createdAt: '2026-11-22T10:00:05.000Z',
  ...overrides,
});

describe('read-only PayHero reconciliation suggestions', () => {
  it('matches a callback to the Payment by CheckoutRequestID', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-1', externalEventId: 'PAYHERO:CHECKOUT-1:SUCCEEDED', payload: callback() }],
      [payment()],
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      eventId: 'evt-1',
      checkoutRequestId: 'CHECKOUT-1',
      externalReference: 'INV-1001',
      receipt: 'QK7XYZ1234',
      amount: 1500,
      status: 'MATCHED',
      matchedOn: 'providerId',
    });
    expect(result[0].payment).toMatchObject({ id: 'pay-1', status: 'SUCCEEDED' });
    expect(result[0].reasons.join(' ')).toMatch(/review manually/i);
  });

  it('matches by ExternalReference when the CheckoutRequestID is absent', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-2', payload: callback({ CheckoutRequestID: undefined }) }],
      [payment({ providerId: 'SOME-OTHER-ID' })],
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ status: 'MATCHED', matchedOn: 'reference' });
  });

  it('normalizes references case/whitespace-insensitively', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-3', payload: callback({ ExternalReference: ' inv-1001 ' }) }],
      [payment({ providerId: undefined, reference: 'INV-1001' })],
    );

    expect(result[0]).toMatchObject({ status: 'MATCHED', matchedOn: 'reference' });
  });

  it('flags an amount mismatch instead of settling or rejecting', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-4', payload: callback({ Amount: 999 }) }],
      [payment()],
    );

    expect(result[0].status).toBe('AMOUNT_MISMATCH');
    expect(result[0].reasons.join(' ')).toMatch(/amount.*differs/i);
  });

  it('flags a successful event with no Payment as MISSING_PAYMENT', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-5', payload: callback() }],
      [],
    );

    expect(result[0].status).toBe('MISSING_PAYMENT');
    expect(result[0].payment).toBeNull();
    expect(result[0].reasons.join(' ')).toMatch(/no matching Payment/i);
  });

  it('treats a failed result as informational rather than a missing payment', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-6', payload: callback({ ResultCode: 1032, ResultDesc: 'Cancelled', Status: 'failed' }) }],
      [],
    );

    expect(result[0]).toMatchObject({ status: 'FAILED_EVENT', successful: false });
    expect(result[0].reasons.join(' ')).toMatch(/failed result/i);
  });

  it('surfaces events with no match key rather than dropping them', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-7', payload: { response: { Amount: 500, ResultCode: 0 } } }],
      [],
    );

    expect(result[0].status).toBe('NO_MATCH_KEY');
    expect(result[0].reasons.join(' ')).toMatch(/no CheckoutRequestID/i);
  });

  it('reports orphan payments only when requested', () => {
    const events = [{ id: 'evt-8', payload: callback() }];
    const payments = [payment(), payment({ id: 'pay-2', providerId: 'ORPHAN', reference: 'INV-9999' })];

    const withOrphans = reviewPayHeroEvents(events, payments, true);
    expect(withOrphans.filter((s) => s.status === 'ORPHAN_PAYMENT')).toHaveLength(1);
    expect(withOrphans.find((s) => s.status === 'ORPHAN_PAYMENT')?.payment?.id).toBe('pay-2');

    const withoutOrphans = reviewPayHeroEvents(events, payments, false);
    expect(withoutOrphans.filter((s) => s.status === 'ORPHAN_PAYMENT')).toHaveLength(0);
  });

  it('flags a non-KES payment currency and a status disagreement', () => {
    const result = reviewPayHeroEvents(
      [{ id: 'evt-9', payload: callback() }],
      [payment({ currency: 'USD', status: 'PENDING' })],
    );

    expect(result[0].status).toBe('CURRENCY_MISMATCH');
    expect(result[0].reasons.join(' ')).toMatch(/settles in KES/i);
    expect(result[0].reasons.join(' ')).toMatch(/Payment status is PENDING/i);
  });

  it('reads already-normalised payload shapes defensively', () => {
    const result = reviewPayHeroEvents(
      [{
        id: 'evt-10',
        payload: {
          checkoutRequestId: 'CHECKOUT-10',
          externalReference: 'INV-1001',
          amount: 1500,
          resultCode: 0,
          success: true,
        },
      }],
      [payment({ providerId: 'CHECKOUT-10', reference: undefined })],
    );

    expect(result[0]).toMatchObject({ status: 'MATCHED', matchedOn: 'providerId', successful: true });
  });

  it('produces no suggestions for empty inputs and summarizes statuses', () => {
    expect(reviewPayHeroEvents([], [])).toEqual([]);
    const summary = summarizePayHeroReview(reviewPayHeroEvents(
      [{ id: 'a', payload: callback() }, { id: 'b', payload: callback({ ResultCode: 1032, Status: 'failed' }) }],
      [],
    ));
    expect(summary).toMatchObject({ MISSING_PAYMENT: 1, FAILED_EVENT: 1 });
  });
});
