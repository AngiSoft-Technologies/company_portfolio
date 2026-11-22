/**
 * PayPal REST adapter (Orders v2) — online clients, cards, PayPal wallet,
 * Pay Later, Venmo and the other PayPal-supported methods.
 *
 * Deliberately implemented with `fetch`, like the Paystack/M-Pesa/PayHero
 * adapters in this folder: no extra SDK dependency, same env-gated contract.
 *
 * Security / reliability contracts:
 *  - Credentials come from the encrypted runtime config vault (env fallback).
 *    Sandbox and live are separate so production can never silently fall back
 *    to sandbox credentials.
 *  - `createOrder` and `captureOrder` send a sanitized, length-bounded
 *    `PayPal-Request-Id` (unique per call type) so retries are idempotent at
 *    PayPal as well as in our `Payment` table (unique providerId/reference).
 *  - Prices are computed server-side. The browser never sends an amount to
 *    this adapter — it only receives an approval URL for an existing order.
 *  - KES is not a PayPal settlement currency: `PAYPAL_CURRENCY=KES` and a KES
 *    request both fail closed instead of silently charging 1 KES = 1 USD.
 *    The original invoice currency + amount are preserved in metadata.
 *
 * Docs: https://developer.paypal.com/ai-tools/mcp-server
 *       https://developer.paypal.com/guides/node-express
 *       https://developer.paypal.com/reference/guidelines/idempotency
 */

import crypto from 'crypto';
import { getConfig } from '../../../../shared/services/runtimeConfig';

export type PayPalEnvironment = 'sandbox' | 'live';

const API_BASE: Record<PayPalEnvironment, string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

/** Currencies PayPal can settle in (subset commonly used by AngiSoft clients). */
const SUPPORTED_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CHF', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF',
  'ILS', 'INR', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'SEK',
  'SGD', 'THB', 'TWD', 'USD',
]);

const MAX_REQUEST_ID_LENGTH = 38;

/** Single source of truth for the currency allowlist (used by payouts too). */
export function isSupportedPayPalCurrency(value: unknown): boolean {
  return SUPPORTED_CURRENCIES.has(String(value ?? '').trim().toUpperCase());
}

export class PayPalError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = 'PayPalError';
  }
}

export function paypalEnvironment(): PayPalEnvironment {
  const raw = getConfig('PAYPAL_ENV').trim().toLowerCase();
  if (raw === 'live' || raw === 'production') return 'live';
  return 'sandbox';
}

function credentials(): { clientId: string; clientSecret: string } {
  const live = paypalEnvironment() === 'live';
  const id = live
    ? (getConfig('PAYPAL_LIVE_CLIENT_ID') || getConfig('PAYPAL_CLIENT_ID') || '')
    : (getConfig('PAYPAL_SANDBOX_CLIENT_ID') || getConfig('PAYPAL_CLIENT_ID') || '');
  const secret = live
    ? (getConfig('PAYPAL_LIVE_CLIENT_SECRET') || getConfig('PAYPAL_CLIENT_SECRET') || '')
    : (getConfig('PAYPAL_SANDBOX_CLIENT_SECRET') || getConfig('PAYPAL_CLIENT_SECRET') || '');
  return { clientId: String(id).trim(), clientSecret: String(secret).trim() };
}

export function isConfigured(): boolean {
  const { clientId, clientSecret } = credentials();
  return Boolean(clientId && clientSecret);
}

/**
 * The single authoritative settlement-currency helper for every PayPal flow
 * (checkout, rail selection, payouts and refunds). Never derive this from the
 * browser. KES is rejected explicitly — it is not a PayPal settlement currency
 * and silently charging the KES amount as USD would be a 1:1 FX error.
 */
export function paypalSettlementCurrency(requested?: string): string {
  const configured = getConfig('PAYPAL_CURRENCY', 'USD').trim().toUpperCase();
  if (configured === 'KES') {
    throw new PayPalError(
      'PAYPAL_CURRENCY=KES is not a PayPal settlement currency; configure USD or another supported currency',
      500,
    );
  }
  if (!isSupportedPayPalCurrency(configured)) {
    throw new PayPalError(`PAYPAL_CURRENCY ${configured || '(empty)'} is not supported by PayPal`, 500);
  }
  const wanted = String(requested || '').trim().toUpperCase();
  if (wanted === 'KES') {
    throw new PayPalError(
      'KES is not a PayPal settlement currency; route KES through PayHero/MPESA instead of charging 1 KES = 1 USD',
      400,
    );
  }
  return isSupportedPayPalCurrency(wanted) ? wanted : configured;
}

/** Backwards-compatible alias used by the Orders adapter and its callers. */
export const settlementCurrency = paypalSettlementCurrency;

/**
 * Header-safe, bounded PayPal-Request-Id. Control characters are stripped and
 * long references keep their tail entropy via a short hash suffix instead of
 * being silently truncated to a collision.
 */
export function paypalRequestId(reference: string, suffix = ''): string {
  const cleaned = String(reference ?? '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '-')
    .trim();
  const value = `${cleaned}${suffix}`;
  if (value.length <= MAX_REQUEST_ID_LENGTH) return value;
  const hash = crypto.createHash('sha256').update(value).digest('hex').slice(0, 8);
  return `${value.slice(0, MAX_REQUEST_ID_LENGTH - 9)}-${hash}`;
}

export function checkoutUrls() {
  const base = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return {
    returnUrl: (getConfig('PAYPAL_RETURN_URL') || `${base}/portal?paypal=success`).trim(),
    cancelUrl: (getConfig('PAYPAL_CANCEL_URL') || `${base}/portal?paypal=cancel`).trim(),
  };
}

// ─── OAuth token (cached, single-flight) ─────────────────────────────────────

let tokenCache: { env: PayPalEnvironment; token: string; expiresAt: number } | null = null;
let tokenInFlight: Promise<string> | null = null;

export function resetTokenCacheForTests() {
  tokenCache = null;
  tokenInFlight = null;
}

export async function getAccessToken(): Promise<string> {
  const env = paypalEnvironment();
  if (tokenCache && tokenCache.env === env && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }
  if (tokenInFlight) return tokenInFlight;

  tokenInFlight = (async () => {
    const { clientId, clientSecret } = credentials();
    if (!clientId || !clientSecret) {
      throw new PayPalError('PayPal is not configured', 503);
    }
    const res = await fetch(`${API_BASE[env]}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    if (!res.ok) {
      // Never echo the upstream body: it can contain credential/error details.
      throw new PayPalError(`PayPal OAuth failed (${res.status})`, 502);
    }
    const body = JSON.parse(text) as { access_token: string; expires_in?: number };
    if (!body.access_token) throw new PayPalError('PayPal OAuth returned no access token', 502);
    tokenCache = {
      env,
      token: body.access_token,
      expiresAt: Date.now() + Math.max(60, Number(body.expires_in) || 3600) * 1000,
    };
    return body.access_token;
  })();

  try {
    return await tokenInFlight;
  } finally {
    tokenInFlight = null;
  }
}

async function api<T = any>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; data: T }> {
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
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    // Use only structured error fields; raw upstream bodies may leak secrets.
    const detail = data?.details?.[0]?.description || data?.message;
    const message = detail ? String(detail).slice(0, 300) : `HTTP ${res.status}`;
    throw new PayPalError(`PayPal ${method} ${path} failed (${res.status}): ${message}`, res.status);
  }
  return { status: res.status, data: data as T };
}

// ─── Orders v2 ────────────────────────────────────────────────────────────────

export interface CreatePayPalOrderArgs {
  amount: number;
  currency?: string;
  reference: string; // our unique reference; used as PayPal-Request-Id + invoice_id
  description?: string;
  invoiceId?: string;
  bookingId?: string;
  clientId?: string;
  email?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalOrderResult {
  orderId: string;
  approvalUrl: string;
  status: string;
  currency: string;
  amount: string;
  details: any;
}

/** Create a CAPTURE order. Returns the buyer approval URL; no money moves yet. */
export async function createOrder(args: CreatePayPalOrderArgs): Promise<PayPalOrderResult> {
  if (!isConfigured()) throw new PayPalError('PayPal is not configured', 503);
  const amount = Number(args.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new PayPalError('Invalid PayPal amount', 400);
  if (!args.reference) throw new PayPalError('PayPal requires an idempotency reference', 400);

  const currency = paypalSettlementCurrency(args.currency);
  const urls = checkoutUrls();
  const { data } = await api<any>('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: args.reference,
      invoice_id: args.reference,
      custom_id: String(args.invoiceId || args.bookingId || '').slice(0, 127) || undefined,
      description: String(args.description || 'AngiSoft online payment').slice(0, 127),
      amount: { currency_code: currency, value: amount.toFixed(2) },
    }],
    payment_source: {
      paypal: {
        ...(args.email ? { email_address: args.email } : {}),
        experience_context: {
          return_url: args.returnUrl || urls.returnUrl,
          cancel_url: args.cancelUrl || urls.cancelUrl,
          brand_name: 'AngiSoft',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      },
    },
  }, { 'PayPal-Request-Id': paypalRequestId(args.reference) });

  const approvalUrl = (data?.links || []).find((l: any) => l.rel === 'approve')?.href
    || (data?.links || []).find((l: any) => l.rel === 'payer-action')?.href;
  if (!approvalUrl) throw new PayPalError('PayPal order has no approval URL', 502);

  return {
    orderId: String(data.id),
    approvalUrl: String(approvalUrl),
    status: String(data.status || 'CREATED'),
    currency,
    amount: amount.toFixed(2),
    details: {
      ...data,
      approvalUrl,
      settlementCurrency: currency,
      originalCurrency: String(args.currency || currency),
      originalAmount: amount,
      requestedCurrency: String(args.currency || ''),
    },
  };
}

export interface PayPalCapture {
  captureId: string;
  orderId: string;
  status: string;
  amount: string;
  currency: string;
  payerEmail?: string;
  raw: any;
}

function parseCapture(data: any, fallbackOrderId: string): PayPalCapture {
  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0] || {};
  return {
    captureId: String(capture.id || ''),
    orderId: String(data?.id || fallbackOrderId),
    status: String(capture.status || data?.status || ''),
    amount: String(capture?.amount?.value || ''),
    currency: String(capture?.amount?.currency_code || ''),
    payerEmail: data?.payer?.email_address ? String(data.payer.email_address) : undefined,
    raw: data,
  };
}

/** Capture an approved order. Idempotent via a distinct capture Request-Id. */
export async function captureOrder(orderId: string, reference: string): Promise<PayPalCapture> {
  if (!orderId) throw new PayPalError('Missing PayPal order id', 400);
  const { data } = await api<any>(
    'POST',
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    undefined,
    { 'PayPal-Request-Id': paypalRequestId(reference, '-capture') },
  );
  return parseCapture(data, orderId);
}

export async function getOrder(orderId: string): Promise<any> {
  const { data } = await api<any>('GET', `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  return data;
}

// ─── Webhook verification ─────────────────────────────────────────────────────

const WEBHOOK_HEADERS = [
  'paypal-transmission-id',
  'paypal-transmission-time',
  'paypal-cert-url',
  'paypal-auth-algo',
  'paypal-transmission-sig',
] as const;

/**
 * Ask PayPal to verify the webhook signature. Fails closed: a missing webhook
 * id or a verification error is never treated as a valid signature.
 */
export async function verifyWebhookSignature(headers: Record<string, any>, rawBody: Buffer): Promise<boolean> {
  const webhookId = getConfig('PAYPAL_WEBHOOK_ID').trim();
  if (!webhookId) throw new PayPalError('PAYPAL_WEBHOOK_ID is not configured', 503);
  if (WEBHOOK_HEADERS.some((h) => !headers[h])) return false;

  let event: unknown;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return false;
  }

  try {
    const { data } = await api<any>('POST', '/v1/notifications/verify-webhook-signature', {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: event,
    });
    return data?.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('PayPal webhook verification failed', (err as Error)?.message);
    return false;
  }
}

/** Extract the order id from a CAPTURE.* webhook resource. */
export function orderIdFromCaptureEvent(resource: any): string {
  return String(
    resource?.supplementary_data?.related_ids?.order_id
    || resource?.order_id
    || resource?.custom_id
    || '',
  );
}

export function parseWebhookAmount(resource: any): { amount: string; currency: string } {
  return {
    amount: String(resource?.amount?.value || ''),
    currency: String(resource?.amount?.currency_code || ''),
  };
}

export function newRequestId(prefix = 'ANG'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
