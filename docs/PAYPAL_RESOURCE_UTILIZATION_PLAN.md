# PayPal resource utilization plan

> **🛠 OPERATIONAL** — Resource-by-resource rollout decision record.<br>
> Source summary: [`PAYPAL_DOCS_SUMMARY.md`](./PAYPAL_DOCS_SUMMARY.md) ·
> Operational payments guide: [`PAYMENTS.md`](./PAYMENTS.md).

> **Purpose:** account for every resource in [`PAYPAL_DOCS_SUMMARY.md`](./PAYPAL_DOCS_SUMMARY.md)
> and decide how AngiSoft will use it. This is the implementation companion to
> [`PAYMENTS.md`](./PAYMENTS.md), which remains the operational reference for the shipped
> payment rails (PayPal + PayHero + Daraja only).
>
> **Status legend**
> `SHIPPED` — live in this checkout · `PARTIAL` — scaffold/advertised, needs work ·
> `PLANNED` — not built, intended · `DEFERRED` — consciously out of scope for now ·
> `N/A` — no applicable surface in our stack.

> **Code audit — currency reconciliation (2026-11-22).** The code allowlist
> (`SUPPORTED_CURRENCIES` in `paypalService.ts`, shared with payouts) now
> includes CNY alongside INR/HUF/TWD (and CHF/GBP), matching the docs list in
> [`PAYPAL_DOCS_SUMMARY.md`](./PAYPAL_DOCS_SUMMARY.md) §6. JPY/HUF/TWD are
> **zero-decimal** and are formatted as whole numbers by the shared
> `formatPayPalAmount()` helper; KES is **not supported**. BRL/CNY/MYR may
> require an in-country PayPal account or conversion. This is a code-level
> reconciliation, not evidence of live credentials or registered webhooks —
> §11 remains blocking. Venmo and voucher methods (Boleto/Multibanco) are
> documented by PayPal but are **not** AngiSoft catalogue entries.

---

## 0. Coverage at a glance

| Area (plan section) | Items | Shipped | Partial | Planned | Deferred / N/A |
|---|---|---|---|---|---|
| REST core & checkout (§1) | 11 | 6 | 2 | 2 | 1 |
| Payment methods & wallets (§2) | 11 | 2 | 3 | 3 | 3 |
| Money movement (§3) | 5 | 4 | 0 | 1 | 0 |
| Invoicing, catalog & subscriptions (§4) | 6 | 0 | 0 | 5 | 1 |
| Disputes, reporting & reconciliation (§5) | 6 | 0 | 0 | 4 | 2 |
| Agent tools (§6.1–6.9 — 33 discrete tools) | 33 | 0 | 0 | 24 | 9 |
| AI integrations & tooling (§6.10–6.14) | 5 | 0 | 2 | 2 | 1 |
| Testing & operations (§7) | 8 | 0 | 3 | 5 | 0 |
| Reference data (§8) | 6 | 1 | 1 | 3 | 1 |

The intent is **not** to bolt on all 33 agent tools. It is to make every resource
*deliberate*: either wired in, explicitly staged, or explicitly declined with a reason.

---

## 1. REST core & checkout

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 1.1 | OAuth client credentials (`/v1/oauth2/token`) | Backend-only token acquisition; separate sandbox/live credential sets | `billing/services/payments/paypalService.ts` (`getAccessToken`, cached, single-flight) | SHIPPED | Add production fail-closed check: refuse boot in live without live credentials and webhook ID |
| 1.2 | Base URLs sandbox/live | Env-driven switching, no code change to go live | `API_BASE` in `paypalService.ts`, `paypalPayouts.ts`, `darajaPayouts.ts` | SHIPPED | Keep; ensure Fly secrets mirror `backend/.env` |
| 1.3 | `PayPal-Request-Id` / idempotency | Every create/capture/refund/payout POST; 45-day UUID replay safety | `paypalService.ts`, `paypalPayouts.ts`, `Payout` unique reference | SHIPPED | Extend to any future orders PATCH/confirm and dispute calls |
| 1.4 | Orders v2 create | Server-held amount; invoice balance converted to `PAYPAL_CURRENCY` | `paypalService.ts` `createOrder`; called from client-portal pay route | SHIPPED | Pass `invoice_id` into the order for reconciliation |
| 1.5 | Orders v2 capture | Return-page capture + webhook, both idempotent | `paypalService.ts` `captureOrder`; `POST /v1/payments/paypal/capture` | SHIPPED | Harden return-page pairing so a stale `token` cannot settle a different invoice |
| 1.6 | Orders v2 get / show | Read-only live order lookup from admin Money Movement | `GET /v1/admin/money/status/PAYPAL_ORDER_STATUS` (`paypal.getOrder`) | SHIPPED (read-only) | Keep read-only: never capture/refund/modify the order from this endpoint |
| 1.7 | Orders v2 PATCH / confirm | Update amounts/shipping before approval; explicit confirm for alternative payment sources | order adapter | PLANNED | Only when we add address/shipping or APMs that need `confirm` |
| 1.8 | Authorize + separate capture | Two-step authorise-now/capture-on-fulfilment for project deposits | order adapter + `Payout`/`Payment` state machine | PLANNED | Requires adding `AUTHORIZE` intent and an authorisation expiry sweeper |
| 1.9 | Webhooks + verify-signature | Settlement/refund/denial events, verified before any ledger write | `paypalService.ts` verify; raw-body path + CSRF bypass in `app.ts` | SHIPPED | Live webhook **not registered**; subscribe to `PAYMENT.CAPTURE.COMPLETED|REFUNDED|DENIED` after credentials exist, then add dispute and payout events |
| 1.10 | `PayPal-Mock-Response` | Simulate `DUPLICATE_INVOICE_ID` and other errors in sandbox CI tests | test suite | PARTIAL | Add negative-path specs for retry/idempotency using this header |
| 1.11 | `PayPal-Auth-Assertion` / BN code | Only if we become a platform paying on behalf of other merchants | — | N/A | Revisit if multi-tenant merchant onboarding is introduced; BN code from Dashboard → App Settings → Reports |

## 2. Payment methods & wallets

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 2.1 | PayPal wallet / Pay Later / PayPal Credit | Catalogue entries routed through PayPal hosted checkout | `methods.ts`, `PaymentMethodPicker.tsx` | SHIPPED | Add buyer-country eligibility from `findEligibleMethods()` before showing Pay Later |
| 2.2 | Cards (Visa/MC/Amex/Discover) | `CARD` method → "Pay with card" on PayPal checkout | `methods.ts` | SHIPPED | Confirm live card eligibility for our merchant account |
| 2.3 | Local APMs (iDEAL, Bancontact, BLIK, eps, Przelewy24, Trustly, Alipay, OXXO) | International client invoice payment, grouped under Bank/Voucher | `methods.ts` | PARTIAL | Catalogue only; verify each method's country/currency availability at runtime and hide ineligible ones |
| 2.4 | Google Pay | One-tap wallet for eligible devices | `methods.ts` → PayPal checkout | PARTIAL | Enable in PayPal sandbox/live dashboard, register domain, set `environment` and 3DS preference; then render via SDK v6 |
| 2.5 | Apple Pay | One-tap wallet for eligible Apple devices | `methods.ts` → PayPal checkout | PARTIAL | Register and verify merchant domain + domain-association file, Apple Pay merchant identity certificate; HTTPS only |
| 2.6 | Venmo | Documented by PayPal for US clients only | not in the AngiSoft catalogue | DEFERRED | Do not add to the active catalogue; revisit only with verified US buyer eligibility and explicit approval |
| 2.7 | Expanded Card Fields (`advanced_cards`) | Optional on-site card capture with 3DS and SCA | new checkout component | DEFERRED | Only if hosted checkout conversion is insufficient; requires CSP updates and client-token endpoint |
| 2.8 | React SDK v6 (`PayPalProvider`, `useEligibleMethods`, session hooks) | Replace hand-rolled redirect with in-page eligible buttons | web app payment picker | PLANNED | Adopt `@paypal/react-paypal-js/sdk-v6`; pre-fetch eligibility server-side via `useFetchEligibleMethods` and pass to provider |
| 2.9 | Voucher methods (Boleto, OXXO, Multibanco) | Offline-payment completion for BR/MX/PT | catalogue | DEFERRED | Needs a "awaiting offline payment" state and expiry sweeper before exposing |
| 2.10 | Privacy/processing disclosure at checkout | Compliance text + PayPal privacy link | web checkout footer | PLANNED | Add per §4.1 of the summary; legal to approve wording |
| 2.11 | Retired methods (giropay, Sofort) | Explicitly never offered | — | N/A | Documented as blocked in the catalogue tests |

## 3. Money movement

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 3.1 | PayPal Payouts (`create payout`) | International B2C/B2B payouts, supplier and contractor payment | `paypalPayouts.ts`, `/v1/admin/money/payout` types `PAYPAL_PAYOUT`, `PAYPAL_B2B_PAYOUT` | SHIPPED | Add live webhook subscription for payout state changes instead of poll-only status |
| 3.2 | PayPal refunds (`create_refund`, `get_refund`) | Full and partial refunds of captured payments | `PAYPAL_REFUND`, `PAYPAL_REFUND_STATUS` | SHIPPED | Add partial-refund amount validation against remaining capture amount |
| 3.3 | Daraja B2C / B2B / reversal / status | Kenyan wallet payouts, business payments, M-Pesa reversals | `darajaPayouts.ts`, money-movement routes, result callback | SHIPPED | — |
| 3.4 | PayHero B2C / B2B / top-up / balance | Airtel/telco/bank channels and wallet funding | `payheroService.ts`, money-movement routes | SHIPPED | Supply remaining Airtel/telco/bank channel IDs and network codes |
| 3.5 | Shipment tracking (`create/get/update`) | Attach courier tracking to PayPal-paid physical orders | new `fulfilment` link in projects/bookings | PLANNED | Only when physical goods ship; statuses `SHIPPED`/`DELIVERED`/`ON_HOLD`/`CANCELLED`/`LOCAL_PICKUP` |

## 4. Invoicing, catalog & subscriptions

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 4.1 | `create_invoice`, `send_invoice`, `send_invoice_reminder`, `cancel_sent_invoice`, `get_invoice`, `list_invoices` | Offer PayPal-native invoices to international clients who want the bill in their PayPal account | `billing` + finance agent, opt-in per client | PLANNED | Keep our `Invoice` as source of truth; mirror to PayPal with `invoice_id` correlation; never let PayPal overwrite our ledger |
| 4.2 | `generate_invoice_qr_code` | QR on-site payment at events/office | client portal invoice view | PLANNED | Low priority; after PayPal-native invoices ship |
| 4.3 | `create_product`, `list_product`, `show_product_details` | Mirror our service catalogue into PayPal for subscriptions and gift-card flows | `cms`/`billing` sync job | PLANNED | Map types `SERVICE` (our services) and `DIGITAL` (packages); nightly reconciliation |
| 4.4 | `create_subscription_plan`, `list_subscription_plans`, `show_subscription_plan_details` | Recurring service retainers mapped from our pricing packages | `billing` pricing packages → PayPal plans | PLANNED | One plan per billing cycle; enforce max 2 trial + 1 regular cycle |
| 4.5 | `create_subscription`, `show_subscription_details`, `update_subscription`, `cancel_subscription` | Client self-service retainers with cancellation/retention in admin | client portal + admin finance | PLANNED | Cancel requires `payments.reconcile`; log `AuditLog` entry |
| 4.6 | Remote commerce tools (`search_product`, `create_cart`, `checkout_cart`) | Gift-card purchasing only | — | N/A | Explicitly declined — AngiSoft does not sell gift cards; tool stays disabled (no `x-feature-flags: commerce:true`) |

## 5. Disputes, reporting & reconciliation

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 5.1 | `list_disputes`, `get_dispute` | Finance/SUPER_ADMIN dashboard of open and resolved cases | new admin finance widget | PLANNED | Ingest `PAYMENT.DISPUTE.*` webhook events into `ProviderEvent` |
| 5.2 | `accept_dispute_claim` | Resolve in buyer's favour | admin action behind dual approval | DEFERRED | High-risk: require SUPER_ADMIN + documented business approval; never agent-initiated |
| 5.3 | `list_transaction` | Daily reconciliation of PayPal activity against our ledger | `workers/` reconciliation job | PLANNED | Default 31-day window is too broad; page by explicit date range and dedupe by provider ID |
| 5.4 | `get_merchant_insights` | Revenue/order trend tiles in admin analytics | `modules/analytics` | PLANNED | Map ORDERS/SALES × DAILY/WEEKLY/MONTHLY to existing dashboard widgets |
| 5.5 | DropZone SFTP reports | Settlement files, fees and payout reports delivered encrypted | `workers/` + Tigris private bucket | PLANNED | Onboarding required; prefer client mode; allowlist IPs, PGP-decrypt, scan, archive to private `reports/` prefix |
| 5.6 | `PayPal-Partner-Attribution-Id` (BN code) | Partner attribution only | — | N/A | Not a marketplace for other merchants |

## 6. AI / agent layer

Principle: our existing 12-agent workforce (`modules/agents/services/agentRegistry.ts`) and
AI Boardroom use the **agent-toolkit allowlist** rather than raw MCP tools. Every money
movement stays behind our `Payout`/`ApprovalRequest` gate; agents may *propose*, never
*settle*.

| # | Resource/tool | Agent that should own it | Allowed actions | Status | Next action |
|---|---|---|---|---|---|
| 6.1 | `create_order`, `get_order`, `pay_order` | sales / customer-care | create + get; `pay_order` only after invoice approval | PLANNED | Add `@paypal/agent-toolkit` with `actions.orders = {create,get,capture}` and intercept `pay_order` |
| 6.2 | `create_refund`, `get_refund` | finance | get always; create only via `ApprovalRequest` | PLANNED | Refund proposals mirrored into approval queue, executed by admin route |
| 6.3 | Invoice tools (7) | finance / **pa** (Executive Assistant) | create, list, get, send, reminder; cancel only with approval | PLANNED | Charters in `services/agentCharters.ts` gain an `invoice` mandate |
| 6.4 | Catalog tools (3) | marketing / relationships | create/list/show | PLANNED | Sync from CMS, not free-form LLM content |
| 6.5 | Subscription tools (7) | sales / finance | all read; mutations gated | PLANNED | Treat cancel as a revenue-affecting approval |
| 6.6 | Dispute tools (3) | security-compliance / finance | list/get; `accept_dispute_claim` **never** agent-initiated | DEFERRED | Keep human-only per §5.2 |
| 6.7 | Reporting tools (2) | analytics | `get_merchant_insights`, `list_transaction` | PLANNED | Feed existing analytics agent reports |
| 6.8 | Shipment tools (3) | customer-care | create/get/update tracking numbers supplied by ops | DEFERRED | After fulfilment tracking exists (§3.5) |
| 6.9 | Remote commerce tools (3) | — | disabled | N/A | See §4.6 |
| 6.10 | Agent toolkit framework integrations | platform | choose **Vercel AI SDK** path (`@paypal/agent-toolkit/ai-sdk`) to match our stack | PLANNED | Install toolkit, add a `tools/paypal.ts` module, expose only allowlisted actions |
| 6.11 | Remote MCP at `https://mcp.paypal.com/mcp` | developer + ops tooling | read-only investigations, invoice drafts | PARTIAL | OpenCode config now points at production host; complete PayPal OAuth sign-in in `/mcps` |
| 6.12 | LLM connectors (Anthropic `mcp_servers`, OpenAI `mcp` tools) | boardroom / support bot | same allowlist as 6.1–6.8 | DEFERRED | Do not use `require_approval: 'never'` for money-touching tools |
| 6.13 | Prompt best practices | all agents | action-first, explicit fields, split multistep, no PII/secrets | PARTIAL | Add these rules to `agentCharters.ts` and the boardroom system prompt |
| 6.14 | Eligibility gating in prompts | customer-care | don't promise Pay Later/Venmo/Apple Pay unless `isEligible()` passes | PLANNED | Mirror catalogue availability into agent context |

## 7. Testing & operations

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 7.1 | Sandbox accounts | Developer test buyer + business accounts for E2E | `backend/.env` sandbox credentials | PARTIAL | Sandbox credentials present; buyer account not yet used for a full capture test |
| 7.2 | Static test cards | Card checkout E2E | test suite | PARTIAL | Add card order/capture specs with Visa `4012…` style numbers |
| 7.3 | Rejection triggers | Decline-path tests (`CCREJECT-REFUSED`, `-IF`, …) | test suite | PLANNED | Assert our API maps processor codes to stable internal errors |
| 7.4 | 3DS / `SCA_ALWAYS` + `payer-action` link | SCA challenge test | test suite | PLANNED | Needed before EU/UK live traffic |
| 7.5 | Negative testing (sandbox-only, beta) | Error-handling regression via `PayPal-Mock-Response` and test values | CI job | PLANNED | Enable per sandbox business account; never attempt in live |
| 7.6 | Common errors (`/api/errors/overview`) | Normalise 400/403/422/500 into internal error codes | `shared/errors` + adapters | PARTIAL | Add provider error taxonomy to `PayPalError` |
| 7.7 | VS Code extension | Developer onboarding, code snippets, migration assistant | `docs/TESTING_GUIDE.md` | PLANNED | Link in docs; no runtime dependency |
| 7.8 | Production go-live check (from Node/Express guide) | Preflight: live env + live credentials + live webhook + domain checks | deploy checklist | PLANNED | Add to `docs/VERIFICATION_CHECKLIST.md` |

## 8. Reference data

| # | Resource | AngiSoft use | Where it lands | Status | Next action |
|---|---|---|---|---|---|
| 8.1 | Currency codes | Validate settlement currency; **exclude KES**; handle zero-decimal JPY/HUF/TWD | `isSupportedPayPalCurrency()` + `formatPayPalAmount()` in `paypalService.ts`, shared by payouts/refunds | SHIPPED | Allowlist now includes CNY alongside the documented codes; JPY/HUF/TWD are whole-number formatted; KES still rejected. BRL/CNY/MYR still need in-country/conversion confirmation before live use |
| 8.2 | Payment Receiving Preferences | Convert non-held currencies automatically instead of pending payments | PayPal account settings | PLANNED | Configure in live account after credentials are supplied |
| 8.3 | Country codes (`KE`, etc.) | Buyer country in orders and eligibility | order payload / validation | PLANNED | Validate `country_code` against the documented list |
| 8.4 | Locale codes (`en-KE` → REST, `en_US` fallback) | Localise PayPal checkout for our buyers | order `locale` parameter | PLANNED | Derive from user profile; default `en_US` |
| 8.5 | State/province codes | Address validation for US/EU buyers | order address | DEFERRED | Only needed when shipping/address is collected |
| 8.6 | Resource indexes (`llms-*.txt`, `urls.txt`) | Navigation for future doc work | this doc set | SHIPPED | Summarised in `PAYPAL_DOCS_SUMMARY.md` |

---

## 9. Delivery phases

### Phase A — close the gaps on what is already shipped (now)
1. Production fail-closed guard for `PAYPAL_ENV` + live credentials + `PAYPAL_WEBHOOK_ID`.
2. Live PayPal webhook registration (`PAYMENT.CAPTURE.COMPLETED|REFUNDED|DENIED`) and callback URL updates for all providers to `/v1`.
3. ~~`PAYPAL_ORDER_STATUS` money type; partial-refund validation~~ — SHIPPED (read-only order lookup; full/provider-amount refunds and explicit partial amounts validated). `invoice_id` on orders remains planned.
4. Negative-path tests with `PayPal-Mock-Response`; card/3DS sandbox E2E (needs sandbox credentials).
5. ~~Reconcile `SUPPORTED_CURRENCIES`; document zero-decimal handling~~ — SHIPPED (CNY added; JPY/HUF/TWD whole-number formatted via `formatPayPalAmount()`; KES rejected).

### Phase B — eligibility and compliance before more methods go live
6. `@paypal/react-paypal-js/sdk-v6` provider + `useEligibleMethods` in the payment picker.
7. Apple Pay / Google Pay dashboard setup and domain verification; gate rendering on eligibility.
8. Privacy/processing disclosure at checkout.
9. Automated daily `list_transaction` reconciliation and `get_merchant_insights` tiles.

### Phase C — agentic finance with approvals
10. Install `@paypal/agent-toolkit` (AI SDK adapter), allowlist per agent charter.
11. Invoice/subscription/catalog sync; dispute read-only dashboard.
12. `ApprovalRequest` gate for every `pay_order`, `create_refund`, `cancel_subscription`.
13. Prompt rules from `/ai-tools/prompts` added to charters and boardroom system prompt.

### Phase D — deferred / only on demand
14. Expanded Card Fields, vouchers, shipment tracking, dispute acceptance, DropZone SFTP, LLM connectors, mobile SDKs, platform/partner headers.

---

## 10. Non-negotiables

1. **Credentials only in `backend/.env`**, pushed to Fly as secrets; never in source, tests, logs, prompts or this repo.
2. **Sandbox never in production.** Production must fail closed on missing live credentials/webhook ID; the MCP tooling also points at the production host.
3. **Amounts come from the server** (invoice balance), never the browser or an agent.
4. **`PayPal-Request-Id` UUID on every POST/PUT**, plus our own uniqueness constraints.
5. **Verify webhooks** with PayPal's verification API before touching the ledger.
6. **Money movement is admin-only** and audited; agents propose via `ApprovalRequest`, they do not settle.
7. **Eligibility before rendering** wallets/methods; never advertise a method PayPal has not approved for the buyer/session.
8. **No PII or secrets in prompts** (toolkit rejects them; PCI DSS applies).
9. **KES stays out of PayPal charges** — charge in `PAYPAL_CURRENCY`, keep original amount/currency in metadata.

## 11. Open decisions & blockers

| Item | Needed from | Why it blocks |
|---|---|---|
| Live PayPal client ID/secret + webhook ID | Owner | None are provisioned in this checkout; cannot flip `PAYPAL_ENV=live` or verify/register live webhooks |
| Apple Pay merchant identity + domain association | Owner / domain DNS | Apple Pay cannot render in production |
| Google Pay merchant config | Owner | Google Pay cannot render in production |
| PayPal MCP OAuth sign-in via `/mcps` | Owner | MCP tools stay unauthenticated |
| Airtel/telco/bank PayHero channel IDs | Owner | Those methods stay disabled in the catalogue |
| BN code + merchant payer IDs | Owner | Only if we become a platform for other merchants |
| Business decision on refunds/dispute acceptance | Finance lead | Determines whether Phase C can enable those tools |
