import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { logAuditMock } = vi.hoisted(() => ({ logAuditMock: vi.fn(async () => null) }));
vi.mock('../src/shared/services/audit', () => ({ logAudit: logAuditMock }));
vi.mock('../src/shared/middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../src/shared/middleware/roles', () => ({
  requireAccess: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import {
  B2B_COMMAND_IDS,
  generateMpesaQr,
  parseAccountBalance,
  queryAccountBalance,
  registerC2bUrls,
  resetTokenCacheForTests,
  simulateC2b,
} from '../src/modules/billing/services/payments/darajaPayouts';
import {
  decodeStkCallback,
  initStkPush,
  queryStkStatus,
  resetAccessTokenCache,
} from '../src/modules/billing/services/payments/mpesaService';
import mpesaCallbacksRouter, {
  buildAccountBalanceReview,
  c2bConfirmationExternalId,
  callbackDedupeId,
  extractC2bConfirmation,
} from '../src/modules/billing/routes/mpesa-callbacks';
import mpesaRouter from '../src/modules/billing/routes/mpesa';
import type { Db } from '../src/db';

const fetchMock = vi.fn();

const { publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function callsFor(path: string): RequestInit[] {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes(path))
    .map(([, init]) => init as RequestInit);
}

function payloadFor(path: string): Record<string, unknown> {
  const init = callsFor(path)[0];
  expect(init).toBeTruthy();
  return JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
}

describe('Daraja resource pack adapters', () => {
  beforeEach(() => {
    vi.stubEnv('MPESA_ENV', 'sandbox');
    vi.stubEnv('MPESA_CONSUMER_KEY', 'consumer-key');
    vi.stubEnv('MPESA_CONSUMER_SECRET', 'consumer-secret');
    vi.stubEnv('MPESA_SHORTCODE', '600000');
    vi.stubEnv('MPESA_PASSKEY', 'passkey');
    vi.stubEnv('MPESA_CALLBACK_TOKEN', 'shared-token');
    vi.stubEnv('MPESA_INITIATOR_NAME', 'apiuser');
    vi.stubEnv('MPESA_INITIATOR_PASSWORD', 'initiator-password');
    vi.stubEnv('MPESA_INITIATOR_PUBLIC_KEY', publicKey);
    vi.stubEnv('MPESA_CALLBACK_URL', 'https://example.com/stk/callback');
    vi.stubEnv('MPESA_C2B_SHORTCODE', '600111');
    vi.stubEnv('MPESA_C2B_VALIDATION_URL', 'https://example.com/c2b/validation');
    vi.stubEnv('MPESA_C2B_CONFIRMATION_URL', 'https://example.com/c2b/confirmation');
    vi.stubEnv('MPESA_BALANCE_QUEUE_URL', 'https://example.com/balance/timeout');
    vi.stubEnv('MPESA_BALANCE_RESULT_URL', 'https://example.com/balance/result');
    vi.stubEnv('MPESA_QR_CALLBACK_URL', 'https://example.com/qr/callback');
    vi.stubEnv('MPESA_QR_MERCHANT_NAME', 'AngiSoft Test');
    vi.stubEnv('MPESA_QR_TRANSACTION_TYPE', 'BG');
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: unknown) => {
      if (String(url).includes('/oauth/v1/generate')) {
        return Promise.resolve(json({ access_token: 'token', expires_in: 3600 }));
      }
      return Promise.resolve(json({
        ResponseCode: '0',
        ResponseDescription: 'Accepted',
        CheckoutRequestID: 'CRID-TEST',
        MerchantRequestID: 'MRID-TEST',
      }));
    });
    vi.stubGlobal('fetch', fetchMock);
    resetTokenCacheForTests();
    resetAccessTokenCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('exposes the documented B2B command IDs', () => {
    expect(B2B_COMMAND_IDS).toEqual(expect.arrayContaining([
      'BusinessPayBill', 'BusinessBuyGoods', 'DisburseFundsToBusiness',
    ]));
  });

  it('parses the account balance result string', () => {
    expect(parseAccountBalance('Working Account|KES|100000|80000|15000|5000')).toEqual({
      accountType: 'Working Account',
      currency: 'KES',
      total: 100000,
      available: 80000,
      reserved: 15000,
      uncleared: 5000,
    });
  });

  it('queries account balance with the documented payload', async () => {
    await queryAccountBalance({ remarks: 'Payout preflight' });
    const payload = payloadFor('/mpesa/accountbalance/v1/query');
    expect(payload).toMatchObject({
      CommandID: 'AccountBalanceQuery',
      PartyA: '600000',
      IdentifierType: '4',
      Remarks: 'Payout preflight',
      QueueTimeOutURL: 'https://example.com/balance/timeout',
      ResultURL: 'https://example.com/balance/result',
    });
    expect(payload.SecurityCredential).toBeTruthy();
  });

  it('registers C2B URLs with the documented payload', async () => {
    await registerC2bUrls();
    expect(payloadFor('/mpesa/c2b/v2/registerurl')).toEqual({
      ShortCode: '600111',
      ResponseType: 'Completed',
      ConfirmationURL: 'https://example.com/c2b/confirmation?token=shared-token',
      ValidationURL: 'https://example.com/c2b/validation?token=shared-token',
    });
  });

  it('fails closed for live C2B simulation', async () => {
    vi.stubEnv('MPESA_ENV', 'production');
    await expect(simulateC2b({ amount: 10, msisdn: '0712345678', billRefNumber: 'INV-1' }))
      .rejects.toThrow(/sandbox-only/);
  });

  it('generates a dynamic M-Pesa QR payload', async () => {
    await generateMpesaQr({ reference: 'INV-42', amount: 250 });
    expect(payloadFor('/mpesa/qrcode/v1/generate')).toEqual({
      MerchantName: 'AngiSoft Test',
      RefNo: 'INV-42',
      Amount: 250,
      TrxCode: 'BG',
      CPI: '600000',
      Size: '300',
      CallbackURL: 'https://example.com/qr/callback',
    });
  });

  it('fails closed on HTTP 200 rejection bodies without echoing upstream data', async () => {
    fetchMock.mockImplementation((url: unknown) => {
      if (String(url).includes('/oauth/v1/generate')) {
        return Promise.resolve(json({ access_token: 'token', expires_in: 3600 }));
      }
      return Promise.resolve(json({
        ResponseCode: '1',
        ResponseDescription: 'Invalid CPI secret detail',
        QRData: 'raw-upstream-qr-data',
      }));
    });

    const qrError = await generateMpesaQr({ reference: 'INV-9', amount: 100 }).catch((err) => err);
    expect(qrError).toMatchObject({ name: 'DarajaError', status: 400 });
    expect(qrError.message).toBe('Daraja /mpesa/qrcode/v1/generate was rejected');
    expect(qrError.message).not.toMatch(/Invalid CPI secret detail|raw-upstream-qr-data|token/);

    const simError = await simulateC2b({ amount: 10, msisdn: '0712345678', billRefNumber: 'INV-9' })
      .catch((err) => err);
    expect(simError).toMatchObject({ name: 'DarajaError', status: 400 });
    expect(simError.message).not.toMatch(/Invalid CPI secret detail|raw-upstream-qr-data|token/);
  });

  it('extracts a C2B confirmation with TransID dedupe and BillRefNumber match key', () => {
    const review = extractC2bConfirmation({
      TransID: 'NLJ7X8RZT9',
      BillRefNumber: 'INV-2026-42',
      Amount: 1250,
      AccountBalance: 'Working Account|KES|500000|450000|40000|10000',
      MSISDN: 254712345678,
      FirstName: 'Jane',
    });
    expect(review).toEqual({
      transId: 'NLJ7X8RZT9',
      billRefNumber: 'INV-2026-42',
      amount: 1250,
      accountBalance: 'Working Account|KES|500000|450000|40000|10000',
    });
    // MSISDN is never part of the reconciliation record.
    expect(JSON.stringify(review)).not.toContain('254712345678');
    expect(c2bConfirmationExternalId('NLJ7X8RZT9')).toBe('C2B_CONFIRMATION:TransID:NLJ7X8RZT9');
    expect(extractC2bConfirmation({ BillRefNumber: 'INV-1' })).toBeNull();
  });

  it('retains full STK callback metadata', () => {
    const decoded = decodeStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'MRID-1',
          CheckoutRequestID: 'CRID-1',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 250 },
              { Name: 'MpesaReceiptNumber', Value: 'OEI2AK4V15' },
              { Name: 'PhoneNumber', Value: 254712345678 },
              { Name: 'TransactionDate', Value: 20261122120000 },
            ],
          },
        },
      },
    });
    expect(decoded).toMatchObject({
      checkoutRequestId: 'CRID-1',
      merchantRequestId: 'MRID-1',
      resultCode: '0',
      mpesaReceipt: 'OEI2AK4V15',
      amount: 250,
      phone: 254712345678,
      transactionDate: 20261122120000,
    });
  });

  it('reuses the cached OAuth token for STK push and status query', async () => {
    await initStkPush({ phone: '0712345678', amount: 100, reference: 'INV-7' });
    const query = await queryStkStatus('CRID-7');
    expect(query.responseCode).toBe('0');
    expect(callsFor('/oauth/v1/generate')).toHaveLength(1);
    expect(payloadFor('/mpesa/stkpushquery/v1/query')).toMatchObject({
      CheckoutRequestID: 'CRID-7',
    });
    expect(payloadFor('/mpesa/stkpush/v1/processrequest').CallBackURL)
      .toBe('https://example.com/stk/callback');
  });

  it('fails closed on a plain HTTP STK callback URL in production before any upstream call', async () => {
    vi.stubEnv('MPESA_ENV', 'production');
    vi.stubEnv('MPESA_CALLBACK_URL', 'http://example.com/stk/callback');
    await expect(initStkPush({ phone: '0712345678', amount: 100, reference: 'INV-8' }))
      .rejects.toThrow(/must use HTTPS in production/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-2xx M-Pesa responses without echoing upstream errors', async () => {
    const leaked = 'upstream-consumer-secret';
    fetchMock.mockImplementation((url: unknown) => {
      if (String(url).includes('/oauth/v1/generate')) {
        return Promise.resolve(json({ access_token: 'token', expires_in: 3600 }));
      }
      return Promise.resolve(json({ errorMessage: leaked }, 503));
    });
    const error = await queryStkStatus('CRID-FAIL').catch((err) => err);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('M-Pesa request failed (503)');
    expect(error.message).not.toContain(leaked);
  });
});

/** Minimal in-memory Db stand-in for the callback router (no real database). */
function fakePrisma(payout?: any) {
  const events: any[] = [];
  const updates: any[] = [];
  return {
    events,
    updates,
    orm: {
      public: {
        ProviderEvent: {
          where: (criteria: any) => ({
            first: async () => events.find((event) =>
              Object.entries(criteria).every(([key, value]) => event[key] === value)) ?? null,
          }),
          create: async (data: any) => {
            const row = { id: `ev_${events.length + 1}`, ...data };
            events.push(row);
            return row;
          },
        },
        Payout: {
          where: (criteria: any) => ({
            first: async () => payout && Object.entries(criteria).every(
              ([key, value]) => payout[key] === value,
            ) ? payout : null,
            update: async (data: any) => {
              updates.push(data);
              if (payout) Object.assign(payout, data);
              return payout;
            },
          }),
        },
      },
    },
  } as unknown as Db & { events: any[]; updates: any[] };
}

describe('Daraja result callback audit', () => {
  const resultBody = {
    Result: {
      ResultType: 0,
      ResultCode: 0,
      ResultDesc: 'The service request has been accepted successfully',
      OriginatorConversationID: 'ORIG-BAL-1',
      ConversationID: 'CONV-BAL-1',
      TransactionID: 'TXN-BAL-1',
      ResultParameters: {
        ResultParameter: [
          { Key: 'Amount', Value: 1500 },
          { Key: 'AccountBalance', Value: 'Working Account|KES|500000|450000|40000|10000' },
        ],
      },
    },
  };

  const appFor = (prisma: unknown) => {
    const app = express();
    app.use(express.json());
    app.use('/v1/payments/mpesa', mpesaCallbacksRouter(prisma as any));
    return app;
  };

  beforeEach(() => {
    vi.stubEnv('MPESA_CALLBACK_TOKEN', 'shared-token');
    logAuditMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a review-only account-balance payload without any settlement fields', () => {
    expect(buildAccountBalanceReview('Working Account|KES|500000|450000|40000|10000')).toEqual({
      raw: 'Working Account|KES|500000|450000|40000|10000',
      parsed: {
        accountType: 'Working Account', currency: 'KES',
        total: 500000, available: 450000, reserved: 40000, uncleared: 10000,
      },
      reviewOnly: true,
      autoSettlement: false,
    });
    expect(buildAccountBalanceReview('not-a-balance')).toBeNull();
  });

  it('picks documented callback dedupe ids without using customer data', () => {
    expect(callbackDedupeId({ Body: { stkCallback: { CheckoutRequestID: 'CRID-9' } } })).toBe('CRID-9');
    expect(callbackDedupeId({ Result: { OriginatorConversationID: 'ORIG-9', TransactionID: 'TXN-9' } }))
      .toBe('ORIG-9');
    expect(callbackDedupeId({ Result: { ConversationID: 'CONV-9' } })).toBe('CONV-9');
    expect(callbackDedupeId({ TransID: 'NLJ-9', MSISDN: 254712345678 })).toBe('NLJ-9');
    expect(callbackDedupeId({ Result: { TransactionID: 'TXN-9' } })).toBe('TXN-9');
    expect(callbackDedupeId({ PhoneNumber: 254712345678 })).toBeNull();
  });

  it('fails closed when the shared callback token is missing or wrong', async () => {
    const app = appFor(fakePrisma());
    vi.stubEnv('MPESA_CALLBACK_TOKEN', '');
    expect((await request(app).post('/v1/payments/mpesa/callback').send(resultBody)).status).toBe(503);
    vi.stubEnv('MPESA_CALLBACK_TOKEN', 'shared-token');
    expect((await request(app).post('/v1/payments/mpesa/callback?token=wrong').send(resultBody)).status).toBe(403);
  });

  it('records token-gated callbacks as unverified and mirrors the parsed balance for review', async () => {
    const prisma = fakePrisma();
    const app = appFor(prisma);
    const response = await request(app)
      .post('/v1/payments/mpesa/callback?token=shared-token')
      .send(resultBody);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ResultCode: 0, ResultDesc: 'Accepted' });

    await vi.waitFor(() => expect(prisma.events).toHaveLength(2));
    const [result, review] = prisma.events;
    expect(result.eventType).toBe('DARAJA_RESULT');
    expect(result.signatureValid).toBe(false);
    expect(result.payload.authMethod).toBe('SHARED_CALLBACK_TOKEN');

    expect(review.eventType).toBe('DARAJA_ACCOUNT_BALANCE_REVIEW');
    expect(review.signatureValid).toBe(false);
    expect(review.status).toBe('PROCESSED');
    expect(review.payload).toMatchObject({
      reviewOnly: true,
      autoSettlement: false,
      authMethod: 'SHARED_CALLBACK_TOKEN',
      sourceEventId: 'ORIG-BAL-1',
      parsed: { accountType: 'Working Account', currency: 'KES', available: 450000 },
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DARAJA_CALLBACK_RECEIVED',
      entityId: 'ORIG-BAL-1',
    }));
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DARAJA_ACCOUNT_BALANCE_REVIEW_RECORDED',
    }));
  });

  it('redacts callback auth headers and dedupes repeated callbacks', async () => {
    const prisma = fakePrisma();
    const app = appFor(prisma);
    const send = () => request(app)
      .post('/v1/payments/mpesa/callback')
      .set('x-callback-token', 'shared-token')
      .send(resultBody);

    expect((await send()).status).toBe(200);
    await vi.waitFor(() => expect(prisma.events).toHaveLength(2));
    const [result] = prisma.events;
    expect(result.headers['x-callback-token']).toBeUndefined();
    expect(result.headers.authorization).toBeUndefined();

    expect((await send()).status).toBe(200);
    await vi.waitFor(() => expect(prisma.events).toHaveLength(2));
  });

  it('does not re-settle a payout after a terminal state', async () => {
    const payout = {
      id: 'payout_2', reference: 'ORIG-TERM-1', status: 'PENDING',
      amount: '1500.00', providerReference: null, metadata: {},
    };
    const prisma = fakePrisma(payout);
    const app = appFor(prisma);
    const body = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'The service request has been accepted successfully',
        OriginatorConversationID: 'ORIG-TERM-1',
        ConversationID: 'CONV-TERM-1',
        TransactionID: 'TXN-TERM-1',
        ResultParameters: { ResultParameter: [{ Key: 'Amount', Value: 1500 }] },
      },
    };
    const send = () => request(app)
      .post('/v1/payments/mpesa/callback?token=shared-token')
      .send(body);

    expect((await send()).status).toBe(200);
    await vi.waitFor(() => expect(payout.status).toBe('COMPLETED'));
    expect(prisma.updates).toHaveLength(1);

    expect((await send()).status).toBe(200);
    await vi.waitFor(() => expect(prisma.events).toHaveLength(1));
    expect(prisma.updates).toHaveLength(1);
  });

  it('records amount mismatches as token-authenticated, never signature-verified', async () => {
    const payout = {
      id: 'payout_1', reference: 'ORIG-MM-1', status: 'PENDING',
      amount: '1000.00', providerReference: null, metadata: {},
    };
    const prisma = fakePrisma(payout);
    const app = appFor(prisma);
    const response = await request(app)
      .post('/v1/payments/mpesa/callback?token=shared-token')
      .send({
        Result: {
          ResultType: 0, ResultCode: 0, ResultDesc: 'The service request has been accepted successfully',
          OriginatorConversationID: 'ORIG-MM-1', ConversationID: 'CONV-MM-1', TransactionID: 'TXN-MM-1',
          ResultParameters: { ResultParameter: [{ Key: 'Amount', Value: 1500 }] },
        },
      });
    expect(response.status).toBe(200);

    await vi.waitFor(() => expect(prisma.events.some(
      (event) => event.eventType === 'DARAJA_AMOUNT_MISMATCH',
    )).toBe(true));
    const mismatch = prisma.events.find((event) => event.eventType === 'DARAJA_AMOUNT_MISMATCH');
    expect(mismatch).toMatchObject({ signatureValid: false, status: 'FAILED' });
    // No settlement was driven by the callback.
    expect(payout.status).toBe('PENDING');
  });
});

describe('Daraja C2B callback gate', () => {
  const appFor = (prisma: unknown) => {
    const app = express();
    app.use(express.json());
    app.use('/v1/payments/mpesa', mpesaRouter(prisma as any));
    return app;
  };

  beforeEach(() => {
    vi.stubEnv('MPESA_CALLBACK_TOKEN', 'shared-token');
    logAuditMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed when the C2B callback token is missing or wrong', async () => {
    const app = appFor(fakePrisma());
    vi.stubEnv('MPESA_CALLBACK_TOKEN', '');
    expect((await request(app).post('/v1/payments/mpesa/c2b/validation').send({})).status).toBe(503);
    vi.stubEnv('MPESA_CALLBACK_TOKEN', 'shared-token');
    expect((await request(app).post('/v1/payments/mpesa/c2b/validation?token=wrong').send({})).status).toBe(403);
    expect((await request(app).post('/v1/payments/mpesa/c2b/confirmation').send({})).status).toBe(403);
  });

  it('records token-gated C2B events with a hashed dedupe id, never raw PII', async () => {
    const prisma = fakePrisma();
    const app = appFor(prisma);
    const body = {
      TransID: 'NLJ-C2B-1',
      BillRefNumber: 'INV-2026-42',
      Amount: 1250,
      MSISDN: 254712345678,
      FirstName: 'Jane',
    };
    const response = await request(app)
      .post('/v1/payments/mpesa/c2b/validation?token=shared-token')
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ResultCode: 0, ResultDesc: 'Accepted' });
    await vi.waitFor(() => expect(prisma.events).toHaveLength(1));
    const event = prisma.events[0];
    expect(event.eventType).toBe('DARAJA_C2B_VALIDATION');
    expect(event.signatureValid).toBe(false);
    expect(event.status).toBe('RECEIVED');
    expect(event.externalEventId).toMatch(/^C2B:DARAJA_C2B_VALIDATION:[a-f0-9]{32}$/);
    expect(event.externalEventId).not.toContain('254712345678');
    expect(event.externalEventId).not.toContain(JSON.stringify(body));
    await vi.waitFor(() => expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DARAJA_C2B_CALLBACK_RECEIVED',
      meta: expect.objectContaining({ authMethod: 'SHARED_CALLBACK_TOKEN' }),
    })));
  });

  it('acknowledges C2B callbacks before event persistence completes', async () => {
    const prisma = fakePrisma();
    (prisma as any).orm.public.ProviderEvent.create = vi.fn(() => new Promise(() => undefined));
    const response = await request(appFor(prisma))
      .post('/v1/payments/mpesa/c2b/validation?token=shared-token')
      .send({ TransID: 'NLJ-C2B-SLOW-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ResultCode: 0, ResultDesc: 'Accepted' });
  });

  it('records C2B confirmations as read-only reviewed events with no ledger update', async () => {
    const prisma = fakePrisma();
    const response = await request(appFor(prisma))
      .post('/v1/payments/mpesa/c2b/confirmation?token=shared-token')
      .send({
        TransID: 'NLJ-C2B-2',
        BillRefNumber: 'INV-2026-43',
        Amount: 2500,
        MSISDN: 254712345678,
      });

    expect(response.status).toBe(200);
    await vi.waitFor(() => expect(prisma.events).toHaveLength(1));
    expect(prisma.events[0]).toMatchObject({
      externalEventId: 'C2B_CONFIRMATION:TransID:NLJ-C2B-2',
      eventType: 'DARAJA_C2B_CONFIRMATION',
      signatureValid: false,
      status: 'PROCESSED',
    });
    expect(prisma.events[0].payload).toMatchObject({
      matchKey: 'BillRefNumber',
      matchValue: 'INV-2026-43',
    });
    expect(JSON.stringify(prisma.events[0].payload)).not.toContain('254712345678');
    expect(prisma.updates).toHaveLength(0);
  });
});
