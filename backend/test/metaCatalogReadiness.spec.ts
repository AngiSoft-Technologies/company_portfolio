import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Meta catalog-readiness unit tests. Config is a mock map and outbound/DB
 * modules are mocked so no network or database call can be made.
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

const { buildCatalogFeedXmlMock } = vi.hoisted(() => ({
  buildCatalogFeedXmlMock: vi.fn(),
}));

vi.mock('../src/modules/cms/routes/catalog-feed', () => ({
  buildCatalogFeedXml: buildCatalogFeedXmlMock,
}));

import {
  CATALOG_REQUIRED_FIELDS,
  getMetaCatalogReadiness,
  validateFeedXml,
} from '../src/modules/communications/services/metaCatalogReadiness';

const minimalFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>
<item>
${CATALOG_REQUIRED_FIELDS.map((field) => `<${field}>value</${field}>`).join('\n')}
</item>
</channel></rss>`;

describe('Meta catalog readiness', () => {
  beforeEach(() => {
    config.clear();
    buildCatalogFeedXmlMock.mockReset();
    buildCatalogFeedXmlMock.mockResolvedValue({ xml: minimalFeed, itemCount: 1 });
  });

  afterEach(() => {
    config.clear();
  });

  it('validates a complete feed and reports all required product fields', () => {
    const result = validateFeedXml(minimalFeed);
    expect(result).toEqual({ valid: true, itemCount: 1, missingFields: [], errors: [] });
  });

  it('flags missing product fields and empty feeds without throwing', () => {
    const broken = minimalFeed.replace('<g:price>value</g:price>', '<g:price></g:price>');
    const result = validateFeedXml(broken);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('g:price');
    expect(validateFeedXml('')).toMatchObject({ valid: false, itemCount: 0 });
  });

  it('reports configuration gaps and does not echo a credentialed feed URL', async () => {
    config.set('META_CATALOG_ID', 'cat-123');
    config.set('META_CATALOG_FEED_URL', 'https://user:secret@angisoft.co.ke/feed?token=abc');

    const readiness = await getMetaCatalogReadiness();
    expect(readiness.catalogIdConfigured).toBe(true);
    expect(readiness.feedUrlConfigured).toBe(true);
    expect(readiness.feedUrl).toBeNull();
    expect(readiness.gaps.join(' ')).toContain('credentials, query string or fragment');
    expect(JSON.stringify(readiness)).not.toContain('secret');
    expect(JSON.stringify(readiness)).not.toContain('abc');
  });

  it('returns a readiness summary with CAPI event coverage and validated feed', async () => {
    config.set('META_CATALOG_ID', 'cat-123');
    config.set('META_CATALOG_FEED_URL', 'https://angisoft.co.ke/v1/catalog/feed.xml');
    config.set('META_CAPI_ENABLED', 'true');
    config.set('META_CAPI_DATASET_ID', 'dataset-1');
    config.set('META_CAPI_ACCESS_TOKEN', 'token');

    const readiness = await getMetaCatalogReadiness({} as never);
    expect(readiness.configured).toBe(true);
    expect(readiness.feedUrl).toBe('https://angisoft.co.ke/v1/catalog/feed.xml');
    expect(readiness.capi.enabled).toBe(true);
    expect(readiness.capi.events.find((e) => e.name === 'Lead')?.wired).toBe(true);
    expect(readiness.capi.events.find((e) => e.name === 'Schedule')?.wired).toBe(false);
    expect(readiness.feed?.valid).toBe(true);
    expect(readiness.gaps).toEqual([]);
  });
});
