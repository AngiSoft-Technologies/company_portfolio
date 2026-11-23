#!/usr/bin/env node
/**
 * Print the canonical provider callback/return URLs that must be registered in
 * external dashboards. No secrets or token values are emitted; rotated shared
 * tokens belong in the provider dashboard and in runtime config, never in
 * source control.
 *
 * All paths below are verified against backend/src/app.ts mounts:
 *   /v1/payments            -> modules/billing/routes/payments.ts
 *   /v1/payments/mpesa      -> mpesa-callbacks.ts + mpesa.ts
 *   /v1/communications/webhooks -> modules/communications/routes/webhooks.ts
 *   /v1/admin/communications/email -> modules/communications/routes/email.ts
 *   /v1/finance/webhooks    -> modules/finance/routes/webhooks.ts
 *
 * Usage: npm run providers:callbacks
 */
const api = (process.env.API_BASE_URL || 'https://api.angisoft.co.ke').replace(/\/$/, '');
const web = (process.env.WEB_BASE_URL || 'https://www.angisoft.co.ke').replace(/\/$/, '');

const callbacks = [
  {
    provider: 'PayPal',
    type: 'Webhook (verify-webhook-signature)',
    url: `${api}/v1/payments/paypal/webhook`,
    events: ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.DENIED'],
    configKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'PAYPAL_MODE'],
  },
  {
    provider: 'PayPal',
    type: 'Checkout return / cancel URLs',
    url: `${web}/portal?paypal=success | ${web}/portal?paypal=cancel`,
    configKeys: ['PAYPAL_RETURN_URL', 'PAYPAL_CANCEL_URL'],
  },
  {
    provider: 'PayHero',
    type: 'Payment callback (shared token via header or query)',
    url: `${api}/v1/payments/payhero/callback`,
    configKeys: ['PAYHERO_CALLBACK_TOKEN', 'PAYHERO_CALLBACK_URL', 'PAYHERO_CHANNEL_ID', 'PAYHERO_API_KEY'],
  },
  {
    provider: 'Safaricom Daraja',
    type: 'STK / B2C / B2B result callback (shared token via query)',
    url: `${api}/v1/payments/mpesa/callback`,
    configKeys: ['MPESA_CALLBACK_TOKEN', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY'],
  },
  {
    provider: 'Safaricom Daraja',
    type: 'C2B validation + confirmation (registered via /c2b/register)',
    url: `${api}/v1/payments/mpesa/c2b/validation | ${api}/v1/payments/mpesa/c2b/confirmation`,
    configKeys: ['MPESA_CALLBACK_TOKEN', 'MPESA_SHORTCODE', 'MPESA_C2B_RESPONSE_TYPE'],
  },
  {
    provider: 'Zoho Mail',
    type: 'OAuth redirect URI (admin session required)',
    url: `${api}/v1/admin/communications/email/oauth/callback`,
    configKeys: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_REDIRECT_URI'],
  },
  {
    provider: 'Meta (Facebook / Instagram)',
    type: 'Webhook verification + event POST',
    url: `${api}/v1/communications/webhooks/meta`,
    configKeys: ['META_APP_ID', 'META_APP_SECRET', 'META_SYSTEM_USER_TOKEN', 'META_WEBHOOK_VERIFY_TOKEN', 'META_PIXEL_ID', 'META_CAPI_ENABLED'],
  },
  {
    provider: 'WhatsApp Cloud',
    type: 'Webhook verification + event POST',
    url: `${api}/v1/communications/webhooks/whatsapp`,
    configKeys: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
  },
  {
    provider: 'Telegram',
    type: 'Bot webhook',
    url: `${api}/v1/communications/webhooks/telegram`,
    configKeys: ['TELEGRAM_WEBHOOK_TOKEN'],
  },
  {
    provider: 'TikTok',
    type: 'Webhook verification + event POST',
    url: `${api}/v1/communications/webhooks/tiktok`,
    configKeys: ['TIKTOK_VERIFY_TOKEN', 'TIKTOK_VERIFY_SECRET'],
  },
  {
    provider: 'Signed finance webhook inbox',
    type: 'PESAFLOW | PAYPAL | PAYHERO | MPESA | GENERIC',
    url: `${api}/v1/finance/webhooks/{PROVIDER}`,
    configKeys: ['WEBHOOK_SIGNING_SECRETS'],
  },
];

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), callbacks }, null, 2));
