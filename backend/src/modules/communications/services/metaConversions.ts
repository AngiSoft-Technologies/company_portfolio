/**
 * Meta Conversions API (server-side events) adapter.
 *
 * Sends first-party Lead/Purchase events from our own database to a Meta Events
 * Manager dataset. Design rules:
 *
 * - Explicit opt-in (`META_CAPI_ENABLED`), dataset id and access token required.
 * - Marketing consent is required per event; service events only when
 *   `META_CAPI_ALLOW_SERVICE_EVENTS=true` and the privacy notice is approved.
 * - PII is SHA-256 hashed before leaving the server; raw values never logged.
 * - `event_id` + `ProviderEvent` dedupe make retries idempotent.
 * - Network/API failures are logged but never break the business transaction
 *   that triggered the event.
 */

import { createHash } from 'crypto';
import type { Db } from '../../../db';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { logAudit } from '../../../shared/services/audit';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { ProviderConfigurationError } from './providerSecrets';

export const CAPI_EVENT_NAMES = ['Lead', 'Purchase', 'CompleteRegistration', 'Contact', 'Schedule'] as const;
export type CapiEventName = (typeof CAPI_EVENT_NAMES)[number];

export interface MetaConversionInput {
  eventName: CapiEventName;
  /** Stable id from our own data — Meta uses it for server-side dedupe. */
  eventId: string;
  email?: string | null;
  phone?: string | null;
  value?: number;
  currency?: string;
  contentIds?: string[];
  sourceUrl?: string;
  /** True only when the user consented to marketing measurement. */
  marketingConsent?: boolean;
  /** Service-generated event (e.g. a settled payment), not a direct user action. */
  serviceEvent?: boolean;
  actorId?: string | null;
}

function hashPii(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function userData(input: MetaConversionInput): Record<string, string> {
  const data: Record<string, string> = {};
  if (input.email) data.em = hashPii(input.email);
  if (input.phone) {
    const digits = String(input.phone).replace(/\D/g, '');
    if (digits.length >= 8) data.ph = hashPii(digits);
  }
  return data;
}

export function capiConfigured(): boolean {
  return getConfig('META_CAPI_ENABLED') === 'true'
    && Boolean(getConfig('META_CAPI_DATASET_ID'))
    && Boolean(getConfig('META_CAPI_ACCESS_TOKEN'));
}

/**
 * Send one conversion event. Safe to call on every business event: the
 * ProviderEvent dedupe key makes repeated calls a no-op.
 */
export async function sendMetaConversion(prisma: Db, input: MetaConversionInput): Promise<{
  sent: boolean;
  deduped?: boolean;
  reason?: string;
}> {
  if (getConfig('META_CAPI_ENABLED') !== 'true') return { sent: false, reason: 'DISABLED' };
  const datasetId = String(getConfig('META_CAPI_DATASET_ID') || '').trim();
  const token = String(getConfig('META_CAPI_ACCESS_TOKEN') || '').trim();
  if (!datasetId || !token) return { sent: false, reason: 'NOT_CONFIGURED' };
  if (!input.eventId) throw new ProviderConfigurationError('META_CAPI eventId is required');
  if (!CAPI_EVENT_NAMES.includes(input.eventName)) {
    throw new ProviderConfigurationError(`Unsupported Meta CAPI event '${input.eventName}'`);
  }
  if (!input.marketingConsent && !(input.serviceEvent && getConfig('META_CAPI_ALLOW_SERVICE_EVENTS') === 'true')) {
    return { sent: false, reason: 'NO_CONSENT' };
  }

  const recorded = await recordProviderEvent(prisma, {
    domain: 'COMMUNICATIONS',
    provider: 'META_CAPI',
    eventType: input.eventName,
    externalEventId: input.eventId,
    status: 'PROCESSED',
    payload: {
      eventName: input.eventName,
      hasEmail: Boolean(input.email),
      hasPhone: Boolean(input.phone),
      value: input.value ?? null,
      currency: input.currency ?? null,
    },
  });
  if (recorded.deduped) return { sent: false, deduped: true, reason: 'DUPLICATE' };

  const version = String(getConfig('META_GRAPH_VERSION') || 'v23.0').replace(/^\/+/, '');
  const data: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: input.serviceEvent ? 'business_messaging' : 'website',
    user_data: userData(input),
  };
  if (input.sourceUrl) data.event_source_url = input.sourceUrl.slice(0, 2000);
  const custom: Record<string, unknown> = {};
  if (Number.isFinite(input.value)) custom.value = Number(input.value);
  if (input.currency) custom.currency = String(input.currency).toUpperCase().slice(0, 8);
  if (input.contentIds?.length) custom.content_ids = input.contentIds.slice(0, 50).map((id) => String(id));
  if (Object.keys(custom).length) data.custom_data = custom;

  const body: Record<string, unknown> = { data: [data] };
  const testCode = String(getConfig('META_CAPI_TEST_EVENT_CODE') || '').trim();
  if (testCode) body.test_event_code = testCode;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(datasetId)}/events`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, access_token: token }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      await prisma.orm.public.ProviderEvent.where({ id: recorded.event.id } as any)
        .update({ status: 'FAILED', error: `Meta CAPI HTTP ${response.status}` } as any)
        .catch(() => undefined);
      return { sent: false, reason: `HTTP_${response.status}` };
    }
    await logAudit({
      actorId: input.actorId ?? null,
      action: 'communications.meta.capi.sent',
      entity: 'ProviderEvent',
      entityId: recorded.event.id,
      meta: { eventName: input.eventName, eventId: input.eventId, serviceEvent: Boolean(input.serviceEvent) },
    });
    return { sent: true };
  } catch {
    await prisma.orm.public.ProviderEvent.where({ id: recorded.event.id } as any)
      .update({ status: 'FAILED', error: 'Meta CAPI request failed' } as any)
      .catch(() => undefined);
    return { sent: false, reason: 'REQUEST_FAILED' };
  }
}
