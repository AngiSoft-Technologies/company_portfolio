/**
 * Read-only catalogue of canonical inbound endpoints that must be registered in
 * each provider dashboard (Phase 7 closeout).
 *
 * Why this exists: the exact `/v1` callback / return / webhook URLs are scattered
 * across routers, and the east-Africa rails (PayHero + Safaricom Daraja) use
 * shared-secret tokens that must NEVER be echoed to a browser, log or error.
 * This module is the single, side-effect-free source of truth for those paths.
 *
 * Hard rules for anything built on top of this catalogue:
 * - Paths are relative `/v1/...` only. There is no `/api`, no
 *   `/mpesa-extended` and no `/v1/payments/daraja` alias.
 * - `configKeys` are KEY NAMES only. Values are never read, resolved or returned.
 * - Tokenised URLs are shown with a masked `••••` placeholder and flagged
 *   `tokenized: true`; the real token is only ever appended server-side by the
 *   payout adapter and verified in constant time by the callback routes.
 * - Stripe / Paystack appear only as `legacy: true` and are never recommended.
 */
import { getConfig } from './runtimeConfig';

export type EndpointDomain = 'FINANCE' | 'COMMUNICATIONS' | 'OPERATIONS';

export interface IntegrationEndpoint {
  provider: string;
  domain: EndpointDomain;
  purpose: string;
  method: 'GET' | 'POST';
  /** Relative, canonical path. Token placeholders are masked. */
  path: string;
  /** Human-readable verification model — never contains a secret value. */
  authModel: string;
  /** Config KEY NAMES only (no values). */
  configKeys: string[];
  /** True when the live URL carries a shared token in the query string. */
  tokenized: boolean;
  /** Legacy-only rails (Stripe / Paystack) — never recommended. */
  legacy?: boolean;
  notes?: string;
}

/** Canonical API origin for dashboard registration, derived from site config. */
export const CANONICAL_API_ORIGIN = 'https://api.angisoft.co.ke';

export const INTEGRATION_ENDPOINTS: IntegrationEndpoint[] = [
  // ── International collections: PayPal ────────────────────────────────────
  {
    provider: 'PAYPAL',
    domain: 'FINANCE',
    purpose: 'Buyer return URL after PayPal approval (default rail for international / non-KES collect)',
    method: 'GET',
    path: '/portal?paypal=success',
    authModel: 'Client redirect; server-amount driven, signed booking token where applicable',
    configKeys: ['PAYPAL_RETURN_URL', 'PAYPAL_CANCEL_URL'],
    tokenized: false,
    notes: 'Configured as a public site URL, not an API path. Defaults resolve from FRONTEND_URL.',
  },
  {
    provider: 'PAYPAL',
    domain: 'FINANCE',
    purpose: 'PayPal webhook (signature verified against the webhook id)',
    method: 'POST',
    path: '/v1/payments/paypal/webhook',
    authModel: 'PayPal transmission signature verified server-side; raw body preserved',
    configKeys: ['PAYPAL_WEBHOOK_ID'],
    tokenized: false,
  },
  {
    provider: 'PAYPAL',
    domain: 'FINANCE',
    purpose: 'Finance provider event inbox for PayPal (verify → dedupe → process)',
    method: 'POST',
    path: '/v1/finance/webhooks/PAYPAL',
    authModel: 'PayPal signature verification via the shared finance verifier',
    configKeys: ['PAYPAL_WEBHOOK_ID'],
    tokenized: false,
  },

  // ── East Africa collections: PayHero ─────────────────────────────────────
  {
    provider: 'PAYHERO',
    domain: 'FINANCE',
    purpose: 'PayHero callback (M-Pesa STK, Airtel Money, telco wallets, banks)',
    method: 'POST',
    path: '/v1/finance/webhooks/PAYHERO',
    authModel: 'Shared callback token in x-callback-token / x-payhero-token, constant-time compared',
    configKeys: ['PAYHERO_CALLBACK_TOKEN'],
    tokenized: false,
    notes: 'Airtel / telco / bank methods require dedicated channel IDs; never reuse PAYHERO_CHANNEL_ID.',
  },

  // ── East Africa collections: Safaricom Daraja ────────────────────────────
  {
    provider: 'MPESA',
    domain: 'FINANCE',
    purpose: 'Daraja Lipa na M-Pesa STK push callback',
    method: 'POST',
    path: '/v1/payments/mpesa/callback?token=••••',
    authModel: 'Shared token verified in constant time before the 200 ack; deduped via ProviderEvent',
    configKeys: ['MPESA_CALLBACK_TOKEN'],
    tokenized: true,
    notes: 'The live URL carries the callback secret as a query token. Never log, echo or share the resolved URL.',
  },
  {
    provider: 'MPESA',
    domain: 'FINANCE',
    purpose: 'Daraja C2B validation (URL registration / simulation)',
    method: 'POST',
    path: '/v1/payments/mpesa/c2b/validation?token=••••',
    authModel: 'Shared token verified in constant time; immediate ack before any database work',
    configKeys: ['MPESA_CALLBACK_TOKEN'],
    tokenized: true,
  },
  {
    provider: 'MPESA',
    domain: 'FINANCE',
    purpose: 'Daraja C2B confirmation (manual-review reconciliation only)',
    method: 'POST',
    path: '/v1/payments/mpesa/c2b/confirmation?token=••••',
    authModel: 'Shared token verified in constant time; advisory BillRefNumber match, never auto-settles',
    configKeys: ['MPESA_CALLBACK_TOKEN'],
    tokenized: true,
    notes: 'Confirmations are recorded as PROCESSED ProviderEvents for human review only.',
  },
  {
    provider: 'MPESA',
    domain: 'FINANCE',
    purpose: 'Daraja finance provider event inbox',
    method: 'POST',
    path: '/v1/finance/webhooks/MPESA',
    authModel: 'Shared token verification via the finance verifier; deduped via ProviderEvent',
    configKeys: ['MPESA_CALLBACK_TOKEN'],
    tokenized: false,
  },

  // ── Legacy collection rails (never recommended) ──────────────────────────
  {
    provider: 'PAYSTACK',
    domain: 'FINANCE',
    purpose: 'Legacy Paystack webhook — retained for historical reconciliation only',
    method: 'POST',
    path: '/v1/payments/paystack/webhook',
    authModel: 'Paystack HMAC signature',
    configKeys: [],
    tokenized: false,
    legacy: true,
  },
  {
    provider: 'STRIPE',
    domain: 'FINANCE',
    purpose: 'Legacy Stripe webhook — retained for historical reconciliation only',
    method: 'POST',
    path: '/v1/payments/webhook',
    authModel: 'Stripe signature',
    configKeys: [],
    tokenized: false,
    legacy: true,
  },

  // ── Communications & social webhooks ─────────────────────────────────────
  {
    provider: 'WHATSAPP',
    domain: 'COMMUNICATIONS',
    purpose: 'WhatsApp Business webhook verification and inbound events',
    method: 'GET',
    path: '/v1/communications/webhooks/whatsapp',
    authModel: 'hub.verify_token challenge + HMAC signature on POST',
    configKeys: ['WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'],
    tokenized: false,
  },
  {
    provider: 'META',
    domain: 'COMMUNICATIONS',
    purpose: 'Meta / Facebook / Instagram webhook verification and inbound events',
    method: 'GET',
    path: '/v1/communications/webhooks/meta',
    authModel: 'hub.verify_token challenge + X-Hub-Signature-256 on POST',
    configKeys: ['META_WEBHOOK_VERIFY_TOKEN', 'META_APP_SECRET'],
    tokenized: false,
  },
  {
    provider: 'TELEGRAM',
    domain: 'COMMUNICATIONS',
    purpose: 'Telegram bot webhook',
    method: 'POST',
    path: '/v1/communications/webhooks/telegram',
    authModel: 'x-telegram-bot-api-secret-token shared secret',
    configKeys: ['TELEGRAM_WEBHOOK_TOKEN'],
    tokenized: false,
  },
  {
    provider: 'TIKTOK',
    domain: 'COMMUNICATIONS',
    purpose: 'TikTok webhook verification and inbound events',
    method: 'GET',
    path: '/v1/communications/webhooks/tiktok',
    authModel: 'verify_token challenge + HMAC signature on POST',
    configKeys: ['TIKTOK_VERIFY_TOKEN', 'TIKTOK_WEBHOOK_SECRET'],
    tokenized: false,
  },

  // ── Operations / email ────────────────────────────────────────────────────
  {
    provider: 'ZOHO',
    domain: 'OPERATIONS',
    purpose: 'Zoho Mail OAuth redirect URI',
    method: 'GET',
    path: '/v1/admin/communications/email/oauth/callback',
    authModel: 'OAuth state + configured redirect URI allowlist',
    configKeys: ['ZOHO_REDIRECT_URI'],
    tokenized: false,
    notes: 'Register the full origin + this path as the authorized redirect URI in Zoho.',
  },
];

/**
 * Read-only payload for the admin integration-endpoints reference.
 * Reads only one non-secret setting (the public site origin) so the UI can show
 * the absolute buyer-return URL; no secret value is ever resolved or returned.
 */
export function integrationEndpointsPayload() {
  const siteOrigin = String(getConfig('PUBLIC_SITE_URL') || '').trim().replace(/\/+$/, '');
  return {
    apiOrigin: CANONICAL_API_ORIGIN,
    siteOrigin: siteOrigin || null,
    note: 'Register these paths on the canonical API origin. All paths are /v1 only. Tokenised URLs carry a shared secret — the real token is appended server-side and must never be logged or echoed.',
    endpoints: INTEGRATION_ENDPOINTS,
  };
}
