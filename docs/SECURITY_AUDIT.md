# Security Audit

> **🛠 OPERATIONAL — PARTIAL AUDIT.** A dated, evidence-backed source/tool audit now exists at [`security/OWASP_AUDIT.md`](security/OWASP_AUDIT.md). It is **not** a passed audit: no exploit was validated against a running staging target, and Strix could not complete. Do **not** cite this document or the OWASP report as evidence of Phase 5.2 signoff.
>
> Required by `ANGISOFT_DIGITAL_HQ_PLAN.md` §4 Phase 5.2 and §14 (Phase 5 metric: "zero critical security findings"). Current status in `PRODUCTION_READINESS.md` §2/§6: **PARTIAL**.

---

## 1. Status

| Field | Value |
|---|---|
| Scan performed | **PARTIAL — source/tool audit only** |
| Scan date | 2026-11-23 (UTC) |
| Scope | Monorepo source, dependency manifest, git history, static route guards; no running staging target |
| Tool / version | Strix 1.6.2 (failed: EOL model / missing credentials), `pnpm audit --prod`, Gitleaks, custom route/sink greps |
| Findings (critical / high / medium / low) | **0 exploit-validated**; SCA at original scan **0 / 22 / 75 / 13**, after 2026-11-23 targeted remediation **0 / 1 / 3 / 0**; 4 unvalidated static observations |
| Report artifact | [`docs/security/OWASP_AUDIT.md`](security/OWASP_AUDIT.md); raw evidence paths listed in its §6 |
| Sign-off | **Not signed off** — live exploit-validated audit still required |

## 2. What is already known (code-level hardening, NOT a substitute for a scan)

These controls are verified in code; they are listed so the eventual audit has a starting surface:

- CSRF double-submit mounted in `backend/src/app.ts:215-220`; helmet CSP, CORS credentials, sanitize middleware.
- Explicit DENY beats every grant path including the SUPER_ADMIN wildcard (`modules/identity/services/effectivePermissions.ts`, `shared/middleware/roles.ts:41-62`); regression specs in `backend/test/security.spec.ts` and `require-access.spec.ts`.
- Chatbot admin endpoints guarded with `requireAuth` + `chatbot.view_all`; public JSON cache bypasses any authenticated context (`shared/middleware/cache.ts`).
- Public unauthenticated POSTs behind `publicFormLimiter` (30 req/10min/IP).
- Payment callbacks token-gated/amount-checked; Stripe/Paystack signature verification; webhook raw-body capture in `app.ts:170-179`.
- MFA UI + 16 backend endpoints (`modules/identity/routes/mfa.ts`); forced enrollment before dashboard access.
- Money-movement actions require HIGH permissions, audit and approval where applicable (plan §18.2).
- Integration tests isolated from production via `TEST_DATABASE_URL` guard (`connectionUrl.ts`).

**Remediated during closeout (2026-11-23):** OBS-01 — public chat history now requires a device fingerprint, anchors every query to it, rate-limits history, and refuses to reuse a conversation by UUID alone (`backend/src/modules/ai/utils/chatAccess.ts`, `chatbot.ts`; `chatAccess.spec.ts`). OBS-02 — the generic settings CRUD mount now requires `requireAuth` + `requireAccess('administration.settings', ['ADMIN','SUPER_ADMIN'])` in `backend/src/app.ts`; `route-guards.spec.ts` asserts the mount.

**Known open security-adjacent items:** permission seed not applied in production (16 legacy keys vs 213 in code); webhook credential rotation outstanding; scoped authorization checks are centralised in `modules/identity/services/effectivePermissions.ts` (`assertAssigned` / `checkAssigned` / `isAssigned`) and used by the scoped routes (`ANGISOFT_ASSIGNMENT_SCOPE_MATRIX.md`, `test/assignmentScope.spec.ts`); live exploit validation unavailable. Targeted dependency remediation reduced `pnpm audit --prod` from **81 (0/11/58/12)** immediately before the Vite 8 migration, through **4**, to **0 advisories (0 critical / 0 high / 0 moderate / 0 low)** after the Zod 4 migration + scoped overrides (`/tmp/opencode/audit-prod-moderate-overrides.json`); the intermediate 4-advisory and 1-high/3-moderate snapshots are historical. A **blocking tracked-tree gitleaks CI gate** now exists with 12 verified placeholder/prose fingerprints; local rerun via `scripts/scan-secrets.sh` exits 0 with no leaks (`/tmp/opencode/gitleaks-main-verify.out`). These are tool gates, not an exploit-validated live audit. See `security/OWASP_AUDIT.md` §2.2.

## 3. Required audit plan (to be executed before release signoff)

1. **Scope:** all `/v1/*` routes (**100 `app.use('/v1…')` mounts in `backend/src/app.ts` plus the `app.post('/v1/admin/revoke/:employeeId', …)` handler**), both frontends, Socket.IO rooms, webhook receivers, background workers, and the admin `/settings/vault` surface.
2. **OWASP Top 10 (2025)** — test each category with a proof-of-concept, not a static signature: broken access control (IDOR on `/v1/admin/staff/:id/access`, booking/quote/invoice IDs), security misconfiguration (CSP/CORS/helmet), injection (SQL via contract queries, command/path via uploads), cryptographic failures (secret envelope, JWT/refresh), auth failures (MFA bypass, token refresh), logging failures, and mishandling of exceptional conditions.
3. **API Security Top 10 (2023)** — BOLA, BFLA, BOPLA/mass assignment, unrestricted resource consumption (chatbot, uploads, public JSON cache), SSRF (provider adapter URLs), and auth/token flaws.
4. **Tools:** run an autonomous exploit-based scanner (e.g. Strix against the live staging URL and the repository) **and** a conventional DAST pass (OWASP ZAP baseline) plus `npm audit`/dependency review. Preserve the machine-readable output.
5. **Evidence to attach here:** SARIF/ZAP/Strix report files under `docs/security-evidence/`, date, commit SHA, environment, list of exploitable findings with PoC requests, remediation owner, and re-test result.
6. **Gate:** plan §14 Phase 5 requires zero critical findings and no unresolved high findings on auth/money paths. The PARTIAL report is attached, with **0 exploit-validated findings**; `pnpm audit --prod` is now at **0 advisories** and a **blocking gitleaks secret-scan CI gate** passes locally with no leaks — but neither is an authorized exploit-validated live scan. Until one with test accounts is attached and this header is updated to a dated, signed result, `PRODUCTION_READINESS.md` keeps the security audit at **PARTIAL / NOT SIGNED OFF**.

## 4. Re-test checklist after remediation

- [ ] Re-run the same scanner with the same scope; attach new artifact.
- [ ] Confirm CSRF, DENY-precedence, cache-isolation, route-guard and permission-registry specs still pass.
- [ ] Verify the production `Permission` seed count matches the registry (currently 16 vs 213 — blocker).
- [ ] Verify webhook tokens rotated and provider secrets live only in the vault/Fly secrets.
- [ ] Update this document's status table and the `PRODUCTION_READINESS.md` gate row.

---

> **Reminder:** this file now points to a real but PARTIAL audit. A source/tool audit with zero exploit-validated findings is not a passed security audit.
