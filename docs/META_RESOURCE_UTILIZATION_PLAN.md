# Meta resource utilization plan

> **🛠 OPERATIONAL** — Resource-by-resource rollout decision record for **all** Meta
> developer resources, not only WhatsApp.<br>
> Source summary: [`META_DOCS_SUMMARY.md`](./META_DOCS_SUMMARY.md) ·
> Payments boundary: [`PAYMENTS.md`](./PAYMENTS.md).

> **Purpose:** account for every resource in [`META_DOCS_SUMMARY.md`](./META_DOCS_SUMMARY.md)
> and decide how AngiSoft will use it. WhatsApp is one channel among many; the decisions
> below deliberately leave room for Messenger, Instagram, Pages, Threads, Business Agent,
> Conversions API and the rest.
>
> **Status legend**
> `SHIPPED` — code path present in this checkout (not necessarily live/provisioned) ·
> `PARTIAL` — scaffold/advertised, needs work ·
> `PLANNED` — not built, intended · `DEFERRED` — consciously out of scope for now ·
> `N/A` — no applicable surface in our stack.

---

## 0. Coverage at a glance

| Area (plan section) | Items | Shipped | Partial | Planned | Deferred / N/A |
|---|---|---|---|---|---|
| Core platform & APIs (§1) | 5 | 1 | 2 | 1 | 1 |
| Auth, permissions & review (§2) | 9 | 2 | 1 | 6 | 0 |
| Webhooks (§3) | 7 | 3 | 3 | 1 | 0 |
| AI, MCP & Business Agent (§4) | 7 | 3 | 1 | 0 | 3 |
| SDKs (§5) | 3 | 0 | 0 | 2 | 1 |
| Social & identity integrations (§6) | 9 | 3 | 1 | 1 | 4 |
| Business messaging (§7) | 7 | 3 | 3 | 1 | 0 |
| Marketing & commerce (§8) | 7 | 2 | 0 | 1 | 4 |
| Work, data, privacy & gaming (§9) | 5 | 0 | 0 | 2 | 3 |
| **Total** | **59** | **17** | **11** | **15** | **16** |

Shipped **code paths** today cover: WhatsApp Cloud API text/template send, webhook
verification + inbound storage and WhatsApp OTP in MFA; Facebook/Instagram webhook
ingest, comment/message replies and Page post publishing; Messenger read/send; a
provider-neutral outbound dispatcher; three strict read-only Meta MCP clients; consent-
and config-gated Conversions API server events; a public CMS catalog feed; build-time
OG/Twitter meta tags; Threads read/insights/publish/carousel/reply adapters; bounded
Instagram mentions reads; and actor-audited Page/Instagram comment hiding. That is code only —
**no live provider credential, App Review grant, consent decision or spend cap is
verified in this checkout**. Most
shipped paths still fail closed until tokens/flags are configured; the rest remain
consciously staged. The point of the plan is that each resource has a decision, not
that all 59 get built.

---

## 1. Core platform & APIs

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 1.1 | App use cases / dashboard config | Configure additional Meta products on the existing app (Instagram, Threads, Login for Business) as each rollout starts | Meta Developer Portal + `docs/` runbook | PARTIAL | Instagram/Threads code paths now exist but the app use cases are still a portal-side decision; document which are enabled and create **separate dev and production apps** before connecting live assets |
| 1.2 | Graph API | Transport for WhatsApp send/templates and future Page/Instagram calls | `communications/services/whatsappCloud.ts`, `identity/services/mfa.ts` | SHIPPED | Keep server-to-server; never expose Graph calls through the browser |
| 1.3 | Explicit Graph version pinning | Prevent silent payload changes on Meta's quarterly releases | `whatsappCloud.ts` + `mfa.ts` read `WHATSAPP_API_VERSION` (default `v23.0`); newer Meta code reads `META_GRAPH_VERSION` (default `v23.0`) | PARTIAL | Drift narrowed but **two keys remain** — converge on one env-driven version used by every caller; pin, don't float |
| 1.4 | REST / OpenAPI APIs | Generate typed clients for new Meta APIs instead of hand-written payloads | new `modules/meta/` typed clients | PLANNED | When the first REST-based product is adopted, generate types from its published schema |
| 1.5 | `metadata` field deprecation (v25.0 / 19 May 2026) | Ensure nothing depends on it | — | N/A | Keep off; add a lint/grep check when upgrading Graph versions |

## 2. Auth, permissions & App Review

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 2.1 | WhatsApp access token / phone ID | Outbound messages and OTP | `backend/.env` (`WHATSAPP_ACCESS_TOKEN(S)`, `WHATSAPP_PHONE_NUMBER_ID`) | SHIPPED | Rotate on staff exit; never print the value in logs or curl output |
| 2.2 | Per-environment secret storage | Separate dev/prod tokens, app secrets and verify tokens | `backend/.env` → Fly secrets; non-root keys in `CONFIG_REGISTRY` (`runtimeConfig.ts`) | SHIPPED | New Meta MCP/CAPI/Threads/Catalog keys are now registered in the vault; keep them out of `frontend/` and never assume they hold live values |
| 2.3 | Facebook Login | Consumer "connect your Page/Instagram" flow | new `modules/meta/` OAuth route | PLANNED | Only when social publishing is actually enabled; store token server-side |
| 2.4 | Facebook Login for Business | Business admin grants Pages/ad account/catalog/WABA access | new OAuth route + `ProviderConnection` rows | PLANNED | Needed for Marketing API and multi-asset business customers |
| 2.5 | Instagram API with Unified Login | Recommended path for new Instagram clients, no Page required | `modules/meta/` | PLANNED | Prefer this over the older Facebook-Login-based Instagram flow |
| 2.6 | Page access token (`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`) | Publish CMS content to client Facebook Pages | `metaCapabilities.ts` (`publishMetaPagePost`, `listMetaPages`), `META_PAGE_ACCESS_TOKEN` vault key | PARTIAL | Read/publish code paths ship but require a real token plus `META_APP_REVIEW_GRANTED=true`; request the minimum permissions and keep the documented approval flow |
| 2.7 | System user token | Unattended backend jobs (scheduled posting, messaging) | `backend/.env`, one per environment | PLANNED | Never use a personal token for cron/workers; scope to the exact assets |
| 2.8 | App access token | Manage webhook subscriptions via `/app/subscriptions` | `modules/meta/` admin job | PLANNED | Needed once we subscribe to Page/Instagram objects beyond WhatsApp |
| 2.9 | App Review + privacy policy | Unlock advanced permissions for production | Meta app + legal-reviewed policy; `META_APP_REVIEW_GRANTED` runtime flag | PLANNED | The flag is a fail-closed gate, not an approval: prepare a working demo and privacy policy; unreviewed permissions = development/test data only |

## 3. Webhooks

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 3.1 | Webhook verification + HMAC-SHA256 signature | Reject forged callbacks | `communications/routes/webhooks.ts`, `verifyMetaSignature()` in `whatsappCloud.ts` | SHIPPED | Keep `X-Hub-Signature-256` verification mandatory in production |
| 3.2 | Inbound message/status extraction + dedupe | Store conversations, delivery statuses and provider events | `webhooks.ts` (`extractWhatsAppMessages`, `extractWhatsAppStatuses`) | SHIPPED | Add explicit dedupe by message ID on top of existing `ProviderEvent` handling |
| 3.3 | `WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS` dev escape hatch | Local debugging only | `webhooks.ts` | PARTIAL | Already guarded by `NODE_ENV !== 'production'`; add a test asserting it can never be honoured in production |
| 3.4 | Object/field subscriptions for Page, Instagram, Messenger | Real-time comments/DMs into the shared inbox | `parseMetaWebhook()` in `metaSocial.ts` + webhook router | PARTIAL | Ingest already normalises `messages`/`feed`/`comments`/`messaging` for both networks; subscription setup/inspection is still manual |
| 3.5 | `/app/subscriptions` version inspection | Detect which Graph version each subscribed field is using | admin diagnostics | PLANNED | Log active subscription versions; alert on unexpected downgrade/upgrade |
| 3.6 | Messenger webhook model (scoped IDs, messaging windows) | Correctly attribute Messenger/Instagram conversations | `parseMetaWebhook()` + `listMessengerConversations()`/`sendMetaMessage()` | PARTIAL | Scoped-ID attribution is implemented per Page/account; verify 24h/7d window enforcement before relying on it for Messenger/Instagram |
| 3.7 | HTTPS callback with valid TLS | All Meta callbacks | Netlify + Fly endpoints | SHIPPED | Keep; never point a production webhook at a self-signed or localhost URL |

## 4. AI, MCP & Business Agent

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 4.1 | Meta Model API | Optional inference backend for AI features | `modules/ai/` | DEFERRED | No need while the 12-agent workforce runs on its current provider; revisit only for a concrete cost/latency win |
| 4.2 | Meta Ads MCP (`https://mcp.facebook.com/ads`) | Ad reporting/management for the marketing agent | `metaMcp.ts` + `GET/POST /v1/admin/communications/capabilities/meta/mcp/*` | SHIPPED | **Code path only**: JSON-RPC `tools/list` + read-only `tools/call`, exact-URL allowlist and local spend/publish/send refusal. Live calls need `META_MCP_ACCESS_TOKEN`/system-user token; keep any write access off until approval, spend caps and audit exist. `META_AD_ACCOUNT_ID` is the read-only Ads insights setting (spend/impressions/clicks), not a spend credential |
| 4.3 | Meta Social Technologies MCP (`https://mcp.facebook.com/devtools`) | Read-only developer investigations (subscription/field diagnostics) | `metaMcp.ts` (same strict client) | SHIPPED | Read-only client shipped against the exact documented URL; needs credentials + capability flags for live use. Never add the docs page URL as an MCP endpoint |
| 4.4 | WhatsApp Business Tools MCP (`https://mcp.facebook.com/whatsapp_business_tools`) | Template/status investigation (read-only) | `metaMcp.ts` (same strict client) | SHIPPED | Read-only tool catalogue/call shipped; all outbound sends still go through our approval + template gate, not through MCP write tools |
| 4.5 | Meta Business Agent | 24/7 brand-voice WhatsApp agent with handoff to our app for bookings/payment confirmation | `modules/agents` + `modules/bookings` + payments bridge | DEFERRED | No adapter in this checkout. Revisit only after phone-number eligibility is confirmed; if built, start with knowledge + read-only handoff and never let it settle money |
| 4.6 | Wit.ai | Intent extraction on free-text inbound messages | `modules/ai/` | DEFERRED | Structured Flows/buttons cover most cases; add only if free-text volume justifies it |
| 4.7 | Prompt-injection controls for webhook/web content | Prevent a crafted inbound message from driving agent actions | existing `agentRunner.ts` delimiters + gate | PARTIAL | Extend the existing input-delimiting/quality-gate pattern to any Meta webhook content fed to an LLM |

## 5. SDKs

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 5.1 | Web JavaScript SDK (Login / sharing / pixel) | Browser-side Login and measurement when those products ship | `frontend/web` | PLANNED | Load only on the pages that need it; version-pin and gate behind consent |
| 5.2 | iOS / Android / Unity SDKs | Native apps | — | N/A | No native app in the current platform; revisit if one is built |
| 5.3 | CSP allowlist for Meta-hosted scripts/iframes | Keep plugins/SDKs working under CSP | `frontend/web` CSP headers | PLANNED | Update only when a SDK/plugin actually ships; never loosen CSP globally |

## 6. Social & identity integrations

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 6.1 | Sharing dialogs + Open Graph / crawler markup | Rich previews of portfolio projects and case studies on the public site | `frontend/web/vite.config.ts` `injectMeta()` build-time prerender | SHIPPED | Per-route `og:*`, canonical and `twitter:*` tags are emitted into `dist/<route>/index.html`; sharing dialogs themselves are not added |
| 6.2 | Social Plugins (Share, Page, Embedded Posts/Video) | Optional embeds on marketing pages | public site | DEFERRED | Plugins degrade invisibly, so low risk — but only add after consent/OG work; no replacement plugins exist |
| 6.3 | Pages API | Publish portfolio/news content to client Pages; read engagement | `metaCapabilities.ts` (`listMetaPages`, `publishMetaPagePost`) | PARTIAL | Read + write code paths ship; writes still require a live Page token, `pages_manage_posts` from App Review and our `ApprovalRequest` gate — no live Page is connected |
| 6.4 | Instagram Platform — Unified Login | Connect client professional accounts without a Facebook Page | `modules/meta/` (OAuth flow) | PLANNED | Adapters use a configured `META_INSTAGRAM_ACCOUNT_ID` + system-user token; the Unified Login/OAuth consent flow is not implemented |
| 6.5 | Instagram publishing, comment moderation, mentions, insights | Social publishing and inbox moderation from one admin screen | `publishInstagramMedia()`, `listMetaInstagramInsights()`, `listInstagramMentions()`, `hideMetaComment()`, `replyToMetaItem()`, `MetaCommandCenter.tsx` | SHIPPED | Code paths cover single image/video publish, insights, bounded mentions reads, comment/DM replies and actor-audited comment hiding; automated moderation *rules* still do not exist. Live use needs §2.5 permissions, §3.4 subscription, `META_INSTAGRAM_ACCOUNT_ID`, Page token, App Review and the existing system-user token — none are verified in this checkout |
| 6.6 | Threads API (single/carousel posts, media, profiles, replies, insights) | Extend social publishing to Threads | `metaCapabilities.ts` (`readThreadsProfile`, `listMetaThreads`, `listThreadsInsights`, `publishThreadsPost`, `publishThreadsCarousel`, `replyThreadsPost`) | SHIPPED | Profile/threads read, clamped profile/media insights, text/image/video publish, 2–10 item carousels and replies are implemented. Insights need only the Threads token/user; carousel publishing also needs `META_APP_REVIEW_GRANTED=true`. All calls fail closed without `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID` |
| 6.7 | Live Video API | Livestream launches/workshops | — | DEFERRED | Needs 60-day-old account + 100 followers; revisit for marketing events only |
| 6.8 | Stories API | Page Stories from CMS media | `modules/cms` | DEFERRED | Requires upload→publish flow and `CREATE_CONTENT` Page permission; lower priority than feed posts |
| 6.9 | Creator Discovery API | Find Facebook/Instagram creators for partnership ads | marketing workflows | DEFERRED | Needs brand IG business account + discovery permissions; not core delivery |

## 7. Business messaging

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 7.1 | WhatsApp text + template send | Customer care replies, notifications, invoices links | `whatsappCloud.ts`, `communications/routes/inbox.ts` | SHIPPED | Keep; add delivery-status reporting from the existing status extraction |
| 7.2 | Message template management API | Create/approve templates from admin rather than Meta Dashboard | `modules/communications` admin UI | PARTIAL | Sending exists; template creation/approval still happens in the Meta Dashboard — decide if admin UI is worth building |
| 7.3 | WhatsApp Flows | Structured booking/enquiry/payment-method selection inside WhatsApp | `modules/bookings` + payments bridge | PLANNED | Start with lead/booking capture; payment method selection must hand off to our server-held-amount checkout, never collect amounts in the Flow |
| 7.4 | Messenger Platform | Reply to Page/Instagram DMs with live-agent + bot mix | `listMessengerConversations()`, `sendMetaMessage()`, shared inbox | PARTIAL | Read/send and webhook ingest ship; a person must initiate and 24h/7d window enforcement still needs verification before enabling the bot mix |
| 7.5 | Instagram Messaging (generic/button/product templates, quick replies) | Same inbox for Instagram DMs | `replyToMetaItem()` (`META_INSTAGRAM`) + shared inbox | PARTIAL | Instagram DM ingest/replies reuse the Messenger pattern; product templates/quick replies from the catalogue are not wired up yet |
| 7.6 | Provider-neutral messaging abstraction | One inbox API for WhatsApp/Messenger/Instagram/email/Telegram | `services/conversations.ts`, `services/outbound.ts`, `services/capabilities.ts` | SHIPPED | Capability-gated dispatcher with account-scoped grants and idempotent inbox primitives already covers the shipped channels; extend it if Business Agent is ever added |
| 7.7 | Admin provider scaffolding (`META_FACEBOOK`, `META_INSTAGRAM`) | Let staff configure non-WhatsApp Meta channels | `SettingsAdmin.tsx`, `SocialAdmin.tsx` + `metaSocial.ts`/`telegram.ts`/`tiktok.ts` | SHIPPED | Provider options and backend adapters now exist; still gated on real credentials/capability flags, so a configured option is not a verified live connection |

## 8. Marketing & commerce

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 8.1 | Marketing API | Ad creation/management and reporting for the marketing agent | `modules/marketing` (write path); `listMetaAdInsights()` (read-only) | DEFERRED | High-risk (spends money, rate-limited); require spend caps, human approval and audit before any write access. Read-only account insights via the `META_AD_ACCOUNT_ID` setting ship separately and do not enable campaign mutation |
| 8.2 | Catalog feed from CMS | Power collection/catalog ads, WhatsApp commerce and Instagram Shopping | `catalog-feed.ts` mounted at `/v1/catalog` → `GET /v1/catalog/feed.xml` (+ `/feed`) | SHIPPED | **Code path only**: rendered from published Services/PricingPackages as RSS 2.0 with `g:` product namespaces, XML escaping, absolute image links and a `PUBLIC_SITE_URL` fallback. Polling needs no credentials, but live Meta Catalog setup still needs `META_CATALOG_ID`, the feed URL and consent-gated CAPI; our catalogue stays the source of truth — never let Meta overwrite our data |
| 8.3 | Commerce Platform / Shops | Distribute products across Shops/Marketplace/Instagram | — | DEFERRED | Shops ads use offsite checkout, which fits us — but only if we actually sell catalogue products online |
| 8.4 | Conversions API (server events) | Send leads/registrations/purchases from our server or CRM to Meta | `metaConversions.ts`, wired into Lead Ads ingest + successful finance events | SHIPPED | **Code path only**: `META_CAPI_ENABLED`, dataset ID and token required; SHA-256 hashed PII, `event_id`/`ProviderEvent` dedupe, non-blocking fail-open. Per-event marketing consent required — service events only when `META_CAPI_ALLOW_SERVICE_EVENTS=true`; test code available via `META_CAPI_TEST_EVENT_CODE` |
| 8.5 | Conversions API Gateway | Lowest-effort Pixel+CAPI redundancy | Events Manager config | PLANNED | Only relevant if we want Pixel+CAPI redundancy without our own server events; the hand-rolled CAPI (§8.4) already ships with custom Lead/Purchase events |
| 8.6 | Signals Gateway | Own-infrastructure event receive/send | — | DEFERRED | Only if data-residency/control requirements justify operating it |
| 8.7 | Audience Network | Ad monetisation | — | N/A | No free app/large audience product; no relevant inventory |

## 9. Work, data portability, privacy & gaming

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 9.1 | Admin Center / managed Meta accounts | Centrally controlled staff Meta accounts with SSO | internal IT | DEFERRED | Useful if staff use personal Page accounts today; needs IT decision, not code |
| 9.2 | Data Portability / Export Your Information | Let clients import their Meta-held data into AngiSoft | future importer | DEFERRED | Requires Developer Portal onboarding as an EYI destination; low priority |
| 9.3 | Instant Games | — | — | N/A | No gaming product |
| 9.4 | Cookie consent + privacy review | Lawful use of Pixel/CAPI and any Meta tracking | public site consent flow + privacy policy | PLANNED | Legal review required; Meta explicitly does not provide legal advice; enable tracking only after consent |
| 9.5 | Meta Platform Terms compliance | All integrations | `docs/SECURITY.md` + rollout checklist | PLANNED | Re-check at each new product; Admin Center integrations in particular must comply |

---

## 10. Delivery phases

### Phase A — fix the WhatsApp foundation first (now)
1. Finish reconciling Graph version drift: `WHATSAPP_API_VERSION` (WhatsApp callers) and
   `META_GRAPH_VERSION` (newer Meta code) both default to `v23.0` but are still two keys.
2. Assert in tests that unsigned webhooks are never accepted in production.
3. Add message-ID dedupe and delivery-status reporting to the inbox.
4. Rotate the stored WhatsApp tokens/verify token if they were ever printed in a
   diagnostic command; keep them only in `backend/.env` → Fly secrets.
5. Decide whether admin-side template management (§7.2) is needed.

### Phase B — provider-neutral messaging, then the next channel
6. Channel abstraction (§7.6) is shipped; extend it rather than rebuilding when another
   channel is added.
7. Configure a **separate production Meta app**, Business Login and system user (§2.4,
   §2.7); complete App Review only for the permissions actually needed (§2.9).
8. Add webhook object/field subscriptions with shared verification middleware (§3.4).
9. Add Instagram Unified Login + Messenger/Instagram Messaging into the shared inbox.

### Phase C — publishing and structured flows
10. OG/Twitter meta is shipped (§6.1); verify the CMS → Pages/Instagram publishing paths
    (§6.3, §6.5) against live assets with the `ApprovalRequest` gate in place.
11. WhatsApp Flows for booking/enquiry capture, handing off to our server-held-amount
    checkout (§7.3).
12. Public CMS catalog feed is shipped (§8.2); register the feed URL and catalog id for
    live Meta setup. CAPI server events are also shipped (§8.4), so opt-in Conversions
    API Gateway (§8.5) is optional.

### Phase D — AI-assisted, always gated
13. Read-only clients for all three MCP servers are shipped (§4.2–4.4); credential them
    with separate dev/prod apps and audited Business Integrations before live use, and
    never enable their spend/publish/send tools.
14. Meta Business Agent is deferred (§4.5); if it is ever built, use knowledge + read-only
    handoff for booking/payment *confirmation* only, never settling money or bypassing
    `ApprovalRequest`.
15. Prompt-injection defenses extended to all Meta-sourced content (§4.7).

### Phase E — deferred / only on demand
16. Meta Business Agent, Live Video, Stories, Creator Discovery, Wit.ai, Marketing API,
    Commerce Platform, Signals Gateway, Data Portability, Admin Center, Social Plugins,
    Model API. Threads read/insights/publish/carousel/reply, Instagram mentions reads,
    comment hiding and the read-only MCP clients already ship but remain credential- and
    grant-gated (§6.5, §6.6, §4.2–4.4).

---

## 11. Non-negotiables

1. **Credentials only in `backend/.env`**, pushed to Fly as secrets. No Meta token, app
   secret or verify token in source, tests, logs, curl output, prompts or docs.
2. **Separate dev and production apps/tokens/MCP connections.** No production webhook
   points at test assets; no live app uses development-mode test permissions.
3. **Pin the Graph version in every URL.** One env-driven version; never the implicit
   default; track Meta's deprecations (e.g. `metadata`).
4. **Verify every webhook** with HMAC-SHA256 and dedupe by message/event ID. Production
   must fail closed on a missing signature or secret.
5. **Least privilege.** Request the minimum permissions; read before write; system users
   for unattended jobs; audit Business Integrations regularly.
6. **Do not add the Meta docs page URL as an MCP endpoint.** Use the three documented MCP
   server URLs, with least-privilege OAuth and dev/prod separation.
7. **Agents propose, humans/gated routes execute.** The MCP client is read-only and
   locally refuses spend/publish/send tools; any future Ads MCP/Marketing API write access
   stays off until approval, spend caps and audit exist; Business Agent never settles
   money; all publishing/messaging actions keep an `AuditLog` trail.
8. **Treat webhook, document and web content as prompt-injection vectors** before
   feeding it to any LLM.
9. **Consent before tracking.** CAPI is hard-gated on `META_CAPI_ENABLED`, a dataset ID
   and token, plus per-event marketing consent; service events require
   `META_CAPI_ALLOW_SERVICE_EVENTS=true`. Pixel/Advanced Matching still need an explicit
   privacy notice and legal review of the wording.
10. **Keep money server-held.** Flows/Payment-method selection routes to our `/v1`
    checkout; Meta never receives a client-chosen amount.
11. **Bound and audit the new social operations.** Threads insights request only fixed
    metrics and a clamped window; carousels accept only 2–10 validated public HTTPS URLs,
    bounded text and timed-out calls; comment hiding is App Review + Page-token gated and
    writes an actor audit entry. No upstream response body is echoed to the UI, logs or
    error messages.

## 12. Open decisions & blockers

| Item | Needed from | Why it blocks |
|---|---|---|
| Separate production Meta app + Business Manager assets | Owner | Cannot connect live Pages/Instagram/WABA safely |
| Business Login for Business + system user tokens | Owner | Blocks unattended publishing/messaging and Marketing API |
| App Review for advanced permissions | Owner + legal privacy policy | Unreviewed permissions only deliver test data in production |
| Confirmation of which social channels clients actually use | Sales/CS | Prioritises Pages vs Instagram vs Threads work |
| Consent/privacy policy approval | Legal | CAPI code ships but stays disabled/no-consent until the notice is approved; also blocks Pixel and Advanced Matching |
| `META_CAPI_ENABLED`, dataset ID, access token (+ optional test event code) | Owner | Readiness of live CAPI delivery; no dataset is verified in this checkout |
| Spend caps + approval policy for Meta Ads | Finance lead | Blocks any Marketing API/Ads MCP write access (the MCP client itself is read-only) |
| Meta Business Agent phone-number eligibility | Owner | Determines whether the deferred agent could ever run on our number |
| `META_MCP_ACCESS_TOKEN` / system-user token + MCP capability flags | Owner | Read-only MCP clients are shipped but fail closed until credentials and flags are set |
| `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID` (+ App Review for carousel writes) | Owner | Threads read/insights/publish/carousel/reply adapters are shipped but unusable without a Threads grant |
| `META_SYSTEM_USER_TOKEN`, `META_INSTAGRAM_ACCOUNT_ID`, `META_PAGE_ACCESS_TOKEN` + App Review | Owner | Instagram mentions reads and comment hiding are shipped but fail closed until credentials and the review grant are configured |
| Public catalog feed URL (register `PUBLIC_SITE_URL` if needed) + `META_CATALOG_ID` | CMS/Owner | Feed is shipped at `/v1/catalog/feed.xml` and needs no polling credentials, but live Meta Catalog setup still needs the registered URL/catalog id and consent-gated CAPI |

---

## 13. Phase 7 closeout verification (code audit, no live assets)

Reconciliation of the Meta/communications closeout against this checkout. **All statements
below describe code paths, not verified live integrations.**

- **Networks covered.** Facebook Page reads/publish, Messenger reads/replies, comments
  read/reply/moderation, app subscription and Ads-insights reads, Lead Ads ingest;
  Instagram account/insights/mentions reads, image/video publish and replies; Threads
  profile/threads/insights reads, single/carousel publish and replies; WhatsApp Cloud
  send/templates/webhooks plus the WhatsApp Business Tools MCP; CAPI and the CMS catalog
  feed. Assistive social drafts never auto-send.
- **MCP allowlist.** `metaCapabilities.ts` and `metaMcp.ts` share one canonical map of
  exactly three endpoints — `https://mcp.facebook.com/ads`,
  `https://mcp.facebook.com/devtools` and
  `https://mcp.facebook.com/whatsapp_business_tools`. A docs URL, lookalike host, query
  string, extra path or any other value is rejected before a request is made **and** is
  reported as unconfigured in `GET .../capabilities/meta`. `tools/call` accepts only
  read-style tool names and locally refuses spend/publish/send verbs; credentials are
  never registered as tool arguments, logged or returned. Both `tools/list` and
  `tools/call` write actor-audited entries. No local MCP path can spend, publish or send.
- **CAPI.** `sendMetaConversion()` requires `META_CAPI_ENABLED=true`, a dataset id and an
  access token, plus per-event marketing consent; service-generated events additionally
  require `META_CAPI_ALLOW_SERVICE_EVENTS=true`. Email/phone are SHA-256 hashed (phone
  digits only), the payload carries only booleans/value/currency, `event_id` plus
  `ProviderEvent` dedupe key make retries idempotent, and HTTP/network failures are
  recorded as `FAILED` but never break the business transaction. The admin UI does not
  advertise live measurement; readiness remains a deployment/consent decision.
- **App Review.** `META_APP_REVIEW_GRANTED` gates Page/Instagram publishing, comment
  moderation, Ads insights, Lead Ads ingest and Threads carousel publishing. Missing
  grants are reported `available: false` with an `appReview` reason, and the service
  guards throw `ProviderCapabilityError` before any network call.
- **Verification run.** `backend`: `TEST_DATABASE_URL=<dummy> vitest run
  test/metaResourcePack.spec.ts test/phase7Foundation.spec.ts` — 50 tests passed;
  `tsc --noEmit` result is reported separately in the closeout message.

**Gaps that remain (not blockers, and not claims of live readiness):** no live Meta
credential, dataset, App Review grant or consent notice exists in this checkout, so none
of these paths can be exercised upstream here; both existing CAPI call sites are service
events (Lead Ads ingest and finance processing), so no `marketingConsent: true` user-action
call site ships yet; Graph version keys are still split between `WHATSAPP_API_VERSION`
and `META_GRAPH_VERSION`; single Threads publish/reply are gated on the Threads token/user
but not on `META_APP_REVIEW_GRANTED` (deliberate per §6.6 — revisit if Review denies
unreviewed publishing); MCP tool descriptions from upstream are length-capped, but descriptions and
input schemas are still rendered in the admin UI and must be treated as untrusted content.
