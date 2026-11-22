/**
 * PesaFlow REST adapter (Phase 7C).
 *
 * Adapter-ready, fail-closed: every call requires PESAFLOW_API_KEY,
 * PESAFLOW_API_SECRET and PESAFLOW_BASE_URL from runtime config. Missing
 * configuration raises a clear "not configured" error before any network
 * request. Secrets are used for request signing only and are never logged.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { getConfig } from '../../../../shared/services/runtimeConfig';

const REQUEST_TIMEOUT_MS = 25_000;

export class PesaFlowError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = 'PesaFlowError';
  }
}

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!getConfig('PESAFLOW_API_KEY')) missing.push('PESAFLOW_API_KEY');
  if (!getConfig('PESAFLOW_API_SECRET')) missing.push('PESAFLOW_API_SECRET');
  if (!getConfig('PESAFLOW_BASE_URL')) missing.push('PESAFLOW_BASE_URL');
  return missing;
}

export function isConfigured(): boolean {
  return missingConfig().length === 0;
}

export function currency(requested?: string): string {
  return String(requested || getConfig('PESAFLOW_CURRENCY', 'KES') || 'KES').toUpperCase();
}

function assertConfigured(): void {
  const missing = missingConfig();
  if (missing.length) {
    throw new PesaFlowError(
      `PesaFlow is not configured (missing: ${missing.join(', ')})`,
      503,
    );
  }
}

function path(template: string, configKey: string, fallback: string): string {
  return (getConfig(configKey) || fallback).replace('{reference}', encodeURIComponent(template));
}

function sign(timestamp: string, body: string): string {
  return createHmac('sha256', getConfig('PESAFLOW_API_SECRET'))
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

async function request<T = any>(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  assertConfigured();
  const baseUrl = getConfig('PESAFLOW_BASE_URL').replace(/\/+$/, '');
  const rawBody = body ? JSON.stringify(body) : '';
  const timestamp = Date.now().toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${getConfig('PESAFLOW_API_KEY')}`,
        'X-PesaFlow-Timestamp': timestamp,
        'X-PesaFlow-Signature': sign(timestamp, rawBody),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      ...(rawBody ? { body: rawBody } : {}),
    });
    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // Upstream bodies are never echoed verbatim — they may contain tokens.
      throw new PesaFlowError('PesaFlow returned a non-JSON response', 502);
    }
    if (!response.ok) {
      throw new PesaFlowError(
        `PesaFlow request failed (${response.status}): ${String(parsed?.message || parsed?.error || 'upstream error').slice(0, 300)}`,
        response.status >= 400 && response.status < 600 ? response.status : 502,
      );
    }
    return (parsed ?? {}) as T;
  } catch (err: any) {
    if (err instanceof PesaFlowError) throw err;
    if (err?.name === 'AbortError') throw new PesaFlowError('PesaFlow request timed out', 504);
    throw new PesaFlowError(`PesaFlow request failed: ${String(err?.message || err).slice(0, 300)}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export interface PesaFlowCollectInput {
  reference: string;
  amount: number | string;
  currency?: string;
  phone: string;
  channel?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Collect money (C2B) via PesaFlow. */
export async function collect(input: PesaFlowCollectInput): Promise<any> {
  assertConfigured();
  if (!input.reference || !input.phone) throw new PesaFlowError('PesaFlow collect requires reference and phone', 400);
  return request('POST', path('', 'PESAFLOW_COLLECT_PATH', '/v1/payments/collect'), {
    reference: input.reference,
    amount: Number(input.amount),
    currency: currency(input.currency),
    phone: input.phone,
    channel: input.channel || getConfig('PESAFLOW_CHANNEL', 'mpesa'),
    callbackUrl: input.callbackUrl || getConfig('PESAFLOW_CALLBACK_URL') || undefined,
    metadata: input.metadata ?? {},
  }, `collect:${input.reference}`);
}

/** Look up the status of a PesaFlow transaction. */
export async function status(reference: string): Promise<any> {
  assertConfigured();
  if (!reference) throw new PesaFlowError('PesaFlow status requires a reference', 400);
  return request('GET', path(reference, 'PESAFLOW_STATUS_PATH', '/v1/payments/{reference}/status'));
}

export interface PesaFlowRefundInput {
  reference: string;
  amount?: number | string;
  currency?: string;
  reason?: string;
}

/** Refund a captured PesaFlow transaction. */
export async function refund(input: PesaFlowRefundInput): Promise<any> {
  assertConfigured();
  if (!input.reference) throw new PesaFlowError('PesaFlow refund requires a reference', 400);
  return request('POST', path(input.reference, 'PESAFLOW_REFUND_PATH', '/v1/payments/{reference}/refund'), {
    amount: input.amount === undefined ? undefined : Number(input.amount),
    currency: currency(input.currency),
    reason: input.reason || 'Customer refund',
  }, `refund:${input.reference}:${input.amount ?? 'full'}`);
}

/** Fetch settlements for a period (empty list when the adapter is not configured). */
export async function settlements(input: {
  periodStart?: string;
  periodEnd?: string;
  financeAccountId?: string;
} = {}): Promise<any[]> {
  assertConfigured();
  const query = new URLSearchParams();
  if (input.periodStart) query.set('from', input.periodStart);
  if (input.periodEnd) query.set('to', input.periodEnd);
  if (input.financeAccountId) query.set('account', input.financeAccountId);
  const endpoint = path('', 'PESAFLOW_SETTLEMENT_PATH', '/v1/settlements');
  const queryString = query.toString();
  const response = await request<{ data?: any[]; settlements?: any[] }>(
    'GET',
    `${endpoint}${queryString ? `?${queryString}` : ''}`,
  );
  return Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.settlements)
      ? response.settlements
      : Array.isArray(response)
        ? response as any
        : [];
}

/**
 * Verify a PesaFlow webhook with constant-time HMAC-SHA256 comparison.
 * Signature header may be a bare hex digest or `sha256=<hex>`.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, headers: Record<string, any>): boolean {
  assertConfigured();
  const secret = getConfig('PESAFLOW_WEBHOOK_SECRET');
  if (!secret) throw new PesaFlowError('PesaFlow is not configured (missing: PESAFLOW_WEBHOOK_SECRET)', 503);
  const header = String(
    headers?.['x-pesaflow-signature']
    || headers?.['x-signature']
    || headers?.['x-pesaflow-signature-sha256']
    || '',
  ).replace(/^sha256=/i, '');
  if (!header) return false;
  const expected = createHmac('sha256', secret).update(Buffer.isBuffer(rawBody) ? rawBody : String(rawBody)).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(header, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export default {
  isConfigured,
  missingConfig,
  currency,
  collect,
  status,
  refund,
  settlements,
  verifyWebhookSignature,
  PesaFlowError,
};
