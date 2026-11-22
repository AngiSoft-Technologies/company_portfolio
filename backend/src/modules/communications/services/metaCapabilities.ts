/**
 * Extended Meta developer capability surface (Phase 7 7F).
 *
 * Feature flags come only from runtimeConfig — app id, business manager, the
 * system-user/page tokens, Graph version and the three configured MCP
 * endpoints. No documentation URL is invented here: if an MCP URL is not
 * configured, the capability is reported as unavailable and calls fail closed.
 *
 * Operations that require App Review / advanced permissions are only reported
 * available when `META_APP_REVIEW_GRANTED=true` AND a system-user token is
 * present. This is deliberately conservative: a missing grant must never look
 * like a working integration.
 */

import type { Db } from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { logAudit } from '../../../shared/services/audit';
import { ProviderCapabilityError } from './capabilities';
import { ProviderConfigurationError } from './providerSecrets';
import { generateAiDraft, ingestInboundMessage, upsertContact } from './conversations';
import { capiConfigured, sendMetaConversion } from './metaConversions';
import { resolveMetaAccount, sendMetaComment, sendMetaMessage } from './metaSocial';
import type { MetaNetwork } from './metaSocial';

export const META_OPERATIONS = [
  'pages.read',
  'pages.publish',
  'app.subscriptions.read',
  'ads.insights.read',
  'instagram.read',
  'instagram.insights.read',
  'instagram.mentions.read',
  'instagram.publish',
  'messenger.read',
  'messenger.send',
  'comments.read',
  'comments.reply',
  'comments.moderate',
  'published_content.read',
  'templates.read',
  'lead_ads.ingest',
  'threads.read',
  'threads.insights.read',
  'threads.publish',
  'threads.carousel.publish',
  'threads.reply',
  'mcp.ads',
  'mcp.social',
  'mcp.whatsapp',
] as const;

export type MetaOperation = (typeof META_OPERATIONS)[number];

/**
 * Canonical MCP allowlist. The capability reporter and the MCP client must
 * agree on these three URLs: a documentation page or lookalike host is never
 * reported as a configured server, and is never contacted.
 */
export const META_MCP_ENDPOINTS = {
  'mcp.ads': { configKey: 'META_ADS_MCP_URL', url: 'https://mcp.facebook.com/ads' },
  'mcp.social': { configKey: 'META_SOCIAL_MCP_URL', url: 'https://mcp.facebook.com/devtools' },
  'mcp.whatsapp': { configKey: 'META_WHATSAPP_MCP_URL', url: 'https://mcp.facebook.com/whatsapp_business_tools' },
} as const;

type Requirement = 'systemUserToken' | 'pageAccessToken' | 'appId' | 'appSecret' | 'adAccount' | 'businessManager' | 'appReview' | 'mcpAds' | 'mcpSocial' | 'mcpWhatsapp' | 'threadsToken' | 'threadsUser';

const OPERATION_REQUIREMENTS: Record<MetaOperation, Requirement[]> = {
  'pages.read': ['systemUserToken'],
  'pages.publish': ['systemUserToken', 'appReview'],
  'app.subscriptions.read': ['appId', 'appSecret'],
  'ads.insights.read': ['systemUserToken', 'appReview', 'adAccount'],
  'instagram.read': ['systemUserToken'],
  'instagram.insights.read': ['systemUserToken'],
  'instagram.mentions.read': ['systemUserToken'],
  'instagram.publish': ['systemUserToken', 'appReview'],
  'messenger.read': ['pageAccessToken'],
  'messenger.send': ['pageAccessToken'],
  'comments.read': ['pageAccessToken'],
  'comments.reply': ['pageAccessToken'],
  'comments.moderate': ['pageAccessToken', 'appReview'],
  'published_content.read': ['systemUserToken'],
  'templates.read': ['systemUserToken'],
  'lead_ads.ingest': ['systemUserToken', 'appReview'],
  'threads.read': ['threadsToken', 'threadsUser'],
  'threads.insights.read': ['threadsToken', 'threadsUser'],
  'threads.publish': ['threadsToken', 'threadsUser', 'appReview'],
  // Write-like Meta operations require the explicit deployment-level grant.
  'threads.carousel.publish': ['threadsToken', 'threadsUser', 'appReview'],
  'threads.reply': ['threadsToken', 'threadsUser', 'appReview'],
  'mcp.ads': ['mcpAds', 'systemUserToken'],
  'mcp.social': ['mcpSocial', 'systemUserToken'],
  'mcp.whatsapp': ['mcpWhatsapp', 'systemUserToken'],
};

export interface MetaCapabilityStatus {
  operation: MetaOperation;
  available: boolean;
  requires: Requirement[];
  approvalRequired: boolean;
  reason?: string;
}

/** Only the exact allowlisted URL counts as configured; nothing else is surfaced. */
function allowlistedMcpEndpoint(configKey: string, allowedUrl: string): string | null {
  const configured = String(getConfig(configKey) || '').trim().replace(/\/+$/, '');
  return configured === allowedUrl ? allowedUrl : null;
}

export function getMetaFeatureFlags() {
  return {
    appIdConfigured: Boolean(getConfig('META_APP_ID')),
    appSecretConfigured: Boolean(getConfig('META_APP_SECRET')),
    adAccountConfigured: Boolean(getConfig('META_AD_ACCOUNT_ID')),
    businessManagerConfigured: Boolean(getConfig('META_BUSINESS_MANAGER_ID')),
    systemUserTokenConfigured: Boolean(getConfig('META_SYSTEM_USER_TOKEN')),
    pageAccessTokenConfigured: Boolean(getConfig('META_PAGE_ACCESS_TOKEN')),
    threadsTokenConfigured: Boolean(getConfig('THREADS_ACCESS_TOKEN')),
    threadsUserConfigured: Boolean(getConfig('THREADS_USER_ID')),
    appReviewGranted: getConfig('META_APP_REVIEW_GRANTED') === 'true',
    capiConfigured: capiConfigured(),
    graphVersion: String(getConfig('META_GRAPH_VERSION') || 'v23.0'),
    mcpEndpoints: {
      ads: allowlistedMcpEndpoint(META_MCP_ENDPOINTS['mcp.ads'].configKey, META_MCP_ENDPOINTS['mcp.ads'].url),
      social: allowlistedMcpEndpoint(META_MCP_ENDPOINTS['mcp.social'].configKey, META_MCP_ENDPOINTS['mcp.social'].url),
      whatsapp: allowlistedMcpEndpoint(META_MCP_ENDPOINTS['mcp.whatsapp'].configKey, META_MCP_ENDPOINTS['mcp.whatsapp'].url),
    },
  };
}

function requirementMet(requirement: Requirement, flags: ReturnType<typeof getMetaFeatureFlags>): boolean {
  switch (requirement) {
    case 'systemUserToken': return flags.systemUserTokenConfigured;
    case 'pageAccessToken': return flags.pageAccessTokenConfigured;
    case 'appId': return flags.appIdConfigured;
    case 'appSecret': return flags.appSecretConfigured;
    case 'adAccount': return flags.adAccountConfigured;
    case 'businessManager': return flags.businessManagerConfigured;
    case 'appReview': return flags.appReviewGranted;
    case 'mcpAds': return Boolean(flags.mcpEndpoints.ads);
    case 'mcpSocial': return Boolean(flags.mcpEndpoints.social);
    case 'mcpWhatsapp': return Boolean(flags.mcpEndpoints.whatsapp);
    case 'threadsToken': return flags.threadsTokenConfigured;
    case 'threadsUser': return flags.threadsUserConfigured;
    default: return false;
  }
}

export function getMetaOperationStatus(operation: MetaOperation): MetaCapabilityStatus {
  const flags = getMetaFeatureFlags();
  const requires = OPERATION_REQUIREMENTS[operation];
  const missing = requires.filter((requirement) => !requirementMet(requirement, flags));
  return {
    operation,
    available: missing.length === 0,
    requires,
    approvalRequired: requires.includes('appReview'),
    ...(missing.length ? { reason: `Missing or unconfigured: ${missing.join(', ')}` } : {}),
  };
}

export function listMetaCapabilities() {
  const flags = getMetaFeatureFlags();
  return {
    flags,
    operations: META_OPERATIONS.map((operation) => getMetaOperationStatus(operation)),
  };
}

/** Fail-closed guard for any extended Meta operation. */
export function assertMetaOperation(operation: MetaOperation): void {
  const status = getMetaOperationStatus(operation);
  if (!status.available) {
    throw new ProviderCapabilityError('META', 'respond', `Meta operation '${operation}' is unavailable: ${status.reason ?? 'feature flag disabled'}`);
  }
}

export function hasMetaLeadEvent(payload: any): boolean {
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (String(change?.field ?? '') === 'leadgen' || change?.value?.leadgen_id) return true;
    }
  }
  return false;
}

function leadFields(value: any): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const item of value?.field_data || []) {
    const name = String(item?.name ?? '');
    const fieldValue = Array.isArray(item?.values) ? item.values[0] : item?.values;
    if (name && fieldValue !== undefined && fieldValue !== null) fields[name] = String(fieldValue);
  }
  return fields;
}

/**
 * Ingest a Meta Lead Ads / lead form event into Lead + Contact and run routing.
 * If the payload only carries a leadgen id and no token/review grant, fetching
 * details fails closed — no placeholder lead is invented.
 */
export async function ingestMetaLeadEvent(prisma: Db, payload: any, opts: { connectionId?: string | null; network?: MetaNetwork } = {}) {
  if (!hasMetaLeadEvent(payload)) return { stored: 0 };
  // Lead Ads details/pages are advanced-permission features. Fail closed
  // before touching the database when the deployment lacks the grant.
  assertMetaOperation('lead_ads.ingest');
  const entries = payload?.entry || [];
  const network = opts.network ?? 'META_FACEBOOK';
  let stored = 0;
  for (const entry of entries) {
    for (const change of entry?.changes || []) {
      if (String(change?.field ?? '') !== 'leadgen' && !change?.value?.leadgen_id) continue;
      const value = change?.value ?? {};
      const leadgenId = String(value.leadgen_id ?? value.id ?? '');
      if (!leadgenId) continue;
      let fields = leadFields(value);
      if (!Object.keys(fields).length) {
        const token = getConfig('META_SYSTEM_USER_TOKEN');
        const version = String(getConfig('META_GRAPH_VERSION') || 'v23.0');
        const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(leadgenId)}?fields=field_data,created_time,form_id,ad_id,campaign_id,page_id`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new ProviderConfigurationError(`Meta lead details request failed (HTTP ${response.status})`);
        const json: any = await response.json().catch(() => ({}));
        Object.assign(value, { form_id: json?.form_id, ad_id: json?.ad_id, created_time: json?.created_time, page_id: json?.page_id });
        fields = leadFields(json);
      }
      const email = String(fields.email ?? fields.email_address ?? '').trim();
      if (!email) throw new ProviderConfigurationError('Meta lead event has no email field; refusing to create a placeholder lead');

      const existingLead = await prisma.orm.public.Lead
        .where((l: any) => l.email.eq(email)).first().catch(() => null) as any;
      const lead = existingLead ?? await prisma.orm.public.Lead.create({
        id: newId(), name: String(fields.full_name ?? fields.name ?? email), email,
        phone: fields.phone ?? null, source: `meta_lead_ads:${value.form_id ?? 'unknown'}`,
        status: 'new', notes: `Meta lead form ${value.form_id ?? leadgenId}`,
        createdAt: ts(), updatedAt: ts(),
      } as any);
      const contact = await upsertContact(prisma, {
        name: String(fields.full_name ?? fields.name ?? email),
        leadId: lead.id,
        company: fields.company ?? null,
        identity: { channel: 'EMAIL', value: email, externalId: leadgenId, metadata: { leadgenId, formId: value.form_id ?? null } },
      });
      const connection = opts.connectionId
        ? await prisma.orm.public.ProviderConnection.where({ id: opts.connectionId } as any).first().catch(() => null) as any
        : await prisma.orm.public.ProviderConnection
          .where({ domain: 'COMMUNICATIONS', provider: network } as any).first().catch(() => null) as any;
      if (!connection) throw new ProviderConfigurationError(`No ${network} provider connection available for lead routing`);
      const account = await resolveMetaAccount(prisma, connection, value.page_id ? String(value.page_id) : null);
      await ingestInboundMessage(prisma, {
        accountId: account.id,
        channel: 'META_LEAD_ADS',
        externalThreadId: `leadgen:${leadgenId}`,
        providerMessageId: `leadgen:${leadgenId}`,
        sentAt: value.created_time ? new Date(Number(value.created_time) * 1000).toISOString() : null,
        preview: `New Meta lead: ${email}`,
        bodyText: `Meta lead form submission: ${email}`,
        senderAddress: email,
        contact: { name: String(contact?.name ?? email), leadId: lead.id, identity: { channel: 'EMAIL', value: email } },
        metadata: { leadgenId, formId: value.form_id ?? null, adId: value.ad_id ?? null, campaignId: value.campaign_id ?? null } as any,
      });
      // Server-side Lead event. Lead Ads webhooks are service events, so they
      // only leave the server when META_CAPI_ALLOW_SERVICE_EVENTS is granted.
      void sendMetaConversion(prisma, {
        eventName: 'Lead',
        eventId: `lead:${lead.id}`,
        email,
        phone: fields.phone ?? null,
        serviceEvent: true,
        sourceUrl: value.ad_id ? `meta://ad/${value.ad_id}` : undefined,
      }).catch(() => undefined);
      stored += 1;
    }
  }
  await logAudit({
    action: 'communications.meta.lead_ads.ingest', entity: 'Lead',
    meta: { network, stored, hasLeadgenEvent: true },
  });
  return { stored };
}

// ─── Live Graph API operations ─────────────────────────────────────────────

function graphBase(): string {
  const version = String(getConfig('META_GRAPH_VERSION') || 'v23.0').replace(/^\/+/, '');
  return `https://graph.facebook.com/${version}`;
}

function configuredId(primary: string, fallback?: string): string {
  const id = getConfig(primary) || fallback;
  if (!id) throw new ProviderConfigurationError(`${primary} is not configured`);
  return String(id);
}

/**
 * Perform a Graph read. `operation` is always capability-gated first, and
 * only the configured Graph base URL is used. Error bodies are never echoed
 * (they can reflect tokens or request context).
 */
export async function metaGraphRead(operation: MetaOperation, objectId: string, fields: string, opts: { limit?: number; connectionId?: string | null } = {}): Promise<any> {
  assertMetaOperation(operation);
  if (!/^[A-Za-z0-9_.:-]+$/.test(objectId)) throw new ProviderConfigurationError('Invalid Meta object id');
  if (!/^[A-Za-z0-9_,.{}[\]:-]+$/.test(fields)) throw new ProviderConfigurationError('Invalid Meta field list');
  const token = getConfig('META_SYSTEM_USER_TOKEN') || getConfig('META_PAGE_ACCESS_TOKEN');
  if (!token) throw new ProviderConfigurationError('META_SYSTEM_USER_TOKEN / META_PAGE_ACCESS_TOKEN is not configured');
  const params = new URLSearchParams({ fields });
  if (opts.limit) params.set('limit', String(Math.min(Math.max(opts.limit, 1), 100)));
  const response = await fetch(`${graphBase()}/${encodeURIComponent(objectId)}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta Graph ${operation} failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

export async function listMetaPages() {
  const businessManagerId = configuredId('META_BUSINESS_MANAGER_ID');
  return metaGraphRead('pages.read', businessManagerId, 'id,name,username', { limit: 50 });
}

export async function getMetaInstagramAccount() {
  const accountId = configuredId('META_INSTAGRAM_ACCOUNT_ID');
  return metaGraphRead('instagram.read', accountId, 'id,username,account_type,media_count');
}

function reportWindow(days: number): { since: string; until: string } {
  const count = Math.min(Math.max(Math.trunc(days) || 7, 1), 90);
  const until = new Date();
  const since = new Date(until.getTime() - count * 24 * 60 * 60 * 1000);
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) };
}

/** Read webhook subscriptions registered on the configured Meta app. */
export async function listMetaAppSubscriptions() {
  assertMetaOperation('app.subscriptions.read');
  const appId = configuredId('META_APP_ID');
  if (!/^\d+$/.test(appId)) throw new ProviderConfigurationError('META_APP_ID must be numeric');
  const appSecret = getConfig('META_APP_SECRET');
  if (!appSecret) throw new ProviderConfigurationError('META_APP_SECRET is not configured');
  const response = await fetch(`${graphBase()}/${appId}/subscriptions`, {
    headers: { Authorization: `Bearer ${appId}|${appSecret}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta subscription read failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

/** Read-only Ads insights: spend/impressions/clicks, never campaign mutation. */
export async function listMetaAdInsights(objectId?: string, days = 7) {
  assertMetaOperation('ads.insights.read');
  const target = objectId || configuredId('META_AD_ACCOUNT_ID');
  if (!/^(?:act_)?\d+$/.test(target)) throw new ProviderConfigurationError('Invalid Meta ad account id');
  const { since, until } = reportWindow(days);
  const params = new URLSearchParams({
    level: 'ACCOUNT',
    fields: 'spend,impressions,clicks,actions,date_start,date_stop',
    time_range: JSON.stringify({ since, until }),
    limit: '25',
  });
  const response = await fetch(`${graphBase()}/${encodeURIComponent(target)}/insights?${params}`, {
    headers: { Authorization: `Bearer ${graphToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta Ads insights failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

/**
 * Read mentions of the configured Instagram professional account. Read-only,
 * bounded and gated on the existing system-user token; no message is sent.
 */
export async function listInstagramMentions(objectId?: string) {
  assertMetaOperation('instagram.mentions.read');
  const target = objectId || configuredId('META_INSTAGRAM_ACCOUNT_ID');
  if (!/^\d+$/.test(target)) throw new ProviderConfigurationError('Invalid Instagram account id');
  const params = new URLSearchParams({
    fields: 'id,text,timestamp,from,media',
    limit: '25',
  });
  const response = await fetch(`${graphBase()}/${encodeURIComponent(target)}/mentions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${graphToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta Instagram mentions read failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

/** Read-only Instagram professional-account insights. */
export async function listMetaInstagramInsights(objectId?: string, days = 7) {
  assertMetaOperation('instagram.insights.read');
  const target = objectId || configuredId('META_INSTAGRAM_ACCOUNT_ID');
  if (!/^\d+$/.test(target)) throw new ProviderConfigurationError('Invalid Instagram account id');
  const { since, until } = reportWindow(days);
  const params = new URLSearchParams({
    metric: 'impressions,reach,profile_views,website_clicks',
    period: 'day',
    since,
    until,
  });
  const response = await fetch(`${graphBase()}/${encodeURIComponent(target)}/insights?${params}`, {
    headers: { Authorization: `Bearer ${graphToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta Instagram insights failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

export async function listMetaPublishedContent(objectId?: string) {
  const target = objectId || getConfig('META_FACEBOOK_PAGE_ID') || getConfig('META_INSTAGRAM_ACCOUNT_ID');
  if (!target) throw new ProviderConfigurationError('No page/instagram account id configured for published content');
  return metaGraphRead('published_content.read', String(target), 'id,message,caption,created_time,permalink_url', { limit: 25 });
}

export async function listApprovedMetaTemplates() {
  const wabaId = configuredId('META_WHATSAPP_BUSINESS_ACCOUNT_ID', getConfig('META_BUSINESS_MANAGER_ID'));
  return metaGraphRead('templates.read', wabaId, 'id,name,language,status,category,components', { limit: 100 });
}

export async function listMetaComments(objectId: string) {
  if (!objectId) throw new ProviderConfigurationError('objectId is required');
  return metaGraphRead('comments.read', objectId, 'id,message,created_time,from', { limit: 50 });
}

/**
 * Hide an existing Page/Instagram comment. No body is created and no upstream
 * response body (which could reflect account context) is returned or logged.
 * Requires an explicit App Review grant plus the Page access token.
 */
export async function hideMetaComment(prisma: Db, input: {
  commentId: string;
  network?: MetaNetwork;
  actorId?: string | null;
}) {
  assertMetaOperation('comments.moderate');
  const commentId = String(input.commentId ?? '');
  if (!/^[A-Za-z0-9_.:-]+$/.test(commentId)) throw new ProviderConfigurationError('Invalid comment id');
  const token = getConfig('META_PAGE_ACCESS_TOKEN');
  if (!token) throw new ProviderConfigurationError('META_PAGE_ACCESS_TOKEN is not configured');
  const network: MetaNetwork = input.network ?? 'META_FACEBOOK';
  const params = new URLSearchParams({ hide: 'true' });
  const response = await fetch(`${graphBase()}/${encodeURIComponent(commentId)}?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta comment moderation failed (HTTP ${response.status})`);
  await logAudit({
    actorId: input.actorId ?? null,
    action: 'communications.meta.comments.moderate',
    entity: 'Comment',
    entityId: commentId,
    meta: { operation: 'comments.moderate', network, hidden: true },
  });
  return { commentId, hidden: true };
}

export async function listMessengerConversations(pageId?: string) {
  const target = pageId || getConfig('META_FACEBOOK_PAGE_ID');
  if (!target) throw new ProviderConfigurationError('META_FACEBOOK_PAGE_ID is not configured');
  assertMetaOperation('messenger.read');
  const token = getConfig('META_PAGE_ACCESS_TOKEN');
  if (!token) throw new ProviderConfigurationError('META_PAGE_ACCESS_TOKEN is not configured');
  const params = new URLSearchParams({ fields: 'id,updated_time,snippet,participants', limit: '25' });
  const response = await fetch(`${graphBase()}/${encodeURIComponent(String(target))}/conversations?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta Messenger read failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

/** Publish a Page post. Requires an explicit deployment-level review grant. */
export async function publishMetaPagePost(prisma: Db, input: { pageId?: string; message: string; actorId?: string | null }) {
  assertMetaOperation('pages.publish');
  const pageId = input.pageId || getConfig('META_FACEBOOK_PAGE_ID');
  if (!pageId) throw new ProviderConfigurationError('META_FACEBOOK_PAGE_ID is not configured');
  const token = configuredId('META_PAGE_ACCESS_TOKEN');
  const response = await fetch(`${graphBase()}/${encodeURIComponent(String(pageId))}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: String(input.message).slice(0, 5000) }),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Meta publish failed (HTTP ${response.status})`);
  const json: any = await response.json().catch(() => ({}));
  await logAudit({
    actorId: input.actorId ?? null, action: 'communications.meta.publish',
    entity: 'ProviderConnection', entityId: String(pageId),
    meta: { operation: 'pages.publish', postId: json?.id ?? null },
  });
  return { id: json?.id ?? null };
}

function graphToken(): string {
  const token = getConfig('META_SYSTEM_USER_TOKEN') || getConfig('META_PAGE_ACCESS_TOKEN');
  if (!token) throw new ProviderConfigurationError('META_SYSTEM_USER_TOKEN / META_PAGE_ACCESS_TOKEN is not configured');
  return token;
}

function httpsMediaUrl(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  let url: URL;
  try { url = new URL(String(raw)); } catch { throw new ProviderConfigurationError('Media URL must be a valid https URL'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new ProviderConfigurationError('Media URL must be a public https URL without credentials');
  }
  return url.toString().slice(0, 2000);
}

/** Publish a single image/video to an Instagram professional account. */
export async function publishInstagramMedia(prisma: Db, input: {
  accountId?: string;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  actorId?: string | null;
}) {
  assertMetaOperation('instagram.publish');
  const accountId = input.accountId || getConfig('META_INSTAGRAM_ACCOUNT_ID');
  if (!accountId) throw new ProviderConfigurationError('META_INSTAGRAM_ACCOUNT_ID is not configured');
  if (!/^[A-Za-z0-9_.:-]+$/.test(accountId)) throw new ProviderConfigurationError('Invalid Instagram account id');
  const imageUrl = httpsMediaUrl(input.imageUrl);
  const videoUrl = httpsMediaUrl(input.videoUrl);
  if (Boolean(imageUrl) === Boolean(videoUrl)) {
    throw new ProviderConfigurationError('Provide exactly one of imageUrl or videoUrl');
  }
  const caption = String(input.caption ?? '').slice(0, 2200);
  const token = graphToken();
  const containerPayload: Record<string, unknown> = {
    ...(imageUrl ? { image_url: imageUrl } : { video_url: videoUrl, media_type: 'VIDEO' }),
    ...(caption ? { caption } : {}),
  };
  const containerResponse = await fetch(`${graphBase()}/${encodeURIComponent(accountId)}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(containerPayload),
    signal: AbortSignal.timeout(20_000),
  });
  if (!containerResponse.ok) throw new ProviderConfigurationError(`Instagram media container failed (HTTP ${containerResponse.status})`);
  const container: any = await containerResponse.json().catch(() => ({}));
  if (!container?.id) throw new ProviderConfigurationError('Instagram did not return a media container id');

  const publishResponse = await fetch(`${graphBase()}/${encodeURIComponent(accountId)}/media_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ creation_id: String(container.id) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!publishResponse.ok) throw new ProviderConfigurationError(`Instagram publish failed (HTTP ${publishResponse.status})`);
  const published: any = await publishResponse.json().catch(() => ({}));
  await logAudit({
    actorId: input.actorId ?? null,
    action: 'communications.meta.instagram.publish',
    entity: 'ProviderConnection',
    entityId: String(accountId),
    meta: { operation: 'instagram.publish', containerId: String(container.id), mediaId: published?.id ?? null },
  });
  return { containerId: String(container.id), mediaId: published?.id ?? null };
}

// ─── Threads API (separate OAuth grant, feature-flagged) ───────────────────

const THREADS_GRAPH_BASE = 'https://graph.threads.net/v1.0';

function threadsToken(): string {
  const token = getConfig('THREADS_ACCESS_TOKEN');
  if (!token) throw new ProviderConfigurationError('THREADS_ACCESS_TOKEN is not configured');
  return token;
}

function threadsUserId(): string {
  const userId = getConfig('THREADS_USER_ID');
  if (!userId) throw new ProviderConfigurationError('THREADS_USER_ID is not configured');
  if (!/^[A-Za-z0-9_.:-]+$/.test(userId)) throw new ProviderConfigurationError('Invalid Threads user id');
  return userId;
}

function assertThreadId(threadId: string): string {
  if (!/^[A-Za-z0-9_.:-]+$/.test(threadId)) throw new ProviderConfigurationError('Invalid Threads object id');
  return threadId;
}

/** Threads insights only accept Unix-second windows and never before this date. */
const THREADS_INSIGHTS_EPOCH = 1_712_991_600;

function threadsWindow(days: number): { since: number; until: number } {
  const count = Math.min(Math.max(Math.trunc(days) || 7, 1), 90);
  const now = Math.floor(Date.now() / 1000);
  const since = Math.max(THREADS_INSIGHTS_EPOCH, now - count * 24 * 60 * 60);
  return { since, until: Math.max(since, now) };
}

/**
 * Carousel media must be publicly reachable over https. Loopback, link-local,
 * private and credential-bearing URLs are refused before any upstream call.
 */
function carouselMediaUrl(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') throw new ProviderConfigurationError('Carousel media URL is required');
  let url: URL;
  try { url = new URL(String(raw)); } catch { throw new ProviderConfigurationError('Carousel media URL must be a valid https URL'); }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:'
    || url.username || url.password
    || host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || /^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)
    || host === '[::1]' || host === '::1'
  ) {
    throw new ProviderConfigurationError('Carousel media URL must be a public https URL without credentials');
  }
  return url.toString().slice(0, 2000);
}

function threadsContainerId(value: unknown): string {
  const id = String((value as any)?.id ?? '');
  if (!/^[A-Za-z0-9_.:-]+$/.test(id)) throw new ProviderConfigurationError('Threads did not return a valid container id');
  return id;
}

export async function readThreadsProfile() {
  assertMetaOperation('threads.read');
  const userId = threadsUserId();
  const params = new URLSearchParams({ fields: 'id,username,threads_biography,threads_profile_picture_url' });
  const response = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}?${params}`, {
    headers: { Authorization: `Bearer ${threadsToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Threads profile read failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

export async function listMetaThreads(limit = 25) {
  assertMetaOperation('threads.read');
  const userId = threadsUserId();
  const params = new URLSearchParams({
    fields: 'id,text,timestamp,media_type,permalink',
    limit: String(Math.min(Math.max(limit, 1), 100)),
  });
  const response = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}/threads?${params}`, {
    headers: { Authorization: `Bearer ${threadsToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Threads list failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

/**
 * Bounded Threads insights. A media id reads lifetime metrics; omitting it reads
 * profile-level metrics over a clamped Unix-second window. Only fixed metrics
 * are requested and no upstream body is echoed in an error path.
 */
export async function listThreadsInsights(threadId?: string, days = 7) {
  assertMetaOperation('threads.insights.read');
  const params = new URLSearchParams();
  let target: string;
  if (threadId) {
    target = assertThreadId(threadId);
    params.set('metric', 'views,likes,replies,reposts,quotes');
  } else {
    target = threadsUserId();
    const { since, until } = threadsWindow(days);
    params.set('metric', 'views,likes,replies,reposts,quotes,clicks');
    params.set('since', String(since));
    params.set('until', String(until));
  }
  const endpoint = threadId
    ? `${THREADS_GRAPH_BASE}/${encodeURIComponent(target)}/insights`
    : `${THREADS_GRAPH_BASE}/${encodeURIComponent(target)}/threads_insights`;
  const response = await fetch(`${endpoint}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${threadsToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Threads insights read failed (HTTP ${response.status})`);
  return response.json().catch(() => ({}));
}

export async function publishThreadsPost(prisma: Db, input: {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  actorId?: string | null;
}) {
  assertMetaOperation('threads.publish');
  const userId = threadsUserId();
  const text = String(input.text ?? '').trim().slice(0, 500);
  if (!text && !input.imageUrl && !input.videoUrl) throw new ProviderConfigurationError('Threads post requires text or media');
  const imageUrl = httpsMediaUrl(input.imageUrl);
  const videoUrl = httpsMediaUrl(input.videoUrl);
  if (imageUrl && videoUrl) throw new ProviderConfigurationError('Provide either imageUrl or videoUrl, not both');
  const payload: Record<string, unknown> = {
    media_type: imageUrl || videoUrl ? (videoUrl ? 'VIDEO' : 'IMAGE') : 'TEXT',
    ...(text ? { text } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
    ...(videoUrl ? { video_url: videoUrl } : {}),
  };
  const create = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}/threads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${threadsToken()}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  if (!create.ok) throw new ProviderConfigurationError(`Threads draft failed (HTTP ${create.status})`);
  const draft: any = await create.json().catch(() => ({}));
  if (!draft?.id) throw new ProviderConfigurationError('Threads did not return a draft id');
  const publish = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}/threads_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${threadsToken()}` },
    body: JSON.stringify({ creation_id: String(draft.id) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!publish.ok) throw new ProviderConfigurationError(`Threads publish failed (HTTP ${publish.status})`);
  const result: any = await publish.json().catch(() => ({}));
  await logAudit({
    actorId: input.actorId ?? null,
    action: 'communications.meta.threads.publish',
    entity: 'ProviderConnection',
    entityId: userId,
    meta: { operation: 'threads.publish', draftId: String(draft.id), threadId: result?.id ?? null },
  });
  return { draftId: String(draft.id), threadId: result?.id ?? null };
}

/**
 * Publish a 2–10 item Threads carousel. Child containers are created from
 * public HTTPS media URLs, then a CAROUSEL container is published. Every
 * request is capability-gated and timed out; only returned ids are consumed,
 * never raw upstream response bodies.
 */
export async function publishThreadsCarousel(prisma: Db, input: {
  text?: string;
  mediaUrls: string[];
  actorId?: string | null;
}) {
  assertMetaOperation('threads.carousel.publish');
  const userId = threadsUserId();
  const token = threadsToken();
  if (!Array.isArray(input.mediaUrls) || input.mediaUrls.length < 2 || input.mediaUrls.length > 10) {
    throw new ProviderConfigurationError('Threads carousel requires between 2 and 10 media URLs');
  }
  const mediaUrls = input.mediaUrls.map(carouselMediaUrl);
  if (new Set(mediaUrls).size !== mediaUrls.length) {
    throw new ProviderConfigurationError('Threads carousel media URLs must be unique');
  }
  const text = String(input.text ?? '').trim().slice(0, 500);
  const childIds = await Promise.all(mediaUrls.map(async (mediaUrl) => {
    const isVideo = /\.(?:mp4|mov|webm|m4v|mkv|avi)(?:[?#]|$)/i.test(mediaUrl);
    const payload: Record<string, unknown> = isVideo
      ? { media_type: 'VIDEO', video_url: mediaUrl }
      : { media_type: 'IMAGE', image_url: mediaUrl };
    const response = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}/threads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new ProviderConfigurationError(`Threads carousel child failed (HTTP ${response.status})`);
    return threadsContainerId(await response.json().catch(() => ({})));
  }));
  const create = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}/threads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      ...(text ? { text } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!create.ok) throw new ProviderConfigurationError(`Threads carousel container failed (HTTP ${create.status})`);
  const draftId = threadsContainerId(await create.json().catch(() => ({})));
  const publish = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}/threads_publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ creation_id: draftId }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!publish.ok) throw new ProviderConfigurationError(`Threads carousel publish failed (HTTP ${publish.status})`);
  const result: any = await publish.json().catch(() => ({}));
  const threadId = String(result?.id ?? '') || null;
  if (threadId && !/^[A-Za-z0-9_.:-]+$/.test(threadId)) {
    throw new ProviderConfigurationError('Threads did not return a valid published thread id');
  }
  await logAudit({
    actorId: input.actorId ?? null,
    action: 'communications.meta.threads.carousel.publish',
    entity: 'ProviderConnection',
    entityId: userId,
    meta: { operation: 'threads.carousel.publish', childCount: childIds.length, draftId, threadId },
  });
  return { childIds, draftId, threadId };
}

export async function replyThreadsPost(prisma: Db, input: {
  threadId: string;
  text: string;
  actorId?: string | null;
}) {
  assertMetaOperation('threads.reply');
  const threadId = assertThreadId(input.threadId);
  const text = String(input.text ?? '').trim().slice(0, 500);
  if (!text) throw new ProviderConfigurationError('Threads reply text is required');
  const response = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(threadId)}/replies`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${threadsToken()}` },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ProviderConfigurationError(`Threads reply failed (HTTP ${response.status})`);
  const result: any = await response.json().catch(() => ({}));
  await logAudit({
    actorId: input.actorId ?? null,
    action: 'communications.meta.threads.reply',
    entity: 'Conversation',
    entityId: threadId,
    meta: { operation: 'threads.reply', replyId: result?.id ?? null },
  });
  return { replyId: result?.id ?? null };
}

/** Reply to a social comment/DM through the already capability-gated adapters. */
export async function replyToMetaItem(prisma: Db, input: {
  network: MetaNetwork;
  connectionId?: string | null;
  recipientId: string;
  objectId?: string;
  text: string;
  actorId?: string | null;
}) {
  assertMetaOperation(input.objectId ? 'comments.reply' : 'messenger.send');
  const result = input.objectId
    ? await sendMetaComment(prisma, { network: input.network, connectionId: input.connectionId, objectId: input.objectId, text: input.text })
    : await sendMetaMessage(prisma, {
      network: input.network, connectionId: input.connectionId, recipientId: input.recipientId, text: input.text, actorId: input.actorId,
    });
  await logAudit({
    actorId: input.actorId ?? null, action: 'communications.meta.reply',
    entity: 'Conversation', meta: { network: input.network, isComment: Boolean(input.objectId) },
  });
  return result;
}

/** Assistive social reply drafts only. Never sends, and logs the assistance. */
export async function generateSocialReplyDraft(prisma: Db, conversationId: string, actorId?: string | null) {
  const conversation = await prisma.orm.public.Conversation.where({ id: conversationId } as any).first().catch(() => null) as any;
  if (!conversation) throw new ProviderConfigurationError('Conversation not found');
  if (!['META_FACEBOOK', 'META_INSTAGRAM'].includes(String(conversation.channel))) {
    throw new ProviderCapabilityError(String(conversation.channel), 'respond', 'Social reply drafts are only available for Meta Facebook/Instagram conversations');
  }
  const result = await generateAiDraft(prisma, conversationId, actorId);
  await logAudit({
    actorId: actorId ?? null, action: 'communications.meta.social_ai_draft',
    entity: 'Conversation', entityId: conversationId,
    meta: { channel: conversation.channel, assistive: true, autoSent: false, model: result.model },
  });
  return result;
}
