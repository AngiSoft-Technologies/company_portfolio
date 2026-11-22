/**
 * PayPal OUTBOUND money movement — Payouts v1 + Refunds v2.
 *
 * Complements `paypalService.ts` (Orders v2, inbound money). It deliberately
 * reuses that adapter's OAuth token and environment resolution so credentials
 * and sandbox/live separation stay in exactly one place. No new dependency:
 * everything goes through `fetch`.
 *
 * Endpoints used:
 *  - POST /v1/payments/payouts                              (create payout batch)
 *  - GET  /v1/payments/payouts/{batchId}                    (batch lookup)
 *  - GET  /v1/payments/payouts/{batchId}/payout-items/{id}   (item lookup)
 *  - POST /v2/payments/captures/{captureId}/refund          (refund a capture)
 *  - GET  /v2/payments/refunds/{refundId}                   (refund lookup)
 *
 * Reliability / security contracts:
 *  - Fails closed: no credentials → no request, clear `PayPalPayoutError`.
 *  - Idempotent: `sender_batch_id` is derived from the caller's reference and
 *    `PayPal-Request-Id` is `${reference}-payout` / `${reference}-refund`.
 *  - Every call has a timeout; JSON is parsed defensively and upstream bodies
 *    are never logged in full (no credentials or tokens can leak into logs).
 *
 * Env (read via paypalService): PAYPAL_ENV, PAYPAL_SANDBOX_CLIENT_ID,
 * PAYPAL_SANDBOX_CLIENT_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET,
 * PAYPAL_LIVE_CLIENT_ID, PAYPAL_LIVE_CLIENT_SECRET, PAYPAL_CURRENCY.
 */

import { createHash } from 'crypto';
import {
  formatPayPalAmount,
  getAccessToken,
  isConfigured as paypalIsConfigured,
  isSupportedPayPalCurrency,
  paypalEnvironment,
  paypalRequestId,
  settlementCurrency as paypalSettlementCurrency,
  type PayPalEnvironment,
} from './paypalService';

const API_BASE: Record<PayPalEnvironment, string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_ID_LENGTH = 30;

/** PayPal error with an HTTP-ish status so callers can map it to a response. */
export class PayPalPayoutError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = 'PayPalPayoutError';
  }
}

/** Delegates to the single PayPal credential gate (no separate config source). */
export function isConfigured(): boolean {
  return paypalIsConfigured();
}

export type PayPalRecipientType = 'EMAIL' | 'PHONE' | 'PAYPAL_ACCOUNT_ID';

const RECIPIENT_TYPES = new Set<string>(['EMAIL', 'PHONE', 'PAYPAL_ACCOUNT_ID']);

/** camelCase is canonical; snake_case aliases are accepted for API-shaped callers. */
export interface PayoutItemInput {
  recipientType?: string;
  recipient_type?: string;
  amount: number | string;
  currency: string;
  note?: string;
  receiver: string;
  senderItemId?: string;
  sender_item_id?: string;
}

export interface CreatePayoutInput {
  /** Business reference used for idempotency (required). */
  reference: string;
  items: PayoutItemInput[];
  emailSubject?: string;
  email_subject?: string;
  emailMessage?: string;
  email_message?: string;
}

export interface RefundCaptureInput {
  captureId?: string;
  capture_id?: string;
  /** Business reference used for the idempotency header (required). */
  reference: string;
  /** Omit for a full refund. */
  amount?: number | string;
  /** Defaults to PAYPAL_CURRENCY / USD when `amount` is supplied. */
  currency?: string;
  note?: string;
}

/** Normalized view plus the raw PayPal body for auditing. */
export interface PayPalPayoutBatch {
  batchId: string;
  status: string;
  raw: any;
  [key: string]: any;
}

export interface PayPalRefund {
  refundId: string;
  status: string;
  amount: string;
  currency: string;
  raw: any;
  [key: string]: any;
}

// ─── validation helpers ───────────────────────────────────────────────────────

function requireReference(value: unknown): string {
  const reference = String(value ?? '').trim();
  if (!reference) throw new PayPalPayoutError('PayPal payouts require an idempotency reference', 400);
  return reference;
}

function requireId(value: unknown, field: string): string {
  const id = String(value ?? '').trim();
  if (!id) throw new PayPalPayoutError(`Missing PayPal ${field}`, 400);
  return id;
}

/** Deterministic, header/body-safe identifier derived from the caller's reference. */
function sanitizeId(value: string): string {
  const cleaned = value
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_ID_LENGTH);
  return cleaned || createHash('sha256').update(value).digest('hex').slice(0, MAX_ID_LENGTH);
}

/** Shared sanitizer keeps PayPal-Request-Id consistent with the Orders adapter. */
function buildRequestId(reference: string, suffix: '-payout' | '-refund'): string {
  return paypalRequestId(reference, suffix);
}

function normalizeRecipientType(value: unknown): PayPalRecipientType {
  const type = String(value ?? '').trim().toUpperCase();
  if (!RECIPIENT_TYPES.has(type)) {
    throw new PayPalPayoutError(
      'recipient_type must be one of EMAIL, PHONE or PAYPAL_ACCOUNT_ID',
      400,
    );
  }
  return type as PayPalRecipientType;
}

function normalizeAmount(value: unknown, field: string, currency: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PayPalPayoutError(`${field} must be a positive amount`, 400);
  }
  try {
    return formatPayPalAmount(currency, amount);
  } catch (err: any) {
    throw new PayPalPayoutError(String(err?.message || err), Number(err?.status) || 400);
  }
}

function normalizeCurrency(value: unknown): string {
  const currency = String(value ?? '').trim().toUpperCase();
  if (currency === 'KES') {
    throw new PayPalPayoutError(
      'KES is not a PayPal settlement currency; use PayHero/MPESA instead of charging 1 KES = 1 USD',
      400,
    );
  }
  if (!isSupportedPayPalCurrency(currency)) {
    throw new PayPalPayoutError(`Unsupported PayPal payout currency: ${currency || '(empty)'}`, 400);
  }
  return currency;
}

// ─── shared request wrapper ───────────────────────────────────────────────────

async function apiRequest<T = any>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  if (!isConfigured()) throw new PayPalPayoutError('PayPal is not configured', 503);

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE[paypalEnvironment()]}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Never echo an unexpected upstream body — it may contain sensitive data.
      data = null;
    }

    if (!res.ok) {
      const detail = data?.details?.[0]?.description
        || data?.message
        || data?.error_description
        || `HTTP ${res.status}`;
      throw new PayPalPayoutError(
        `PayPal ${method} ${path} failed (${res.status}): ${String(detail).slice(0, 300)}`,
        res.status,
      );
    }
    if (data === null) {
      throw new PayPalPayoutError(
        `PayPal ${method} ${path} returned an empty or invalid JSON response`,
        502,
      );
    }
    return data as T;
  } catch (err) {
    if (err instanceof PayPalPayoutError) throw err;
    const status = Number((err as any)?.status);
    throw new PayPalPayoutError(
      `PayPal ${method} ${path} request failed: ${String((err as Error)?.message || 'network error').slice(0, 300)}`,
      Number.isFinite(status) && status > 0 ? status : 502,
    );
  }
}

// ─── Payouts v1 ───────────────────────────────────────────────────────────────

/** Create a payout batch. Money moves here — callers must pass a stable reference. */
export async function createPayout(input: CreatePayoutInput): Promise<PayPalPayoutBatch> {
  if (!isConfigured()) throw new PayPalPayoutError('PayPal is not configured', 503);
  const reference = requireReference(input?.reference);
  if (!Array.isArray(input?.items) || input.items.length === 0) {
    throw new PayPalPayoutError('A PayPal payout requires at least one item', 400);
  }

  const seenSenderItemIds = new Set<string>();
  const items = input.items.map((item, index) => {
    const rawItemId = String(item?.senderItemId ?? item?.sender_item_id ?? '').trim();
    if (!rawItemId) {
      throw new PayPalPayoutError(`items[${index}].sender_item_id is required`, 400);
    }
    const senderItemId = sanitizeId(rawItemId);
    if (seenSenderItemIds.has(senderItemId)) {
      throw new PayPalPayoutError(`Duplicate sender_item_id "${senderItemId}" in PayPal payout batch`, 400);
    }
    seenSenderItemIds.add(senderItemId);

    const receiver = String(item?.receiver ?? '').trim();
    if (!receiver) throw new PayPalPayoutError(`items[${index}].receiver is required`, 400);
    const currency = normalizeCurrency(item?.currency);

    return {
      recipient_type: normalizeRecipientType(item?.recipientType ?? item?.recipient_type),
      amount: {
        value: normalizeAmount(item?.amount, `items[${index}].amount`, currency),
        currency,
      },
      note: item?.note ? String(item.note).slice(0, 140) : undefined,
      receiver,
      sender_item_id: senderItemId,
    };
  });

  const data = await apiRequest<any>(
    'POST',
    '/v1/payments/payouts',
    {
      sender_batch_header: {
        sender_batch_id: sanitizeId(reference),
        email_subject: String(input.emailSubject ?? input.email_subject ?? '').trim().slice(0, 100)
          || 'You have received a payment',
        email_message: String(input.emailMessage ?? input.email_message ?? '').trim().slice(0, 200)
          || 'AngiSoft has sent you a payment.',
      },
      items,
    },
    { 'PayPal-Request-Id': buildRequestId(reference, '-payout') },
  );

  return {
    ...data,
    batchId: String(data?.batch_header?.payout_batch_id || ''),
    status: String(data?.batch_header?.batch_status || ''),
    raw: data,
  };
}

/** Look up a payout batch by its PayPal batch id. */
export async function getPayout(batchId: string): Promise<any> {
  const id = requireId(batchId, 'batchId');
  return apiRequest('GET', `/v1/payments/payouts/${encodeURIComponent(id)}`);
}

/** Look up a single payout item inside a batch. */
export async function getPayoutItem(batchId: string, itemId: string): Promise<any> {
  const batch = requireId(batchId, 'batchId');
  const item = requireId(itemId, 'payout item id');
  return apiRequest(
    'GET',
    `/v1/payments/payouts/${encodeURIComponent(batch)}/payout-items/${encodeURIComponent(item)}`,
  );
}

// ─── Refunds v2 ───────────────────────────────────────────────────────────────

/** Refund a captured payment. Omit `amount` for a full refund. */
export async function refundCapture(input: RefundCaptureInput): Promise<PayPalRefund> {
  if (!isConfigured()) throw new PayPalPayoutError('PayPal is not configured', 503);
  const captureId = requireId(input?.captureId ?? input?.capture_id, 'captureId');
  const reference = requireReference(input?.reference);

  const body: Record<string, any> = {};
  if (input.amount !== undefined && input.amount !== null && input.amount !== '') {
    const currency = normalizeCurrency(input.currency ?? paypalSettlementCurrency());
    body.amount = {
      value: normalizeAmount(input.amount, 'amount', currency),
      currency_code: currency,
    };
  }
  if (input.note) body.note = String(input.note).slice(0, 140);

  const data = await apiRequest<any>(
    'POST',
    `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    body,
    { 'PayPal-Request-Id': buildRequestId(reference, '-refund') },
  );

  return {
    ...data,
    refundId: String(data?.id || ''),
    status: String(data?.status || ''),
    amount: String(data?.amount?.value || ''),
    currency: String(data?.amount?.currency_code || ''),
    raw: data,
  };
}

/** Look up a refund by its PayPal refund id. */
export async function getRefund(refundId: string): Promise<any> {
  const id = requireId(refundId, 'refundId');
  return apiRequest('GET', `/v2/payments/refunds/${encodeURIComponent(id)}`);
}
