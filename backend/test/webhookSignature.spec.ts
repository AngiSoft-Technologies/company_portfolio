import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route-level production guard for unsigned Meta/WhatsApp webhooks.
 *
 * The router is exercised without an HTTP server: the POST handler is taken
 * from the Express router's route stack and called with plain req/res stubs.
 * Every outbound collaborator is mocked, so a bypass would be visible as a
 * 200 plus a provider-event enqueue rather than a real side effect.
 */
const h = vi.hoisted(() => ({
  getConfig: vi.fn((_key: string, fallback = '') => fallback),
  recordProviderEvent: vi.fn(async () => ({ event: { id: 'event-1', status: 'RECEIVED' }, deduped: false })),
  decryptSecret: vi.fn(() => null),
  enqueue: vi.fn(async () => undefined),
  processProviderEvent: vi.fn(async () => undefined),
  verifyMetaSignature: vi.fn(() => false),
  verifyMetaVerifyToken: vi.fn(() => false),
  verifyTelegramWebhook: vi.fn(async () => false),
}));

vi.mock('../src/shared/services/runtimeConfig', () => ({ getConfig: h.getConfig }));
vi.mock('../src/shared/services/providerEvents', () => ({ recordProviderEvent: h.recordProviderEvent }));
vi.mock('../src/shared/services/secrets', () => ({ decryptSecret: h.decryptSecret }));
vi.mock('../src/queue', () => ({ getQueue: () => ({ add: h.enqueue }) }));
vi.mock('../src/modules/communications/services/eventProcessor', () => ({ processProviderEvent: h.processProviderEvent }));
vi.mock('../src/modules/communications/services/whatsappCloud', () => ({ verifyMetaSignature: h.verifyMetaSignature }));
vi.mock('../src/modules/communications/services/metaSocial', () => ({ verifyMetaVerifyToken: h.verifyMetaVerifyToken }));
vi.mock('../src/modules/communications/services/telegram', () => ({ verifyTelegramWebhook: h.verifyTelegramWebhook }));

import communicationsWebhooksRouter from '../src/modules/communications/routes/webhooks';

const prisma = {
  orm: {
    public: {
      ProviderConnection: { where: () => ({ all: async () => [{ id: 'conn-1' }] }) },
      ProviderSecret: { where: () => ({ orderBy: () => ({ first: async () => null }) }) },
    },
  },
} as any;

const router = communicationsWebhooksRouter(prisma);

function postHandler(routePath: string) {
  const layer = (router as any).stack.find((candidate: any) => candidate.route?.path === routePath && candidate.route?.methods?.post);
  if (!layer) throw new Error(`Missing POST ${routePath} handler`);
  const stack = layer.route.stack as any[];
  return stack[stack.length - 1].handle as (req: any, res: any) => Promise<void>;
}

function makeRes() {
  const res: any = {
    sendStatus: vi.fn(() => res),
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res;
}

const originalNodeEnv = process.env.NODE_ENV;

describe('production unsigned-webhook guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'production';
    // Hostile configuration: every dev-only bypass flag is explicitly 'true',
    // including the Telegram/TikTok equivalents. The route guard must ignore
    // them solely because NODE_ENV is production.
    h.getConfig.mockImplementation((key: string, fallback = '') => (
      key.endsWith('ALLOW_UNSIGNED_WEBHOOKS') ? 'true' : fallback
    ));
    for (const flag of [
      'WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS',
      'META_ALLOW_UNSIGNED_WEBHOOKS',
      'TELEGRAM_ALLOW_UNSIGNED_WEBHOOKS',
      'TIKTOK_ALLOW_UNSIGNED_WEBHOOKS',
    ]) {
      expect(h.getConfig(flag)).toBe('true');
    }
    h.getConfig.mockClear();
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('rejects an unsigned WhatsApp webhook when the bypass flag is true in production', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{ id: 'wba-1', changes: [{ value: { messages: [{ id: 'wamid.1', from: '254700000000', text: { body: 'hello' } }] } }] }],
    };
    const req = { body: Buffer.from(JSON.stringify(payload)), headers: {}, query: {} };
    const res = makeRes();

    await postHandler('/whatsapp')(req, res);

    // Production short-circuits before the dev-only flag is even read.
    expect(h.getConfig).not.toHaveBeenCalledWith('WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS');
    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect((h.recordProviderEvent.mock.calls[0] as unknown as any[])[1]).toMatchObject({
      eventType: 'whatsapp.webhook.rejected',
      signatureValid: false,
      status: 'FAILED',
    });
    expect(h.enqueue).not.toHaveBeenCalled();
    expect(h.processProviderEvent).not.toHaveBeenCalled();
  });

  it('rejects an unsigned Meta webhook when the bypass flag is true in production', async () => {
    const payload = {
      object: 'facebook_page',
      entry: [{ id: 'page-1', changes: [{ field: 'comments', value: { comment_id: 'c-1', from: { id: 'u-1' }, message: 'ping' } }] }],
    };
    const req = { body: Buffer.from(JSON.stringify(payload)), headers: {}, query: { network: 'META_FACEBOOK' } };
    const res = makeRes();

    await postHandler('/meta')(req, res);

    // Production short-circuits before the dev-only flag is even read.
    expect(h.getConfig).not.toHaveBeenCalledWith('META_ALLOW_UNSIGNED_WEBHOOKS');
    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect((h.recordProviderEvent.mock.calls[0] as unknown as any[])[1]).toMatchObject({
      eventType: 'meta.webhook.rejected',
      signatureValid: false,
      status: 'FAILED',
    });
    expect(h.enqueue).not.toHaveBeenCalled();
    expect(h.processProviderEvent).not.toHaveBeenCalled();
  });

  it('control: the same bypass is only honoured outside production', async () => {
    process.env.NODE_ENV = 'test';
    const payload = { object: 'whatsapp_business_account', entry: [{ id: 'wba-1', changes: [] }] };
    const req = { body: Buffer.from(JSON.stringify(payload)), headers: {}, query: {} };
    const res = makeRes();

    await postHandler('/whatsapp')(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(h.processProviderEvent).toHaveBeenCalledTimes(1);
  });
});
