/**
 * Runtime configuration store.
 *
 * Root secrets (DB URL, JWT signing keys, encryption keyring, S3, Redis) stay
 * in the environment / Fly secrets — they are needed before the database is
 * reachable. Everything else lives in the `Setting` table:
 *
 *   config:<KEY>  → plain, UI-editable setting (JSON value)
 *   secret:<KEY>  → AES-256-GCM encrypted credential (EncryptedSecret JSON)
 *
 * `loadRuntimeConfig()` fills an in-memory mirror at boot; `getConfig()` is
 * synchronous so existing service code keeps its current call shape. A short
 * TTL refresh in HTTP middleware propagates UI changes across instances.
 */

import prisma from '../../db';
import { ts } from '../../prisma/db';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
  type EncryptedSecret,
} from './secrets';

export type ConfigKind = 'secret' | 'setting';

export interface ConfigDefinition {
  key: string;
  group: string;
  kind: ConfigKind;
  description: string;
  /** Safe fallback used when neither DB nor env has a value. */
  defaultValue?: string;
}

const SECRET = (group: string, key: string, description: string): ConfigDefinition => ({
  key,
  group,
  kind: 'secret',
  description,
});
const SETTING = (
  group: string,
  key: string,
  description: string,
  defaultValue = ''
): ConfigDefinition => ({ key, group, kind: 'setting', description, defaultValue });

export const CONFIG_REGISTRY: ConfigDefinition[] = [
  // ── PayPal ──────────────────────────────────────────────────────────────
  SECRET('PayPal', 'PAYPAL_CLIENT_ID', 'Legacy PayPal client id (fallback)'),
  SECRET('PayPal', 'PAYPAL_CLIENT_SECRET', 'Legacy PayPal client secret (fallback)'),
  SECRET('PayPal', 'PAYPAL_SANDBOX_CLIENT_ID', 'Sandbox app client id'),
  SECRET('PayPal', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'Sandbox app secret'),
  SECRET('PayPal', 'PAYPAL_LIVE_CLIENT_ID', 'Live app client id'),
  SECRET('PayPal', 'PAYPAL_LIVE_CLIENT_SECRET', 'Live app secret'),
  SECRET('PayPal', 'PAYPAL_WEBHOOK_ID', 'Webhook id used to verify incoming events'),
  SETTING('PayPal', 'PAYPAL_ENV', 'sandbox or live', 'sandbox'),
  SETTING('PayPal', 'PAYPAL_CURRENCY', 'Settlement currency (KES is not supported)', 'USD'),
  SETTING('PayPal', 'PAYPAL_RETURN_URL', 'Buyer return URL after approval'),
  SETTING('PayPal', 'PAYPAL_CANCEL_URL', 'Buyer return URL after cancellation'),

  // ── PayHero ─────────────────────────────────────────────────────────────
  SECRET('PayHero', 'PAYHERO_API_USERNAME', 'API username'),
  SECRET('PayHero', 'PAYHERO_API_PASSWORD', 'API password'),
  SECRET('PayHero', 'PAYHERO_BASIC_AUTH_TOKEN', 'Precomputed basic auth token (optional)'),
  SECRET('PayHero', 'PAYHERO_ACCOUNT_ID', 'PayHero account id'),
  SECRET('PayHero', 'PAYHERO_CHANNEL_ID', 'Default payment channel id'),
  SECRET('PayHero', 'PAYHERO_AIRTEL_CHANNEL_ID', 'Airtel channel id'),
  SECRET('PayHero', 'PAYHERO_TELCO_CHANNEL_ID', 'Telco channel id'),
  SECRET('PayHero', 'PAYHERO_MOBILE_NETWORK_CODE', 'Mobile network code'),
  SECRET('PayHero', 'PAYHERO_BANK_NETWORK_CODE', 'Bank network code'),
  SECRET('PayHero', 'PAYHERO_CUSTOMER_NAME', 'Customer name sent with STK pushes'),
  SECRET('PayHero', 'PAYHERO_CALLBACK_TOKEN', 'Shared token used to authenticate callbacks'),
  SETTING('PayHero', 'PAYHERO_CALLBACK_URL', 'Public callback URL'),

  // ── M-Pesa / Daraja ─────────────────────────────────────────────────────
  SECRET('M-Pesa / Daraja', 'MPESA_CONSUMER_KEY', 'Daraja consumer key'),
  SECRET('M-Pesa / Daraja', 'MPESA_CONSUMER_SECRET', 'Daraja consumer secret'),
  SECRET('M-Pesa / Daraja', 'MPESA_PASSKEY', 'STK push passkey'),
  SECRET('M-Pesa / Daraja', 'MPESA_SHORTCODE', 'Paybill / till shortcode'),
  SECRET('M-Pesa / Daraja', 'MPESA_INITIATOR_NAME', 'B2C/B2B initiator name'),
  SECRET('M-Pesa / Daraja', 'MPESA_INITIATOR_PASSWORD', 'Initiator credential'),
  SECRET('M-Pesa / Daraja', 'MPESA_INITIATOR_PUBLIC_KEY', 'Initiator RSA public key'),
  SECRET('M-Pesa / Daraja', 'MPESA_CALLBACK_TOKEN', 'Shared token used to authenticate callbacks'),
  SETTING('M-Pesa / Daraja', 'MPESA_ENV', 'sandbox or production', 'sandbox'),
  SETTING('M-Pesa / Daraja', 'MPESA_CALLBACK_URL', 'Public STK callback URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_TRANSACTION_TYPE', 'STK transaction type', 'CustomerPayBillOnline'),
  SETTING('M-Pesa / Daraja', 'MPESA_B2C_TIMEOUT_URL', 'B2C timeout URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_B2C_RESULT_URL', 'B2C result URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_B2B_TIMEOUT_URL', 'B2B timeout URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_B2B_RESULT_URL', 'B2B result URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_STATUS_QUEUE_URL', 'Transaction status queue URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_REVERSAL_QUEUE_URL', 'Reversal queue URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_REVERSAL_RESULT_URL', 'Reversal result URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_C2B_SHORTCODE', 'C2B paybill or till shortcode'),
  SETTING('M-Pesa / Daraja', 'MPESA_C2B_VALIDATION_URL', 'C2B validation callback URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_C2B_CONFIRMATION_URL', 'C2B confirmation callback URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_C2B_RESPONSE_TYPE', 'C2B response type', 'Completed'),
  SETTING('M-Pesa / Daraja', 'MPESA_BALANCE_QUEUE_URL', 'Account balance timeout callback URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_BALANCE_RESULT_URL', 'Account balance result callback URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_STATUS_RESULT_URL', 'Transaction status result callback URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_REVERSAL_TIMEOUT_URL', 'Reversal timeout callback URL'),
  SETTING('M-Pesa / Daraja', 'MPESA_QR_MERCHANT_NAME', 'M-Pesa QR merchant display name', 'AngiSoft'),
  SETTING('M-Pesa / Daraja', 'MPESA_QR_TRANSACTION_TYPE', 'M-Pesa QR transaction type code', 'BG'),
  SETTING('M-Pesa / Daraja', 'MPESA_QR_CALLBACK_URL', 'M-Pesa QR callback URL'),

  // ── Meta / WhatsApp ─────────────────────────────────────────────────────
  SECRET('Meta / WhatsApp', 'META_APP_SECRET', 'Meta app secret'),
  SECRET('Meta / WhatsApp', 'META_SYSTEM_USER_TOKEN', 'Meta system user token'),
  SECRET('Meta / WhatsApp', 'META_MCP_ACCESS_TOKEN', 'OAuth token for the three Meta MCP servers'),
  SECRET('Meta / WhatsApp', 'META_CAPI_ACCESS_TOKEN', 'Conversions API access token'),
  SECRET('Meta / WhatsApp', 'WHATSAPP_ACCESS_TOKEN', 'WhatsApp Cloud API access token'),
  SECRET('Meta / WhatsApp', 'WHATSAPP_ACCESS_TOKENS', 'JSON map of phone-number-id → access token'),
  SECRET('Meta / WhatsApp', 'WHATSAPP_APP_SECRET', 'App secret used to verify webhook signatures'),
  SECRET('Meta / WhatsApp', 'WHATSAPP_VERIFY_TOKEN', 'Webhook verification token'),
  SECRET('Meta / WhatsApp', 'META_WEBHOOK_VERIFY_TOKEN', 'Facebook/Instagram webhook verification token'),
  SETTING('Meta / WhatsApp', 'META_WHATSAPP_BUSINESS_ACCOUNT_ID', 'WhatsApp Business Account id used for template reads'),
  SETTING('Meta / WhatsApp', 'META_ALLOW_UNSIGNED_WEBHOOKS', 'Dev-only unsigned webhook guard', 'false'),
  SETTING('Meta / WhatsApp', 'META_GRAPH_VERSION', 'Graph API version', 'v23.0'),
  SETTING('Meta / WhatsApp', 'META_APP_ID', 'Meta app id'),
  SETTING('Meta / WhatsApp', 'META_BUSINESS_MANAGER_ID', 'Business Manager id'),
  SETTING('Meta / WhatsApp', 'META_AD_ACCOUNT_ID', 'Meta ad account id for read-only insights'),
  SETTING('Meta / WhatsApp', 'META_APP_REVIEW_GRANTED', 'True when Meta App Review granted required permissions', 'false'),
  SETTING('Meta / WhatsApp', 'META_MCP_PROTOCOL_VERSION', 'JSON-RPC MCP protocol version', '2025-06-18'),
  SETTING('Meta / WhatsApp', 'META_ADS_MCP_URL', 'Meta Ads MCP endpoint', 'https://mcp.facebook.com/ads'),
  SETTING('Meta / WhatsApp', 'META_SOCIAL_MCP_URL', 'Meta devtools MCP endpoint', 'https://mcp.facebook.com/devtools'),
  SETTING('Meta / WhatsApp', 'META_WHATSAPP_MCP_URL', 'WhatsApp Business MCP endpoint', 'https://mcp.facebook.com/whatsapp_business_tools'),
  SETTING('Meta / WhatsApp', 'WHATSAPP_API_VERSION', 'WhatsApp Cloud API version', 'v23.0'),
  SETTING('Meta / WhatsApp', 'WHATSAPP_PHONE_NUMBER_ID', 'Sending phone number id'),
  SETTING('Meta / WhatsApp', 'WHATSAPP_OTP_TEMPLATE_NAME', 'Approved OTP template name'),
  SETTING('Meta / WhatsApp', 'WHATSAPP_OTP_TEMPLATE_LANGUAGE', 'OTP template language', 'en'),
  SETTING('Meta / WhatsApp', 'WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS', 'Dev-only unsigned webhook guard', 'false'),

  // ── Meta Conversions API (server-side measurement) ──────────────────────
  SETTING('Meta / WhatsApp', 'META_CAPI_ENABLED', 'Send server-side conversion events to Meta', 'false'),
  SETTING('Meta / WhatsApp', 'META_CAPI_DATASET_ID', 'Meta Events Manager dataset id'),
  SETTING('Meta / WhatsApp', 'META_CAPI_TEST_EVENT_CODE', 'Optional test event code for CAPI validation'),
  SETTING('Meta / WhatsApp', 'META_CAPI_ALLOW_SERVICE_EVENTS', 'Allow service-initiated purchase events without explicit marketing consent', 'false'),

  // ── Meta Threads / Catalog (feature-flagged adapters) ───────────────────
  SECRET('Meta / WhatsApp', 'THREADS_ACCESS_TOKEN', 'Threads API access token'),
  SETTING('Meta / WhatsApp', 'THREADS_USER_ID', 'Threads user id used for publishing'),
  SETTING('Meta / WhatsApp', 'META_CATALOG_ID', 'Meta Catalog id for the CMS product feed'),
  SETTING('Meta / WhatsApp', 'META_CATALOG_FEED_URL', 'Public URL Meta polls for the CMS catalog feed'),

  // ── Meta social / Telegram / TikTok ─────────────────────────────────────
  SECRET('Meta / WhatsApp', 'META_PAGE_ACCESS_TOKEN', 'Facebook page access token'),
  SECRET('Meta / WhatsApp', 'TELEGRAM_BOT_TOKEN', 'Telegram Bot API token'),
  SECRET('Meta / WhatsApp', 'TELEGRAM_WEBHOOK_TOKEN', 'Shared secret for Telegram webhook verification'),
  SECRET('Meta / WhatsApp', 'TIKTOK_ACCESS_TOKEN', 'TikTok read-only access token'),
  SECRET('Meta / WhatsApp', 'TIKTOK_VERIFY_TOKEN', 'TikTok webhook verification token'),
  SECRET('Meta / WhatsApp', 'TIKTOK_WEBHOOK_SECRET', 'TikTok webhook signature secret'),
  SETTING('Meta / WhatsApp', 'META_FACEBOOK_PAGE_ID', 'Facebook page id'),
  SETTING('Meta / WhatsApp', 'META_INSTAGRAM_ACCOUNT_ID', 'Instagram professional account id'),
  SETTING('Meta / WhatsApp', 'TELEGRAM_ALLOW_UNSIGNED_WEBHOOKS', 'Dev-only unsigned webhook guard', 'false'),
  SETTING('Meta / WhatsApp', 'TIKTOK_APP_ID', 'TikTok app id'),
  SETTING('Meta / WhatsApp', 'TIKTOK_ALLOW_UNSIGNED_WEBHOOKS', 'Dev-only unsigned webhook guard', 'false'),

  // ── PesaFlow (adapter-ready, unavailable until configured) ──────────────
  SECRET('PesaFlow', 'PESAFLOW_API_KEY', 'PesaFlow API key'),
  SECRET('PesaFlow', 'PESAFLOW_API_SECRET', 'PesaFlow API secret'),
  SECRET('PesaFlow', 'PESAFLOW_WEBHOOK_SECRET', 'PesaFlow webhook signing secret'),
  SETTING('PesaFlow', 'PESAFLOW_ENV', 'sandbox or live', 'sandbox'),
  SETTING('PesaFlow', 'PESAFLOW_BASE_URL', 'PesaFlow REST base URL'),
  SETTING('PesaFlow', 'PESAFLOW_CHANNEL', 'Default PesaFlow collection channel', 'mpesa'),
  SETTING('PesaFlow', 'PESAFLOW_CURRENCY', 'PesaFlow settlement currency', 'KES'),
  SETTING('PesaFlow', 'PESAFLOW_CALLBACK_URL', 'Public PesaFlow callback URL'),

  // ── Communications automation ───────────────────────────────────────────
  SETTING('Communications', 'COMMUNICATIONS_WHATSAPP_WINDOW_HOURS', 'WhatsApp free-form reply window in hours', '24'),
  SETTING('Communications', 'COMMUNICATIONS_SLA_RESPONSE_MINUTES', 'First-response SLA in minutes', '60'),
  SETTING('Communications', 'COMMUNICATIONS_AI_DRAFTS_ENABLED', 'Enable assistive AI drafts', 'true'),

  // ── Email / SMS / Zoho / AI ─────────────────────────────────────────────
  SECRET('Email / SMS / Zoho', 'SMTP_PASS', 'SMTP password'),
  SECRET('Email / SMS / Zoho', 'SMTP_USER', 'SMTP username'),
  SECRET('Email / SMS / Zoho', 'SMS_GATEWAY_TOKEN', 'SMS gateway token'),
  SECRET('Email / SMS / Zoho', 'ZOHO_CLIENT_ID', 'Zoho OAuth client id'),
  SECRET('Email / SMS / Zoho', 'ZOHO_CLIENT_SECRET', 'Zoho OAuth client secret'),
  SECRET('Email / SMS / Zoho', 'ZOHO_REFRESH_TOKEN', 'Zoho OAuth refresh token'),
  SECRET('AI', 'OPENAI_API_KEY', 'OpenAI API key'),
  SECRET('AI', 'OPENAI_ADMIN_API_KEY', 'OpenAI admin API key'),
  SECRET('AI', 'AI_API_KEY', 'AI provider key (legacy env fallback)'),
  SETTING('Email / SMS / Zoho', 'SMTP_HOST', 'SMTP host'),
  SETTING('Email / SMS / Zoho', 'SMTP_PORT', 'SMTP port'),
  SETTING('Email / SMS / Zoho', 'SMTP_SECURE', 'SMTP TLS flag'),
  SETTING('Email / SMS / Zoho', 'EMAIL_FROM', 'Default from address'),
  SETTING('Email / SMS / Zoho', 'EMAIL_NOREPLY', 'No-reply address'),
  SETTING('Email / SMS / Zoho', 'EMAIL_SUPPORT', 'Support address'),
  SETTING('Email / SMS / Zoho', 'EMAIL_UPDATES', 'Updates address'),
  SETTING('Email / SMS / Zoho', 'EMAIL_LOGO_URL', 'Email logo URL'),
  SETTING('Email / SMS / Zoho', 'CHATBOT_ADMIN_EMAIL', 'Chatbot escalation address'),
  SETTING('Email / SMS / Zoho', 'ZOHO_REDIRECT_URI', 'Zoho OAuth redirect URI'),
  SETTING('Email / SMS / Zoho', 'ZOHO_ACCOUNTS_BASE', 'Zoho accounts OAuth base URL', 'https://accounts.zoho.com'),
  SETTING('Email / SMS / Zoho', 'ZOHO_MAIL_API_BASE', 'Zoho Mail API base URL', 'https://mail.zoho.com/api'),
  SETTING('Email / SMS / Zoho', 'ZOHO_MAIL_USER_ID', 'Zoho Mail user id'),
  SETTING('Email / SMS / Zoho', 'ZOHO_MAIL_DOMAIN', 'Zoho Mail domain', 'angisoft.co.ke'),
  SETTING('Operations', 'OWNER_EMAIL', 'Owner notification address'),
  SETTING('Operations', 'CEO_EMAIL', 'CEO notification address'),
  SETTING('Operations', 'ADMIN_EMAIL', 'Administrator notification address'),
  SETTING('Operations', 'ADMIN_URL', 'Admin app URL', 'https://admin.angisoft.co.ke'),
  SETTING('Operations', 'PUBLIC_SITE_URL', 'Public website base URL used in feeds', 'https://angisoft.co.ke'),
  SETTING('Operations', 'SMS_GATEWAY_URL', 'SMS gateway endpoint'),
  SETTING('Operations', 'SMS_TO', 'SMS recipient'),
];

export const PLACEHOLDER_SECRET = '__SET_IN_ADMIN__';

const definitions = new Map(CONFIG_REGISTRY.map((item) => [item.key, item]));

/** Dev-only webhook bypasses must never be honoured in production. */
const UNSIGNED_WEBHOOK_FLAGS = new Set([
  'WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS',
  'META_ALLOW_UNSIGNED_WEBHOOKS',
  'TELEGRAM_ALLOW_UNSIGNED_WEBHOOKS',
  'TIKTOK_ALLOW_UNSIGNED_WEBHOOKS',
]);

/** Boot/env mirror. Secrets are plaintext here, equivalent to process.env. */
const store = new Map<string, string>();
let lastLoadedAt = 0;
let refreshInFlight: Promise<void> | null = null;
const REFRESH_TTL_MS = 30_000;

function envFallback(key: string, fallback = ''): string {
  const raw = process.env[key];
  return raw === undefined || raw === '' ? fallback : raw;
}

/** Synchronous read used by runtime services. */
export function getConfig(key: string, fallback = ''): string {
  const definition = definitions.get(key);
  const effectiveFallback = fallback || definition?.defaultValue || '';
  if (UNSIGNED_WEBHOOK_FLAGS.has(key) && process.env.NODE_ENV === 'production') {
    return 'false';
  }
  const stored = store.get(key);
  if (stored === undefined) return envFallback(key, effectiveFallback);
  if (stored === PLACEHOLDER_SECRET) return '';
  return stored;
}

export function hasConfig(key: string): boolean {
  return Boolean(getConfig(key));
}

function isEncryptedSecret(value: unknown): value is EncryptedSecret {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.ciphertext === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.authTag === 'string'
  );
}

export type SettingWrite = Parameters<typeof prisma.orm.public.Setting.create>[0];
export const asSettingValue = (value: unknown): SettingWrite['value'] => value as SettingWrite['value'];

/** Load/refresh the DB mirror. Falls back to env when the DB is unavailable. */
export async function loadRuntimeConfig(force = false): Promise<void> {
  if (!force && Date.now() - lastLoadedAt < REFRESH_TTL_MS) return;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const rows = await prisma.orm.public.Setting.all();
      for (const row of rows) {
        const key = row.key || '';
        if (key.startsWith('config:')) {
          const name = key.slice('config:'.length);
          if (definitions.has(name)) {
            store.set(name, row.value === null || row.value === undefined ? '' : String(row.value));
          }
        } else if (key.startsWith('secret:') && isEncryptedSecret(row.value)) {
          const name = key.slice('secret:'.length);
          if (definitions.has(name)) {
            try {
              store.set(name, decryptSecret(row.value));
            } catch {
              // A secret encrypted with an unavailable key stays unset until rotated.
              store.delete(name);
            }
          }
        }
      }
      lastLoadedAt = Date.now();
    } catch (err) {
      // Fail open: environment values remain in effect (also keeps unit tests
      // that mock the DB from requiring a database connection).
      console.warn(`Runtime config load failed; using environment defaults: ${String(err)}`);
      lastLoadedAt = Date.now();
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export function clearRuntimeConfigCache(): void {
  store.clear();
  lastLoadedAt = 0;
}

/** Persist a value to the Setting table and update the in-process mirror. */
export async function setConfigValue(key: string, value: string): Promise<void> {
  const definition = definitions.get(key);
  if (!definition) throw new Error(`Unknown config key: ${key}`);
  if (typeof value !== 'string') throw new Error('Config value must be a string');
  const storageKey = definition.kind === 'secret' ? `secret:${key}` : `config:${key}`;
  const storedValue: unknown =
    definition.kind === 'secret' && value ? encryptSecret(value) : value;

  const existing = await prisma.orm.public.Setting.where({ key: storageKey }).first();
  if (existing) {
    await prisma.orm.public.Setting.where({ key: storageKey }).update({ value: asSettingValue(storedValue) });
  } else {
    await prisma.orm.public.Setting.create({ key: storageKey, value: asSettingValue(storedValue), updatedAt: ts() });
  }
  store.set(key, value);
  lastLoadedAt = Date.now();
}

export async function deleteConfigValue(key: string): Promise<void> {
  const definition = definitions.get(key);
  if (!definition) throw new Error(`Unknown config key: ${key}`);
  const storageKey = definition.kind === 'secret' ? `secret:${key}` : `config:${key}`;
  const existing = await prisma.orm.public.Setting.where({ key: storageKey }).first();
  if (existing) await prisma.orm.public.Setting.where({ key: storageKey }).delete();
  store.delete(key);
  lastLoadedAt = Date.now();
}

export interface AdminConfigEntry {
  key: string;
  group: string;
  kind: ConfigKind;
  description: string;
  configured: boolean;
  source: 'database' | 'environment' | 'default' | 'unset';
  displayValue: string | null;
  updatedAt: string | null;
}

/** Metadata-only view for the SUPER_ADMIN UI. Never returns raw secrets. */
export async function listConfigForAdmin(): Promise<AdminConfigEntry[]> {
  await loadRuntimeConfig(true);
  const rows = await prisma.orm.public.Setting.all();
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return CONFIG_REGISTRY.map((definition) => {
    const storageKey = definition.kind === 'secret' ? `secret:${definition.key}` : `config:${definition.key}`;
    const row = byKey.get(storageKey);
    const value = getConfig(definition.key);
    const hasEnv = process.env[definition.key] !== undefined && process.env[definition.key] !== '';
    let source: AdminConfigEntry['source'] = 'default';
    if (definition.kind === 'secret' && isEncryptedSecret(row?.value)) source = 'database';
    else if (definition.kind === 'setting' && row) source = 'database';
    else if (hasEnv) source = 'environment';
    else source = 'unset';
    return {
      key: definition.key,
      group: definition.group,
      kind: definition.kind,
      description: definition.description,
      configured: Boolean(value),
      source,
      displayValue:
        definition.kind === 'secret'
          ? value
            ? maskSecret(value)
            : null
          : value || null,
      updatedAt: row?.updatedAt ? String(row.updatedAt) : null,
    };
  });
}
