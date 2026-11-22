# 🛠 Secrets & Runtime Configuration Architecture

> **🛠 OPERATIONAL** — Runbook for credential storage and the SUPER_ADMIN configuration vault.

## Decision

`.env` is for **local development only**. Production uses Fly secrets for the small set of
root credentials needed before the database is reachable, and an encrypted vault in the
existing `Setting` table for everything else.

```
Fly secrets (root, 38 keys)
  DATABASE_URL · APP_ENCRYPTION_KEY (+ keyring) · JWT_SECRET · MFA_HMAC_SECRET
  REDIS_URL · S3_* · SMTP-less infrastructure · CORS/WebAuthn · deploy tokens
          │ unlocks
          ▼
AES-256-GCM ──encrypts──▶ Setting rows named secret:<KEY> (54 credentials)
                          Setting rows named config:<KEY> (83 plain settings)
                                   ▲
                    SUPER_ADMIN UI: /settings/vault
                    write-only, masked, audited
```

The app needs no schema migration: `Setting.key` already exists and `Setting.value` is JSON.

## What stays in the environment (38)

| Tier | Keys |
|---|---|
| DB bootstrap | `DATABASE_URL`, `DATABASE_URL_REPLICA`, `TEST_DATABASE_URL`, `APP_ENCRYPTION_KEY`, `APP_ENCRYPTION_KEY_V2…`, `APP_ENCRYPTION_KEY_ACTIVE_VERSION` |
| Identity | `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `MFA_HMAC_SECRET` |
| Infrastructure | `REDIS_URL`, `REDIS_FAMILY`, `CACHE_ENABLED`, `PUBLIC_CACHE_TTL`, `S3_ENDPOINT`, `IAM_URL`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_BASE_URL` |
| Runtime/bound at setup | `NODE_ENV`, `PORT`, `FRONTEND_URL`, `CORS_ORIGIN`, `MCP_HTTP_ENABLED`, `SENTRY_DSN`, `WEB_AUTHN_RP_ID`, `WEB_AUTHN_ORIGIN`, `WEB_AUTHN_RP_NAME` |
| Bootstrap seeding | `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| Deploy/CI | `NETLIFY_DEPLOY_KEYS_*`, `NETLIFY_BUILD_HOOK_*` |
| Legacy — retire | `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `PAYSTACK_SECRET_KEY` |

These cannot be moved without a boot-order refactor: the app must have a DB connection and
the decryption key before it can read any vault row.

## What moved to the database (137)

- **54 encrypted credentials** (`secret:<KEY>`): PayPal client IDs/secrets/webhook id,
  PayHero credentials/channels/callback token, M-Pesa consumer/passkey/initiator/callback
  token, Meta/WhatsApp/Facebook/Telegram/TikTok secrets and tokens — including the new
  `META_WEBHOOK_VERIFY_TOKEN`, `TIKTOK_VERIFY_TOKEN` and `TIKTOK_WEBHOOK_SECRET` alongside
  `META_MCP_ACCESS_TOKEN`, `META_CAPI_ACCESS_TOKEN` and `THREADS_ACCESS_TOKEN` — PesaFlow
  credentials, SMTP/SMS/Zoho OAuth credentials, AI provider keys.
- **83 plain settings** (`config:<KEY>`): PayPal environment/currency/return URLs, callback
  and result URLs, WhatsApp/Meta identifiers and versions, the Meta MCP protocol version
  and three exact MCP endpoint URLs, Conversions API flags/dataset/test-event code,
  the read-only Ads insights setting `META_AD_ACCOUNT_ID`, `META_APP_REVIEW_GRANTED`,
  `THREADS_USER_ID`, `META_CATALOG_ID` and
  `META_CATALOG_FEED_URL`, `PUBLIC_SITE_URL` (public base for the CMS catalog feed), extended
  Daraja C2B/balance/QR URLs, Zoho accounts/Mail API/user settings,
  communications SLA/window flags, PesaFlow channel/URLs, SMTP host/port/addresses,
  owner/CEO/admin addresses, and all four dev-only unsigned-webhook guards
  (`WHATSAPP`, `META`, `TELEGRAM`, `TIKTOK`; all forced `false` in production).
- **9 already DB-backed**: `AI_ENABLED`, `AI_PROVIDER`, `AI_PROVIDER_BASE_URL`, `AI_MODEL`,
  `AI_RESPONSE_FORMAT`, `AI_CONNECT_TIMEOUT`, `AI_TIMEOUT`, `AI_MAX_TOKENS`, `AI_TEMPERATURE`
  live in `Setting['chatbot_ai_config']`. The encrypted `AI_API_KEY` / `OPENAI_API_KEY`
  vault rows take precedence; saving the AI form now strips `apiKey` from the plain JSON,
  and changing the key requires SUPER_ADMIN even though the rest of the form is ADMIN-editable.

The authoritative key list is `CONFIG_REGISTRY` in
`backend/src/shared/services/runtimeConfig.ts`. Its current shape is **137 keys = 54
`SECRET` + 83 `SETTING`**; these counts are registry entries, not evidence that any vault
row holds a live credential. Recount from the registry whenever keys are added.

## How it works

- `backend/src/shared/services/secrets.ts` — AES-256-GCM with random IV + auth tag.
  Version 1 uses `APP_ENCRYPTION_KEY`; higher versions use `APP_ENCRYPTION_KEY_Vn`.
  Decryption selects the version stored on the row, so key rotation is non-destructive.
- `backend/src/shared/services/runtimeConfig.ts` — `getConfig(KEY)` is synchronous and
  reads an in-memory mirror filled from `Setting` rows at boot; env is the fallback.
  `loadRuntimeConfig()` refreshes at most every 30 s (middleware in `app.ts`, timers in
  `index.ts` and `worker.ts`), so UI edits propagate across instances.
- `backend/src/shared/routes/runtime-config.ts` — `GET/PUT/DELETE /v1/admin/config[/:key]`,
  gated to `SUPER_ADMIN`. Secrets are never returned in plaintext; only a masked preview,
  source and update timestamp. Every write is recorded in `AuditLog` without its value.
- Admin UI: `frontend/admin/src/features/settings/RuntimeConfigAdmin.tsx` at
  `/admin/settings/vault` (nav: **People & System → Configuration Vault**).

Migrated runtime readers: PayPal (orders, payouts, webhook verification), PayHero,
M-Pesa STK, Daraja payouts/callbacks, WhatsApp MFA + Cloud sends + webhook verification,
Meta MCP/CAPI/Threads/social adapters, SMTP/lazy transporter, email branding, agent
outreach and AI keys. Plaintext `ProviderConnection.config.appSecret` /
`config.verifyToken` are no longer read.

## Seeding

```bash
cd backend
npm run config:seed -- --dry-run   # lists 137 keys, no values, no writes
npm run config:seed                # inserts missing rows, keeps existing
npm run config:seed -- --force     # overwrite from current .env (use with care)
```

Values already present in `.env` are encrypted and written; missing values get the
encrypted marker `__SET_IN_ADMIN__`, which the runtime treats as "not set" and the UI
shows as **Not set**. Run the seed **where the database is reachable** (e.g.
`fly ssh console -a company-portfolio -C 'cd /app && npm run config:seed'`) after deploying
this code. The development sandbox cannot reach Neon, so no live rows were seeded here.

## Rotation procedure

1. In the vault UI, replace the credential. The DB row is re-encrypted with the active
   key version immediately.
2. Rotate the corresponding credential at the provider and update its webhook URL if the
   shared token changed.
3. To rotate the master key: add `APP_ENCRYPTION_KEY_V2` to Fly secrets with a new random
   value, set `APP_ENCRYPTION_KEY_ACTIVE_VERSION=2`, redeploy, then
   `npm run config:seed -- --force` (or re-save each secret in the UI) to re-encrypt.
   Keep `APP_ENCRYPTION_KEY` (v1) until every row reports version 2.

## Outstanding follow-ups

- Run `config:seed` against production once network access is available.
- The stale commented-out `DATABASE_URL` was removed from `backend/.env`; rotate that
  credential at Neon. Rotate `MPESA_CALLBACK_TOKEN` and `PAYHERO_CALLBACK_TOKEN` because an
  earlier diagnostic printed callback query strings.
- Fill blank vault entries for Meta/WhatsApp, live PayPal, PayHero channels and PayHero
  customer name using the UI rather than `.env`. This includes the new Meta MCP, CAPI,
  Threads and catalog keys (`META_MCP_ACCESS_TOKEN`, `META_CAPI_ACCESS_TOKEN`,
  `THREADS_ACCESS_TOKEN`, `META_CAPI_DATASET_ID`, `THREADS_USER_ID`, `META_CATALOG_ID`,
  `META_CATALOG_FEED_URL`) — set them only once the corresponding live asset and consent
  are approved; a registered key is not a configured credential.
- Delete Stripe/Paystack secrets from Fly once legacy rails are fully retired.
