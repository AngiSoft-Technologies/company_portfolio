# Security Policy

> **🛠 OPERATIONAL** — Current security contacts and policy.<br>
> **Phase 5.2 audit status:** the P0 findings listed in `ANGISOFT_DIGITAL_HQ_PLAN.md` §2/§13 are resolved — CSRF double-submit is mounted on all `/api` (`shared/middleware/csrf`), chatbot admin endpoints require `chatbot.view_all`, effective permissions enforce explicit-DENY precedence over the SUPER_ADMIN wildcard (`identity/services/effectivePermissions`, covered by `test/require-access.spec.ts`), backend specs mock the Prisma facade and never touch production, and route shadowing was fixed during module mounts. Additional hardening shipped: granular `support_tickets.*`/`expenses.*`/`leave.*`/`quotes.approve` permissions, approval thresholds with self-review blocks, signature-verified Stripe/Paystack webhooks, shared-secret + amount cross-checks on unsigned M-Pesa/PayHero callbacks, `publicFormLimiter` on all public POST endpoints, `SameSite=Strict` refresh cookie via same-origin Netlify proxying. See `docs/ANGISOFT_CAPABILITY_MAP.md` §Phase 5.2 for the running audit log.

## Reporting a vulnerability
If you discover a security vulnerability in this project, please report it privately by emailing **security@angisoft.co.ke** with the subject line "[angisoft.co.ke] Security vulnerability" and include as much detail as possible (steps to reproduce, affected versions, and any suggested fixes).

Please do not open a public issue or disclose the vulnerability publicly before we have had a chance to address it.

## Response
We will acknowledge receipt within 48 hours and work to provide a fix or mitigation as quickly as possible.

## Supported versions
Use the repository's tags and releases to determine which versions are supported. If your report affects a supported release, we will coordinate a disclosure once a fix is available.

## Credit
If you would like to be credited for responsibly reporting a vulnerability, please mention how you would like your name to appear in the disclosure email.
