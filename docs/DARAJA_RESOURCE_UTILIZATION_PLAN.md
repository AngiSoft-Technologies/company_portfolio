# Daraja Developer Resource Utilization Plan

> **🛠 OPERATIONAL** — Phase 7 finance resource inventory and decision record.<br>
> Canonical plan: [`ANGISOFT_DIGITAL_HQ_PLAN.md`](ANGISOFT_DIGITAL_HQ_PLAN.md) §18.
>
> **Canonical Phase 7 status: Implemented (code complete).** This is a code-completion
> claim only. The additive migration `20261122210000_phase7_completion` exists but
> **must not be applied** from this document; live credentials, provider enablement and
> a disposable integration database remain blockers. No production readiness is claimed.

This document records how the local developer resource pack at
`/home/prof_angera/Projects/mpesa-ultimate-daraja-guide-main` is used by Phase 7
Finance. It inventories **all 27 Markdown files available locally** in that pack.
That is an inventory of the *locally available set*, not a claim that the pack is
complete, official, or sufficient for production.

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
> `/v1/payments/daraja` alias, **no** `/mpesa-extended` prefix and **no** `/api`
> alias. This pass added no public route.

## Local pack inventory (27 Markdown files)

Paths are relative to the pack root. Dispositions describe how each locally
available file informed this checkout — not that Safaricom endorses it.

### Overview and getting started (3)

| # | Relative path | One-line purpose | Disposition |
|---|---|---|---|
| 1 | `README.md` | Community-pack positioning, feature list and minimal STK quick start; disclaims official status. | **USED — inventory/scope control.** Drove the status table; no endpoint invented from it. |
| 2 | `docs/getting-started/intro.md` | Daraja 3.0 architecture, sandbox/live bases, async callback lifecycle and shortcode/passkey/initiator concepts. | **USED — implemented.** `API_BASE` + `environment()`; live callback URLs must be HTTPS. |
| 3 | `docs/getting-started/auth.md` | OAuth `client_credentials` token endpoint, Basic `ConsumerKey:ConsumerSecret` and Bearer header. | **USED — implemented.** `getAccessToken()` caches a single-flight token by environment/credential identity. |

### Guides (4)

| # | Relative path | One-line purpose | Disposition |
|---|---|---|---|
| 4 | `guides/sandbox-vs-production.md` | Sandbox/live matrix (TLS, IP allowlisting, payout certificates) and go-live steps. | **USED — implemented + checklist.** Live HTTPS enforcement, sandbox-only simulation. |
| 5 | `guides/common-errors.md` | Diagnostics for HTTP 401/400, result 1037 (timeout) and result 1 (insufficient funds). | **USED — implemented.** `darajaHttpHint()` / `darajaResultHint()`; unknown codes get no invented hint. |
| 6 | `guides/mpesa-callbacks-explained.md` | Token-in-URL advice, immediate `200 OK` before slow work, `CheckoutRequestID` idempotency. | **USED — hardened.** Constant-time token gate, immediate ack, hashed/transaction-id dedupe; tokenized URLs never logged. |
| 7 | `guides/stk-flow-explained.md` | PIN-prompt latency, 60s UI guidance and one Transaction Status query after a lost callback. | **USED — implemented elsewhere.** One delayed one-shot recovery job; no polling or rescheduling. |

### STK Push / M-Pesa Express pages (6)

| # | Relative path | One-line purpose | Disposition |
|---|---|---|---|
| 8 | `docs/apis/stk-push/overview.md` | STK lifecycle from client request to phone PIN prompt and async callback. | **USED — verification.** Existing `mpesaService.ts` implements this flow. |
| 9 | `docs/apis/stk-push/request.md` | `processrequest` payload, password/timestamp derivation and required fields. | **USED — verification.** Matches `initStkPush()`; passkey stays in config. |
| 10 | `docs/apis/stk-push/response.md` | Synchronous acknowledgement (`MerchantRequestID`, `CheckoutRequestID`, `ResponseCode`). | **USED — verification.** Existing response handling retains `CheckoutRequestID`. |
| 11 | `docs/apis/stk-push/callbacks.md` | Success/failure callback JSON shapes under `stkCallback`. | **USED — implemented.** Consumed by `decodeStkCallback()` with dedupe and amount cross-check. |
| 12 | `docs/apis/stk-push/errors.md` | Synchronous/callback codes including `400.002.02`, `403.002.01`, `400.002.05`. | **USED — implemented.** Mapped to non-secret operator hints; no auto-retry. |
| 13 | `docs/apis/stk-push/examples.md` | Node.js, cURL and Python STK snippets. | **VERIFICATION ONLY.** Illustrative; no sample credentials imported. |

### Other API pages (10)

| # | Relative path | One-line purpose | Disposition |
|---|---|---|---|
| 14 | `docs/apis/c2b/overview.md` | C2B URL registration plus validation/confirmation callback lifecycle. | **USED — implemented.** Tokenized registration; confirmations are manual review only. |
| 15 | `docs/apis/account-balance/overview.md` | Shortcode balance query and result callback payload. | **USED — review only.** `MPESA_BALANCE` produces review events; no ledger settlement. |
| 16 | `docs/apis/transaction-status/overview.md` | Transaction Status query for delayed or lost callbacks. | **USED — implemented.** One-shot recovery after seven minutes; no polling. |
| 17 | `docs/apis/reversal/overview.md` | Reversal request payload (pack uses `v1/index` and `ReceiverShortCode`). | **CONFLICT RETAINED (C2).** Code uses `/v1/request` with `ReceiverParty`. |
| 18 | `docs/apis/b2b/overview.md` | B2B `paymentrequest` payload and CommandIDs (pack shows v1 path). | **CONFLICT RETAINED (C1).** Code uses the Safaricom-compatible v3 path. |
| 19 | `docs/apis/b2c/overview.md` | B2C disbursement lifecycle and payload (pack shows v1 path). | **CONFLICT RETAINED (C1b).** Code uses the v3 path. |
| 20 | `docs/apis/qr-code/overview.md` | Dynamic QR generation payload and `TrxCode` values. | **USED — implemented.** Locally allowlisted `TrxCode`: `BG`, `PB`, `WA`, `SM`. |
| 21 | `docs/apis/business-to-pochi/overview.md` | Pochi la Biashara disbursement request parameters. | **ADAPTER-ONLY / DEFERRED.** No dispatch; official enablement + approval required. |
| 22 | `docs/apis/ratiba/overview.md` | Standing orders / recurring payment create, manage and cancel. | **ADAPTER-ONLY / DEFERRED.** No dispatch; official enablement + approval required. |
| 23 | `docs/apis/tax-remittance/overview.md` | KRA corporate tax/VAT remittance request parameters. | **ADAPTER-ONLY / DEFERRED.** No dispatch; official enablement + approval required. |

### Out-of-scope API page (1)

| # | Relative path | One-line purpose | Disposition |
|---|---|---|---|
| 24 | `docs/apis/bill-manager/overview.md` | Three Bill Manager invoice examples (opt-in/create/reconcile), no request/response schemas. | **DEFERRED — NO ADAPTER.** Building a payload would mean inventing shapes; official contract required. |

### Language examples (3)

| # | Relative path | One-line purpose | Disposition |
|---|---|---|---|
| 25 | `examples/nodejs.md` | Fetch-based OAuth, timestamp/password derivation and STK request in Node.js. | **VERIFICATION ONLY.** Cross-checks the shipped adapter semantics. |
| 26 | `examples/curl.md` | Same OAuth + STK flow expressed as cURL commands. | **VERIFICATION ONLY.** Confirms canonical field names; no sample credentials copied. |
| 27 | `examples/python.md` | Python `requests` equivalent of OAuth + STK and password derivation. | **VERIFICATION ONLY.** No Python code imported. |

## Implementation status (code complete, not production-ready)

Statuses below describe code in this checkout under the canonical Phase 7 status
**Implemented (code complete)**; they imply nothing about live enablement or
deployment.

| Area | Status | What actually exists |
|---|---|---|
| OAuth + environment split | CODE COMPLETE | `darajaPayouts.ts` caches a single-flight token keyed by env/identity; tokens refresh 300s before expiry (the guide's five-minute guidance), matching the STK cache. Live HTTPS callback URLs enforced. `MPESA_ENV` accepts `live` and `production`. |
| STK push, query, callback decoding | CODE COMPLETE + HARDENED | `mpesaService.ts` handles password/timestamp, `CheckoutRequestID`, and one-shot status recovery. `darajaTimestamp()` pins `YYYYMMDDHHmmss` to `Africa/Nairobi` (EAT, UTC+3) via `Intl`, not server-local time — the pack's Node sample (`toISOString()`) and Python sample (`datetime.now()`) disagree, so the IANA zone is authoritative. Live callbacks validated as HTTPS before OAuth; non-2xx upstream responses do not echo raw bodies. |
| B2C / B2B disbursement | CODE COMPLETE | Safaricom-compatible **v3** `paymentrequest` paths, RSA-encrypted initiator credential, CommandID allowlists. See C1/C1b. |
| Transaction status / reversal | CODE COMPLETE | `/mpesa/transactionstatus/v1/query`; `/mpesa/reversal/v1/request` with `ReceiverParty` / `RecieverIdentifierType` (see C2). |
| Account balance | CODE COMPLETE — REVIEW ONLY | `queryAccountBalance()` posts `/mpesa/accountbalance/v1/query`; the result callback emits `DARAJA_ACCOUNT_BALANCE_REVIEW` ProviderEvents + AuditLog rows with `reviewOnly: true` / `autoSettlement: false`. `MPESA_BALANCE` is a preflight catalogue action. No ledger or settlement is driven from it. |
| C2B URL registration / sandbox simulation | CODE COMPLETE + TOKEN-GATED | `registerC2bUrls()` and sandbox-only `simulateC2b()`. Registered validation/confirmation URLs carry `MPESA_CALLBACK_TOKEN` as a query parameter; local validation fails closed before OAuth when the token is absent. Registration is only through the authenticated `/v1/payments/mpesa/c2b/register` admin route. |
| C2B validation / confirmation | CODE COMPLETE — RECORD ONLY | Both callbacks pass the same constant-time token gate, acknowledge immediately, and are retained as immutable ProviderEvents with actor-audited rows. Dedupe ids are body hashes (validation/malformed) or `TransID` (confirmation) — never phone/name. Confirmations are **manual review only**. |
| C2B reconciliation / auto-settlement | **READ-ONLY REVIEW AID — NO AUTO-SETTLEMENT** | Confirmations stay `PROCESSED` review records; nothing auto-settles and no scheduled job writes anything. A SUPER_ADMIN/ADMIN/MANAGER-gated `GET /v1/admin/finance/reconciliation/c2b/review` now surfaces **suggestions only**: `c2bMatching.ts` consumes the stored `matchKey: 'BillRefNumber'` / `matchValue` hook, matches case/whitespace-insensitively against `Invoice.number` + `publicReference`, cross-checks the amount (advisory `AMOUNT_MISMATCH`), flags unknown/missing references as `UNMATCHED`, and never writes, posts to the ledger or settles. Audited via `finance.reconciliation.c2b_review`. Any actual settlement remains a separately approved manual finance action. |
| Dynamic QR | CODE COMPLETE + VALIDATED | `generateMpesaQr()` with documented payload, optional callback URL and locally allowlisted `TrxCode` (`BG`, `PB`, `WA`, `SM`). |
| Payout result callbacks | CODE COMPLETE + HARDENED | Constant-time shared-token gate, immediate 200 ack, `callbackDedupeId()`, `recordProviderEvent()` dedupe, amount cross-check, terminal-state replay guard, generic `DARAJA_CALLBACK_RECEIVED` audit, redacted auth headers. `signatureValid: false` + `authMethod: 'SHARED_CALLBACK_TOKEN'` throughout. |
| Community error hints | CODE COMPLETE + EXPANDED | `darajaHttpHint()` / `darajaResultHint()` map the four documented diagnostics plus reviewed Safaricom-compatible codes (`1001`, `1032`, `2001`, `400.002.02`, `400.002.05`, `403.002.01`) to non-secret hints. |
| Pochi / standing orders / tax remittance | **ADAPTER-ONLY / DEFERRED** | Canonical paths/keys are implemented with mocked tests, but entries are unavailable and inert: no dispatch path or public/admin money-moving route. Requires official Safaricom enablement **and** capability approval. |
| Bill Manager | **DEFERRED — NO ADAPTER** | Pack provides only three endpoint examples and no schemas. Needs the official payload contract before any adapter or route exists. |
| USSD | **NOT IN PACK — NOT INVENTED** | No USSD reference appears in the 27 files. No endpoint or payload was guessed. |

## Adapter-only and deferred capabilities

These are visible in the Finance Hub only as unavailable entries with an explicit
reason; they are not routing options and must not be presented as enabled:

| Capability | Catalogue id | State | Gate |
|---|---|---|---|
| Pochi la Biashara payout | `MPESA_POCHI` | Adapter only, inert | Official Safaricom enablement + capability approval |
| Standing order / Ratiba | `MPESA_STANDING_ORDER` | Adapter only, inert | Official Safaricom enablement + capability approval |
| Tax remittance | `MPESA_TAX_REMITTANCE` | Adapter only, inert | Official Safaricom enablement + capability approval |
| Bill Manager / invoicing | — (no entry) | Not implemented | Official payload contract + enablement/approval |

## Callback safety contract (unchanged guards, added audit)

1. `MPESA_CALLBACK_TOKEN` must be configured; missing → 503, wrong → 403.
   Both `?token=` and `X-Callback-Token` are accepted; the header form is
   preferred for manual tests so the shared secret need not appear in access
   logs. Registered C2B URLs necessarily carry the token as a query parameter;
   **never log, echo or document those tokenized URLs**.
2. Respond `{ ResultCode: 0, ResultDesc: 'Accepted' }` immediately; all DB work
   follows the ack so Daraja retries are harmless.
3. Dedupe key comes from `callbackDedupeId()`: `CheckoutRequestID` first for
   STK-shaped bodies, then `OriginatorConversationID`, `ConversationID`,
   `TransID`, `TransactionID`, then a raw-body hash. Phone numbers/names are
   never keys.
4. Amount cross-check compares the decoded amount to the stored payout; a
   mismatch creates `DARAJA_AMOUNT_MISMATCH` and leaves the payout `PENDING`.
5. Terminal-state guard: only `PENDING` payouts transition. Replays after
   `COMPLETED` / `FAILED` create no second settlement.
6. Audit rows record receipt, balance review, mismatch and settlement/failure.
   Auth headers (`authorization`, `cookie`, `set-cookie`, `x-callback-token`)
   are stripped before callback headers are persisted.
7. C2B registration appends the shared token to both callback URLs and fails
   closed before OAuth when `MPESA_CALLBACK_TOKEN` is absent. C2B callbacks use
   the same gate, respond before any database work, hash the raw body into a
   32-hex dedupe suffix (or use `TransID` for confirmations), and write an
   actor-free `DARAJA_C2B_CALLBACK_RECEIVED` audit row. Confirmations stay
   `PROCESSED` **manual-review records with no ledger effect**.
8. STK recovery is one delayed one-shot job after seven minutes. There is no
   polling loop and no rescheduling; settlement requires an explicit terminal
   result with an amount match.

## Reconciled and retained conflicts

| ID | Item | Community pack / prior code value | Canonical contract used now | Decision |
|---|---|---|---|---|
| C1 | B2B payment path | Pack: `/mpesa/b2b/v1/paymentrequest` | Code/tests: `/mpesa/b2b/v3/paymentrequest` | **Conflict retained, code unchanged.** v3 is the Safaricom-compatible path already chosen; pack is non-authoritative. |
| C1b | B2C payment path | Pack: `/mpesa/b2c/v1/paymentrequest` | Code/tests: `/mpesa/b2c/v3/paymentrequest` | Same as C1. |
| C2 | Reversal path/keys | Pack: `/mpesa/reversal/v1/index`, `ReceiverShortCode` | Code: `/mpesa/reversal/v1/request`, `ReceiverParty`, `RecieverIdentifierType` | Existing Safaricom contract retained. |
| C3 | Tax remittance path | Pack + prior code: `/mpesa/tax/v1/remit` | `/mpesa/b2b/v1/remittax` | Patched in `darajaPayouts.ts`; capability remains adapter-only/deferred. |
| C4 | Pochi payload | Pack + prior code: `BusinessPaymentToPochi`, `Initiator`, `Occasion` | `BusinessPayToPochi`, `InitiatorName`, `Occassion` | Patched in `darajaPayouts.ts`; capability remains adapter-only/deferred. |
| C5 | Standing-order path | Pack + prior code: `/mpesa/ratiba/v1/subscribe` | `/standingorder/v1/createStandingOrderExternal` | Patched; no `/mpesa` prefix added. Capability remains adapter-only/deferred. |
| C6 | Callback signature claims | Prior rows claimed `signatureValid: true` behind the shared token | `signatureValid: false` + `authMethod: 'SHARED_CALLBACK_TOKEN'` | Patched in `mpesa-callbacks.ts` and the separate STK callback in `billing/routes/payments.ts`; C2B events use the same explicit `false` value. Possession of a shared token is authentication, never a verified signature. |
| C7 | Bill Manager shapes | Pack gives only three endpoint examples | None | Not implemented; official payload contract required before code. |

## Configuration (137-key vault)

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
MPESA_REVERSAL_QUEUE_URL      # reversal QueueTimeOutURL — key read by code
MPESA_REVERSAL_RESULT_URL     # reversal ResultURL — key read by code
MPESA_QR_MERCHANT_NAME
MPESA_QR_TRANSACTION_TYPE
MPESA_QR_CALLBACK_URL
```

**Key reconciliation.** Earlier revisions of this plan named
`MPESA_REVERSAL_TIMEOUT_URL` as the reversal timeout key. Code does **not** read
that key: `darajaPayouts.ts` resolves `QueueTimeOutURL` from
`MPESA_REVERSAL_QUEUE_URL` and `ResultURL` from `MPESA_REVERSAL_RESULT_URL`.
`MPESA_REVERSAL_TIMEOUT_URL` remains registered in the 137-key vault but is
legacy/unused — do not treat it as the live queue-timeout configuration.
`MPESA_BALANCE_QUEUE_URL` / `MPESA_BALANCE_RESULT_URL` and
`MPESA_STATUS_RESULT_URL` are the read-only balance and status result keys.

All callback URLs must be HTTPS in production. Keep `MPESA_CALLBACK_TOKEN`
secret and rotate it; update every configured callback URL when it changes.
`registerC2bUrls()` appends the token to the registered validation and confirmation
URLs and fails closed before OAuth if it is missing. Prefer `X-Callback-Token`
for manual callback tests so the shared secret does not land in access logs;
registered Daraja URLs necessarily carry it as a query parameter and must
**never be logged or echoed**.

## Production enablement checklist (not performed by this documentation pass)

1. Reconfirm C1, C1b and C3-C5 against the official Daraja portal.
2. Obtain official Bill Manager payload schemas before implementing that adapter.
3. Configure distinct queue-timeout and result URLs (`MPESA_REVERSAL_QUEUE_URL`
   and `MPESA_REVERSAL_RESULT_URL` for reversals); never collapse them into one endpoint.
4. Register C2B validation/confirmation URLs with the tokenized paths produced by
   `registerC2bUrls()` and verify the immediate `ResultCode` response; never log
   the registered URLs because they contain the shared callback token.
5. Confirm production IP allowlisting, HTTPS callbacks and initiator certificate validity.
6. Run one sandbox STK transaction, one C2B simulation, one B2C payout, one status query and one reversal; verify ProviderEvent dedupe, redacted callback headers, audited C2B receipt, and no ledger post from the balance-review or confirmation events.
7. Allow 60 seconds before showing an STK failure in the web UI; use the one-shot delayed seven-minute STK recovery worker before declaring a lost webhook — never poll or reschedule.
8. Treat C2B confirmations as manual review until a separately approved reconciliation job exists.
9. Confirm QR `TrxCode` values against the live shortcode before enabling the
   admin QR action; the adapter accepts only `BG`, `PB`, `WA` and `SM`.
10. Obtain official enablement and capability approval before exposing Pochi,
    standing orders, tax remittance or Bill Manager; they remain inert until then.

## Closeout verification (code audit)

- Focused Phase 7 suites pass 7 files / 125 tests with a dummy
  `TEST_DATABASE_URL`; they cover tokenized C2B registration, fail-closed
  callback tokens, immediate C2B acknowledgement, hashed dedupe ids, read-only
  confirmations, HTTPS STK callback validation, redacted upstream errors, QR
  code validation, result hints, `MPESA_BALANCE`, STK recovery, booking deposits
  and explicit-consent Meta CAPI dispatch.
- The full mocked backend suite passes **66 files / 606 tests** (no skips in the
  final run); `test/integration.spec.ts` still needs a real disposable
  `TEST_DATABASE_URL` and is not claimed here. Backend `tsc --noEmit`,
  workspace typechecks, both production builds, `pnpm lint`, the i18n suite and
  the 137-key config dry-run are reported in the canonical plan.
- The additive migration `20261122210000_phase7_completion` **is applied** to
  the live Neon branch (19 tables + 10 columns verified read-only on
  2026-11-23). The permission/config seed is still unapplied. Status remains
  **Implemented (code complete)**, not production-ready.

## Disclaimer

The local pack is a developer aid, not the authoritative API reference. Any
unresolved conflict must be resolved in favour of the official Safaricom Daraja
portal before live credentials are used. This inventory describes the 27 files
available locally; it does not assert that they cover every Daraja product.
