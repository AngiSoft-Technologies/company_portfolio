# Meta developer documentation — consolidated understanding

> **🛠 OPERATIONAL** — Condensed understanding of the official Meta developer
> documentation across **all** resource families, not only WhatsApp.<br>
> Companion plan: [`META_RESOURCE_UTILIZATION_PLAN.md`](./META_RESOURCE_UTILIZATION_PLAN.md).

> **Source of truth:** the canonical pages at <https://developers.facebook.com/docs>
> (the `/documentation/*` product index and each linked guide/reference) fetched in
> this session, plus Context7 library `/websites/developers_facebook` (High reputation,
> 21,235 snippets). Canonical URLs are kept below so any statement can be traced back.
> `/websites/developers_meta` and `/llmstxt/developers_meta_llms_txt` were checked and
> are Horizon/Llama/AI-focused — useful for AI work, but **not** the primary docs source
> for the platform resources summarised here.
>
> **Companion document:** [`META_RESOURCE_UTILIZATION_PLAN.md`](./META_RESOURCE_UTILIZATION_PLAN.md)
> maps every resource here to a concrete AngiSoft use, status and owner.
>
> **Scope note:** WhatsApp is one channel in this platform. This summary covers the full
> developer surface — core APIs, auth, MCP/AI, social, messaging, marketing/commerce,
> work, data portability, gaming and policy — because AngiSoft will adopt more than one
> Meta resource over time.

---

## 1. The shape of Meta's developer platform

The docs index groups resources into these families:

| Family | What it gives us | Entry point |
|---|---|---|
| Meta App Development | Create/configure apps, use cases, app review, dashboard | `/documentation/development` |
| Graph API | The long-standing nodes/edges/fields API over Meta's social graph | `/documentation/graph-api` |
| REST API | New OpenAPI-style APIs with per-API auth | `/documentation/rest-api` |
| Meta Model API & MCP | Model access and MCP servers for agents | `/documentation/meta-model-api`, `/documentation/mcp` |
| App Integrations | Add Meta capabilities to an app (Login, sharing, messaging, etc.) | `/documentation/app-integrations` |
| Authentication | Facebook Login, Login for Business, tokens, permissions | `/documentation/authentication` |
| Developer Guides | Webhooks, rate limits, errors, app review, testing | `/documentation/development` |
| SDKs | JavaScript, iOS, Android, Unity and partner SDKs | `/documentation/sdk` |
| Gaming | Instant Games on Facebook and Messenger | `/documentation/games` |
| Social Integrations | Sharing, Social Plugins, Pages, Instagram, Threads | `/documentation/sharing`, `/documentation/plugins`, `/documentation/pages-api`, `/documentation/instagram-platform`, `/documentation/threads` |
| Videos | Live Video API, Stories API, embedded players | `/documentation/live-video-api`, `/documentation/video-api` |
| Business Messaging | Messenger, WhatsApp Business Platform, Instagram Messaging, Flows, Business Agent | `/documentation/business-messaging` |
| Meta Business Agent | Configure an AI agent to handle business conversations | `/documentation/meta-business-agent` |
| Marketing & Commerce | Marketing API, Catalog, Commerce Platform, Conversions API, Gateways, Audience Network | `/documentation/ads-commerce` |
| Work & Education | Admin Center / managed Meta accounts | `/documentation/admin-center` |
| Artificial Intelligence | Wit.ai, Meta Model API, Llama tooling | `/documentation/wit-ai`, `/documentation/meta-model-api` |
| Data Portability | Export Your Information destination onboarding | `/documentation/data-portability` |

Two platform-wide shifts matter for how we build:

1. **Graph API remains the backbone** for existing products (Pages, Instagram, WhatsApp,
   Marketing), but **new APIs are REST/OpenAPI-based**. Meta states new APIs from
   **1 July 2025** use the REST API, and **all new third-party APIs from January 2026**
   do so. Existing Graph API integrations continue to work.
2. **Auth is per-API.** Login, tokens and permissions are not uniform across products;
   each API documents its own requirements. Never assume a Facebook user token works for
   a WhatsApp or Marketing call without checking that API's auth section.

---

## 2. Core APIs — app development, Graph API, REST API

### 2.1 Meta App Development — `/documentation/development`

An app is created in the Developer Portal with a **use case** (e.g. Business Messaging,
Instagram, Threads, Facebook Login). The use case pre-configures permissions, products
and dashboard surfaces. Moving from development to production requires **App Review**
for any permission beyond the basic defaults, plus a privacy policy and a valid
business verification for many products. Development mode restricts delivery to app
admins/developers/testers and sends only test notifications.

### 2.2 Graph API — `/documentation/graph-api`

- Host: `https://graph.facebook.com`, **HTTPS only**.
- Data model: **nodes** (users, pages, photos, conversations…) connected by **edges**,
  with selectable **fields** — e.g. `/me?fields=id,name`.
- An **access token** is required on almost every call; which token type and which
  permissions depend on the node/edge.
- **Versioning is quarterly.** Always put the version in the path (`/v23.0/…`) rather
  than relying on the default; pin it per integration so a rollout cannot silently
  change our payload shape.
- `metadata` is deprecated in **v25.0** and fully deprecated **19 May 2026** — do not
  build new code that depends on it.
- Browser-based calls need CORS-aware configuration; server-to-server calls from our
  backend are the preferred pattern for anything that moves data or money.

### 2.3 REST API — `/documentation/rest-api`

- OpenAPI-based, with machine-readable schemas — generate types/clients from the spec
  instead of hand-writing payloads where possible.
- Covered by the same Meta app/permissions framework, but **authentication may differ
  per API** (some use app-scoped tokens, some system users, some partner onboarding).
- This is where new capabilities will land; a new integration should check "REST vs
  Graph" first, not assume Graph.

---

## 3. Authentication, permissions and App Review

### 3.1 Facebook Login & Login for Business — `/documentation/facebook-login`, `/documentation/facebook-login-for-business`

- Standard **Facebook Login** lets a person authorise our app and grants a **user access
  token** with the permissions we request. Use it for consumer-facing connections (e.g.
  "connect your Page" for a small business).
- **Facebook Login for Business** is the business-oriented flow: a business admin grants
  access to business assets (Pages, ad accounts, catalogs, WhatsApp Business Accounts),
  producing tokens suitable for managing those assets.
- **Instagram API with Unified Login** is now the recommended setup for new Instagram
  integrations: a client connects their professional account by logging in with either
  Instagram or Facebook, with **no Facebook Page required**, and the same flow enables
  messaging, publishing, comment moderation and ads management.
- Token exchange and long-lived tokens are obtained server-side. Never ship an app
  secret or a long-lived token to the browser.

### 3.2 Permissions & App Review — `/documentation/permissions`, `/documentation/app-review`

- Permissions are granular and product-specific: `pages_show_list`,
  `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`,
  `business_management`, `facebook_creator_marketplace_discovery`, etc.
- Advanced permissions require **App Review** with a working demo, a privacy policy and
  often business verification. Development mode only returns test data for unreviewed
  permissions.
- Least privilege is the rule: request the minimum set, and separate read and write
  permissions so a read-only integration cannot publish or delete.

### 3.3 Tokens & accounts — `/documentation/access-tokens`

- **User token** — acts for a person; expires unless refreshed.
- **Page token** — obtained from a user token with Page permissions; acts as the Page.
- **System user token** — owned by a Business Manager, non-human, ideal for backend jobs
  and the one to use for unattended publishing/messaging.
- **App access token** — app-level operations such as webhook subscription management.
- Store only in `backend/.env` / Fly secrets, scoped per environment; rotate on staff
  exit; never log or commit them.

---

## 4. Webhooks & real-time updates — `/documentation/webhooks`

- Callback must be **HTTPS with a valid TLS certificate** — self-signed certs are
  rejected.
- Subscribe to **objects and fields** (e.g. Page feed, Instagram comments, WhatsApp
  messages, Messenger conversations). Subscriptions are per app and often per token.
- The webhook payload is **gated by the permissions the token holds**; a subscription
  alone does not grant data access.
- **Development mode delivers only test notifications** for most objects — use real
  test users/assets before go-live.
- Verify the signature (`X-Hub-Signature-256` HMAC-SHA256 with the app secret) and dedupe
  by event/message ID before acting. Use `/app/subscriptions` to inspect which version
  of each field is active.
- **Messenger webhooks behave differently** (scoped IDs, messaging windows, entry
  points) and have their own setup guide — see §9.

---

## 5. AI, MCP and the agent layer

### 5.1 Meta Model API — `/documentation/meta-model-api`

The docs describe access to **Muse Spark** through the Meta Model API for agentic,
coding and multimodal workflows. Relevant to us as an optional backend for AI features,
but it is **not** required for the Meta business integrations above; our existing agent
workforce can stay on its current provider.

### 5.2 MCP servers — `/documentation/mcp`

Meta documents three remote MCP servers:

| Server | URL | Purpose |
|---|---|---|
| Meta Ads | `https://mcp.facebook.com/ads` | Ads management and reporting |
| Meta Social Technologies | `https://mcp.facebook.com/devtools` | Developer/social tooling |
| WhatsApp Business Tools | `https://mcp.facebook.com/whatsapp_business_tools` | WhatsApp Business operations |

Important guardrails from the docs:

- **Do not add the documentation page URL to an MCP client** — use the MCP server URLs.
- OAuth permissions are under our control: grant **least privilege**, use **separate
  dev and production apps**, and audit **Business Integrations** regularly.
- Treat content arriving from untrusted sources (webhooks, documents, web pages) as
  **prompt-injection risk** before letting an agent act on it.

### 5.3 Meta Business Agent — `/documentation/meta-business-agent/overview`

A configurable AI agent that handles customer conversations **24/7 in our brand voice on
WhatsApp**. What it can do:

- **Add knowledge** — business info, FAQs, websites and files.
- **Define responses** — instructions controlling tone, priorities and brand voice.
- **Connect systems** — our own APIs and webhook subscriptions so it can take actions
  such as booking an appointment or **confirming a payment**.
- **Hand off to our app** for specific events or flows.
- **Test** with sample messages before and after go-live.

Phone numbers have eligibility rules, so availability must be checked in setup. This is
the most directly useful "AI + messaging" resource for AngiSoft because it can be wired
to our bookings and payments rather than replacing our 12-agent workforce.

### 5.4 Wit.ai — `/documentation/wit-ai`

Natural-language understanding / conversational tooling. Meta's Graph API exposes
Page **built-in NLP** configuration (`/{page_id}/nlp_configs`) with language models and
an optional **Wit token** for custom entities, intents and traits. Useful if we need
intent extraction on inbound messages beyond keyword rules, but optional — most
messaging flows can start with structured buttons/Flows.

---

## 6. SDKs & developer tooling — `/documentation/sdk`

Meta publishes SDKs for web (JavaScript), iOS, Android, Unity and gaming, plus
partner-maintained SDKs. Responsibilities are always split: **Meta handles delivery,
eligibility and the platform UI; our app supplies content and handles our own business
rules.** For AngiSoft the web SDK matters for Login/sharing/pixel; native SDKs are only
relevant if a mobile app is built. Keep SDK versions pinned and update CSP allowlists
for any Meta-hosted script/iframe.

---

## 7. Social & identity integrations

### 7.1 Sharing — `/documentation/sharing`

Share dialogs for iOS, Android and Web give a consistent, expressive share experience
(quotes on link shares, photos + videos, hashtags) without requiring login. The
**Webmasters** section covers the Facebook crawler, **Open Graph markup**, migration and
optimising page content for sharing. Best practices are documented separately.

### 7.2 Social Plugins — `/documentation/plugins`

Share Button, Page Plugin, Embedded Posts, and Embedded Video / Live Video Player.
Plugins **gracefully degrade to invisible elements** if blocked, so they are safe to
include; Meta states there are no replacement plugins. Follow the plugin best practices
for layout and consent.

### 7.3 Pages API — `/documentation/pages-api`

Manage Facebook Pages: publish/schedule posts, read engagement, moderate comments and
subscribe to real-time updates. Requires a **Page access token** with the right
permissions (`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
`pages_manage_engagement`). This is the natural backend for social publishing from our
CMS once a client connects their Page.

### 7.4 Instagram Platform — `/documentation/instagram-platform`

Three setups: **Unified Login** (recommended for new integrations, no Page required),
**Instagram Login**, and **Instagram API with Facebook Login**. Capabilities include
messaging, media publishing, comment moderation, mentions and insights. It also hosts
the **Creator Discovery API** and partnership-ad discovery (see §7.7).

### 7.5 Threads API — `/documentation/threads`

Create and publish single posts and carousels, retrieve media and profiles, moderate
replies and read insights. Guides cover posts, media retrieval and profiles. A separate
"Threads use case" exists when creating the app. Useful for extending social publishing
beyond Facebook/Instagram without a new auth model.

### 7.6 Video & Stories — `/documentation/live-video-api`, `/documentation/video-api/page-stories-api`

- **Live Video API** — stream to a profile/Page/Group/Event, backup streams, crosspost,
  interact with viewers and create polls. Go-live requirements since 10 June 2024:
  account at least 60 days old and Page/professional-mode profile with at least 100
  followers. `overlay_url` is removed for v24.0+.
- **Stories API** — upload media to Meta servers, then publish it to a Page as a Story.
  Requires Login/Login for Business, a Page token with `CREATE_CONTENT` task and
  `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`
  (`business_management` for a system user).

### 7.7 Creator Discovery — `/documentation/fb-creator-discovery`

The **Creator Discovery API** is the preferred way to find and evaluate creators: one
endpoint returns both Facebook and Instagram creators, with `platform=facebook` or
`platform=any`; it requires the brand's Instagram business account. The legacy Facebook
Creator Discovery API requires `facebook_creator_marketplace_discovery` and
`pages_show_list` via Facebook Login. Relevant to our marketing/influencer work, not to
core delivery.

---

## 8. Business Messaging

### 8.1 Messenger Platform — `/documentation/business-messaging/messenger-platform/overview`

- A business' **Facebook Page or Instagram Professional account** responds to people
  who message it through Facebook, Instagram or a Meta plugin. **Free to use.**
- A person must **initiate** the conversation. A webhook notification fires; our app
  reads the conversation through the Graph API and replies within the **standard
  messaging window** — 24 hours for most actions, up to **7 days** after a
  Click-to-Messenger / Click-to-Direct ad.
- Each person gets a **scoped ID unique to that Page/account**, so IDs cannot be joined
  across Pages without a first-party identity mapping.
- Automatic replies, live agents or a mix are supported, with many entry points and
  message types.

### 8.2 WhatsApp Business Platform — `/documentation/business-messaging/whatsapp/overview`

The resource we already use. Structure:

- **Access tokens & permissions** — obtain through Business Manager; token type decides
  what can be sent.
- **Pricing** — separate guides for template messages, non-template messages,
  authentication international rates, AI providers and billing changes. Business-initiated
  messages use approved templates; user-initiated sessions allow free-form replies inside
  a window.
- **Send/receive** — `POST /<version>/<phone-number-id>/messages` on Graph; inbound
  messages and status updates arrive by webhook.
- **Templates** — `POST /<version>/<WABA_ID>/message_templates` with components
  (header/body/buttons, URL buttons can deep-link). Templates require approval.

### 8.3 WhatsApp Flows — `/documentation/business-messaging/whatsapp/flows`

Structured, interactive conversations defined by a Flow: lead capture, product
recommendation, pre-approved loans, selection of repayment terms and **payment method**,
etc. Flows are packaged with templates, guides and code. This is the right mechanism for
"choose a service → pick a date → pay" inside WhatsApp rather than a long free-text
exchange.

### 8.4 Instagram Messaging — `/documentation/business-messaging/instagram-messaging`

Overview, get started, sample experience and message features: send message, generic
template, button template, product template, quick replies. Shares infrastructure with
Messenger Platform (same scoped IDs/windows model).

### 8.5 Meta Business Agent (messaging view)

Covered in §5.3; it is both an AI resource and a WhatsApp channel feature. Handoff to
our app is what keeps it from being an opaque black box.

---

## 9. Marketing, commerce & ads

### 9.1 Marketing API — `/documentation/ads-commerce/marketing-api`

Covers ad creation/management, versioning, rate limiting, data-processing options,
authorization and authentication. Powerful but high-risk: it can spend money. Any use
must be behind explicit approval, strict spend caps and an audit trail.

### 9.2 Catalog — `/documentation/ads-commerce/catalog`

A container for products and inventory, used by Collection Ads, Marketplace, Advantage+
Catalog Ads, Instagram Shopping and **WhatsApp conversational commerce**. Our CMS
service catalogue is the natural source for a feed.

### 9.3 Commerce Platform — `/documentation/ads-commerce/commerce-platform`

Integrates a retailer's infrastructure with Shops, Marketplace and Instagram Shopping:
seller onboarding, catalog management and order flows. **Shops ads now use offsite
checkout** — buyers discover on Facebook/Instagram and complete checkout on *our*
website, which fits AngiSoft's server-held-amount payment model.

### 9.4 Conversions API — `/documentation/ads-commerce/conversions-api`

Send marketing events from our server/CRM to Meta (website events, app events, business
messaging events and offline conversions) instead of maintaining separate connection
points. Events attach to a **dataset ID** and are processed like Pixel events. If a Pixel
is installed, Meta can configure Conversions API with one click in Events Manager.

### 9.5 Gateways — `/documentation/ads-commerce/gateway-products`

- **Conversions API Gateway** — self-serve in Events Manager; no coding; redundant setup
  with the Pixel; lower technical lift and maintenance, with only cloud/partner fees.
- **Signals Gateway** — receive and send events on **our own infrastructure** using
  documented components; no third party/coding required for setup, auto-updates with
  client consent.

### 9.6 Audience Network — `/documentation/audience-network`

App Bidding: an open real-time auction over ad inventory across multiple demand sources.
Covers bidding integration, platform setup (Android/iOS/Unity), ad formats and testing.
Monetisation only — not relevant unless we ship a large free app/audience.

---

## 10. Work, data portability, gaming & privacy

### 10.1 Admin Center — `/documentation/admin-center`

Create and manage **managed Meta accounts** for people in an organisation, with
enterprise-grade controls including SSO integrations and an account-management API.
Integrations must comply with Meta Platform Terms. Relevant if staff need centrally
controlled Meta accounts rather than personal ones.

### 10.2 Data Portability — `/documentation/data-portability`

Meta supports open standards and is a Data Transfer Initiative partner using the
Data Transfer Project. After onboarding in the Developer Portal, a platform can be
listed as a destination in **Export Your Information (EYI)**. Relevant only if we want
clients to export their Meta-held data into AngiSoft.

### 10.3 Gaming — `/documentation/games`

Instant Games: lightweight HTML5 games playable inside Facebook and Messenger with
social discovery and monetisation. No current AngiSoft use case.

### 10.4 Privacy & policy — `/documentation/privacy`, Platform Terms

Meta's cookie-consent resource gives general context; laws vary by region and evolve.
Meta explicitly does **not** provide legal guidance — we must do our own assessment and
get legal review. The Meta Pixel can collect HTTP headers, pixel/click data and optional
custom data or form field names; **values only with Advanced Matching**, so consent and
privacy notices must be explicit before enabling it.

---

## 11. Cross-cutting rules to carry into implementation

1. **Check which API family a capability belongs to** — new REST/OpenAPI vs legacy
   Graph. Pin the Graph version in every URL; never rely on the default.
2. **Auth is per product.** Choose user, Page, system-user or app token deliberately;
   system users for unattended backend jobs, never a personal token.
3. **Least privilege + App Review.** Request only the permissions we need; unreviewed
   advanced permissions mean development-mode/test data only.
4. **Verify webhooks** with HMAC-SHA256 and dedupe by ID; production must reject
   unsigned callbacks. Messenger webhooks are their own model.
5. **Secrets stay server-side** in `backend/.env` / Fly secrets. No tokens in the repo,
   browser, logs, prompts or docs.
6. **Separate dev and production apps/tokens/MCP connections.** Never point production
   at test assets or test notifications.
7. **Agent safety:** MCP/Business Agent permissions are ours to grant — least privilege,
   audit Business Integrations, and treat webhook/document/web content as potential
   prompt injection before letting an agent act.
8. **Money and publishing stay behind our gates.** Agents may propose bookings/payments
   or draft content; `ApprovalRequest`/admin routes execute it, with `AuditLog` entries.
9. **Consent before tracking.** Pixel/CAPI data collection needs an explicit privacy
   notice and consent flow; Advanced Matching values only with consent.
10. **WhatsApp is one channel, not the strategy.** Build a provider-neutral messaging
    abstraction so Messenger/Instagram/Business Agent can be added without rewriting
    the inbox.
