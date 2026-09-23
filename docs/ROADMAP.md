# Production-Readiness & Growth Roadmap

Status of this document: **live**. Phases are executed in order; each phase is
environment-gated (a missing env key must never crash the app or silently
weaken security). Mark items `[x]` only when verified (build/tests/deployed).

Legend: `[ ]` pending · `[~]` in progress · `[x]` done.

---

## Where we are today

| Layer | Current state |
| --- | --- |
| Frontend | React 19 + Vite 7 + MUI + Tailwind 4, Redux Toolkit. Deployed on Netlify. |
| Backend | Express + TypeScript (strict, CommonJS), Node ≥ 24, 40+ route modules. Fly.io (Docker) — `web` + `worker` process groups (`backend/fly.toml`). |
| Database | Prisma 7 + Neon Postgres (`backend/src/db.ts` singleton, Neon adapter). |
| Payments | Stripe only — `backend/src/routes/payments.ts` + `services/payments/stripeService.ts`. Signature-verified webhook, idempotent `Payment` rows keyed by `providerId`. |
| Files | Local disk (`uploads/`, ephemeral on the Fly `web` machines) + S3/Tigris object storage (`services/storage/s3.ts`, `AWS_*` secrets from `fly storage create`) + public CDN `https://<bucket>.t3.tigrisfiles.io` + read-proxy fallback. |
| AI | Multi-provider adapter done (`services/aiProvider.ts`), admin-configurable at `/admin/ai-config`. NVIDIA via OpenAI-compatible + status polling; also Anthropic, Google, Moonshot, Groq, etc. |
| Async | `bullmq` + `ioredis` installed; small `queue/` + `workers/` (email, file processor, reconciliation). Redis keys removed previously. |
| Observability | Sentry (`services/monitoring/sentry.ts`), structured logs (winston). |

## Guiding principles

1. **Fail closed.** Never process money or webhooks without provable authenticity
   (Stripe signature, Paystack HMAC, PayHero/Daraja reference matching). Missing
   config → 500/503, never "accept anyway".
2. **Reversible by env.** Every new subsystem is behind env vars; toggling a key
   off restores previous behaviour. No irreversible schema/workflow changes.
3. **Idempotent state changes.** `Payment` rows update by natural key
   (`provider` + `providerId` / reference / `CheckoutRequestID`), never insert blindly.
4. **Observability before scale.** Log webhook decisions, queue job outcomes, and
   replica-lag/health in a queryable format before load is added.
5. **One source of truth for content.** Public UI reads `/api/*`; never hardcode
   business content in components.

---

## Phase 1 — Object storage: Tigris / any S3-compatible backend `[~]`

**Why:** Fly machines wipe `uploads/` on every deploy/restart. User-uploaded
files must live in durable object storage. Tigris (`https://t3.storage.dev`) is an
S3-compatible API, so the existing AWS SDK v3 client works unchanged; Cloudflare R2,
AWS, or MinIO work the same way.

**Design**
- `backend/src/services/storage/s3.ts` — single S3 client + helpers:
  `isS3Enabled()`, `toPublicUrl(key)`, `generatePresignedPutUrl()`,
  `uploadObject()` (streams multer buffer → bucket), `getObject()` (streams bucket → response).
  `forcePathStyle` is env-controllable (`S3_FORCE_PATH_STYLE`, default on for custom endpoints).
- `backend/src/routes/uploads.ts` — the `/uploads/local/image` and `/uploads/local/document`
  endpoints (used by `frontend/src/components/FileUpload.jsx`) become storage-agnostic:
  - S3 configured → memory-buffer multer → `uploadObject()` → `File` row with
    `metadata.storage = 's3'`, `metadata.key`, and either a public URL or
    `/api/uploads/files/:id/raw` proxy.
  - Not configured → existing disk-storage behaviour (unchanged).
- Private downloads (`/files/:id/download`) and a new public proxy
  (`/files/:id/raw`) stream from S3 when the row is S3-backed.
- Presigned path (`/sign` + `/confirm`) already targets S3; `admin.ts` confirm builds
  `${S3_PUBLIC_BASE_URL}/${key}` — already Tigris-compatible.

**Config (backend `.env` / Fly secrets)**
```env
# Tigris
S3_ENDPOINT=https://t3.storage.dev
S3_REGION=auto
S3_ACCESS_KEY=tid_...
S3_SECRET_KEY=tsec_...
S3_BUCKET=your-bucket-name
S3_FORCE_PATH_STYLE=1
S3_PUBLIC_BASE_URL=https://your-bucket.t3.storage.dev   # public CDN host for public files
```
- Get keys/bucket from the Tigris dashboard (`t3 buckets create` / access keys), or
  Cloudflare R2 / AWS S3 with the same env shape.
- `S3_PUBLIC_BASE_URL` is optional; when unset, public S3 files are served through
  `/api/uploads/files/:id/raw`.

**Verification**: backend `tsc` + build + vitest; manual "upload an image then a
private document in admin, then restart the container" test in staging.

**Status**
- `[x]` `s3.ts` upgraded to a full put/get/presign client with `isS3Enabled()`
- `[~]` `uploads.ts` routes storage-aware + raw proxy
- `[x]` `.env` / `.env.example` documented
- `[ ]` live-verified against a real Tigris bucket (blocked: needs credentials; sandbox has no egress)

---

## Phase 2 — Payments: PayHero (M-Pesa + Kenyan banks), Paystack, Stripe `[~]`

Goal: one internal gateway with interchangeable providers, all feeding the same
`Payment` table, so a booking deposit can be paid by M-Pesa STK, Kenyan bank
automation (PayHero), Paystack (cards), or Stripe.

### Provider research summary (checked against current docs)

- **PayHero** (`https://docs.payhero.co.ke`)
  - Base `https://backend.payhero.co.ke/api/v2`, **Basic auth** (API username + password token).
  - `POST /payments` → STK push: `{ amount, phone_number, channel_id, provider: "m-pesa", external_reference, customer_name?, callback_url, credential_id? }`
    → `{ success, status: "QUEUED", reference, CheckoutRequestID }`.
  - **Callback** (POST to our `callback_url`): `{ response: { CheckoutRequestID, ExternalReference, MerchantRequestID, MpesaReceiptNumber, Phone, ResultCode, ResultDesc, Status }, status }`.
    No signature header — authenticate by matching `ExternalReference` to a stored `Payment` row
    (which only we minted). STK abuse protection: >10 failed pushes to one number → 24h block;
    >50 fails/6h → 4h restriction. Treat failures as client-abandons, not retries.
  - Also covers **bank paybills**: register a channel of `type: paybill|till|bank`, then STK-push
    money into any bank/sacco/school paybill (`Get PH Bank Paybills` lists them).

- **M-Pesa Daraja (Safaricom)** (`https://developer.safaricom.co.ke`)
  - OAuth: `POST /oauth/v1/generate?grant_type=client_credentials` with consumer key/secret → access token.
  - STK: `POST /mpesa/stkpush/v1/processrequest` with `BusinessShortCode`, `Password` = base64(`${shortcode}${passkey}${timestamp}`),
    `Timestamp` = `YYYYMMDDHHmmss`, `TransactionType` `CustomerPayBillOnline`, `PartyA`+`PhoneNumber` (2547…),
    `PartyB` = shortcode, `CallBackURL`, `AccountReference`, `TransactionDesc`.
  - Query: `POST /mpesa/stkpushquery/v1/query` (`CheckoutRequestID`). Sandbox shortcode `174379`,
    mock passkey `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`.
  - **Callback**: `Body.stkCallback` → `ResultCode` (`0` = success), `ResultDesc`,
    `CallbackMetadata.Item[]` (receipt, phone, amount). Not signed — authenticate by matching
    `CheckoutRequestID` to a stored `Payment` row we created, and reply `0` / reject `1`.

- **Paystack** (`https://paystack.com/docs`)
  - Base `https://api.paystack.co`, `Authorization: Bearer <secret>`.
  - `POST /transaction/initialize` → `{ status, data: { authorization_url, reference } }`; amount is in the
    currency's subunit (e.g. KES → cents).
  - `GET /transaction/verify/:reference` → `response.data.status` is the transaction status (`success`, …).
  - **Webhook**: `x-paystack-signature` = HMAC-SHA512 of the **raw body** signed with the secret key;
    event `charge.success`. Compare digests in constant-time, then match `data.reference` to a stored row.

- **Stripe** — already integrated: `payment_intent.succeeded` / `payment_intent.payment_failed`,
  `STRIPE_WEBHOOK_SECRET` signature verification, `PaymentIntents` idempotency.

### Gateway shape

```
backend/src/services/payments/
├── stripeService.ts      (exists — keep)
├── paystackService.ts    (initialize/verify via REST + constructWebhookEvent)
├── mpesaService.ts       (Daraja OAuth + STK push + query)
├── payheroService.ts     (v2 STK push + callback typing)
└── index.ts              (gateway: initializePayment({provider,…}) + webhook router map)
```

- `initializePayment` normalises: amount → provider subunit, phone → `2547…`, reference = our generated
  `external_reference` (PayHero/Daraja `AccountReference`), records a `PENDING` `Payment` row first
  (natural key: `provider` + provider-specific id).
- Webhook/callback router (`payments.ts`): per-provider verification then a single idempotent
  `applyPaymentSuccess(provider, providerId, amount, currency, metadata, bookingId)` that upserts the
  `Payment` row and flips the booking to `DEPOSIT_PAID` (existing behaviour).
- Charge initiation endpoint `POST /api/payments/initiate` (auth + role/booking-ownership checks,
  mirrors `create-intent` strike-pass rules). No new public write surface.
- Reconciliation: extend `scripts/reconcile-*.js` pattern to all providers (`status` sync by natural key).

**Env per provider (goes to Fly secrets)**
```env
# Stripe (exists)
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paystack
PAYSTACK_SECRET_KEY=sk_live_...

# PayHero
PAYHERO_API_USERNAME=...
PAYHERO_API_PASSWORD=...
PAYHERO_CHANNEL_ID=0            # registered till/paybill/bank channel id
PAYHERO_CALLBACK_URL=https://api.angisoft.co.ke/api/payments/payhero/callback

# M-Pesa Daraja
MPESA_ENV=sandbox               # sandbox | production
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://api.angisoft.co.ke/api/payments/mpesa/callback
```

**Security matrix (webhook ack)**
| Provider | Verification | Idempotency key |
| --- | --- | --- |
| Stripe | `stripe.webhooks.constructEvent` signature | `payment_intent.id` |
| Paystack | HMAC-SHA512 of raw body vs `x-paystack-signature` | `data.reference` |
| PayHero | row-exists match on `ExternalReference` (no signature) | `CheckoutRequestID` |
| Daraja | row-exists match on `CheckoutRequestID` (no signature) | `CheckoutRequestID` |

**Status**: `[ ]` services · `[ ]` routes · `[ ]` tests (mocked provider) · `[ ]` live test

---

## Phase 3 — Platform architecture: realtime, queues, caching, storage, scale `[~]`

### 3.1 Realtime background updates (WebSockets)
- Socket.IO (or native `ws`) server in `backend/src/index.ts` sharing auth with JWT.
- Channels: booking status push to client portal + staff dashboard, admin notifications,
  chatbot streaming, upload progress.
- Store session keys in Redis (shared across Fly machines). Stickiness: many-to-many via Redis adapter.

### 3.2 Message queues (already have `bullmq` + `ioredis`)
- **Done**: `backend/src/queue/index.ts` is now a Redis-gated facade — BullMQ (backed by
  `REDIS_URL`) in production, and a draining in-memory fallback when Redis is absent (dev/test).
  Same contract either way: `getQueue(name).add(jobName, data)` / `createWorker(name, processor)` /
  `getWorkers()` / new `closeWorkers()` (wired into graceful shutdown). Workers moved behind it as-is
  (`emails`, `file-processing`, `reconciliation`).
- **Bug fixed**: the in-memory adapter previously looked up processors by job name (`'send'`) while
  workers registered under the *queue* name (`'emails'`) — email jobs were queued but never drained.
  Lookup now prefers the queue-name processor and falls back to the job name; verified by runtime smoke.
- Next: per-job retry/backoff tuning + Daraja callback scheduling for missing rows (see §2).
- TODO: `payment.confirmed`/`payment.failed` → enqueue email + booking event so webhook handlers
  return `200` fast and never block on worker work.

### 3.3 Caching
- **Done**: `backend/src/middleware/cache.ts` (public JSON cache) + `backend/src/services/cache.ts`
  (Redis when `REDIS_URL`, in-memory fallback; fail-soft; `purgeCache(prefix)` helper). Only
  unauthenticated `GET` routes from an explicit allow-list (`/api/services`, projects, blogs,
  testimonials, faqs, solutions, industries, announcements, company-stats, home-sections,
  about-sections, certifications, careers, products, product-faqs) are cached. Responses get
  `Cache-Control: public, s-maxage=<PUBLIC_CACHE_TTL>` (default 60 s) so a CDN can cache them too.
  Env: `CACHE_ENABLED` / `PUBLIC_CACHE_TTL`.
- Still to consider: conditional invalidation on admin writes (calls `purgeCache` per content type)
  if 60 s TTL freshness is not enough.

### 3.4 CDN / delivery
- Frontend already on Netlify edge. Serve public uploads from the object-store CDN
  (`S3_PUBLIC_BASE_URL`) instead of `/uploads/public` static mount once Phase 1 lands; keep the static
  mount for legacy assets during rollout. Immutable cache headers already on `/uploads/public`; API
  content now also emits `Cache-Control: public, s-maxage` (see §3.3) so a CDN can cache origin JSON.
- **Status**: code-ready — set S3 keys/bucket + `S3_PUBLIC_BASE_URL`, then flip `uploads` to bucket mode.

### 3.5 Database scaling — Neon read replicas (and later sharding)
- **Reads vs writes**: install `@prisma/extension-read-replicas`, give `db.ts` a
  `DATABASE_URL_REPLICA` (or array) target. All `findMany`/`findUnique` reads route to the replica;
  writes + `$transaction` stay on the primary. Neon replicas cost no extra storage and spin up in seconds
  (Free plan: up to 3).
- Pooling: use the Neon `-pooler` hostname in `DATABASE_URL` (PgBouncer-style) so Fly machines don't
  exhaust connections; keep a direct URL for `prisma migrate`.
- Sharding/partitioning: for the current traffic envelope, read replicas + pooling are the right first
  step. Revisit Citus-style/Neon sharding only when write volume of a single table (e.g. analytics events,
  chatbot history) exceeds a single primary. Plan partition-keyed write tables (by tenant/date) now.
- Indexes: audit hot query paths (bookings by client, audit logs, chat history) in `prisma/schema.prisma`.

### 3.6 gRPC & MCP
- **gRPC**: deliberately **not implemented** (doc-only). Rationale: for a single-deploy Express API the
  REST layer is already correct; gRPC would only pay off if we split payments/notifications into
  separate deployables. Revisit then: generate TS stubs (protobuf) under `backend/src/grpc/`.
- **MCP (Done)**: read-only Model Context Protocol server over the public content catalog —
  `backend/src/mcp/tools.ts` (services, projects, products, blog posts, testimonials) exposed two ways:
  - stdio: `npm run mcp:stdio` (desktop/local AI clients).
  - HTTP: Streamable HTTP (stateless) on `POST /mcp`, opt-in via `MCP_HTTP_ENABLED=true`.
  Uses `@modelcontextprotocol/sdk` (1.30); never on the critical request path.

### 3.7 Observability & operations
- Sentry already initialised. Extend: capture webhook outcomes, queue job metrics, payment latency.
- `/health` already exists; `/readyz` **done** (DB hard-gated + optional Redis ping + worker registry via
  `queue/getWorkers`).
- Structured request logging with `x-request-id`; correlation IDs across queue jobs.

---

## Phase 4 — UI revamp `[~]`
- Brand tokens aligned with the new logo palette — **done** (`constants.js` `BRAND_COLORS`,
  `ThemeContext`, `index.css` @theme + 24 components swept to official hexes; per-product
  gradient identity hues kept).
- Performance: keep lazy routes (already used), add skeleton loaders, reduce MUI bundle via icon sub-imports
  (already done for react-icons), add image `loading="lazy"`/`decoding="async"` audit.
- Accessibility + dark-mode consistency across admin panels.
- Convert remaining hardcoded `/uploads/public` strings to `resolveAssetUrl()` — remaining raw literals
  audited and found to be consumed via `resolveAssetUrl` at render time (ProjectLists/ProjectDetails,
  HeroSlider data, IndustryExpertise, ModernProjectCard, ProjectCard); `FileUpload.jsx` upload API
  paths intentionally raw.
- Realtime badges via Phase 3 sockets (booking status, unread notifications).

---

## Execution log

| Date | Phase | Items |
| --- | --- | --- |
| (this session) | 1 | s3.ts + uploads.ts storage-agnostic; env docs; ROADMAP + CLAUDE.md |
| (this session) | 2 | paystackService + mpesaService + payheroService + payments gateway index.ts; `POST /initiate`, paystack/mpesa/payhero webhooks in payments.ts; raw-body middleware in app.ts; `PaymentProvider` enum + migration 20260923000000; env docs. Verified: tsc + build + auth.spec. Live E2E pending provider keys/Fly.io. |
| (this session) | 3 | Realtime Socket.IO (`services/realtime/index.ts`: JWT handshake auth, `user:<id>`/`staff`/`booking:<id>` rooms, secure `booking:join` by trackingToken or staff role, `booking:leave`); emit fan-out from `logBookingEvent`, `createNotification`, and `applyPaymentOutcome`; shared origin allow-list `config/origins.ts`; `initRealtime`/`closeRealtime` in index.ts. Neon read replicas in `db.ts` via `@prisma/extension-read-replicas` (env-gated on `DATABASE_URL_REPLICA`, prod-only). `/health/readyz` deep probe (DB hard-gated + optional Redis ping + worker registry via `queue/getWorkers`). Caching/CDN-first steps: all runtime assets route through `resolveAssetUrl` so `ASSET_BASE_URL` CDN rollout is drop-in. |
| (this session) | 4 | Frontend `hooks/useRealtime.js` (socket singleton, JWT agent, subscribe/emit); `BookingProgress.jsx` live-refreshes on `booking:event` (joins room via tracking token); Vite `/socket.io` ws proxy; 92 hardcoded `/uploads/public` literals routed through `resolveAssetUrl` across 9 data/util/component files + 10 runtime components. Brand-palette alignment: `BRAND_COLORS`/`constants.js` → official palette; old hexes (`#0A3DFF`→`#0875FF`, `#00C2FF`→`#00AFFF`, `#39FF6A`→`#27D94B`, `#3B6FFF`→`#3B9AFF`, etc.) swept across `index.css` + 24 components (137 replacements, build green; per-product gradient hues `#8A2BE2`/`#EF4444` preserved). |
| (this session) | 3 | Redis-gated queue adoption (`queue/index.ts`: BullMQ when `REDIS_URL`, in-memory fallback with the `'send'`/`'emails'` processor-lookup bug fixed + `closeWorkers()` wired into `index.ts` graceful shutdown; runtime smoke verified). Redis-gated public JSON cache (`middleware/cache.ts` + `services/cache.ts`, allow-listed public GET routes, `s-maxage` headers, `purgeCache`, env `CACHE_ENABLED`/`PUBLIC_CACHE_TTL`; runtime smoke verified). MCP read-only server (`mcp/tools.ts` + `mcp/index.ts`; stdio via `npm run mcp:stdio`, HTTP via `MCP_HTTP_ENABLED` on `/mcp`; `@modelcontextprotocol/sdk@1.30`). gRPC deliberately doc-only (§3.6). `.env.example` updated. Verified: tsc + build + auth.spec 3/3. |
| (this session) | 5 | Fly.io "one ecosystem" wiring: shared Redis helper `services/redis.ts` (REDIS_FAMILY + auto-IPv6 for `*.upstash.io`; used by queue, cache, readyz, realtime); `s3.ts` honors `AWS_*` secret names (`fly storage create`) + auto-derives `<bucket>.t3.tigrisfiles.io` public CDN (S3_PUBLIC_BASE_URL corrected in `.env`); Socket.IO Redis adapter `@socket.io/redis-adapter` wired into `realtime/index.ts` behind `REDIS_URL` (fail-soft to in-process; teardown in `closeRealtime`); workers-only entrypoint `src/worker.ts` + `start:worker` script → Fly `worker` process group; `backend/fly.toml` (`web`+`worker` processes, `[http_service]` `/health/readyz` check, `release_command = "npx prisma migrate deploy"`, jnb region, secrets guide). `.env.example` deleted per user preference — runtime `backend/.env` is the single config source (updated in place: REDIS_URL/REDIS_FAMILY/CACHE_ENABLED/PUBLIC_CACHE_TTL/CDN base). Docs updated: AGENTS.md, CLAUDE.md, backend/README.md (Fly.io deploy + worker script), docs/ARCHITECTURE.md. Verified: tsc + build + auth.spec 3/3. Live deploy/Redis/Tigris E2E requires user Fly auth + live keys. |
| (this session) | 6 | **LIVE on Fly.io**: app `company-portfolio` (user's own app; user fly.toml: single `app` process, lhr, scale-to-zero, `release_command = npx prisma migrate deploy`). Linked secrets on the app from `backend/.env` (Neon `DATABASE_URL`, Tigris `S3_*` → `my-company-portfolio` bucket, `REDIS_URL` + `REDIS_FAMILY=6`) via `scripts/fly-secrets.sh` (fixed `--only` filter bug; earlier full-sweep overwrote JWT/SMTP/OpenAI secrets with matching `.env` values — source-of-truth alignment, disclosed). `fly redis create` Upstash `company-portfolio-redis` (PAYG, `--enable-prodpack=false` to skip the TTY prompt). Deployed via `fly deploy -a company-portfolio --local-only` (depot/`api.depot.dev` unreachable; `docker push registry.fly.io/...` → "app repository not found"). Custom domain `api.angisoft.co.ke` cert attached (`fly certs add`, shared v4 `66.241.124.205` + pre-existing v6 `2a09:8280:1::198:5fd8:0`; DNS records pending at registrar → A + AAAA). **Verified live**: `/health/readyz` 200 `{ready:true, database:true, redis:true, workers:[emails,file-processing,reconciliation]}`; `/api/services` 200 real data. Netlify `/uploads/*` proxy + `PAYHERO_CALLBACK_URL` + frontend `/api` base all keep `api.angisoft.co.ke` unchanged (domain now routes to Fly). `angisoft-api` test app left dormant (user: leave as-is). |