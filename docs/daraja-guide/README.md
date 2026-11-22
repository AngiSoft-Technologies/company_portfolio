# Daraja Developer Guide (vendored reference)

This directory is a **verbatim, vendored copy** of the community-maintained guide
originally located at `file:///home/prof_angera/Projects/mpesa-ultimate-daraja-guide-main`.
It is kept in-repo so the Finance/Payments modules can benefit from the worked
examples, error codes and flow explanations without depending on a local path.

> **⚠️ Non-authoritative.** This is a *community* guide, not Safaricom official
> documentation. Where it conflicts with Safaricom's published Daraja docs, the
> official docs win. Where it conflicts with an AngiSoft decision already made,
> the recorded decision wins (see the conflict register below).

## How to use this

1. **`../DARAJA_RESOURCE_UTILIZATION_PLAN.md`** is the *authoritative* inventory:
   it maps every one of these 27 files to a disposition (USED / REVIEW ONLY /
   ADAPTER-ONLY / DEFERRED) and records conflict decisions **C1–C7**.
2. Read the specific file you need, then check the utilization plan's row for it
   before writing or changing code. A file being present here does **not** mean
   its capability is enabled.
3. Never copy request/response fields, endpoint paths, codes or amounts from
   these docs into a money-moving path without cross-checking the official
   Safaricom contract and the conflict register.

## Contents

| Path | What it covers |
| --- | --- |
| `docs/getting-started/` | Auth (OAuth token, timestamp/password generation) and intro. |
| `docs/apis/stk-push/` | STK push overview, request, response, callbacks, examples and errors. |
| `docs/apis/c2b/`, `b2c/`, `b2b/` | Customer-to-business, business-to-customer and business-to-business flows. |
| `docs/apis/account-balance/`, `transaction-status/`, `reversal/`, `qr-code/` | Read/status, reversal and QR capabilities. |
| `docs/apis/business-to-pochi/`, `ratiba/`, `tax-remittance/`, `bill-manager/` | Adapter-only/deferred capabilities — **inert** until official Safaricom enablement plus approval. |
| `guides/` | Common errors, callback mechanics, sandbox-vs-production, STK flow. |
| `examples/` | curl, Node.js and Python examples (reference only — do not lift credentials). |
| `UPSTREAM-README.md` | The original upstream README, preserved verbatim. |

## Decisions that override this guide

- **C1** — `MPESA_ENV` accepts `live` or `production`; community pack is non-authoritative.
- **C2** — Safaricom-compatible paths retained; no `/mpesa-extended`, `/api` or `/v1/payments/daraja`.
- **C3** — Amount validation is integer/whole-number aware; MSISDN normalized to `^254[1-9]\d{8}$`.
- **C4** — Daraja callbacks require constant-time `MPESA_CALLBACK_TOKEN`, immediate 200 ack and ProviderEvent dedupe.
- **C5** — C2B confirmations are manual-review only (`PROCESSED` ProviderEvents), never auto-settle.
- **C6** — STK recovery is one delayed one-shot job after 7 minutes — never polling or rescheduling.
- **C7** — Pochi / standing orders (Ratiba) / tax remittance / Bill Manager stay adapter-only and `available: false` until official enablement and approval.

Credentials, passkeys and tokens are **never** copied from these examples into
source code or committed. See `../SECRETS_ARCHITECTURE.md`.
