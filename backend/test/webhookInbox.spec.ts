import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * DB-free contracts for the cross-domain webhook inbox: strict redaction of
 * signatures/tokens/credentialed URLs/PII, no raw headers, no mutations, and
 * bounded read-only filtering.
 */

const h = vi.hoisted(() => ({
  logAudit: vi.fn(async () => null),
}));

vi.mock('../src/shared/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = { sub: 'SUPER-1', role: 'SUPER_ADMIN' };
    next();
  },
}));
vi.mock('../src/shared/middleware/roles', () => ({
  requireAccess: () => (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock('../src/shared/services/audit', () => ({ logAudit: h.logAudit }));

const rows: any[] = [
  {
    id: 'PE-1', connectionId: 'CONN-1', provider: 'META', domain: 'COMMUNICATIONS',
    eventType: 'page.post', externalEventId: 'evt_123', signatureValid: true,
    status: 'PROCESSED', dedupeKey: 'META:evt_123',
    error: null,
    payload: {
      object: 'page',
      access_token: 'SUPER_SECRET_TOKEN',
      data: [{ email: 'buyer@example.com', phone: '0712345678', message: 'hello' }],
      callback_url: 'https://example.com/hook?token=abc&sig=xyz',
    },
    headers: { 'x-hub-signature-256': 'sha256=DEADBEEF', authorization: 'Bearer secret' },
    createdAt: '2026-11-22T10:00:00.000Z', processedAt: '2026-11-22T10:00:01.000Z',
  },
  {
    id: 'PE-2', connectionId: null, provider: 'PAYPAL', domain: 'FINANCE',
    eventType: 'PAYMENT.CAPTURE.COMPLETED', externalEventId: 'WH-9', signatureValid: false,
    status: 'FAILED', dedupeKey: 'PAYPAL:WH-9',
    error: 'payer buyer@example.com failed on +254712345678',
    payload: { id: 'WH-9', amount: { value: '42.50', currency_code: 'USD' } },
    headers: { 'paypal-transmission-sig': 'SIG' },
    createdAt: '2026-11-22T09:00:00.000Z', processedAt: null,
  },
];

const providerEventStore = {
  orderBy: () => providerEventStore,
  limit: () => providerEventStore,
  all: async () => rows,
};
const db: any = { orm: { public: { ProviderEvent: providerEventStore } } };

import webhookInboxRouter, { redactWebhookString, redactWebhookValue, toSafeWebhookEvent } from '../src/shared/routes/webhookInbox';

const app = express();
app.use(express.json());
app.use('/v1/admin/webhook-inbox', webhookInboxRouter(db));

describe('webhook inbox redaction', () => {
  it('redacts emails, MSISDNs and credentialed URL query strings', () => {
    expect(redactWebhookString('buyer@example.com')).toBe('••••');
    expect(redactWebhookString('call 0712345678 now')).toBe('call •••• now');
    expect(redactWebhookString('+254712345678')).toBe('••••');
    const redacted = redactWebhookString('https://example.com/hook?token=abc&sig=xyz');
    expect(redacted).toBe('https://example.com/hook');
    expect(redacted).not.toMatch(/token|sig|abc|xyz/);
  });

  it('redacts sensitive keys and PII keys without mutating the input', () => {
    const payload = {
      access_token: 'SECRET', api_key: 'KEY', signature: 'SIG',
      email: 'a@b.com', msisdn: '0712345678',
      safe: 'value', nested: { password: 'P', count: 3 },
    };
    const snapshot = JSON.stringify(payload);
    const result: any = redactWebhookValue(payload);
    expect(result.access_token).toBe('••••');
    expect(result.api_key).toBe('••••');
    expect(result.signature).toBe('••••');
    expect(result.email).toBe('••••');
    expect(result.msisdn).toBe('••••');
    expect(result.nested.password).toBe('••••');
    expect(result.safe).toBe('value');
    expect(result.nested.count).toBe(3);
    expect(JSON.stringify(payload)).toBe(snapshot);
  });

  it('never projects raw headers', () => {
    const safe: any = toSafeWebhookEvent(rows[0]);
    expect(safe).not.toHaveProperty('headers');
    expect(JSON.stringify(safe)).not.toMatch(/DEADBEEF|Bearer secret|sha256/);
  });
});

describe('webhook inbox route (read-only)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns redacted events across both domains', async () => {
    const response = await request(app).get('/v1/admin/webhook-inbox');
    expect(response.status).toBe(200);
    expect(response.body.events).toHaveLength(2);
    const body = JSON.stringify(response.body);
    expect(body).not.toMatch(/SUPER_SECRET_TOKEN|DEADBEEF|buyer@example\.com|0712345678|abc&sig/);
    expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'communications.webhook_inbox.view',
      entity: 'ProviderEvent',
    }));
  });

  it('filters by domain and status', async () => {
    const finance = await request(app).get('/v1/admin/webhook-inbox?domain=finance');
    expect(finance.status).toBe(200);
    expect(finance.body.events).toHaveLength(1);
    expect(finance.body.events[0].provider).toBe('PAYPAL');

    const failed = await request(app).get('/v1/admin/webhook-inbox?status=failed');
    expect(failed.body.events).toHaveLength(1);
    expect(failed.body.events[0].id).toBe('PE-2');
  });

  it('is GET-only (no replay/retry/settle mutations)', async () => {
    const response = await request(app).post('/v1/admin/webhook-inbox').send({});
    expect(response.status).toBe(404);
    expect(rows).toHaveLength(2);
  });
});

describe('integration endpoints catalogue (read-only)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists canonical /v1 paths with no secret values', async () => {
    const response = await request(app).get('/v1/admin/webhook-inbox/endpoints');
    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.apiOrigin).toBe('https://api.angisoft.co.ke');
    expect(Array.isArray(body.endpoints)).toBe(true);
    const paths = body.endpoints.map((e: any) => e.path as string);
    expect(paths).toContain('/v1/payments/paypal/webhook');
    expect(paths).toContain('/v1/finance/webhooks/PAYHERO');
    expect(paths).toContain('/v1/payments/mpesa/callback?token=••••');
    // No forbidden aliases anywhere in the catalogue.
    const all = JSON.stringify(body);
    expect(all).not.toMatch(/\/api\/|\/mpesa-extended|\/v1\/payments\/daraja/);
    // Config values are never resolved — only KEY NAMES appear.
    expect(all).not.toMatch(/SUPER_SECRET|abc&sig/);
    expect(h.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'administration.integration_endpoints.view',
      entity: 'IntegrationEndpoint',
    }));
  });

  it('marks tokenised Daraja URLs and legacy rails explicitly', async () => {
    const response = await request(app).get('/v1/admin/webhook-inbox/endpoints');
    const endpoints = response.body.endpoints as any[];
    const stk = endpoints.find((e) => e.path.startsWith('/v1/payments/mpesa/callback'));
    expect(stk?.tokenized).toBe(true);
    expect(stk?.configKeys).toContain('MPESA_CALLBACK_TOKEN');
    const payhero = endpoints.find((e) => e.path === '/v1/finance/webhooks/PAYHERO');
    expect(payhero?.tokenized).toBe(false);
    const legacy = endpoints.filter((e) => e.legacy);
    expect(legacy.map((e) => e.provider).sort()).toEqual(['PAYSTACK', 'STRIPE']);
  });
});
