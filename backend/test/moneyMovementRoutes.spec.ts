import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * DB-free route contracts for the money-movement console hardening:
 * default-deny payout dispatch, read-only balance/status lookups, status
 * throttling, and pending/callback-driven M-Pesa reversals.
 */

const h = vi.hoisted(() => ({
  getMoneyType: vi.fn(),
  moneyMovementSummary: vi.fn(() => ({ flows: [], byFlow: {} })),
  generateReference: vi.fn(() => 'PO-TEST'),
  withScopeLock: vi.fn(),
  queryAccountBalance: vi.fn(),
  queryTransactionStatus: vi.fn(),
  reverseTransaction: vi.fn(),
  createPayout: vi.fn(),
  getTransactionStatus: vi.fn(),
  getWallet: vi.fn(),
  getOrder: vi.fn(),
  getRefund: vi.fn(),
  getPayout: vi.fn(),
  getPayoutItem: vi.fn(),
  refundCapture: vi.fn(),
  postLedgerEntry: vi.fn(async () => ({})),
  resolveFinanceAccount: vi.fn(async () => ({ id: 'ACC-1' })),
  recordProviderEvent: vi.fn(),
  logAudit: vi.fn(async () => null),
}));

vi.mock('../src/shared/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = { sub: 'ADMIN-1', role: 'SUPER_ADMIN' };
    next();
  },
}));
vi.mock('../src/shared/middleware/roles', () => ({
  requireAccess: () => (_req: any, _res: any, next: () => void) => next(),
  isRole: () => true,
}));
vi.mock('../src/shared/services/audit', () => ({ logAudit: h.logAudit }));
vi.mock('../src/shared/services/providerEvents', () => ({ recordProviderEvent: h.recordProviderEvent }));
vi.mock('../src/shared/services/runtimeConfig', () => ({
  getConfig: (key: string, fallback?: string) => process.env[key] ?? fallback ?? '',
}));
vi.mock('../src/modules/billing/services/payments', () => ({
  generateReference: h.generateReference,
  withScopeLock: h.withScopeLock,
}));
vi.mock('../src/modules/billing/services/payments/moneyMovement', () => ({
  getMoneyType: h.getMoneyType,
  moneyMovementSummary: h.moneyMovementSummary,
}));
vi.mock('../src/modules/billing/services/payments/darajaPayouts', () => ({
  queryAccountBalance: h.queryAccountBalance,
  queryTransactionStatus: h.queryTransactionStatus,
  reverseTransaction: h.reverseTransaction,
}));
vi.mock('../src/modules/billing/services/payments/paypalService', () => ({
  getOrder: h.getOrder,
  settlementCurrency: () => 'USD',
}));
vi.mock('../src/modules/billing/services/payments/paypalPayouts', () => ({
  createPayout: h.createPayout,
  getRefund: h.getRefund,
  getPayout: h.getPayout,
  getPayoutItem: h.getPayoutItem,
  refundCapture: h.refundCapture,
}));
vi.mock('../src/modules/billing/services/payments/payheroService', () => ({
  getTransactionStatus: h.getTransactionStatus,
  getWallet: h.getWallet,
}));
vi.mock('../src/modules/finance/services/ledger', () => ({
  postLedgerEntry: h.postLedgerEntry,
  resolveFinanceAccount: h.resolveFinanceAccount,
}));

const store: Record<string, any[]> = {};
const MODELS = ['Payout', 'ProviderEvent', 'Payment', 'LedgerEntry', 'FinanceTransaction', 'Refund'];
for (const model of MODELS) store[model] = [];
let idCounter = 0;

function queryable(model: string) {
  const rows = () => store[model] ?? [];
  const makeChain = (crit: any): any => {
    const filtered = () => {
      const entries = crit && typeof crit === 'object' && !Array.isArray(crit) ? Object.entries(crit) : [];
      if (!entries.length) return rows();
      return rows().filter((row: any) => entries.every(([key, value]) => row[key] === value));
    };
    return {
      where: (c: any) => makeChain({ ...(crit || {}), ...(c || {}) }),
      orderBy: () => makeChain(crit),
      limit: () => makeChain(crit),
      all: async () => filtered(),
      first: async () => filtered()[0] ?? null,
      create: async (data: any) => {
        const row = { id: data?.id ?? `mock_${++idCounter}`, ...data };
        rows().push(row);
        return row;
      },
      update: async (data: any) => {
        const hit = filtered()[0];
        if (hit) Object.assign(hit, data);
        return hit ?? null;
      },
    };
  };
  return makeChain(undefined);
}

const publics: Record<string, unknown> = {};
for (const model of MODELS) publics[model] = queryable(model);
const db: any = { orm: { public: publics } };

vi.mock('../src/prisma/db', () => ({
  ts: (value?: any) => (typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString()),
  newId: () => `test_${++idCounter}`,
}));

import moneyMovementRouter from '../src/modules/billing/routes/money-movement';

const app = express();
app.use(express.json());
app.use('/v1/admin/money', moneyMovementRouter(db));

const TYPES: Record<string, any> = {
  MPESA_BALANCE: { id: 'MPESA_BALANCE', flow: 'STATUS', provider: 'MPESA', available: true },
  MPESA_STATUS: { id: 'MPESA_STATUS', flow: 'STATUS', provider: 'MPESA', available: true },
  MPESA_REVERSAL: { id: 'MPESA_REVERSAL', flow: 'REVERSAL', provider: 'MPESA', available: true },
  // Deliberately advertised to prove the dispatcher still fails closed.
  MPESA_POCHI: { id: 'MPESA_POCHI', flow: 'B2C', provider: 'MPESA', available: true },
};

describe('money movement route hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of MODELS) store[model] = [];
    h.getMoneyType.mockImplementation((type: string) => TYPES[String(type).toUpperCase()] ?? null);
    h.withScopeLock.mockImplementation(async (_prisma: any, _scope: string, fn: any) => fn(_prisma));
    h.queryAccountBalance.mockResolvedValue({
      responseCode: '0', responseDescription: 'Accepted',
      conversationId: 'BAL-CONV', originatorConversationId: 'BAL-ORIG',
    });
    h.queryTransactionStatus.mockResolvedValue({ responseCode: '0', status: 'COMPLETED' });
    h.reverseTransaction.mockResolvedValue({
      responseCode: '0', responseDescription: 'Accepted', conversationId: 'REV-CONV',
    });
    h.recordProviderEvent.mockImplementation(async (_prisma: any, input: any) => {
      const externalEventId = String(input.externalEventId || '');
      const existing = store.ProviderEvent.find((event) => event.externalEventId === externalEventId);
      if (existing) return { event: existing, deduped: true };
      const event = {
        id: `evt_${++idCounter}`,
        provider: input.provider,
        externalEventId,
        eventType: input.eventType,
        status: input.status || 'RECEIVED',
        payload: input.payload,
      };
      store.ProviderEvent.push(event);
      return { event, deduped: false };
    });
  });

  it('fails closed for a catalogue payout type with no explicit dispatcher', async () => {
    const response = await request(app)
      .post('/v1/admin/money/payout')
      .send({ type: 'MPESA_POCHI', amount: 100, phone: '254700000000' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/no payout dispatcher/);
    expect(h.createPayout).not.toHaveBeenCalled();
    expect(store.Payout).toHaveLength(0);
  });

  it('returns a sanitized, non-settling M-Pesa balance response', async () => {
    const response = await request(app).get('/v1/admin/money/status/MPESA_BALANCE');

    expect(response.status).toBe(200);
    expect(response.body.status).toEqual({
      responseCode: '0', responseDescription: 'Accepted',
      conversationId: 'BAL-CONV', originatorConversationId: 'BAL-ORIG',
    });
    expect(response.body.reviewOnly).toBe(true);
    expect(response.body.autoSettlement).toBe(false);
    expect(h.postLedgerEntry).not.toHaveBeenCalled();
  });

  it('throttles repeated M-Pesa transaction-status checks', async () => {
    const first = await request(app).get('/v1/admin/money/status/MPESA_STATUS?transactionId=TX-1');
    const second = await request(app).get('/v1/admin/money/status/MPESA_STATUS?transactionId=TX-1');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(h.queryTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it('submits an M-Pesa reversal once, records PENDING ledger intent, and dedupes replays', async () => {
    const payload = { transactionId: 'TX-REV-1', amount: 250 };
    const first = await request(app).post('/v1/admin/money/reversal').send(payload);
    const second = await request(app).post('/v1/admin/money/reversal').send(payload);

    expect(first.status).toBe(202);
    expect(first.body.pending).toBe(true);
    expect(second.status).toBe(200);
    expect(second.body.reused).toBe(true);
    expect(h.reverseTransaction).toHaveBeenCalledTimes(1);
    expect(h.reverseTransaction.mock.calls[0][0]).toMatchObject({
      transactionId: 'TX-REV-1', amount: 250, originatorConversationId: first.body.reference,
    });
    expect(h.postLedgerEntry).toHaveBeenCalledTimes(1);
    expect(h.postLedgerEntry.mock.calls[0][1]).toMatchObject({
      entryType: 'REVERSAL', status: 'PENDING', amount: 250, currency: 'KES',
    });
    expect(store.Payout).toHaveLength(1);
    expect(store.Payout[0].status).toBe('PENDING');
  });
});
