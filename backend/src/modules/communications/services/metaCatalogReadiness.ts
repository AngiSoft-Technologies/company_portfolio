/**
 * Read-only Meta Catalog / commerce readiness diagnostic (Phase 7 7F).
 *
 * The CMS feed at /v1/catalog/feed.xml is the single source of truth for the
 * products Meta Catalog/Shops, Instagram shopping and WhatsApp commerce poll.
 * This service consumes the two registered-but-unused config keys
 * (META_CATALOG_ID, META_CATALOG_FEED_URL) and validates the *exact same feed*
 * that endpoint renders. It never pushes to Meta, never mutates CMS data and
 * never returns a token or credential.
 */

import type { Db } from '../../../db';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { buildCatalogFeedXml } from '../../cms/routes/catalog-feed';
import { CAPI_EVENT_NAMES } from './metaConversions';

/** Fields Meta/Google expects on every product item in the feed. */
export const CATALOG_REQUIRED_FIELDS = [
  'g:id',
  'g:title',
  'g:description',
  'g:link',
  'g:image_link',
  'g:price',
  'g:availability',
  'g:condition',
  'g:brand',
] as const;

/** Which CAPI events actually have an emission call site in this codebase. */
const CAPI_WIRED_EVENTS = new Set(['Lead', 'Purchase']);

export interface FeedValidation {
  valid: boolean;
  itemCount: number;
  missingFields: string[];
  errors: string[];
}

/**
 * Pure, offline validation of a product RSS feed. No network is used and no
 * secrets are read. Kept separate so it can be unit-tested without a DB.
 */
export function validateFeedXml(xml: string): FeedValidation {
  const errors: string[] = [];
  if (!/^\s*<\?xml/i.test(xml)) errors.push('Missing XML declaration');
  if (!/<rss\b/i.test(xml)) errors.push('Missing <rss> root element');
  if (!/xmlns:g\s*=\s*["']http:\/\/base\.google\.com\/ns\/1\.0["']/i.test(xml)) {
    errors.push('Missing Google/Meta product namespace');
  }

  const items = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  const missingFields = new Set<string>();
  for (const item of items) {
    for (const field of CATALOG_REQUIRED_FIELDS) {
      const tag = field.slice(2); // strip the "g:" prefix for the raw XML tag
      const empty = new RegExp(`<g:${tag}(?:\\s[^>]*)?>\\s*<\\/g:${tag}>`).test(item);
      if (!new RegExp(`<g:${tag}(?:\\s[^>]*)?>`, 'i').test(item) || empty) missingFields.add(field);
    }
  }

  if (items.length === 0) errors.push('Feed contains no <item> entries');
  return {
    valid: items.length > 0 && missingFields.size === 0 && errors.length === 0,
    itemCount: items.length,
    missingFields: [...missingFields],
    errors,
  };
}

/** Sanitize a configured feed URL for display — never echo query/credentials. */
function displayFeedUrl(raw: string): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export async function getMetaCatalogReadiness(prisma?: Db) {
  const catalogId = String(getConfig('META_CATALOG_ID') || '').trim();
  const rawFeedUrl = String(getConfig('META_CATALOG_FEED_URL') || '').trim();
  const configured = Boolean(catalogId && rawFeedUrl);

  const capiEnabled = getConfig('META_CAPI_ENABLED') === 'true'
    && Boolean(getConfig('META_CAPI_DATASET_ID'))
    && Boolean(getConfig('META_CAPI_ACCESS_TOKEN'));

  const gaps: string[] = [];
  if (!catalogId) gaps.push('META_CATALOG_ID is not configured');
  if (!rawFeedUrl) gaps.push('META_CATALOG_FEED_URL is not configured');
  if (rawFeedUrl && !displayFeedUrl(rawFeedUrl)) {
    gaps.push('META_CATALOG_FEED_URL must be an http(s) URL without credentials, query string or fragment');
  }
  if (!capiEnabled) gaps.push('Conversions API is not fully configured');

  let feed: FeedValidation | null = null;
  if (prisma) {
    try {
      const { xml } = await buildCatalogFeedXml(prisma);
      feed = validateFeedXml(xml);
      if (!feed.valid) {
        gaps.push(`CMS feed validation failed: ${[...feed.errors, ...feed.missingFields].join(', ')}`);
      }
    } catch {
      feed = { valid: false, itemCount: 0, missingFields: [], errors: ['Feed could not be rendered'] };
      gaps.push('CMS feed could not be rendered from published catalog rows');
    }
  }

  return {
    configured,
    catalogIdConfigured: Boolean(catalogId),
    feedUrlConfigured: Boolean(rawFeedUrl),
    feedUrl: displayFeedUrl(rawFeedUrl),
    publicFeedPath: '/v1/catalog/feed.xml',
    requiredFields: CATALOG_REQUIRED_FIELDS,
    capi: {
      enabled: capiEnabled,
      allowServiceEvents: getConfig('META_CAPI_ALLOW_SERVICE_EVENTS') === 'true',
      events: CAPI_EVENT_NAMES.map((name) => ({ name, wired: CAPI_WIRED_EVENTS.has(name) })),
    },
    feed,
    gaps,
  };
}
