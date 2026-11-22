# Daraja Developer Resource Utilization Plan

This document records how the local developer resource pack at
`/home/prof_angera/Projects/mpesa-ultimate-daraja-guide-main` is used by Phase 7
Finance. All ten files named in the second-pass task were read in full.

> **Authority.** The pack is community-maintained and explicitly disclaims
> official status (`README.md:120-121`). It is a developer aid, **not** an
> authoritative Safaricom API reference. Where it conflicts with a
> Safaricom-compatible path already chosen in this repo, the conflict is
> recorded below and the pack is not followed blindly. Official Daraja portal
> confirmation remains a production enablement gate.

> **Naming contract.** All public AngiSoft endpoints for this rail live under
> `/v1/payments/mpesa/*` (`/callback`, `/c2b/validation`, `/c2b/confirmation`,
> `/c2b/register`, `/c2b/simulate`, `/balance`, `/qr`). `Daraja` is only the
> internal Safaricom API name used in adapter code and docs. There is **no**
> `/v1/payments/daraja` alias and **no** `/mpesa-extended` prefix. This pass
> added no public route.

## Complete ten-file inventory

| # | Source file | What the file actually provides | Implementation / decision | Why |
|---|---|---|---|---|
| 1 | `README.md` | Positioning, feature list (OAuth, STK, C2B, B2C, status/balance, B2B, Bill Manager, reversals, standing orders, QR, tax, Pochi, Ratiba), and a minimal STK quick start. Disclaimer at lines 120-121 confirms it is not official. | **USED — inventory and scope control.** Feature list drives the status table below; quick-start STK payload is already implemented in `mpesaService.ts`. Bill Manager is deliberately not implemented. | The README is an index, not a contract. Its breadth was used to check coverage, but no endpoint/payload was invented from it. |
| 2 | `docs/getting-started/intro.md` | Sandbox base `https://sandbox.safaricom.co.ke`, production base `https://api.safaricom.co.ke`, async callback lifecycle, HTTPS + IP allowlisting in production, shortcode/passkey/initiator concepts. | **USED — implemented.** `darajaPayouts.ts` has `API_BASE` + `environment()`; `resolveUrl()` now rejects plain HTTP callback URLs when `MPESA_ENV=live|production`. | Matches the pack's environment rules without hardcoding a dual-environment credential set. |
| 3 | `docs/getting-started/auth.md` | OAuth 2.0 client_credentials at `/oauth/v1/generate?grant_type=client_credentials`, Basic `Base64(ConsumerKey:ConsumerSecret)`, Bearer token on every request. | **USED — implemented.** `getAccessToken()` caches a single-flight token keyed by environment + credential identity; `post()`/`postPublic()` send Bearer auth. | Avoids one token request per payment while keeping credential rotation safe. |
| 4 | `guides/sandbox-vs-production.md` | Comparison matrix (strict TLS/HTTPS and IP whitelisting in production, certificates required for payouts) and go-live steps. | **USED — implemented + documented.** Live HTTPS enforcement in `resolveUrl()`, sandbox-only `simulateC2b()`, and checklist items for IP allowlisting/certificates. | These are production enablement facts, not reasons to expose a new public route. |
| 5 | `guides/common-errors.md` | Only four diagnostics: HTTP 401 (token), HTTP 400 (missing fields / numeric amount types), result 1037 (timeout), result 1 (insufficient funds). | **USED — implemented this pass.** `darajaHttpHint()` / `darajaResultHint()` in `darajaPayouts.ts`; hints attached to typed `DarajaError`s from OAuth, `post()`, `postPublic()` and C2B registration. | Diagnostics only. Unknown codes get no hint rather than an invented explanation; hints never become auto-retry or settlement logic. |
| 6 | `guides/mpesa-callbacks-explained.md` | Webhook token in URL (e.g. `?token=...`), immediate `200 OK` before slow work, idempotency by `CheckoutRequestID`. | **USED — implemented/hardened.** Callback router keeps the constant-time `MPESA_CALLBACK_TOKEN` gate (503 unconfigured / 403 wrong), acks immediately, and `callbackDedupeId()` prefers `CheckoutRequestID` then transaction/correlation ids. Auth headers are redacted before persistence. | The pack's URL-token advice is supported; the header form `X-Callback-Token` is also supported so the shared secret need not appear in access logs. Shared token is authentication, **not** a cryptographic signature, so events keep `signatureValid: false`. |
| 7 | `guides/stk-flow-explained.md` | 3-10s PIN prompt latency, allow up to 60s before UI failure, lost-webhook mitigation via one Transaction Status query after ~5 minutes. | **USED — implemented elsewhere.** `mpesaService.ts` + delayed STK recovery worker retain `CheckoutRequestID` and query once; no duplicate STK adapter was added to `darajaPayouts.ts`. | Duplicating STK query into the outbound adapter would create two divergent sources of truth. This file is out of edit scope, so status is recorded here, not changed. |
| 8 | `examples/nodejs.md` | Fetch-based OAuth, timestamp `YYYYMMDDHHMMSS`, Base64 `ShortCode+Passkey+Timestamp`, STK payload fields. | **USED — verification only.** Matches existing `initStkPush()` password derivation and payload in `mpesaService.ts`; covered by mocked tests. | Example code is illustrative; production code already keeps passkey in config and never logs it. |
| 9 | `examples/curl.md` | Same OAuth + STK request in cURL form, including `AccountReference: INV-102` and `TransactionDesc`. | **USED — verification only.** Confirms the canonical STK field names used by the existing service. | No copy-paste of sample credentials; no new route or adapter branch was added. |
| 10 | `examples/python.md` | Python `requests` equivalent of the same OAuth + STK flow and password derivation. | **USED — verification only.** Cross-checks the Node/cURL examples against the shipped adapter semantics. | Language samples do not add new contract information; no Python code was imported. |

### Supporting pack pages consulted in the earlier pass

The README's repository tree also points to API-specific pages (`docs/apis/*`).
Those were consulted earlier to reconcile conflicting paths/payload keys. They
are **not** part of the ten-file inventory above; their conflicts are retained
in the conflict table below. Where those pages disagree with the ten-file set,
the ten-file set plus the existing Safaricom-compatible adapter contract wins.

## Implementation status

| Area | Status | What actually exists |
|---|---|---|
| OAuth + environment split | SHIPPED | `darajaPayouts.ts` caches a single-flight token keyed by env/identity; live HTTPS callback URLs are enforced. `MPESA_ENV` accepts `live` and `production`. |
| STK push, query, callback decoding | SHIPPED (existing service) | `mpesaService.ts` handles password/timestamp, `CheckoutRequestID`, and one-shot status recovery. Kept out of this adapter to avoid duplication. |
| B2C / B2B disbursement | SHIPPED | Safaricom-compatible **v3** `paymentrequest` paths, RSA-encrypted initiator credential, CommandID allowlists. See conflict C1. |
| Transaction status / reversal | SHIPPED | `/mpesa/transactionstatus/v1/query`; `/mpesa/reversal/v1/request` with `ReceiverParty` / `RecieverIdentifierType` (see C2). |
| Account balance | SHIPPED (adapter + review) | `queryAccountBalance()` posts `/mpesa/accountbalance/v1/query`; `parseAccountBalance()` is consumed by the result callback: parsed balances become `DARAJA_ACCOUNT_BALANCE_REVIEW` ProviderEvents + AuditLog rows with `reviewOnly: true` / `autoSettlement: false`. No ledger or settlement is driven from them. |
| C2B URL registration / sandbox simulation | SHIPPED | `registerC2bUrls()` and sandbox-only `simulateC2b()`. Registration is reachable only through the authenticated `/v1/payments/mpesa/c2b/register` admin route; no unauthenticated money-moving route was added. |
| C2B validation / confirmation | SHIPPED (record only) | Both callbacks acknowledge immediately and are retained as immutable ProviderEvents. Confirmation extraction keeps `TransID` (dedupe) and `BillRefNumber` (match key); MSISDN is never used to match. |
| C2B reconciliation / auto-settlement | **NOT IMPLEMENTED — doc claim corrected** | No scheduled job matches `BillRefNumber` → invoice and nothing auto-settles. Confirmations are read-only review records; any matching/settlement is a manual finance action until a separately approved job exists. |
| Dynamic QR | SHIPPED | `generateMpesaQr()` with documented payload and optional callback URL. |
| Payout result callbacks | SHIPPED + HARDENED | Shared-token constant-time gate, immediate 200 ack, `callbackDedupeId()` (CheckoutRequestID/transaction ids), `recordProviderEvent()` dedupe, amount cross-check, terminal-state replay guard, generic `DARAJA_CALLBACK_RECEIVED` audit, redacted auth headers. `signatureValid: false` + `authMethod: 'SHARED_CALLBACK_TOKEN'` throughout. |
| Community error hints | SHIPPED | `darajaHttpHint()` / `darajaResultHint()` map only the four documented diagnostics to non-secret operator hints. |
| Pochi / remittance / standing order | PARTIAL (adapter only) | Canonical paths/keys are implemented with mocked tests, but these are capability-gated and **not** exposed through a public or admin route. Production enablement requires official confirmation plus capability approval. |
| Bill Manager / Invoicing | **DELIBERATELY NOT IMPLEMENTED** | The pack lists only three endpoint examples (`/v1/billmanager-invoice/optin`, `/create`, `/reconcile`) and no request/response schemas. Building a payload would mean inventing shapes, which is prohibited here. Needs the official contract before any adapter or route exists. |
| USSD | **NOT IN PACK — NOT INVENTED** | No USSD reference appears in the ten files. No endpoint or payload was guessed. |

## Callback safety contract (unchanged guards, added audit)

1. `MPESA_CALLBACK_TOKEN` must be configured; missing → 503, wrong → 403.
   Both `?token=` and `X-Callback-Token` are accepted; the header form is
   preferred to avoid query-string secret leakage.
2. Respond `{ ResultCode: 0, ResultDesc: 'Accepted' }` immediately; all DB work
   follows the ack so Daraja retries are harmless.
3. Dedupe key comes from `callbackDedupeId()`: `CheckoutRequestID` first for
   STK-shaped bodies, then `OriginatorConversationID`, `ConversationID`,
   `TransID`, `TransactionID`, then a raw-body hash. `recordProviderEvent()`
   enforces the key; phone numbers/names are never keys.
4. Amount cross-check compares the decoded amount to the stored payout; a
   mismatch creates `DARAJA_AMOUNT_MISMATCH` and leaves the payout `PENDING`.
5. Terminal-state guard: only `PENDING` payouts transition. Replays after
   `COMPLETED` / `FAILED` create no second settlement.
6. Audit rows record receipt, balance review, mismatch and settlement/failure.
   Auth headers (`authorization`, `cookie`, `set-cookie`, `x-callback-token`)
   are stripped before the callback headers are persisted.

## Reconciled and retained conflicts

| ID | Item | Community pack / prior code value | Canonical contract used now | Decision |
|---|---|---|---|---|
| C1 | B2B payment path | Pack: `/mpesa/b2b/v1/paymentrequest` | Code/tests: `/mpesa/b2b/v3/paymentrequest` | **Conflict retained, code unchanged.** v3 is the Safaricom-compatible path already chosen; pack is non-authoritative. |
| C1b | B2C payment path | Pack: `/mpesa/b2c/v1/paymentrequest` | Code/tests: `/mpesa/b2c/v3/paymentrequest` | Same as C1. |
| C2 | Reversal path/keys | Pack: `/mpesa/reversal/v1/index`, `ReceiverShortCode` | Code: `/mpesa/reversal/v1/request`, `ReceiverParty`, `RecieverIdentifierType` | Existing Safaricom contract retained. |
| C3 | Tax remittance path | Pack + prior code: `/mpesa/tax/v1/remit` | `/mpesa/b2b/v1/remittax` | Patched in `darajaPayouts.ts`. |
| C4 | Pochi payload | Pack + prior code: `BusinessPaymentToPochi`, `Initiator`, `Occasion` | `BusinessPayToPochi`, `InitiatorName`, `Occassion` | Patched in `darajaPayouts.ts`; path unchanged. |
| C5 | Standing-order path | Pack + prior code: `/mpesa/ratiba/v1/subscribe` | `/standingorder/v1/createStandingOrderExternal` | Patched. No `/mpesa` prefix added. |
| C6 | Callback signature claims | Prior rows claimed `signatureValid: true` behind the shared token | `signatureValid: false` + `authMethod: 'SHARED_CALLBACK_TOKEN'` | Patched in `mpesa-callbacks.ts`. The separate STK callback in `billing/routes/payments.ts` is outside this scope and remains a documented follow-up. |
| C7 | Bill Manager shapes | Pack gives only three endpoint examples | None | Not implemented; official payload contract required before code. |

## Configuration

Registered in `backend/src/shared/services/runtimeConfig.ts` and seeded with
`__SET_IN_ADMIN__` markers by `npm run config:seed` (values are never stored in
this document):

```
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

All callback URLs must be HTTPS in production. Keep `MPESA_CALLBACK_TOKEN`
secret and rotate it; update every configured callback URL when it changes.

## Production enablement checklist

1. Reconfirm C1, C1b and C3-C5 against the official Daraja portal.
2. Obtain official Bill Manager payload schemas before implementing that adapter.
3. Configure separate result and timeout URLs; never collapse them into one endpoint.
4. Register C2B validation/confirmation URLs and verify the immediate `ResultCode` response.
5. Confirm production IP allowlisting, HTTPS callbacks and initiator certificate validity.
6. Run one sandbox STK transaction, one C2B simulation, one B2C payout, one status query and one reversal; verify ProviderEvent dedupe, redacted callback headers, and no ledger post from the balance-review event.
7. Allow 60 seconds before showing an STK failure in the web UI; use the one-shot delayed STK recovery worker before declaring a lost webhook.
8. Treat C2B confirmations as manual review until a separately approved reconciliation job exists.

## Disclaimer

The local pack is a developer aid, not the authoritative API reference. Any
unresolved conflict must be resolved in favour of the official Safaricom Daraja
portal before live credentials are used.
