# PayPal documentation — consolidated understanding

> **🛠 OPERATIONAL** — Condensed understanding of the supplied PayPal documentation.<br>
> Companion plan: [`PAYPAL_RESOURCE_UTILIZATION_PLAN.md`](./PAYPAL_RESOURCE_UTILIZATION_PLAN.md).

> **Source of truth:** the PayPal documentation supplied in this session and the saved
> corpus at `/tmp/opencode/paypal-docs/` (`payments-llms.txt`, `llms-root.txt`,
> `llms-developer-resources.txt`, `urls.txt` and 40+ full `.md` pages). This summary was
> written from those files, not from memory or web search. Canonical URLs are kept so any
> statement can be traced back to the source page.
>
> **Companion document:** [`PAYPAL_RESOURCE_UTILIZATION_PLAN.md`](./PAYPAL_RESOURCE_UTILIZATION_PLAN.md)
> maps every resource here to a concrete AngiSoft use, status and owner.

---

## 1. The shape of PayPal's platform

PayPal's developer resources fall into three layers:

| Layer | What it gives us | Entry points |
|---|---|---|
| **AI / agent layer** | Natural-language control of PayPal through agent tools, MCP and LLM connectors | `/ai-tools/get-started`, `/ai-tools/toolkit`, `/ai-tools/agent-tools`, `/ai-tools/mcp-server`, `/ai-tools/build-with-llm`, `/ai-tools/prompts` |
| **Commerce & money layer** | Orders, capture, refunds, payouts, invoices, subscriptions, disputes, tracking, reporting | `/api/orders/v2`, `/payment-methods`, `/api/webhooks/overview`, REST API guides |
| **Operations & reference layer** | Sandbox testing, error simulation, code/locale/currency references, SFTP report delivery | `/sandbox-testing/*`, `/negative-testing/*`, `/reference/*`, `/secure-file-transfer`, `/vs-code-extension` |

The AI layer is a *client* of the commerce layer: every agent tool ultimately calls a
PayPal REST API. That is why the safety rules (server-held amounts, idempotency,
verified webhooks, human approval) must live in the REST layer and be inherited by the
agents — not reimplemented in a prompt.

---

## 2. AI resources

### 2.1 PayPal's AI resources for developers — `/ai-tools/get-started`

Three ways to build:

1. **Agent toolkit** — custom agents for a website/app (our path).
2. **LLM integration** — let ChatGPT/Claude talk to PayPal via MCP.
3. **Agentic commerce services** — make products discoverable in AI shopping surfaces.

Documented example use cases map closely to AngiSoft: e-commerce order processing and
returns, marketplaces, SaaS billing/subscription/reconciliation, and service businesses
that generate and send invoices. Stated features: direct access to payment/financial
APIs, automation of repetitive finance tasks, developer-friendly tooling across
quickstarts and MCP, PCI-oriented secure environment, and scaling from a single bot to
multi-agent systems.

### 2.2 Agent toolkit quickstart — `/ai-tools/toolkit`

`@paypal/agent-toolkit` (TypeScript) / `paypal-agent-toolkit` (Python). Works with
**Amazon Bedrock, CrewAI, LangChain, MCP, OpenAI Agents SDK and Vercel AI SDK**; compatible
with any LLM that supports function calling; Node 18+ / Python 3.11+.

The recurring setup pattern:

```ts
const toolkit = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  configuration: {
    actions: { orders: { create: true, get: true, capture: true }, /* … */ },
    context: { sandbox: true }, // flip to false/production for live
  },
});
```

- `actions` is an **allowlist** — only the enabled verbs become tools. This is the key
  control for least privilege (e.g. finance agent gets `orders` + `invoices`, never
  `accept_dispute_claim`).
- `context.sandbox` is environment-scoped, mirroring the REST `PAYPAL_ENV` split.
- Tool calls are handled explicitly (`handleToolCall` / `getTools()`), so an application
  can intercept and gate any call — essential for money movement.
- The guide also shows a Next.js chat front end with a `/api/chat` route (PayPal's
  example, not an AngiSoft route) and a controlling system prompt.
- Documented commerce-agent roles: customer support, product recommendation, order
  processing, shipping, returns/exchanges, subscription management.

Best practices from the guide: sandbox first, credentials in environment variables (never
source), explicit error handling, and well-defined system prompts.

### 2.3 Agent tools reference — `/ai-tools/agent-tools`

Full catalog — 33 tools across 8 domains (the exact tool names an agent can invoke):

| Domain | Tools |
|---|---|
| Catalog | `create_product`, `list_product`, `show_product_details` |
| Disputes | `list_disputes`, `get_dispute`, `accept_dispute_claim` |
| Invoices | `create_invoice`, `list_invoices`, `get_invoice`, `send_invoice`, `send_invoice_reminder`, `cancel_sent_invoice`, `generate_invoice_qr_code` |
| Payments | `create_order`, `get_order`, `pay_order`, `create_refund`, `get_refund` |
| Reporting | `get_merchant_insights` (ORDERS/SALES × DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY), `list_transaction` (default 31-day window) |
| Shipment | `create_shipment_tracking`, `get_shipment_tracking`, `update_shipment_tracking` (statuses `SHIPPED`/`DELIVERED`/`ON_HOLD`/`CANCELLED`/`LOCAL_PICKUP`) |
| Subscriptions | `create_subscription_plan`, `list_subscription_plans`, `show_subscription_plan_details`, `create_subscription`, `show_subscription_details`, `update_subscription`, `cancel_subscription` |
| Remote-only commerce | `search_product`, `create_cart`, `checkout_cart` — **gift cards only**, enabled with header `x-feature-flags: commerce:true` |

Notable parameters: `create_product` type is `PHYSICAL | DIGITAL | SERVICE`;
subscription plans allow at most two trial cycles and one regular cycle; `pay_order`
captures an authorised order; `create_refund` accepts an optional partial amount.

### 2.4 LLM integration quickstart — `/ai-tools/build-with-llm`

Generate an access token first, then attach the remote MCP server to the model request:

- **Anthropic Messages API** — `mcp_servers: [{ type: 'url', url: 'https://mcp.paypal.com/sse', name, authorization_token }]` with the beta header `anthropic-beta: mcp-client-2025-04-04`.
- **OpenAI Responses API** — `tools: [{ type: 'mcp', server_label: 'paypal-mcp', server_url: 'https://mcp.paypal.com/sse', require_approval: 'never', headers: { Authorization: 'Bearer …' } }]`.

`require_approval: 'never'` in the doc is a demo convenience; for money movement we must
keep approval in our own layer rather than trusting that flag.

### 2.5 MCP server quickstart — `/ai-tools/mcp-server`

Two hosting modes:

- **Local** — `npx -y @paypal/mcp --tools=all`, with `PAYPAL_ACCESS_TOKEN` and
  `PAYPAL_ENVIRONMENT=SANDBOX|PRODUCTION`. Token can also be passed via `--access-token`.
- **Remote** — hosts:

  | Environment | Host |
  |---|---|
  | Sandbox | `https://mcp.sandbox.paypal.com` |
  | Production | `https://mcp.paypal.com` |

  Transports documented: **SSE** at `/sse`, **Streamable HTTP** at `/http`. Production
  replaces the sandbox host in either path. Authorization is either PayPal login/consent
  in the browser or a bearer token built from Developer Dashboard client credentials.

Connection troubleshooting from the doc: clear `~/.mcp-auth` if sign-in gets stuck.

> **Observed in this environment:** with an MCP initialize request, production
> `https://mcp.paypal.com/mcp` and `/sse` both answer `401` (reachable, needs sign-in),
> while `/http` answers `404`. Our OpenCode config therefore uses `/mcp` against the
> **production** host, not the sandbox host.

### 2.6 Best practices for prompts — `/ai-tools/prompts`

| Principle | Rule |
|---|---|
| Action first | "Create an invoice…", then parameters in tool order |
| Be specific | Include every required field (`currency`, `invoice_id`, …) |
| Split complex tasks | e.g. create order → pay order → create shipment |
| Encourage thinking | "Think step-by-step before calling the tool…" |
| Protect PII | Never put card numbers, SSNs, passwords or secrets in prompts; the toolkit rejects them and PCI DSS applies |

Worked multistep recipes: invoice a client; online order with shipping; sell a
subscription; evaluate/resolve disputes; add and verify a product; invoice with QR code;
fix an invoice error; reconcile a transaction (`list_transaction` + `get_order`); cancel
a subscription.

---

## 3. REST API fundamentals

### 3.1 Get started & requests — `/api/get-started`, `/api/make-api-requests`

- Base URLs: sandbox `https://api-m.sandbox.paypal.com`, live `https://api-m.paypal.com`.
- OAuth 2.0 client-credentials flow: `POST /v1/oauth2/token` with Basic auth and
  `grant_type=client_credentials` → `access_token` plus `expires_in` seconds
  (the doc's sample response uses `31668`); refresh before expiry.
- **First-party** calls act for our own business. **Third-party** calls (platforms/
  marketplaces) add `PayPal-Auth-Assertion` (unsigned JWT with `iss` = platform client id,
  `payer_id` = merchant payer id) and `PayPal-Partner-Attribution-Id` (BN code from
  Developer Dashboard → App Settings → Reports).
- `PayPal-Mock-Response` injects sandbox errors, e.g.
  `{"mock_application_codes":"DUPLICATE_INVOICE_ID"}`.
- `PayPal-Request-Id` is recommended for all POST/PUT calls.

### 3.2 Idempotency — `/reference/guidelines/idempotency`

- Send a unique `PayPal-Request-Id` on POSTs; PayPal stores it **up to 45 days** and
  returns the original call's result on a retry.
- Use a **UUID** (fits the 38-character limit) and keep IDs unique *per call type* — an
  authorize and a capture must not share an ID.
- Two simultaneous requests with the same ID: the first is processed, the second may fail.
- Replaying returns the *current* status, not a snapshot of the original response.

### 3.3 Orders v2 — `/api/orders/v2`

Operations:

- `POST` create order · `GET` show order · `PATCH` update a `CREATED`/`APPROVED` order
- `POST` confirm order · `POST` authorize · `POST` capture
- `POST` add tracking · `PATCH` trackers (update/cancel)
- `POST` server callback · `GET` public callback verification certificate

The summary page explicitly says the JSON/YAML OpenAPI schema
(`/api/orders/v2/schema.json`) is the authoritative source for exact parameters — use it
rather than guessing field shapes.

### 3.4 Webhooks — `/api/webhooks/overview`

Configure a webhook in the Dashboard, receive the POST, then **verify** it by posting the
message, stored webhook ID and request headers back to PayPal's verify-signature endpoint.
Never trust an unverified webhook body.

### 3.5 Errors — `/api/errors/overview`

Standard HTTP statuses with JSON error bodies; 500, 422, 400 and 403 samples are
documented. Map these into provider-specific errors so our API returns a stable internal
code rather than leaking PayPal's raw payload.

---

## 4. Payment methods & wallets

### 4.1 Payment methods — `/payment-methods`

Five categories: **bank redirect, direct banking, voucher, digital wallet, deferred
payment**. Behaviors: push vs pull, instant vs delayed availability, and direct vs
redirect vs offline payer flow.

Representative methods and constraints:

| Method | Type / flow | Geography | Currency notes | Refunds |
|---|---|---|---|---|
| PayPal | digital wallet | global | — | Yes |
| Visa / Mastercard / Amex / Discover | card | PayPal Checkout countries | — | Yes |
| Apple Pay / Google Pay | push, direct | per country list | min 1 USD | up to 180 days |
| Venmo | digital wallet | US only | — | Yes |
| Pay Later / PayPal Credit | loan / credit line | AU, FR, DE, IT, ES, GB, US / US, GB | — | Yes |
|iDEAL, Bancontact, BLIK, eps, Przelewy24, Trustly, MyBank | bank redirect | NL, BE, PL, AT, PL, AT/DE/DK/ES…, IT | EUR/PLN/DKK/SEK/GBP/NOK | 90–365 days |
| Alipay, GrabPay, Satispay | wallet, redirect | CN, SG, EU | AUD/CAD/EUR/…, SGD, EUR | 90–365 days |
| Boleto, OXXO, Multibanco | voucher | BR, MX, PT | BRL/MXN/EUR | N/A |

Retired: **giropay** (30 Jun 2024) and **Sofort** (18 Apr 2024) — never surface them.

Compliance: checkout must state that PayPal processes the data, with a link to the PayPal
privacy notice, or include equivalent language in the privacy policy shown before payment.

### 4.2 Apple Pay — `/apple-pay/integrate`

Needs HTTPS, registered/verified merchant domain with Apple's domain-association file, a
sandbox iCloud test buyer, and SDK v6 `findEligibleMethods()` gating. Production deploys
the `www.paypal.com/web-sdk/v6/core` script, production credentials, production merchant
domain registration and current domain-association files; keep CSP updated.

### 4.3 Google Pay — `/google-pay/integrate`

Enable Google Pay in the sandbox account, use SDK v6, `environment: 'TEST'` →
`'PRODUCTION'`, `SCA_WHEN_REQUIRED`, and allow 3DS where required. Eligibility and device
support decide whether the button renders.

### 4.4 Venmo — `/venmo`

US-only, buyer-side eligibility checked with `findEligibleMethods().isEligible('venmo')`
before rendering; presentation mode is configurable; HTTPS in production.

### 4.5 Expanded card fields — `/expanded/card-fields`

Hosted card fields with `findEligibleMethods().isEligible('advanced_cards')`,
`cardSession.submit(orderId, options)`, 3D Secure/SCA handling, billing fields for risk,
CSP updates for PayPal domains, and a production-readiness checklist. Test with the
sandbox card numbers.

### 4.6 React SDK — `/sdk/react/reference`

`@paypal/react-paypal-js/sdk-v6` provides `PayPalProvider` (env `sandbox|production`,
client id, merchant id, optional pre-fetched `eligibleMethodsResponse`) and hooks:
`usePayPal`, `useEligibleMethods`, `useFetchEligibleMethods` (server-side),
`usePayPalOneTimePaymentSession`, `useVenmoOneTimePaymentSession`,
`usePayLaterOneTimePaymentSession`, `usePayPalCreditOneTimePaymentSession`,
`usePayPalGuestPaymentSession`, plus corresponding one-time/save buttons and shipping
callbacks. Place the provider at app root so buttons render sooner.

### 4.7 Mobile & legacy SDKs

`/sdk/android/overview` documents the responsibility split: PayPal handles app-switch
eligibility server-side and presents the flow; the app supplies card-entry fields and
handles the 3DS challenge where required. Relevant only if we ship a native app.

---

## 5. Sandbox & testing

- **Sandbox** (`/sandbox-testing/overview`) mirrors production API features with virtual
  accounts from Developer Dashboard → Sandbox → Accounts; track mock transactions on
  `www.sandbox.paypal.com`. Test one virtual account per user entity in a transaction.
- **Card testing** (`/credit-card-number-generator`) — static Visa/Mastercard/Amex/JCB/
  Diners/Maestro/CUP numbers with future expiry; rejection triggers in the card-name field
  (`CCREJECT-REFUSED`, `-SF`, `-EC`, `-IRC`, `-IF`, `-LS`, `-IA`, `-BANK_ERROR`, `-CVV_F`)
  producing specific processor codes; 3DS scenarios via `SCA_ALWAYS` and the `payer-action`
  HATEOAS link.
- **Negative testing** (`/negative-testing/overview`) — sandbox-only, beta, business
  accounts; enable per sandbox account under Settings → Negative Testing; force errors via
  request headers (`PayPal-Mock-Response`) or test values.

---

## 6. Reference data

- **Currency codes** (`/reference/currency-codes`) — ISO-4217. Supported: AUD, BRL, CAD,
  CNY, CZK, DKK, EUR, HKD, HUF, ILS, INR, JPY, MXN, MYR, NOK, NZD, PHP, PLN, SEK, SGD,
  THB, TWD, USD. **KES is not listed.** JPY/HUF/TWD are zero-decimal. BRL/CNY/MYR need an
  in-country PayPal account or conversion. Configure Payment Receiving Preferences so
  payments in currencies we do not hold are converted instead of left pending.

> **AngiSoft reconciliation (code audit 2026-11-22):** `SUPPORTED_CURRENCIES` in
> `paypalService.ts` (shared by payouts) now includes CNY alongside INR/HUF/TWD
> (and CHF/GBP), matching this reference list. JPY/HUF/TWD are formatted as
> zero-decimal amounts by `formatPayPalAmount()`, and **KES is not supported** by
> our allowlist. BRL/CNY/MYR may require an in-country account or conversion.
> This is a code-level reconciliation — no live credentials or registered
> webhooks are claimed as provisioned. See
> [`PAYPAL_RESOURCE_UTILIZATION_PLAN.md`](./PAYPAL_RESOURCE_UTILIZATION_PLAN.md) §8.1.
- **Country codes** (`/reference/country-codes`) — two-character codes; Kenya = `KE`.
- **Locale codes** (`/reference/locale-codes`) — BCP-47 for REST; Kenya priority is
  `en_US` → `fr_XC` → `es_XC` → `zh_XC`, with `en-KE` as the REST value.
- **State/province codes** (`/reference/state-codes`) — exact spellings matter for the
  countries that use names rather than codes; Kenya is not enumerated.

---

## 7. Operations & developer tooling

- **DropZone / SFTP** (`/secure-file-transfer`) — encrypted file exchange for settlement
  and merchant reports. Client mode (pull from our S3/GCS/SFTP into PayPal, or receive into
  our storage) is preferred; server mode uses `dropzone.paypalcorp.com` and allowlists
  `DropZone.paypal.com`. Client IP allowlist: `173.0.81.0/24`, `66.211.170.66`. PGP/7Zip/
  Encrypto encryption, virus and sensitive-data scanning.
- **VS Code extension** (`/vs-code-extension`) — code samples, snippets, quick links and
  an AI migration assistant; useful for onboarding developers, not a runtime dependency.
- **Resource indexes** — `llms-root.txt`, `payments-llms.txt`,
  `llms-developer-resources.txt` and `urls.txt` are navigation maps, not API contracts.
  They point to sandbox accounts, bulk accounts, test calls, error handling, 3DS/SCA
  guidance, iOS/Android SDK overviews and go-live checks.

---

## 8. Cross-cutting rules to carry into implementation

1. **Environment separation is absolute.** Sandbox and live use different hosts,
   credentials, webhook IDs and MCP hosts. Never mix them; the app must fail closed in
   production on missing live configuration.
2. **Amounts are server-held.** The browser chooses a method, never a price.
3. **Idempotency everywhere.** `PayPal-Request-Id` UUIDs on every POST/PUT, plus our own
   `Payment`/`Payout` uniqueness.
4. **Verify webhooks** through PayPal's verification API before applying any outcome.
5. **Least-privilege tools.** Enable only the agent actions each role needs; intercept
   tool calls for approval on anything that moves money.
6. **Eligibility before rendering.** Apple Pay, Google Pay, Venmo, Pay Later and card
   fields all require `findEligibleMethods()` checks and one-time dashboard setup.
7. **No PII or secrets in prompts.** The toolkit rejects them, and PCI DSS applies.
8. **KES is not a PayPal settlement currency.** Charge in `PAYPAL_CURRENCY` (USD default)
   and preserve the original currency/amount in metadata for reconciliation.
9. **Documented methods are not automatically catalogued.** Venmo, Boleto and Multibanco
   appear in PayPal's docs but are not active AngiSoft payment catalogue entries; do not
   add them as part of this closeout. Currency allowlist gaps are recorded in §6 above.
