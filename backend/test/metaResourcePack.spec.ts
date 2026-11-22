import { createHash } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Meta resource-pack unit tests.
 *
 * Only pure guard/configuration helpers are exercised here: config is a mock
 * map, and the audit, provider-event, DB and outbound-adapter modules are
 * mocked so no database or network call can be made.
 */
const { config, getConfigMock } = vi.hoisted(() => {
  const config = new Map<string, string>();
  const getConfigMock = vi.fn((key: string, fallback = '') => config.get(key) ?? fallback ?? '');
  return { config, getConfigMock };
});

vi.mock('../src/shared/services/runtimeConfig', () => ({
  getConfig: getConfigMock,
  CONFIG_REGISTRY: [],
  hasConfig: (key: string) => Boolean(getConfigMock(key)),
  loadRuntimeConfig: async () => undefined,
  clearRuntimeConfigCache: () => undefined,
  setConfigValue: async () => undefined,
  deleteConfigValue: async () => undefined,
}));

const { logAuditMock } = vi.hoisted(() => ({
  logAuditMock: vi.fn(async () => undefined),
}));

vi.mock('../src/shared/services/audit', () => ({
  logAudit: logAuditMock,
}));

const { recordProviderEventMock } = vi.hoisted(() => ({
  recordProviderEventMock: vi.fn(async () => ({ event: { id: 'mock-event' }, deduped: false })),
}));

vi.mock('../src/shared/services/providerEvents', () => ({
  recordProviderEvent: recordProviderEventMock,
  dispatchProviderEvent: vi.fn(async () => ({ dispatched: true, processed: true })),
  registerProviderEventProcessor: vi.fn(),
  providerEventDedupeKey: vi.fn(() => 'META:mock'),
}));

vi.mock('../src/db', () => ({
  default: {},
  validateDatabaseConnection: async () => true,
}));

vi.mock('../src/prisma/db', () => ({
  db: {},
  default: {},
  ts: (value?: unknown) => (typeof value === 'string' ? value : new Date().toISOString()),
  tsMs: (value: unknown) => new Date(String(value)).getTime(),
  newId: () => 'mock-id',
}));

vi.mock('../src/modules/communications/services/conversations', () => ({
  generateAiDraft: vi.fn(),
  ingestInboundMessage: vi.fn(),
  upsertContact: vi.fn(),
}));

vi.mock('../src/modules/communications/services/metaSocial', () => ({
  resolveMetaAccount: vi.fn(),
  sendMetaComment: vi.fn(),
  sendMetaMessage: vi.fn(),
}));

import {
  assertReadOnlyMcpTool,
  isReadOnlyMcpToolName,
  MCP_OPERATIONS,
  resolveMcpEndpoint,
  sanitizeMcpArgs,
} from '../src/modules/communications/services/metaMcp';
import {
  capiConfigured,
  firstPartySourceUrl,
  sendMetaConversion,
} from '../src/modules/communications/services/metaConversions';
import {
  META_OPERATIONS,
  assertMetaOperation,
  getMetaFeatureFlags,
  getMetaOperationStatus,
  hideMetaComment,
  listInstagramMentions,
  listMetaAdInsights,
  listMetaAppSubscriptions,
  listMetaInstagramInsights,
  listThreadsInsights,
  publishThreadsCarousel,
} from '../src/modules/communications/services/metaCapabilities';
import { ProviderCapabilityError } from '../src/modules/communications/services/capabilities';
import { ProviderConfigurationError } from '../src/modules/communications/services/providerSecrets';

const ENDPOINTS = [
  { operation: 'mcp.ads', configKey: 'META_ADS_MCP_URL', url: 'https://mcp.facebook.com/ads' },
  { operation: 'mcp.social', configKey: 'META_SOCIAL_MCP_URL', url: 'https://mcp.facebook.com/devtools' },
  { operation: 'mcp.whatsapp', configKey: 'META_WHATSAPP_MCP_URL', url: 'https://mcp.facebook.com/whatsapp_business_tools' },
];

describe('Meta resource pack', () => {
  beforeEach(() => {
    config.clear();
    getConfigMock.mockClear();
    logAuditMock.mockClear();
    recordProviderEventMock.mockClear();
  });

  afterEach(() => {
    config.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('resolveMcpEndpoint', () => {
    it.each(ENDPOINTS)('accepts the exact documented URL for $operation', ({ operation, configKey, url }) => {
      config.set(configKey, url);
      expect(resolveMcpEndpoint(operation)).toBe(url);
    });

    it('rejects docs, lookalike, query-string and trailing-path URLs', () => {
      const rejected = [
        'https://developers.facebook.com/docs/mcp',
        'https://mcp.facebook.com.evil.example/ads',
        'https://mcp.facebook.com/ads?q=1',
        'https://mcp.facebook.com/ads/extra',
      ];
      for (const url of rejected) {
        config.set('META_ADS_MCP_URL', url);
        expect(() => resolveMcpEndpoint('mcp.ads')).toThrowError(ProviderConfigurationError);
      }
    });

    it('exposes exactly the three documented MCP operations', () => {
      expect(MCP_OPERATIONS).toEqual(['mcp.ads', 'mcp.social', 'mcp.whatsapp']);
    });
  });

  describe('assertReadOnlyMcpTool', () => {
    it.each(['list_ads', 'get_campaign', 'query_insights'])('allows read-only tool %s', (tool) => {
      expect(isReadOnlyMcpToolName(tool)).toBe(true);
      expect(() => assertReadOnlyMcpTool(tool)).not.toThrow();
    });

    it.each(['create_campaign', 'send_message', 'publish_post', 'delete_item'])('rejects write tool %s', (tool) => {
      expect(isReadOnlyMcpToolName(tool)).toBe(false);
      expect(() => assertReadOnlyMcpTool(tool)).toThrowError(ProviderCapabilityError);
    });

    it('rejects lookalike names that a catalogue would otherwise show as available', () => {
      for (const tool of ['list_campaigns_and_send', 'get_publish_status', 'read/ads']) {
        expect(isReadOnlyMcpToolName(tool)).toBe(false);
        expect(() => assertReadOnlyMcpTool(tool)).toThrowError(ProviderCapabilityError);
      }
    });
  });

  describe('sanitizeMcpArgs', () => {
    it('keeps benign arguments unchanged', () => {
      const args = { ad_id: '123', limit: 5, active: true };
      expect(sanitizeMcpArgs(args)).toEqual(args);
    });

    it('strips credential-shaped keys', () => {
      const safe = sanitizeMcpArgs({
        limit: 10,
        access_token: 'placeholder',
        password: 'placeholder',
        client_secret: 'placeholder',
        auth_header: 'placeholder',
        cookie: 'placeholder',
        credentials: 'placeholder',
      });
      expect(safe).toEqual({ limit: 10 });
      expect(JSON.stringify(safe)).not.toContain('placeholder');
    });

    it('rejects payloads over 8192 characters', () => {
      expect(() => sanitizeMcpArgs({ blob: 'x'.repeat(9000) }))
        .toThrowError(ProviderConfigurationError);
    });
  });

  describe('capiConfigured', () => {
    it('is false while disabled even with dataset and credential configured', () => {
      config.set('META_CAPI_ENABLED', 'false');
      config.set('META_CAPI_DATASET_ID', 'dataset-1');
      config.set('META_CAPI_ACCESS_TOKEN', 'placeholder');
      expect(capiConfigured()).toBe(false);
    });

    it('is false when enabled but dataset or credential is missing', () => {
      config.set('META_CAPI_ENABLED', 'true');
      expect(capiConfigured()).toBe(false);

      config.set('META_CAPI_DATASET_ID', 'dataset-1');
      expect(capiConfigured()).toBe(false);

      config.delete('META_CAPI_DATASET_ID');
      config.set('META_CAPI_ACCESS_TOKEN', 'placeholder');
      expect(capiConfigured()).toBe(false);
    });

    it('is true only when enabled with dataset and credential', () => {
      config.set('META_CAPI_ENABLED', 'true');
      config.set('META_CAPI_DATASET_ID', 'dataset-1');
      config.set('META_CAPI_ACCESS_TOKEN', 'placeholder');
      expect(capiConfigured()).toBe(true);
    });
  });

  describe('getMetaFeatureFlags', () => {
    it('reports CAPI status so the admin UI never shows an unconfigured integration', () => {
      expect(getMetaFeatureFlags().capiConfigured).toBe(false);
      config.set('META_CAPI_ENABLED', 'true');
      config.set('META_CAPI_DATASET_ID', 'dataset-1');
      expect(getMetaFeatureFlags().capiConfigured).toBe(false);
      config.set('META_CAPI_ACCESS_TOKEN', 'placeholder');
      expect(getMetaFeatureFlags().capiConfigured).toBe(true);
    });

    it('exposes the WhatsApp Graph version as a non-secret version string', () => {
      expect(getMetaFeatureFlags().whatsappGraphVersion).toBe('v23.0');
      config.set('WHATSAPP_API_VERSION', 'v24.0');
      expect(getMetaFeatureFlags().whatsappGraphVersion).toBe('v24.0');
      expect(getMetaFeatureFlags().graphVersion).toBe('v23.0');
    });

    it('exposes only booleans, version strings and allowlisted endpoint strings', () => {
      config.set('META_APP_ID', '123456');
      config.set('META_GRAPH_VERSION', 'v24.0');
      config.set('WHATSAPP_API_VERSION', 'v23.0');
      config.set('META_CAPI_ENABLED', 'true');
      config.set('META_CAPI_DATASET_ID', 'dataset-1');
      for (const { configKey, url } of ENDPOINTS) config.set(configKey, url);

      const flags = getMetaFeatureFlags() as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(flags)) {
        if (key === 'graphVersion' || key === 'whatsappGraphVersion') {
          expect(typeof value, key).toBe('string');
          expect(value, key).toMatch(/^v\d+(?:\.\d+)+$/);
        } else if (key === 'mcpEndpoints') {
          expect(value && typeof value === 'object', key).toBe(true);
          for (const [endpointName, endpoint] of Object.entries(value as Record<string, unknown>)) {
            expect(endpoint === null || (typeof endpoint === 'string' && endpoint.startsWith('https://mcp.facebook.com/')), endpointName).toBe(true);
          }
        } else {
          expect(typeof value, key).toBe('boolean');
        }
      }
    });

    it('never includes configured token values in the flag payload', () => {
      const dummySecrets: Record<string, string> = {
        META_APP_SECRET: 'dummy-app-secret-DO-NOT-EXPOSE',
        META_SYSTEM_USER_TOKEN: 'dummy-system-token-DO-NOT-EXPOSE',
        META_PAGE_ACCESS_TOKEN: 'dummy-page-token-DO-NOT-EXPOSE',
        META_CAPI_ACCESS_TOKEN: 'dummy-capi-token-DO-NOT-EXPOSE',
        META_MCP_ACCESS_TOKEN: 'dummy-mcp-token-DO-NOT-EXPOSE',
        WHATSAPP_ACCESS_TOKEN: 'dummy-whatsapp-token-DO-NOT-EXPOSE',
        THREADS_ACCESS_TOKEN: 'dummy-threads-token-DO-NOT-EXPOSE',
      };
      for (const [key, value] of Object.entries(dummySecrets)) config.set(key, value);
      config.set('META_CAPI_ENABLED', 'true');
      config.set('META_CAPI_DATASET_ID', 'dataset-1');

      const serialized = JSON.stringify(getMetaFeatureFlags());
      for (const secret of Object.values(dummySecrets)) {
        expect(serialized).not.toContain(secret);
      }
      expect(serialized).not.toContain('DO-NOT-EXPOSE');
    });
  });

  describe('firstPartySourceUrl', () => {
    it('builds an HTTPS first-party URL from a relative public path', () => {
      config.set('PUBLIC_SITE_URL', 'https://angisoft.co.ke/');
      expect(firstPartySourceUrl('/contact')).toBe('https://angisoft.co.ke/contact');
      expect(firstPartySourceUrl('/contact/')).toBe('https://angisoft.co.ke/contact/');
    });

    it.each(['https://evil.example/contact', '//evil.example/contact', '/contact?q=1', '/contact#lead', '/contact\nlead'])(
      'rejects unsafe or non-first-party source path %s',
      (path) => {
        config.set('PUBLIC_SITE_URL', 'https://angisoft.co.ke');
        expect(firstPartySourceUrl(path)).toBeUndefined();
      },
    );
  });

  describe('sendMetaConversion', () => {
    const configureCapi = () => {
      config.set('META_CAPI_ENABLED', 'true');
      config.set('META_CAPI_DATASET_ID', 'dataset-1');
      config.set('META_CAPI_ACCESS_TOKEN', 'placeholder-token');
    };
    // Only the ProviderEvent status update is needed; CAPI never touches other models.
    const prismaStub = () => ({
      orm: { public: { ProviderEvent: { where: () => ({ update: async () => undefined }) } } },
    }) as any;
    const leadEvent = { eventName: 'Lead', eventId: 'lead-1' } as const;

    it('stays silent and fail-open while disabled or missing dataset/token', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      expect(await sendMetaConversion(prismaStub(), { ...leadEvent, marketingConsent: true }))
        .toEqual({ sent: false, reason: 'DISABLED' });
      config.set('META_CAPI_ENABLED', 'true');
      expect(await sendMetaConversion(prismaStub(), { ...leadEvent, marketingConsent: true }))
        .toEqual({ sent: false, reason: 'NOT_CONFIGURED' });
      config.set('META_CAPI_DATASET_ID', 'dataset-1');
      expect(await sendMetaConversion(prismaStub(), { ...leadEvent, marketingConsent: true }))
        .toEqual({ sent: false, reason: 'NOT_CONFIGURED' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(recordProviderEventMock).not.toHaveBeenCalled();
    });

    it('requires per-event consent; service events need META_CAPI_ALLOW_SERVICE_EVENTS', async () => {
      configureCapi();
      const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      expect(await sendMetaConversion(prismaStub(), leadEvent)).toEqual({ sent: false, reason: 'NO_CONSENT' });
      expect(await sendMetaConversion(prismaStub(), { ...leadEvent, serviceEvent: true }))
        .toEqual({ sent: false, reason: 'NO_CONSENT' });
      expect(fetchMock).not.toHaveBeenCalled();
      config.set('META_CAPI_ALLOW_SERVICE_EVENTS', 'true');
      expect(await sendMetaConversion(prismaStub(), { ...leadEvent, serviceEvent: true }))
        .toEqual({ sent: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('SHA-256 hashes PII and keeps tokens and raw values out of the request and audit', async () => {
      configureCapi();
      config.set('META_CAPI_TEST_EVENT_CODE', 'TEST-123');
      const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const result = await sendMetaConversion(prismaStub(), {
        ...leadEvent,
        email: ' Person@Example.COM ',
        phone: '+254 712 345 678',
        value: 100,
        currency: 'kes',
        marketingConsent: true,
        actorId: 'actor-1',
      });
      expect(result).toEqual({ sent: true });
      const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
      expect(url).toContain('/dataset-1/events');
      const body = JSON.parse(init.body);
      expect(body.data[0].user_data).toEqual({
        em: createHash('sha256').update('person@example.com').digest('hex'),
        ph: createHash('sha256').update('254712345678').digest('hex'),
      });
      expect(body.data[0].action_source).toBe('website');
      expect(body.data[0].custom_data).toMatchObject({ value: 100, currency: 'KES' });
      expect(body.test_event_code).toBe('TEST-123');
      expect(init.body).not.toContain('Person@Example.COM');
      expect(init.body).not.toContain('+254 712 345 678');
      const recorded = recordProviderEventMock.mock.calls[0]?.[1] as any;
      expect(recorded).toMatchObject({
        domain: 'COMMUNICATIONS', provider: 'META_CAPI', externalEventId: 'lead-1',
      });
      expect(recorded.payload).not.toHaveProperty('email');
      expect(recorded.payload).not.toHaveProperty('phone');
      expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        action: 'communications.meta.capi.sent',
        meta: expect.objectContaining({
          eventName: 'Lead',
          eventId: 'lead-1',
          serviceEvent: false,
          marketingConsent: true,
        }),
      }));
      const auditText = JSON.stringify(logAuditMock.mock.calls);
      expect(auditText).not.toContain('placeholder-token');
      expect(auditText).not.toContain('person@example.com');
    });

    it('dedupes by ProviderEvent and never resends the same event id', async () => {
      configureCapi();
      const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      recordProviderEventMock.mockResolvedValueOnce({ event: { id: 'mock-event' }, deduped: true });
      expect(await sendMetaConversion(prismaStub(), { ...leadEvent, marketingConsent: true }))
        .toEqual({ sent: false, deduped: true, reason: 'DUPLICATE' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fails open on upstream errors without echoing error bodies', async () => {
      configureCapi();
      const upstreamLeak = 'EAAplaceholderLeakedSecret';
      const fetchMock = vi.fn(async () => new Response(
        JSON.stringify({ error: { message: upstreamLeak } }), { status: 503 },
      ));
      vi.stubGlobal('fetch', fetchMock);
      const httpResult = await sendMetaConversion(prismaStub(), { ...leadEvent, marketingConsent: true });
      expect(httpResult).toEqual({ sent: false, reason: 'HTTP_503' });
      expect(JSON.stringify(httpResult)).not.toContain(upstreamLeak);
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error(upstreamLeak); }));
      const networkResult = await sendMetaConversion(prismaStub(), { ...leadEvent, marketingConsent: true });
      expect(networkResult).toEqual({ sent: false, reason: 'REQUEST_FAILED' });
      expect(JSON.stringify(networkResult)).not.toContain(upstreamLeak);
    });
  });

  describe('read-only reporting capabilities', () => {
    it('reports app subscription diagnostics only with an app id and secret', () => {
      expect(getMetaOperationStatus('app.subscriptions.read').available).toBe(false);
      config.set('META_APP_ID', '123456');
      expect(getMetaOperationStatus('app.subscriptions.read').available).toBe(false);
      config.set('META_APP_SECRET', 'placeholder');
      expect(getMetaOperationStatus('app.subscriptions.read').available).toBe(true);
    });

    it('reports Ads insights only with a system token, ad account and review grant', () => {
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      expect(getMetaOperationStatus('ads.insights.read').available).toBe(false);
      config.set('META_AD_ACCOUNT_ID', 'act_987');
      expect(getMetaOperationStatus('ads.insights.read').available).toBe(false);
      config.set('META_APP_REVIEW_GRANTED', 'true');
      expect(getMetaOperationStatus('ads.insights.read').available).toBe(true);
      expect(getMetaOperationStatus('ads.insights.read').approvalRequired).toBe(true);
    });

    it('gates Instagram insights on a token but not an ad account or review grant', () => {
      expect(getMetaOperationStatus('instagram.insights.read').available).toBe(false);
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      expect(getMetaOperationStatus('instagram.insights.read').available).toBe(true);
    });

    it('fails closed before any network call when a reporting capability is missing', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      expect(() => assertMetaOperation('ads.insights.read')).toThrowError(ProviderCapabilityError);
      await expect(listMetaAdInsights()).rejects.toThrowError(ProviderCapabilityError);
      await expect(listMetaInstagramInsights()).rejects.toThrowError(ProviderCapabilityError);
      await expect(listMetaAppSubscriptions()).rejects.toThrowError(ProviderCapabilityError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reads Ads insights with only read fields and a bounded date window', async () => {
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      config.set('META_AD_ACCOUNT_ID', 'act_987');
      config.set('META_APP_REVIEW_GRANTED', 'true');
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      await listMetaAdInsights(undefined, 3);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
      expect(url).toContain('/act_987/insights?');
      expect(url).toContain('level=ACCOUNT');
      expect(url).toContain('spend%2Cimpressions%2Cclicks');
      expect(url).toContain('time_range=');
      expect(init.headers.Authorization).toBe('Bearer placeholder');
      expect(url).not.toMatch(/campaign_id|adset_id|create|delete/);
    });

    it('reads Instagram insights from the configured professional account', async () => {
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      config.set('META_INSTAGRAM_ACCOUNT_ID', '123456789');
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      await listMetaInstagramInsights(undefined, 7);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain('/123456789/insights?');
      expect(url).toContain('metric=impressions%2Creach%2Cprofile_views%2Cwebsite_clicks');
      expect(url).toContain('period=day');
    });

    it('rejects malformed object ids without contacting Meta', async () => {
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      config.set('META_AD_ACCOUNT_ID', 'act_987');
      config.set('META_APP_REVIEW_GRANTED', 'true');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(listMetaAdInsights('act_1/insights?limit=999')).rejects.toThrowError(ProviderConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('additional Threads capabilities', () => {
    it('gates insights on the Threads token/user and writes on those plus app review', () => {
      config.set('THREADS_ACCESS_TOKEN', 'placeholder');
      config.set('THREADS_USER_ID', '12345');
      expect(getMetaOperationStatus('threads.insights.read').available).toBe(true);
      for (const operation of ['threads.publish', 'threads.carousel.publish', 'threads.reply'] as const) {
        expect(getMetaOperationStatus(operation).available).toBe(false);
      }
      config.set('META_APP_REVIEW_GRANTED', 'true');
      for (const operation of ['threads.publish', 'threads.carousel.publish', 'threads.reply'] as const) {
        expect(getMetaOperationStatus(operation).available).toBe(true);
        expect(getMetaOperationStatus(operation).approvalRequired).toBe(true);
      }
    });

    it('fails closed before any network call without Threads credentials', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(listThreadsInsights()).rejects.toThrowError(ProviderCapabilityError);
      await expect(publishThreadsCarousel({} as any, {
        mediaUrls: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
      })).rejects.toThrowError(ProviderCapabilityError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reads profile insights with fixed metrics and a clamped Unix-second window', async () => {
      config.set('THREADS_ACCESS_TOKEN', 'placeholder');
      config.set('THREADS_USER_ID', '12345');
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-31T00:00:00Z'));
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      await listThreadsInsights(undefined, 999);
      const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
      expect(url).toContain('/12345/threads_insights?');
      expect(url).toContain('metric=views%2Clikes%2Creplies%2Creposts%2Cquotes%2Cclicks');
      const now = Math.floor(Date.parse('2026-01-31T00:00:00Z') / 1000);
      expect(url).toContain(`since=${now - 90 * 24 * 60 * 60}`);
      expect(url).toContain(`until=${now}`);
      expect(init.headers.Authorization).toBe('Bearer placeholder');
    });

    it('reads media insights by validated thread id without a date window', async () => {
      config.set('THREADS_ACCESS_TOKEN', 'placeholder');
      config.set('THREADS_USER_ID', '12345');
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      await listThreadsInsights('media_1', 7);
      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain('/media_1/insights?');
      expect(url).not.toContain('since=');
      await expect(listThreadsInsights('bad/id')).rejects.toThrowError(ProviderConfigurationError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects unsafe or out-of-range carousel URLs before contacting Threads', async () => {
      config.set('THREADS_ACCESS_TOKEN', 'placeholder');
      config.set('THREADS_USER_ID', '12345');
      config.set('META_APP_REVIEW_GRANTED', 'true');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const valid = 'https://cdn.example.com/a.jpg';
      await expect(publishThreadsCarousel({} as any, { mediaUrls: [valid] })).rejects.toThrowError(ProviderConfigurationError);
      await expect(publishThreadsCarousel({} as any, { mediaUrls: Array.from({ length: 11 }, () => valid) })).rejects.toThrowError(ProviderConfigurationError);
      await expect(publishThreadsCarousel({} as any, { mediaUrls: [valid, 'http://cdn.example.com/b.jpg'] })).rejects.toThrowError(ProviderConfigurationError);
      await expect(publishThreadsCarousel({} as any, { mediaUrls: [valid, 'https://127.0.0.1/b.jpg'] })).rejects.toThrowError(ProviderConfigurationError);
      await expect(publishThreadsCarousel({} as any, { mediaUrls: [valid, 'https://user:pass@cdn.example.com/b.jpg'] })).rejects.toThrowError(ProviderConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('creates child containers then a carousel container, publishes and audits without echoing bodies', async () => {
      config.set('THREADS_ACCESS_TOKEN', 'placeholder');
      config.set('THREADS_USER_ID', '12345');
      config.set('META_APP_REVIEW_GRANTED', 'true');
      const upstreamLeak = 'EAAplaceholderSecretFromUpstream';
      const fetchMock = vi.fn(async (url: string, init?: { body?: string }) => {
        const isPublish = String(url).endsWith('/threads_publish');
        const payload = init?.body ? JSON.parse(init.body) : {};
        const id = isPublish
          ? 'published_1'
          : payload.media_type === 'CAROUSEL' ? 'carousel_1' : `child_${fetchMock.mock.calls.length}`;
        return new Response(JSON.stringify({ id, error: { message: upstreamLeak } }), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);
      const result = await publishThreadsCarousel({} as any, {
        text: 'x'.repeat(900),
        mediaUrls: ['https://cdn.example.com/a.mp4', 'https://cdn.example.com/b.jpg'],
        actorId: 'actor-1',
      });
      expect(fetchMock).toHaveBeenCalledTimes(4);
      const childPayload = JSON.parse(String((fetchMock.mock.calls[0][1] as any).body));
      expect(childPayload).toMatchObject({ media_type: 'VIDEO', video_url: 'https://cdn.example.com/a.mp4' });
      const carouselPayload = JSON.parse(String((fetchMock.mock.calls[2][1] as any).body));
      expect(carouselPayload.media_type).toBe('CAROUSEL');
      expect(carouselPayload.children.split(',')).toHaveLength(2);
      expect(carouselPayload.text).toHaveLength(500);
      const publishPayload = JSON.parse(String((fetchMock.mock.calls[3][1] as any).body));
      expect(publishPayload.creation_id).toBe('carousel_1');
      expect(JSON.stringify(result)).not.toContain(upstreamLeak);
      expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        action: 'communications.meta.threads.carousel.publish',
        meta: expect.objectContaining({ operation: 'threads.carousel.publish', childCount: 2 }),
      }));
    });

    it('rejects an invalid child container id without publishing', async () => {
      config.set('THREADS_ACCESS_TOKEN', 'placeholder');
      config.set('THREADS_USER_ID', '12345');
      config.set('META_APP_REVIEW_GRANTED', 'true');
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'bad id' }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      await expect(publishThreadsCarousel({} as any, {
        mediaUrls: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
      })).rejects.toThrowError(ProviderConfigurationError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Instagram mentions read', () => {
    it('gates mentions on the system-user token and fails closed', async () => {
      expect(getMetaOperationStatus('instagram.mentions.read').available).toBe(false);
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(listInstagramMentions()).rejects.toThrowError(ProviderCapabilityError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reads bounded mention fields from the configured professional account', async () => {
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      config.set('META_INSTAGRAM_ACCOUNT_ID', '123456789');
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      await listInstagramMentions();
      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain('/123456789/mentions?');
      expect(decodeURIComponent(url)).toContain('fields=id,text,timestamp,from,media');
      expect(url).toContain('limit=25');
    });
  });

  describe('comment moderation', () => {
    it('gates hiding comments on app review and the page token', () => {
      config.set('META_PAGE_ACCESS_TOKEN', 'placeholder');
      expect(getMetaOperationStatus('comments.moderate').available).toBe(false);
      config.set('META_APP_REVIEW_GRANTED', 'true');
      expect(getMetaOperationStatus('comments.moderate').available).toBe(true);
      expect(getMetaOperationStatus('comments.moderate').approvalRequired).toBe(true);
    });

    it('fails closed before any network call without the grant or page token', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(hideMetaComment({} as any, { commentId: '123' })).rejects.toThrowError(ProviderCapabilityError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('hides a validated comment id and writes an actor audit trail', async () => {
      config.set('META_PAGE_ACCESS_TOKEN', 'placeholder');
      config.set('META_APP_REVIEW_GRANTED', 'true');
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, leaked: 'placeholder' }), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const result = await hideMetaComment({} as any, { commentId: '123_abc', network: 'META_INSTAGRAM', actorId: 'actor-1' });
      const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string> }];
      expect(url).toContain('/123_abc?hide=true');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer placeholder');
      expect(result).toEqual({ commentId: '123_abc', hidden: true });
      expect(JSON.stringify(result)).not.toContain('leaked');
      expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'actor-1',
        action: 'communications.meta.comments.moderate',
        entity: 'Comment',
        entityId: '123_abc',
      }));
      await expect(hideMetaComment({} as any, { commentId: 'bad/id' })).rejects.toThrowError(ProviderConfigurationError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('MCP capability reporting', () => {
    it('only reports exact allowlisted URLs as configured', () => {
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      expect(getMetaOperationStatus('mcp.ads').available).toBe(false);
      config.set('META_ADS_MCP_URL', 'https://developers.facebook.com/docs/mcp');
      expect(getMetaOperationStatus('mcp.ads').available).toBe(false);
      expect(getMetaFeatureFlags().mcpEndpoints.ads).toBeNull();
      config.set('META_ADS_MCP_URL', 'https://mcp.facebook.com/ads?q=1');
      expect(getMetaOperationStatus('mcp.ads').available).toBe(false);
      config.set('META_ADS_MCP_URL', 'https://mcp.facebook.com/ads');
      expect(getMetaOperationStatus('mcp.ads').available).toBe(true);
      expect(getMetaFeatureFlags().mcpEndpoints.ads).toBe('https://mcp.facebook.com/ads');
    });
  });

  describe('App Review gating', () => {
    it('never reports an advanced operation as available without the explicit grant', () => {
      config.set('META_SYSTEM_USER_TOKEN', 'placeholder');
      config.set('META_PAGE_ACCESS_TOKEN', 'placeholder');
      config.set('META_AD_ACCOUNT_ID', 'act_987');
      config.set('META_APP_ID', '123456');
      config.set('META_APP_SECRET', 'placeholder');
      config.set('THREADS_ACCESS_TOKEN', 'placeholder');
      config.set('THREADS_USER_ID', '12345');
      const advanced = [
        'pages.publish', 'ads.insights.read', 'instagram.publish', 'comments.moderate',
        'lead_ads.ingest', 'threads.carousel.publish',
      ] as const;
      for (const operation of advanced) {
        const status = getMetaOperationStatus(operation);
        expect(status.available, operation).toBe(false);
        expect(status.approvalRequired, operation).toBe(true);
        expect(status.reason, operation).toContain('appReview');
      }
      config.set('META_APP_REVIEW_GRANTED', 'true');
      for (const operation of advanced) {
        expect(getMetaOperationStatus(operation).available, operation).toBe(true);
      }
    });
  });

  describe('META_OPERATIONS', () => {
    it('includes Instagram, Threads, moderation and read-only reporting operations without duplicates', () => {
      for (const operation of [
        'instagram.publish', 'instagram.mentions.read', 'threads.read', 'threads.insights.read',
        'threads.publish', 'threads.carousel.publish', 'threads.reply', 'comments.moderate',
        'app.subscriptions.read', 'ads.insights.read', 'instagram.insights.read',
      ]) {
        expect(META_OPERATIONS).toContain(operation);
      }
      expect(new Set(META_OPERATIONS).size).toBe(META_OPERATIONS.length);
    });
  });
});
