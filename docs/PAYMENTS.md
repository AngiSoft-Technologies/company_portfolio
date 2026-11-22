# Online payments — PayPal, PayHero and Daraja

> **🛠 OPERATIONAL** — Authoritative guide for the three online payment rails.<br>
> Background from the supplied PayPal docs: [`PAYPAL_DOCS_SUMMARY.md`](PAYPAL_DOCS_SUMMARY.md) ·
> Resource-by-resource rollout plan: [`PAYPAL_RESOURCE_UTILIZATION_PLAN.md`](PAYPAL_RESOURCE_UTILIZATION_PLAN.md).

This is the authoritative guide for money movement in AngiSoft. Stripe and
Paystack adapters remain in the codebase for historical support only: they are
**not exposed to online clients and are never routed by the Finance Hub**. The
client portal only offers the three gateways below.

## Rail-selection policy

- **International / non-KES money movement defaults to PayPal**: collect,
  refund and payout. The provider is derived from `selectPaymentRail` (no
  hardcoded PayHero default). PayPal settles in the validated `PAYPAL_CURRENCY`
  (default USD) or a supported method currency; the original invoice currency
  and amount are preserved in metadata. KES is rejected explicitly — we never
  charge 1 KES = 1 USD.
- **East African money movement defaults to PayHero and Safaricom M-Pesa/Daraja**:
  M-Pesa, Airtel, other telcos, banks and wallets. PayHero channel IDs and
  network codes come from the runtime vault. The Daraja adapter implements STK,
  B2C, B2B, status, reversal, callbacks and balance/C2B/QR helpers; the Finance
  Hub catalogue exposes STK, B2C, B2B, reversal, status and the preflight-only
  `MPESA_BALANCE` action. C2B registration/simulation and QR remain authenticated
  adapter/admin operations, not client payment methods.
- **Stripe and Paystack are legacy-only.** They are never offered by
  `GET /v1/payments/methods`, never selected by `selectPaymentRail`, and have no
  Finance Hub routes.
- PesaFlow is adapter-ready but unavailable until credentials are configured in
  the vault. It never silently substitutes for the default rails.

## Coverage matrix

| Flow | Method | Gateway | Region | Initiation | Settlement |
|---|---|---|---|---|---|
| C2B | PayPal wallet / Pay Later / Venmo | PayPal | International | `POST /v1/client-portal/invoices/:id/pay` `{method:'PAYPAL'}` → redirect to PayPal | webhook `PAYMENT.CAPTURE.COMPLETED` + return-page capture |
| C2B | Card — Visa, Mastercard, Amex, Discover | PayPal | International | `method:'CARD'` → “Pay with card” on PayPal checkout | same as above |
| C2B | Google Pay / Apple Pay | PayPal | International | `method:'GOOGLE_PAY'` / `'APPLE_PAY'`; visible to eligible buyers in supported browsers | same as above |
| C2B | iDEAL, Bancontact, BLIK, eps, Przelewy24, Trustly, Alipay, OXXO | PayPal | International | `method:'<ID>'` → PayPal-hosted local method | same as above |
| C2B | Lipa na M-Pesa STK | PayHero | Kenya | `method:'MPESA_STK'` | PayHero callback |
| C2B | Airtel Money | PayHero | Kenya | `method:'AIRTEL_MONEY'` | PayHero callback |
| C2B | Telco / operator billing | PayHero | Kenya | `method:'TELCO'` | PayHero callback |
| C2B | M-Pesa STK (direct) | Safaricom Daraja | Kenya | `method:'MPESA_DARAJA'` | Daraja STK callback |
| B2C | Send to mobile wallet | Daraja / PayHero | Kenya | `POST /v1/admin/money/payout` `{type:'MPESA_B2C'|'PAYHERO_B2C_MOBILE'}` | Daraja/PayHero result callback |
| B2C | PayPal Payout | PayPal | International | `POST /v1/admin/money/payout` `{type:'PAYPAL_PAYOUT'}` | `GET /v1/admin/money/status/PAYPAL_PAYOUT_STATUS` |
| B2B | Pay business via M-Pesa | Daraja | Kenya | `type:'MPESA_B2B'` | Daraja result callback |
| B2B | Bank/Sacco payout | PayHero | Kenya | `type:'PAYHERO_B2B_BANK'` | PayHero callback |
| B2B | PayPal business payout | PayPal | International | `type:'PAYPAL_B2B_PAYOUT'` | PayPal payout status |
| Refund | Captured PayPal payment | PayPal | International | `POST /v1/admin/money/refund` `{captureId}` | immediate |
| Reversal | Completed M-Pesa transaction | Daraja | Kenya | `POST /v1/admin/money/reversal` `{transactionId, amount}` | Daraja result callback |
| Status | Any of the above | all three | Both | `GET /v1/admin/money/types` and `GET /v1/admin/money/status/:type` | live provider lookup |
| Balance | PayHero wallet balance | PayHero | Kenya | `GET /v1/admin/money/status/PAYHERO_BALANCE?walletType=payment_wallet` | live provider balance |
| Top-up | Fund PayHero service wallet | PayHero | Kenya | `POST /v1/admin/money/payout` `{type:'PAYHERO_TOPUP', phone, amount}` | PayHero callback |
| Refund status | PayPal refund lookup | PayPal | International | `GET /v1/admin/money/status/PAYPAL_REFUND_STATUS?refundId=…` | live provider lookup |

The live catalogue with per-method availability is `GET /v1/payments/methods`
(public, no credentials) and `GET /v1/admin/money/types` (admin-only).

All M-Pesa traffic uses one canonical resource family — `/v1/payments/mpesa/*`:
`POST /callback`, `/c2b/validation`, `/c2b/confirmation`, `/c2b/register`,
`/c2b/simulate`, `/balance` and `/qr`. There is no `/api` alias, no
`/mpesa-extended` and no `/v1/payments/daraja` endpoint alias; `Daraja` is only
the Safaricom API name used inside adapter code.

Staff use the **Money Movement** screen in the admin app (`/admin/money-movement`)
to see the full transaction catalogue, initiate B2C/B2B payouts, issue PayPal
refunds, reverse M-Pesa transactions, run live status lookups and review payout
history. It is a thin UI over `/v1/admin/money/*` and carries the same
`payments.view_all` / `payments.reconcile` permission checks as the API.

## Client checkout flow

1. Client dashboard loads `/v1/payments/methods` and renders
   `PaymentMethodPicker`, grouped as Wallet / Card / Mobile money / Operator /
   Bank / Voucher / Pay later. Unavailable methods stay visible with the exact
   reason (missing credentials or channel).
2. Client selects a method. STK methods ask for a phone number.
3. `POST /v1/client-portal/invoices/:id/pay` with `{method, phone}` creates a
   server-held `Payment` row and calls the gateway. The amount always comes
   from the invoice balance, never the browser.
4. PayPal methods return a hosted checkout URL; the browser navigates there.
   PayPal appends `?token=<orderId>` to the return URL. The dashboard pairs it
   with the short-lived `reference` held in `sessionStorage` and calls
   `POST /v1/payments/paypal/capture`.
5. Settlement happens through `applyPaymentOutcome`, which settles the invoice,
   updates the booking, writes a ledger entry and emits realtime events.
   Webhooks and the capture call are deduped by `ProviderEvent` and reference,
   so a replay never moves money twice.

## Booking deposits

Booking deposits use the same three rails but a stricter, token-gated handoff:

1. `POST /v1/bookings` persists the server-validated deposit in
   `details.phase7Deposit` and returns `paymentRequired`, `paymentContext` and a
   tracking token. There is no `clientSecret`; the browser never sends an amount
   or currency when paying.
2. `POST /v1/bookings/reference/:publicReference/deposit?token=…` accepts only
   `{ method, phone?, email? }`. The body schema is strict, so an injected
   `amount`, `currency` or `bookingId` is rejected. The token may be the raw
   tracking token or a signed access token; a bad token is indistinguishable
   from a missing booking.
3. Rail selection is capability-gated and currency-safe: PayPal rejects KES and
   settles in the configured supported currency; PayHero/Daraja reject non-KES.
   The original quote is preserved in `Payment.metadata` and no 1:1 FX is
   performed. A pending deposit is resumed rather than initialized twice, and a
   paid or closed booking is rejected.
4. PayPal returns to `/bookings/:ref?access=<signedToken>&deposit=1&paypal=success`.
   PayPal appends its own `token=<orderId>`; the client pairs that order id with
   the reference saved before redirect and calls
   `POST /v1/payments/paypal/capture` with `{ orderId, reference }`. The signed
   booking authorization is always in `access`, never PayPal's `token`.
5. M-Pesa STK deposits use the canonical `/v1/payments/mpesa/*` callbacks, an
   immediate acknowledgement, deduplicated `ProviderEvent`s, amount
   cross-checking and one delayed seven-minute status recovery job. There is no
   polling loop and no client-held payment secret.

The public deposit route is in the CSRF carve-out because it is token-gated,
rate-limited and server-amount-driven. It exposes only a checkout URL for
PayPal or a prompt status for STK; credentials and raw provider payloads stay
server-side.

## Security contracts

- Provider credentials come from the encrypted runtime config vault
  (`Setting` / `EncryptedSecret`) at runtime, with environment fallback. They
  are never returned to the browser or written to code, and there is no
  committed `.env.example`.
- `PAYPAL_ENV=sandbox` uses sandbox credentials; `live` requires explicit
  `PAYPAL_LIVE_CLIENT_ID` / `PAYPAL_LIVE_CLIENT_SECRET` and never falls back to
  sandbox credentials.
- PayPal webhook: verified through PayPal's `verify-webhook-signature` API with
  `PAYPAL_WEBHOOK_ID`; the id is also required for capability readiness. Missing
  id = 503, invalid signature = 400. Only masked headers are stored on the
  event — `paypal-transmission-sig` is never persisted.
- Daraja callbacks: constant-time `MPESA_CALLBACK_TOKEN` check (503 when
  unconfigured, 403 when wrong) for result, STK and C2B callbacks. Registered
  C2B URLs carry the token, every callback is acknowledged before persistence,
  and all records are deduped via `ProviderEvent` with shared-token
  authentication recorded as `signatureValid: false`. C2B dedupe ids are body
  hashes or `TransID`, never phone numbers, names or raw JSON.
- Payouts are admin-only (`payments.reconcile`), mirrored into `Payout` with a
  unique reference, audited via `AuditLog`, and serialized with an advisory
  lock. Replays return the existing row.
- Money-moving POSTs use a stable reference: `ProviderEvent` dedupe is checked
  before a PayPal refund is re-invoked, and `PayPal-Request-Id` is sanitized and
  length-bounded (`OriginatorConversationID` on M-Pesa).

## PayPal setup

Sandbox values (set them in the runtime vault or `backend/.env`; no values are committed):

```text
PAYPAL_ENV=sandbox
PAYPAL_SANDBOX_CLIENT_ID=…
PAYPAL_SANDBOX_CLIENT_SECRET=…
PAYPAL_CURRENCY=USD
PAYPAL_RETURN_URL=https://<web-domain>/portal?paypal=success
PAYPAL_CANCEL_URL=https://<web-domain>/portal?paypal=cancel
PAYPAL_WEBHOOK_ID=…   # from the Developer Dashboard webhook (PAYMENT.CAPTURE.* events)
```

Production: set `PAYPAL_ENV=live` and populate `PAYPAL_LIVE_CLIENT_ID`,
`PAYPAL_LIVE_CLIENT_SECRET`, and a live webhook id. Add the webhook URL
`https://api.angisoft.co.ke/v1/payments/paypal/webhook` and subscribe to
`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED` and
`PAYMENT.CAPTURE.DENIED`.

KES is not a PayPal settlement currency. `PAYPAL_CURRENCY` (default USD) is
what the buyer is charged; the original invoice currency/amount stays in
`Payment.metadata` for reconciliation.

Google Pay and Apple Pay buttons depend on device/browser eligibility and
PayPal merchant configuration (Google Pay merchant id, Apple Pay merchant
identity certificate + domain verification). They are advertised in the
catalogue and route through PayPal; complete those one-time dashboard steps
before relying on them in production.

## PayHero setup

```text
PAYHERO_API_USERNAME=…
PAYHERO_API_PASSWORD=…
PAYHERO_CHANNEL_ID=…              # primary M-Pesa STK channel
PAYHERO_AIRTEL_CHANNEL_ID=…       # Airtel Money channel
PAYHERO_TELCO_CHANNEL_ID=…        # telco/operator channel
PAYHERO_MOBILE_NETWORK_CODE=safaricom
PAYHERO_BANK_NETWORK_CODE=…
PAYHERO_CALLBACK_URL=https://api.angisoft.co.ke/v1/payments/payhero/callback
PAYHERO_CALLBACK_TOKEN=…
```

## Daraja setup

```text
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=…
MPESA_CONSUMER_SECRET=…
MPESA_SHORTCODE=…
MPESA_PASSKEY=…
MPESA_INITIATOR_NAME=…
MPESA_INITIATOR_PASSWORD=…
MPESA_INITIATOR_PUBLIC_KEY=…      # PEM or base64 PEM from Daraja
MPESA_B2C_TIMEOUT_URL=…
MPESA_B2C_RESULT_URL=https://api.angisoft.co.ke/v1/payments/mpesa/callback
MPESA_B2B_TIMEOUT_URL=…
MPESA_B2B_RESULT_URL=https://api.angisoft.co.ke/v1/payments/mpesa/callback
MPESA_STATUS_QUEUE_URL=…
MPESA_REVERSAL_QUEUE_URL=…
MPESA_REVERSAL_RESULT_URL=…
MPESA_CALLBACK_TOKEN=…
```

Register the result URLs in the Daraja portal and keep the callback token in
the query string or `x-callback-token` header. Prefer the header for manual
tests in production; C2B registration necessarily appends the token to the
validation/confirmation URLs and fails closed before OAuth when it is missing.
Every Daraja callback acknowledges immediately, then records a deduplicated
`ProviderEvent` with shared-token authentication recorded as
`signatureValid: false`.

Extended products are configured with these additional vault settings:

```text
MPESA_C2B_SHORTCODE
MPESA_C2B_VALIDATION_URL
MPESA_C2B_CONFIRMATION_URL
MPESA_C2B_RESPONSE_TYPE
MPESA_BALANCE_QUEUE_URL
MPESA_BALANCE_RESULT_URL
MPESA_STATUS_RESULT_URL
MPESA_REVERSAL_TIMEOUT_URL
MPESA_QR_MERCHANT_NAME
MPESA_QR_TRANSACTION_TYPE
MPESA_QR_CALLBACK_URL
```

`MPESA_ENV` accepts `live` or `production` for the live base URL. OAuth tokens
are cached (with a five-minute safety margin) on both the STK and outbound
paths; a lost STK callback is recovered with one delayed
`queryStkStatus(CheckoutRequestID)` call rather than continuous polling.
Result and timeout URLs must be distinct in production. See
[`DARAJA_RESOURCE_UTILIZATION_PLAN.md`](DARAJA_RESOURCE_UTILIZATION_PLAN.md)
for the complete local resource catalogue and go-live checklist.

## Tests

```sh
cd backend
npx vitest run test/bookingDeposit.spec.ts test/configRegistry.spec.ts test/darajaPayouts.spec.ts test/darajaResourcePack.spec.ts test/metaResourcePack.spec.ts test/money-movement.spec.ts test/mpesaStkRecovery.spec.ts test/paypal.spec.ts test/paypalPayouts.spec.ts test/payment-methods.spec.ts test/phase7Foundation.spec.ts test/route-guards.spec.ts test/runtime-config.spec.ts test/security.spec.ts
```

All tests mock `fetch` and environment; no network calls or real credentials
are used.

## PayPal MCP tools (this machine)

The official **production** remote MCP is configured globally in
`~/.config/opencode/opencode.json` at `https://mcp.paypal.com/mcp` (the documented
`/http` path currently returns 404). Run `/mcps` in OpenCode and sign in with your
PayPal developer account to activate the tools. Do not paste credentials into chat.
The sandbox MCP host is deliberately not used.
