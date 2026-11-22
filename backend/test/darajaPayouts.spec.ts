import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as daraja from '../src/modules/billing/services/payments/darajaPayouts';
import {
  darajaHttpHint,
  darajaResultHint,
} from '../src/modules/billing/services/payments/darajaPayouts';

/**
 * Unit tests for the outbound Daraja adapter (B2C / B2B / status / reversal).
 * Upstream HTTP is mocked; no network calls, keys or credentials are needed.
 */

const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function decryptCredential(credential: string): string {
  return crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(credential, 'base64'),
  ).toString('utf8');
}

function tokenCallCount(): number {
  return fetchMock.mock.calls.filter(([url]: any[]) => String(url).includes('/oauth/v1/generate')).length;
}

function callFor(path: string): any[] {
  const call = fetchMock.mock.calls.find(([url]: any[]) => String(url).includes(path));
  expect(call, `expected a fetch to ${path}`).toBeTruthy();
  return call;
}

function payloadOf(path: string): any {
  return JSON.parse(callFor(path)[1].body);
}

function accepted(overrides: Record<string, unknown> = {}) {
  return {
    ResponseCode: '0',
    ResponseDescription: 'Accept the service request successfully.',
    ConversationID: 'AG_CONVERSATION_1',
    OriginatorConversationID: '00000000-0000-4000-8000-000000000001',
    ...overrides,
  };
}

function stubEnvDefaults() {
  vi.stubEnv('MPESA_ENV', 'sandbox');
  vi.stubEnv('MPESA_CONSUMER_KEY', 'consumer-key');
  vi.stubEnv('MPESA_CONSUMER_SECRET', 'consumer-secret');
  vi.stubEnv('MPESA_SHORTCODE', '600000');
  vi.stubEnv('MPESA_INITIATOR_NAME', 'apiusersandbox');
  vi.stubEnv('MPESA_INITIATOR_PASSWORD', 'initiator-password');
  vi.stubEnv('MPESA_INITIATOR_PUBLIC_KEY', publicKey);
  vi.stubEnv('MPESA_B2C_TIMEOUT_URL', 'https://example.com/daraja/b2c/timeout');
  vi.stubEnv('MPESA_B2C_RESULT_URL', 'https://example.com/daraja/b2c/result');
  vi.stubEnv('MPESA_B2B_TIMEOUT_URL', 'https://example.com/daraja/b2b/timeout');
  vi.stubEnv('MPESA_B2B_RESULT_URL', 'https://example.com/daraja/b2b/result');
  vi.stubEnv('MPESA_STATUS_QUEUE_URL', 'https://example.com/daraja/status/timeout');
  vi.stubEnv('MPESA_STATUS_RESULT_URL', 'https://example.com/daraja/status/result');
  vi.stubEnv('MPESA_REVERSAL_QUEUE_URL', 'https://example.com/daraja/reversal/timeout');
  vi.stubEnv('MPESA_REVERSAL_RESULT_URL', 'https://example.com/daraja/reversal/result');
  vi.stubEnv('MPESA_C2B_VALIDATION_URL', 'https://example.com/daraja/c2b/validation');
  vi.stubEnv('MPESA_C2B_CONFIRMATION_URL', 'https://example.com/daraja/c2b/confirmation');
  vi.stubEnv('MPESA_CALLBACK_TOKEN', 'shared-token');
}

describe('Daraja outbound adapter', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    daraja.resetTokenCacheForTests();
    stubEnvDefaults();
    fetchMock.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/oauth/v1/generate')) return json({ access_token: 'tok', expires_in: 3600 });
      if (u.includes('/b2c/v3/paymentrequest')) return json(accepted());
      if (u.includes('/b2b/v3/paymentrequest')) return json(accepted());
      if (u.includes('/b2b/v1/remittax')) return json(accepted());
      if (u.includes('/b2pochi/v1/paymentrequest')) return json(accepted());
      if (u.includes('/standingorder/v1/createStandingOrderExternal')) return json(accepted());
      if (u.includes('/transactionstatus/v1/query')) return json(accepted());
      if (u.includes('/reversal/v1/request')) return json(accepted());
      return json({}, 404);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reports the environment and gates on outbound credentials', () => {
    expect(daraja.environment()).toBe('sandbox');
    expect(daraja.isConfigured()).toBe(true);

    vi.stubEnv('MPESA_CONSUMER_SECRET', undefined);
    expect(daraja.isConfigured()).toBe(false);
    vi.stubEnv('MPESA_CONSUMER_SECRET', 'consumer-secret');

    vi.stubEnv('MPESA_INITIATOR_PUBLIC_KEY', undefined);
    expect(daraja.isConfigured()).toBe(false);
    vi.stubEnv('MPESA_INITIATOR_PUBLIC_KEY', publicKey);

    vi.stubEnv('MPESA_ENV', 'production');
    expect(daraja.environment()).toBe('live');
    vi.stubEnv('MPESA_ENV', 'live');
    expect(daraja.environment()).toBe('live');
  });

  it('fails closed with a clear error when the public key is missing or invalid', async () => {
    vi.stubEnv('MPESA_INITIATOR_PUBLIC_KEY', undefined);
    await expect(daraja.b2cPayment({ phone: '0712345678', amount: 100 }))
      .rejects.toThrow(/MPESA_INITIATOR_PUBLIC_KEY is not configured/);

    vi.stubEnv('MPESA_INITIATOR_PUBLIC_KEY', 'not-a-key');
    await expect(daraja.b2cPayment({ phone: '0712345678', amount: 100 }))
      .rejects.toThrow(/MPESA_INITIATOR_PUBLIC_KEY is invalid/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a base64-encoded PEM public key', async () => {
    vi.stubEnv('MPESA_INITIATOR_PUBLIC_KEY', Buffer.from(publicKey).toString('base64'));
    await daraja.b2cPayment({ phone: '0712345678', amount: 100 });
    const body = payloadOf('/b2c/v3/paymentrequest');
    expect(decryptCredential(body.SecurityCredential)).toBe('initiator-password');
  });

  it('caches and single-flights the OAuth token', async () => {
    const [first, second] = await Promise.all([daraja.getAccessToken(), daraja.getAccessToken()]);
    expect(first).toBe('tok');
    expect(second).toBe('tok');
    expect(tokenCallCount()).toBe(1);

    await daraja.getAccessToken();
    expect(tokenCallCount()).toBe(1);

    daraja.resetTokenCacheForTests();
    await daraja.getAccessToken();
    expect(tokenCallCount()).toBe(2);
  });

  it('uses the live base URL when MPESA_ENV is production', async () => {
    vi.stubEnv('MPESA_ENV', 'production');
    await daraja.getAccessToken();
    const [url, init] = callFor('/oauth/v1/generate');
    expect(String(url)).toBe('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials');
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('consumer-key:consumer-secret').toString('base64')}`);
  });

  it('sends a valid B2C payload with normalized MSISDN and encrypted credential', async () => {
    const result = await daraja.b2cPayment({
      phone: '0712345678',
      amount: 1500,
      commandId: 'SalaryPayment',
      remarks: 'November payroll',
      occasion: 'Payroll',
    });

    expect(result).toMatchObject({
      responseCode: '0',
      conversationId: 'AG_CONVERSATION_1',
      originatorConversationId: '00000000-0000-4000-8000-000000000001',
    });

    const [url, init] = callFor('/b2c/v3/paymentrequest');
    expect(String(url)).toBe('https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.signal).toBeDefined();

    const body = JSON.parse(init.body);
    expect(body.CommandID).toBe('SalaryPayment');
    expect(body.Amount).toBe(1500);
    expect(body.PartyA).toBe('600000');
    expect(body.PartyB).toBe('254712345678');
    expect(body.Remarks).toBe('November payroll');
    expect(body.Occasion).toBe('Payroll');
    expect(body.QueueTimeOutURL).toBe('https://example.com/daraja/b2c/timeout');
    expect(body.ResultURL).toBe('https://example.com/daraja/b2c/result');
    expect(body.OriginatorConversationID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(decryptCredential(body.SecurityCredential)).toBe('initiator-password');
  });

  it('honours B2C per-call URL overrides and a supplied originator id', async () => {
    await daraja.b2cPayment({
      phone: '+254712345678',
      amount: 10,
      queueTimeoutUrl: 'https://example.com/custom/timeout',
      resultUrl: 'https://example.com/custom/result',
      originatorConversationId: 'AG-RETRY-1',
    });
    const body = payloadOf('/b2c/v3/paymentrequest');
    expect(body.PartyB).toBe('254712345678');
    expect(body.QueueTimeOutURL).toBe('https://example.com/custom/timeout');
    expect(body.ResultURL).toBe('https://example.com/custom/result');
    expect(body.OriginatorConversationID).toBe('AG-RETRY-1');
    expect(body.CommandID).toBe('BusinessPayment');
  });

  it('validates B2C inputs before making any upstream call', async () => {
    await expect(daraja.b2cPayment({ phone: '12345', amount: 100 }))
      .rejects.toBeInstanceOf(daraja.DarajaError);
    await expect(daraja.b2cPayment({ phone: '0712345678', amount: -10 }))
      .rejects.toThrow(/positive payment amount/);
    await expect(daraja.b2cPayment({ phone: '0712345678', amount: Number.NaN }))
      .rejects.toThrow(/positive payment amount/);
    await expect(daraja.b2cPayment({
      phone: '0712345678',
      amount: 10,
      commandId: 'BusinessToBusinessTransfer' as any,
    })).rejects.toThrow(/Invalid B2C CommandID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enforces the B2B CommandID allowlist and payload shape', async () => {
    await daraja.b2bPayment({
      partyB: '600001',
      amount: 250,
      commandId: 'MerchantToMerchantTransfer',
      accountReference: 'INV-12',
    });
    const body = payloadOf('/b2b/v3/paymentrequest');
    expect(String(callFor('/b2b/v3/paymentrequest')[0])).toContain('/mpesa/b2b/v3/paymentrequest');
    expect(body.CommandID).toBe('MerchantToMerchantTransfer');
    expect(body.SenderIdentifierType).toBe('4');
    expect(body.RecieverIdentifierType).toBe('4');
    expect(body.PartyA).toBe('600000');
    expect(body.PartyB).toBe('600001');
    expect(body.AccountReference).toBe('INV-12');
    expect(body.QueueTimeOutURL).toBe('https://example.com/daraja/b2b/timeout');
    expect(body.ResultURL).toBe('https://example.com/daraja/b2b/result');

    fetchMock.mockClear();
    await daraja.b2bPayment({ recipient: '600001', amount: 10 });
    expect(payloadOf('/b2b/v3/paymentrequest').CommandID).toBe('BusinessToBusinessTransfer');

    await expect(daraja.b2bPayment({
      partyB: '600001',
      amount: 10,
      commandId: 'SalaryPayment' as any,
    })).rejects.toThrow(/Invalid B2B CommandID/);
    await expect(daraja.b2bPayment({ partyB: '', amount: 10 }))
      .rejects.toThrow(/Recipient shortcode/);
  });

  it('builds transaction status and reversal payloads', async () => {
    await daraja.queryTransactionStatus({ transactionId: 'TXN-1', remarks: 'Check payout' });
    const statusUrl = String(callFor('/transactionstatus/v1/query')[0]);
    expect(statusUrl).toBe('https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query');
    const status = payloadOf('/transactionstatus/v1/query');
    expect(status.CommandID).toBe('TransactionStatusQuery');
    expect(status.TransactionID).toBe('TXN-1');
    expect(status.Initiator).toBe('apiusersandbox');
    expect(status.PartyA).toBe('600000');
    expect(status.IdentifierType).toBe('4');
    expect(status.QueueTimeOutURL).toBe('https://example.com/daraja/status/timeout');
    expect(status.ResultURL).toBe('https://example.com/daraja/status/result');
    expect(decryptCredential(status.SecurityCredential)).toBe('initiator-password');

    await daraja.reverseTransaction({ transactionId: 'TXN-1', amount: 500, receiverParty: '600001' });
    const reversalUrl = String(callFor('/reversal/v1/request')[0]);
    expect(reversalUrl).toBe('https://sandbox.safaricom.co.ke/mpesa/reversal/v1/request');
    const reversal = payloadOf('/reversal/v1/request');
    expect(reversal.CommandID).toBe('TransactionReversal');
    expect(reversal.TransactionID).toBe('TXN-1');
    expect(reversal.Amount).toBe(500);
    expect(reversal.ReceiverParty).toBe('600001');
    expect(reversal.RecieverIdentifierType).toBe('11');
    expect(reversal.QueueTimeOutURL).toBe('https://example.com/daraja/reversal/timeout');
    expect(reversal.ResultURL).toBe('https://example.com/daraja/reversal/result');
  });

  it('posts distinct status queue/result URLs without echoing credentials', async () => {
    await daraja.queryTransactionStatus({ transactionId: 'TXN-URLS' });
    const body = payloadOf('/transactionstatus/v1/query');
    // Assert the posted body fields only — never log or print auth headers.
    expect(body.QueueTimeOutURL).toBe('https://example.com/daraja/status/timeout');
    expect(body.ResultURL).toBe('https://example.com/daraja/status/result');
    expect(body.ResultURL).not.toBe(body.QueueTimeOutURL);

    fetchMock.mockClear();
    await daraja.queryTransactionStatus({
      transactionId: 'TXN-OVERRIDE',
      queueTimeoutUrl: 'https://example.com/custom/status/timeout',
      resultUrl: 'https://example.com/custom/status/result',
    });
    const overridden = payloadOf('/transactionstatus/v1/query');
    expect(overridden.QueueTimeOutURL).toBe('https://example.com/custom/status/timeout');
    expect(overridden.ResultURL).toBe('https://example.com/custom/status/result');
  });

  it('validates status and reversal inputs', async () => {
    await expect(daraja.queryTransactionStatus({})).rejects.toThrow(/TransactionID is required/);
    await expect(daraja.reverseTransaction({ transactionId: 'TXN-1', amount: 0 }))
      .rejects.toThrow(/positive payment amount/);
    await expect(daraja.reverseTransaction({ transactionId: 'TXN-1', amount: 10, receiverParty: 'abc' }))
      .rejects.toThrow(/ReceiverParty/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws a typed DarajaError on rejection and HTTP failures', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/oauth/')) return json({ access_token: 'tok', expires_in: 3600 });
      return json({ ResponseCode: '1', ResponseDescription: 'Rejected by Safaricom' });
    });
    await expect(daraja.b2cPayment({ phone: '0712345678', amount: 100 }))
      .rejects.toMatchObject({ name: 'DarajaError', message: 'Rejected by Safaricom' });

    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/oauth/')) return json({ access_token: 'tok', expires_in: 3600 });
      return json({ message: 'upstream down' }, 503);
    });
    await expect(daraja.b2bPayment({ partyB: '600001', amount: 100 }))
      .rejects.toMatchObject({ name: 'DarajaError', status: 503 });
  });

  it('exposes community-pack error hints without echoing upstream data', async () => {
    expect(darajaHttpHint(401)).toMatch(/OAuth token/);
    expect(darajaHttpHint(400)).toMatch(/Bad request/);
    expect(darajaHttpHint(503)).toBeNull();
    expect(darajaResultHint('1')).toMatch(/Insufficient funds/);
    expect(darajaResultHint(1032)).toMatch(/cancelled/i);
    expect(darajaResultHint(2001)).toMatch(/PIN/i);
    expect(darajaResultHint('400.002.02')).toMatch(/HTTPS/i);
    expect(darajaResultHint('403.002.01')).toMatch(/token/i);
    expect(darajaResultHint(1037)).toMatch(/Timeout/);
    expect(darajaResultHint('9999')).toBeNull();

    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/oauth/')) return json({ access_token: 'tok', expires_in: 3600 });
      return json({ ResponseCode: '1', ResponseDescription: 'Rejected by Safaricom' });
    });
    const rejected = await daraja.b2cPayment({ phone: '0712345678', amount: 100 }).catch((err) => err);
    expect(rejected).toMatchObject({ name: 'DarajaError', status: 400 });
    expect(rejected.hint).toMatch(/Insufficient funds/);
    expect(rejected.message).not.toMatch(/SecurityCredential|consumer-secret|initiator-password/);

    daraja.resetTokenCacheForTests();
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/oauth/')) return json({}, 401);
      return json(accepted());
    });
    const oauthError = await daraja.getAccessToken().catch((err) => err);
    expect(oauthError).toMatchObject({ name: 'DarajaError', status: 401 });
    expect(oauthError.hint).toMatch(/OAuth token/);
  });

  it('rejects plain HTTP callback URLs in production', async () => {
    vi.stubEnv('MPESA_ENV', 'live');
    await expect(daraja.b2cPayment({
      phone: '0712345678',
      amount: 100,
      queueTimeoutUrl: 'http://example.com/timeout',
    })).rejects.toThrow(/must use HTTPS in production/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('registers C2B URLs with the constant-time callback token and fails closed without it', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/oauth/')) return json({ access_token: 'tok', expires_in: 3600 });
      return json(accepted());
    });
    await daraja.registerC2bUrls();
    const body = payloadOf('/mpesa/c2b/v2/registerurl');
    for (const key of ['ConfirmationURL', 'ValidationURL']) {
      const url = new URL(String(body[key]));
      expect(url.protocol).toBe('https:');
      expect(url.searchParams.get('token')).toBe('shared-token');
    }

    vi.stubEnv('MPESA_CALLBACK_TOKEN', '');
    daraja.resetTokenCacheForTests();
    fetchMock.mockClear();
    await expect(daraja.registerC2bUrls()).rejects.toThrow(/MPESA_CALLBACK_TOKEN is not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates dynamic QR transaction codes before contacting Safaricom', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/oauth/')) return json({ access_token: 'tok', expires_in: 3600 });
      return json({ ResponseCode: '0', QRData: 'placeholder' });
    });
    await expect(daraja.generateMpesaQr({ reference: 'INV-1', amount: 10, transactionType: 'XX' }))
      .rejects.toThrow(/TrxCode must be one of BG, PB, WA or SM/);
    expect(fetchMock).not.toHaveBeenCalled();

    await daraja.generateMpesaQr({ reference: 'INV-1', amount: 10, transactionType: 'pb' });
    expect(payloadOf('/mpesa/qrcode/v1/generate').TrxCode).toBe('PB');
  });

  it('does not attach raw upstream bodies to C2B registration errors', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/oauth/')) return json({ access_token: 'tok', expires_in: 3600 });
      return json({ leaked_callback_url: 'https://example.com/c2b/confirmation' }, 500);
    });
    const error = await daraja.registerC2bUrls({
      confirmationUrl: 'https://example.com/c2b/confirmation',
      validationUrl: 'https://example.com/c2b/validation',
    }).catch((err) => err);
    expect(error).toMatchObject({ name: 'DarajaError', status: 500 });
    expect(error.details).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain('leaked_callback_url');
  });

  it('decodes a Result envelope into a flat callback object', () => {
    expect(daraja.decodeCallback({
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'The service request has been accepted successfully',
        OriginatorConversationID: 'ORIG-1',
        ConversationID: 'AG_CONVERSATION_1',
        TransactionID: 'TXN-1',
        ResultParameters: {
          ResultParameter: [
            { Key: 'Amount', Value: 1500 },
            { Key: 'PartyB', Value: '254712345678' },
          ],
        },
      },
    })).toMatchObject({
      resultCode: '0',
      resultDesc: 'The service request has been accepted successfully',
      transactionId: 'TXN-1',
      conversationId: 'AG_CONVERSATION_1',
      originatorConversationId: 'ORIG-1',
      amount: 1500,
      partyB: '254712345678',
    });

    const named = daraja.decodeCallback({
      Result: JSON.stringify({
        ResultCode: 1,
        TransactionID: 'TXN-2',
        ResultParameters: {
          ResultParameter: [{ Name: 'PartyB', Value: '600001' }],
        },
      }),
    });
    expect(named).toMatchObject({ resultCode: '1', transactionId: 'TXN-2', partyB: '600001' });
    expect(named?.amount).toBeUndefined();
  });

  it('decodes canonical B2C result parameters for cross-checks', () => {
    const decoded = daraja.decodeCallback({
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: 'The service request has been accepted successfully',
        OriginatorConversationID: 'ORIG-B2C-1',
        ConversationID: 'AG_CONV_B2C',
        ResultParameters: {
          ResultParameter: [
            { Key: 'TransactionAmount', Value: 2450 },
            { Key: 'TransactionReceipt', Value: 'RECEIPT-1' },
            { Key: 'TransactionCompletedDateTime', Value: '22.11.2026 12:00:00' },
            { Key: 'ReceiverPartyPublicName', Value: '254712345678 - Jane Doe' },
          ],
        },
      },
    });
    expect(decoded).toMatchObject({
      resultCode: '0',
      originatorConversationId: 'ORIG-B2C-1',
      conversationId: 'AG_CONV_B2C',
      amount: 2450,
      transactionId: 'RECEIPT-1',
      transactionDate: '22.11.2026 12:00:00',
      partyB: '254712345678 - Jane Doe',
      phone: '254712345678 - Jane Doe',
      receiverPartyPublicName: '254712345678 - Jane Doe',
    });

    // The other documented receipt alias must cross-check too.
    const receiptNo = daraja.decodeCallback({
      Result: {
        ResultParameters: {
          ResultParameter: [
            { Key: 'Amount', Value: 50 },
            { Key: 'ReceiptNo', Value: 'RECEIPT-2' },
          ],
        },
      },
    });
    expect(receiptNo).toMatchObject({ amount: 50, transactionId: 'RECEIPT-2' });
  });

  it('returns null when no Result envelope is present', () => {
    expect(daraja.decodeCallback({})).toBeNull();
    expect(daraja.decodeCallback({ Body: { stkCallback: {} } })).toBeNull();
    expect(daraja.decodeCallback({ Result: 'not-json' })).toBeNull();
  });

  it('keeps the Safaricom-compatible B2B v3 path over the community doc v1 path', async () => {
    await daraja.b2bPayment({ partyB: '600001', amount: 100 });
    const url = String(callFor('/b2b/v3/paymentrequest')[0]);
    expect(url).toBe('https://sandbox.safaricom.co.ke/mpesa/b2b/v3/paymentrequest');
    expect(url).not.toContain('/b2b/v1/paymentrequest');
  });

  it('sends the canonical BusinessPayToPochi payload keys', async () => {
    await daraja.payToPochi({
      amount: 3500, partyB: '254708374100', remarks: 'Supply delivery',
    });
    const url = String(callFor('/b2pochi/v1/paymentrequest')[0]);
    expect(url).toBe('https://sandbox.safaricom.co.ke/mpesa/b2pochi/v1/paymentrequest');
    const body = payloadOf('/b2pochi/v1/paymentrequest');
    expect(body).toMatchObject({
      CommandID: 'BusinessPayToPochi',
      InitiatorName: 'apiusersandbox',
      Amount: 3500,
      PartyA: '600000',
      PartyB: '254708374100',
      Remarks: 'Supply delivery',
      QueueTimeOutURL: 'https://example.com/daraja/b2c/timeout',
      ResultURL: 'https://example.com/daraja/b2c/result',
      Occassion: 'VendorPayment',
    });
    expect(body).not.toHaveProperty('Initiator');
    expect(body).not.toHaveProperty('Occasion');
    expect(decryptCredential(body.SecurityCredential)).toBe('initiator-password');
  });

  it('uses the canonical remittax and standing-order paths', async () => {
    await daraja.remitTax({ amount: 1200, accountReference: 'KRA-PRN-9281' });
    const remitUrl = String(callFor('/b2b/v1/remittax')[0]);
    expect(remitUrl).toBe('https://sandbox.safaricom.co.ke/mpesa/b2b/v1/remittax');
    expect(payloadOf('/b2b/v1/remittax')).toMatchObject({
      CommandID: 'PayTaxToKRA',
      AccountReference: 'KRA-PRN-9281',
      PartyB: '572572',
    });
    expect(fetchMock.mock.calls.some(([url]: any[]) => String(url).includes('/tax/v1/remit'))).toBe(false);

    await daraja.createStandingOrder({
      name: 'Rent subscription', amount: 15000, partyB: '254708374100',
      frequency: 'Monthly', startDate: '2026-12-01',
    });
    const standingUrl = String(callFor('/standingorder/v1/createStandingOrderExternal')[0]);
    expect(standingUrl).toBe('https://sandbox.safaricom.co.ke/standingorder/v1/createStandingOrderExternal');
    expect(payloadOf('/standingorder/v1/createStandingOrderExternal')).toMatchObject({
      CommandID: 'CreateSubscription',
      SubscriptionName: 'Rent subscription',
      Frequency: 'Monthly',
      StartDate: '2026-12-01',
    });
    expect(fetchMock.mock.calls.some(([url]: any[]) => String(url).includes('/ratiba/v1/subscribe'))).toBe(false);
  });

  it('parses account balances defensively for the review path', () => {
    expect(daraja.parseAccountBalance('Working Account|KES|100000|80000|15000|5000')).toEqual({
      accountType: 'Working Account',
      currency: 'KES',
      total: 100000,
      available: 80000,
      reserved: 15000,
      uncleared: 5000,
    });
    expect(daraja.parseAccountBalance('Working Account|KES|n/a|80000')).toEqual({
      accountType: 'Working Account',
      currency: 'KES',
      total: undefined,
      available: 80000,
      reserved: undefined,
      uncleared: undefined,
    });
    expect(daraja.parseAccountBalance('not-a-balance')).toBeNull();
    expect(daraja.parseAccountBalance('|KES|10')).toBeNull();
  });
});
