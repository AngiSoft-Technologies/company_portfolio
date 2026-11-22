import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db';

const h = vi.hoisted(() => {
  const matches = (item: any, criteria: any) =>
    Object.entries(criteria).every(([key, value]) => item?.[key] === value);

  const queryable = (store: any[]) => ({
    where(criteria: any) {
      const hit = () => store.find((item) => matches(item, criteria)) ?? null;
      return {
        first: async () => hit(),
        all: async () => store.filter((item) => matches(item, criteria)),
      };
    },
  });

  const registeredProcessors: Array<(job: any) => Promise<unknown>> = [];
  const addJob = vi.fn(async () => ({ id: 'job-1' }));

  return {
    matches,
    queryable,
    registeredProcessors,
    queryStkStatus: vi.fn(),
    applyPaymentOutcome: vi.fn(),
    logAudit: vi.fn(async () => undefined),
    addJob,
    getQueue: vi.fn(() => ({ add: addJob })),
    createWorker: vi.fn((_name: string, processor: (job: any) => Promise<unknown>) => {
      registeredProcessors.push(processor);
      return { isRunning: true };
    }),
  };
});

vi.mock('../src/db', () => ({
  default: { orm: { public: {} } },
}));

vi.mock('../src/prisma/db', () => ({
  db: {},
  default: {},
  ts: (value?: unknown) => (typeof value === 'string' ? value : new Date().toISOString()),
  newId: () => `id_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/queue', () => ({
  getQueue: h.getQueue,
  createWorker: h.createWorker,
}));

vi.mock('../src/shared/services/runtimeConfig', () => ({
  getConfig: (_key: string, fallback = '') => fallback,
}));

vi.mock('../src/shared/services/audit', () => ({
  logAudit: h.logAudit,
}));

vi.mock('../src/modules/billing/services/payments', () => ({
  applyPaymentOutcome: h.applyPaymentOutcome,
}));

vi.mock('../src/modules/billing/services/payments/mpesaService', async () => {
  const actual = await vi.importActual<typeof import('../src/modules/billing/services/payments/mpesaService')>(
    '../src/modules/billing/services/payments/mpesaService',
  );
  return { ...actual, queryStkStatus: h.queryStkStatus };
});

import {
  decodeStkQueryResult,
  MPESA_STK_RECOVERY_DELAY_MS,
  MPESA_STK_RECOVERY_QUEUE,
  scheduleStkStatusRecovery,
} from '../src/modules/billing/services/payments/mpesaService';
import { processStkRecoveryOnce, startMpesaStkRecoveryWorker } from '../src/workers/mpesaStkRecovery';

function fakeDb(payment: any = null) {
  const store = payment ? [payment] : [];
  return {
    orm: {
      public: {
        Payment: h.queryable(store),
      },
    },
  };
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    provider: 'MPESA',
    providerId: 'CRID-1',
    status: 'PENDING',
    amount: '250.00',
    currency: 'KES',
    reference: 'INV-1',
    channelId: null,
    bookingId: null,
    clientId: null,
    metadata: null,
    ...overrides,
  };
}

function statusResult(raw: Record<string, unknown>, responseCode = '0') {
  return {
    responseCode,
    responseDescription: responseCode === '0' ? 'Accepted' : 'Rejected',
    checkoutRequestId: 'CRID-1',
    raw,
  };
}

describe('M-Pesa STK status recovery', () => {
  beforeEach(() => {
    h.queryStkStatus.mockReset();
    h.applyPaymentOutcome.mockReset();
    h.addJob.mockClear();
    h.getQueue.mockClear();
    h.createWorker.mockClear();
    h.logAudit.mockClear();
    h.registeredProcessors.length = 0;
    h.getQueue.mockReturnValue({ add: h.addJob } as any);
    h.applyPaymentOutcome.mockResolvedValue({ id: 'pay-1' });
  });

  it('schedules exactly one delayed status query per STK push', async () => {
    await scheduleStkStatusRecovery({
      checkoutRequestId: 'CRID-1',
      reference: 'INV-1',
      amount: 250,
      phone: '0712345678',
    });

    expect(h.getQueue).toHaveBeenCalledWith(MPESA_STK_RECOVERY_QUEUE);
    expect(h.addJob).toHaveBeenCalledWith(
      'recover-once',
      expect.objectContaining({ checkoutRequestId: 'CRID-1', amount: 250 }),
      { delayMs: MPESA_STK_RECOVERY_DELAY_MS },
    );
    expect(MPESA_STK_RECOVERY_DELAY_MS).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });

  it('decodes only explicit Daraja results as terminal', () => {
    expect(decodeStkQueryResult(statusResult({
      ResultCode: '0',
      ResultDesc: 'Success',
      MpesaReceiptNumber: 'RCPT-1',
      Amount: 250,
      PhoneNumber: 254712345678,
      TransactionDate: 20261122120000,
    }))).toMatchObject({
      outcome: 'SUCCESS',
      receipt: 'RCPT-1',
      amount: 250,
    });

    expect(decodeStkQueryResult(statusResult({ ResultCode: '1', ResultDesc: 'In progress' })).outcome)
      .toBe('PENDING');
    expect(decodeStkQueryResult(statusResult({ ResultCode: '1032', ResultDesc: 'Cancelled' })).outcome)
      .toBe('FAILED');
    expect(decodeStkQueryResult(statusResult({ ResultCode: '0' }, '1')).outcome)
      .toBe('UNKNOWN');
    expect(decodeStkQueryResult(statusResult({ ResultCode: '0' })).outcome)
      .toBe('UNKNOWN');
  });

  it('skips invalid or already-settled payments without querying Daraja', async () => {
    expect(await processStkRecoveryOnce(fakeDb() as unknown as Db, { checkoutRequestId: 'bad id' }))
      .toBe('SKIPPED');
    expect(h.queryStkStatus).not.toHaveBeenCalled();

    expect(await processStkRecoveryOnce(
      fakeDb(paymentRow({ status: 'SUCCEEDED' })) as unknown as Db,
      { checkoutRequestId: 'CRID-1' },
    )).toBe('SKIPPED');
    expect(h.queryStkStatus).not.toHaveBeenCalled();
  });

  it('leaves a still-pending STK payment untouched', async () => {
    h.queryStkStatus.mockResolvedValue(statusResult({ ResultCode: '1', ResultDesc: 'In progress' }));

    expect(await processStkRecoveryOnce(
      fakeDb(paymentRow()) as unknown as Db,
      { checkoutRequestId: 'CRID-1' },
    )).toBe('SKIPPED');
    expect(h.applyPaymentOutcome).not.toHaveBeenCalled();
  });

  it('settles a still-pending payment from an amount-matched explicit success', async () => {
    h.queryStkStatus.mockResolvedValue(statusResult({
      ResultCode: '0',
      ResultDesc: 'Success',
      MpesaReceiptNumber: 'RCPT-1',
      Amount: 250,
    }));

    const result = await processStkRecoveryOnce(
      fakeDb(paymentRow()) as unknown as Db,
      { checkoutRequestId: 'CRID-1' },
    );

    expect(result).toBe('APPLIED');
    expect(h.applyPaymentOutcome).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        provider: 'MPESA',
        providerId: 'CRID-1',
        status: 'SUCCEEDED',
        currency: 'KES',
      }),
    );
    expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'MPESA_STK_RECOVERY_SETTLED',
      entityId: 'pay-1',
    }));
  });

  it('refuses to settle a success whose amount does not match the stored payment', async () => {
    h.queryStkStatus.mockResolvedValue(statusResult({
      ResultCode: '0',
      ResultDesc: 'Success',
      MpesaReceiptNumber: 'RCPT-1',
      Amount: 275,
    }));

    expect(await processStkRecoveryOnce(
      fakeDb(paymentRow()) as unknown as Db,
      { checkoutRequestId: 'CRID-1' },
    )).toBe('SKIPPED');
    expect(h.applyPaymentOutcome).not.toHaveBeenCalled();
    expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'MPESA_STK_RECOVERY_AMOUNT_MISMATCH',
    }));
  });

  it('records an explicit terminal failure without inventing a success', async () => {
    h.queryStkStatus.mockResolvedValue(statusResult({ ResultCode: '1032', ResultDesc: 'Cancelled' }));

    expect(await processStkRecoveryOnce(
      fakeDb(paymentRow()) as unknown as Db,
      { checkoutRequestId: 'CRID-1' },
    )).toBe('APPLIED');
    expect(h.applyPaymentOutcome).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ provider: 'MPESA', status: 'FAILED' }),
    );
    expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'MPESA_STK_RECOVERY_FAILED',
    }));
  });

  it('swallows worker errors so a failed query never becomes a retry loop', async () => {
    h.queryStkStatus.mockRejectedValue(new Error('upstream unavailable'));

    expect(startMpesaStkRecoveryWorker()).toBe(true);
    expect(h.createWorker).toHaveBeenCalledWith(MPESA_STK_RECOVERY_QUEUE, expect.any(Function));
    await expect(h.registeredProcessors[0]({ data: { checkoutRequestId: 'CRID-1' } }))
      .resolves.toBeUndefined();
  });
});
