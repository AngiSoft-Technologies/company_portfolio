# Application Security Audit — OWASP Top 10 (2025) / OWASP API Security Top 10 (2023)

**Status: PARTIAL — code-and-tooling audit only. No exploit was executed against a running application and no Strix findings were produced. This is NOT a full OWASP audit and must not be reported as one.**

- Date (UTC): 2026-11-23
- Repository: `robust-portfolio` (HEAD `4eb15ef4057dca5e529f8afee4127fcce8cdadec` at start of audit)
- Working tree: dirty (other agents' in-progress i18n/docs changes); audit was read-only against the repo. Strix was pointed at an isolated copy under `/tmp/opencode/security-scan-src`.
- `docs/SECURITY.md`: **not present** (checked; no file created outside `docs/security/`).
- Evidence log: `/tmp/opencode/security-audit-log.txt` (full commands, output, and failures). One cached LLM key was accidentally printed by `set -x` during a Strix retry; it was redacted from the log with `sed` and the redaction is recorded in the log. No secret is reproduced in this document. **That log and the first-round gitleaks reports are no longer present in this environment**; they were not recreated and are not relied on for the follow-up verification below. Currently present evidence is indexed in §6.
- Same-day remediation follow-up (2026-11-23): Zod 4 migration, three scoped transitive overrides, a blocking gitleaks CI gate, a local offline scan script, `.gitleaksignore`, and local OBS-03 triage were completed. These are code/CI/SCA changes only; **no live validation was added**.
- Authorization: repository is owned by the project; production URLs and live infrastructure were **not** touched. No destructive commands were run against deployment targets.

---

## 1. Asset map (from the repo, no live target supplied)

| Asset | Detail |
|---|---|
| Source | Single pnpm/Turbo monorepo: `frontend/web`, `frontend/admin`, `backend`, `packages/*` |
| Backend | Express + TypeScript, REST under `/v1`, Prisma 8 contract client, Neon Postgres, Redis/Upstash; modules under `backend/src/modules/`, cross-cutting guards under `backend/src/shared/middleware/` |
| Frontends | React 19 + Vite; admin JWT in memory + refresh cookie; public site uses `/v1/*` |
| Auth | Employee JWT (`requireAuth`), client-portal JWT (`requireClientAuth`), booking tokens, refresh cookie + double-submit CSRF |
| Running environment | None provided. No staging URL, no test accounts, no admin credentials. Production explicitly out of scope. |
| API schema | No OpenAPI/GraphQL file was supplied to the tooling |
| Constraints | No source modifications; no live testing; docs writes limited to `docs/security/` |

Because there is no running instance and no second tenant/user account, BOLA/privilege-escalation categories cannot be validated. Every application-logic item below is an **unvalidated static observation**, not a proven exploit.

---

## 2. Tool attempts and exact results

### 2.1 Strix white-box scan — ATTEMPTED, FAILED (no report produced)

Environment probe (extract):

```
strix: /home/prof_angera/.local/bin/strix
docker: /usr/bin/docker
strix 1.6.2
docker server: 29.10.0
STRIX_LLM: unset        LLM_API_KEY: unset       OPENAI_API_KEY: unset
ANTHROPIC_API_KEY: unset  STRIX_API_KEY: unset    STRIX_TOKEN: unset
strix cloud whoami -> {"signed_in": false, "error": "Not signed in"}  [exit 1]
~/.strix/cli-config.json keys: ["env"] -> LLM_API_KEY, OPENAI_API_BASE, STRIX_LLM
```

Managed cloud was **not** used: `strix cloud whoami` reports not signed in, and no keys were requested. The local CLI config did contain a cached LLM credential, so self-hosted scans were attempted.

| # | Command (abridged; full text in log) | Result |
|---|---|---|
| 1 | `timeout 900 strix -n -t ./security-scan-src --scan-mode standard --scope-mode full --max-budget 15 --max-turns 100 ...` | Stuck at `Pulling image ghcr.io/usestrix/strix-sandbox:1.3.0`; killed by timeout (`exit 124`). A separate `docker images` showed no image. |
| 2 | `timeout 240 docker pull ghcr.io/usestrix/strix-sandbox:1.3.0` | Also timed out (`exit 124`) at `1.3.0: Pulling from usestrix/strix-sandbox`. |
| 3 | Background `timeout 1800 docker pull ...` | **Succeeded**: `Digest: sha256:f6906c…`, `Status: Downloaded newer image`. |
| 4 | Re-ran the same Strix scan | Reached model setup, then failed: `MODEL QUALITY WARNING … 'openai/openai/gpt-oss-20b'` followed by `LLM CONNECTION FAILED … Error code: 410 … The model 'openai/gpt-oss-20b' has reached its end of life on 2026-11-18T08:00:00Z and is no longer available.` (`exit 1`). |
| 5 | `STRIX_LLM=openai/gpt-5.4 strix …` (reusing cached config) | `LLM CONNECTION FAILED … Missing credentials. Please pass an api_key … or set the OPENAI_API_KEY …` (`exit 1`). |
| 6 | Listed models from the cached NVIDIA endpoint, then `OPENAI_API_KEY=<cached> OPENAI_BASE_URL=<cached> STRIX_LLM=openai/z-ai/glm-5.3-flash strix …` | `LLM CONNECTION FAILED` with an empty error detail (`exit 1`). |

No `strix_runs/` directory, `penetration_test_report.md`, `vulnerabilities.json`, or SARIF was produced. **Therefore zero Strix-validated findings exist for this audit.**

### 2.2 Dependency audit — RAN (SCA evidence only)

```
$ pnpm audit --prod --json
pnpm audit --json exit: 1
$ jq '.metadata.vulnerabilities'
{ "info": 0, "low": 13, "moderate": 75, "high": 22, "critical": 0 }

$ pnpm audit --prod
110 vulnerabilities found
Severity: 13 low | 75 moderate | 22 high
```

Notable high-severity entries (advisory titles/paths as printed):

- `nodemailer` — raw message option bypasses file/URL access restrictions (GHSA-p6gq-j5cr-w38f); address-parser DoS advisories (GHSA-2x7j-588g-ccc2, GHSA-v53p-9fqp-m79j). Direct dependency `backend>nodemailer`.
- `@modelcontextprotocol/sdk` — multiple advisories (GHSA-6qxp-vccf-f47h, GHSA-22jm-h49p-29qw, GHSA-46jr-4wx8-v453, GHSA-f897-62hf-6gxq). Direct dependency `backend>@modelcontextprotocol/sdk`.
- `multer` — pending async fileFilter DoS after request teardown (GHSA-q7qp-rjg7-q26m). Direct dependency `backend>multer`.
- `zod` — memory exhaustion on oversized constrained collections (GHSA-mrhx-c7xc-m3w5). Direct `backend>zod`.
- `body-parser` (via Express) — DoS via trailing bytes after compressed body (GHSA-27r3-jxmh-p828).
- `dompurify` — low-severity hook-handler issue (GHSA-mrv2-3pqr-j5jr), used by both frontends for blog HTML sanitization.
- Many transitive Prisma/alchemy/hono/vite/undici entries; not reachable application code in this review.

SCA output is **not** proof of exploitability. It maps to OWASP 2025 **A03 Software Supply Chain Failures**.

#### 2.2.1 Targeted remediation follow-up (2026-11-23)

After the Vite 8 / Tailwind 4 first-party plugin migration, the Zod 4 migration and three further scoped transitive overrides were completed. `pnpm audit --prod --json` now reports **0 advisories: 0 critical / 0 high / 0 moderate / 0 low** (`/tmp/opencode/audit-prod-moderate-overrides.json`, 455 production dependencies). Progress: 110 advisories (22 high) at the original scan → 81 before the first override round → 4 after the first override round (`/tmp/opencode/audit-prod-after-overrides.json`: 1 high `zod` + 3 moderate) → 3 after Zod 4 (`/tmp/opencode/audit-prod-zod4.json`: 3 moderate) → 0 after the final scoped overrides.

- **Fixed — direct dependencies:** `zod` is `^4.6.7` in `backend/package.json` and all 79 backend import sites were migrated; `dompurify` is `^3.4.17` in both frontends; `nodemailer`, `@modelcontextprotocol/sdk`, `multer`, and `body-parser` were already upgraded.
- **Fixed — Zod 4 verification:** backend TypeScript is clean (empty output in `/tmp/opencode/backend-tsc-zod4-fix.out`) and the mocked backend suite passes **55 files / 520 tests** (`/tmp/opencode/backend-tests-overrides.out`). These are local code/test results, not exploit validation.
- **Fixed — the three moderate transitive advisories:** scoped `pnpm-workspace.yaml` overrides pin `glob@13` → `14.0.2`, `minimatch@10` → `11.0.1`, and `@hono/node-server@1|2` → `2.1.6`. Earlier overrides (same file) pin patched `source-map-js`, `qs`, `undici`, `fast-uri`, `ip-address`, `fast-xml-parser`, `valibot`, `@vitest/mocker`, `sharp`, `lodash`, `hono@4`, and the two Express `body-parser` trees. Local Prisma/MCP smoke output is kept at `/tmp/opencode/prisma-generate-overrides2.out`, `/tmp/opencode/prisma-contract-emit.out`, and `/tmp/opencode/mcp-import-overrides2.out`; live CLI/provider compatibility is not claimed.
- **Full local gate after remediation:** `pnpm install` exit 0 (`/tmp/opencode/pnpm-install-moderate-overrides.out`), `pnpm typecheck` 12/12 (`/tmp/opencode/typecheck-overrides.out`), `pnpm lint` 12/12 with 0 errors (`/tmp/opencode/lint-overrides.out`), `pnpm build` 3/3 (`/tmp/opencode/build-overrides.out`), web tests 4 files / 35 tests (`/tmp/opencode/web-tests-final-zod4.out`), E2E 11/11 (`/tmp/opencode/e2e-final-zod4.out`).

**Interpretation:** "0 advisories" is dependency-graph evidence (SCA) only. It does not prove exploitability or absence of vulnerabilities in application code, and build provenance/CI trust was not assessed. `pnpm peers check` still reports pre-existing optional Prisma toolchain peer gaps (`/tmp/opencode/peers-check.out`); these are build-time dependencies, not request-path code.

### 2.3 Secret scanning — RAN

```
$ gitleaks detect --no-banner --redact --exit-code 0 --report-format json \
    --report-path /tmp/opencode/gitleaks-git-report.json --source <repo>
133 commits scanned.
scanned ~43560477 bytes (43.56 MB) in 1m46s
leaks found: 16
```

All 16 hits are in git history, not in current backend source:

- 14 in `docs/daraja-guide/**` (`generic-api-key`, `curl-auth-header`) — inspection shows sandbox placeholders (`YOUR_CONSUMER_KEY`, truncated `bfb279f9…yourpasskey`) and public sandbox shortcode `174379`; treated as **likely false positives**.
- 1 in `backend/IMPLEMENTATION_PLAN.txt` at historical commit `5ebadc4…` (`generic-api-key`).
- 1 `gcp-api-key` in deleted legacy file `frontend/src/js/firebase-config.js` at historical commit `5ebadc4…` — file is not in the current tree; **rotation status unknown**.

Additional checks:

```
$ gitleaks detect --no-git --no-banner --redact --max-target-megabytes 2 \
    --report-path /tmp/opencode/gitleaks-src-report.json \
    --source /tmp/opencode/security-scan-src/backend/src
scanned ~4563797 bytes (4.56 MB) in 21.6s
no leaks found

$ git ls-files backend/.env
(empty — runtime .env is not tracked)
```

A whole-worktree `--no-git` scan timed out after 300 s and is recorded as a tool failure in the log; the targeted source scan completed. The original report files are no longer present in `/tmp/opencode`, so the 16-hit figure above is carried forward from the original audit record, not re-derived here.

#### 2.3.1 Local re-verification and CI gate (2026-11-23)

`gitleaks` 8.30.1 is installed locally, so the follow-up was re-run without network access or credentials:

```
$ gitleaks dir --no-banner --redact --max-target-megabytes 2 \
    --report-format json --report-path /tmp/opencode/gitleaks-tracked-baseline.json \
    /tmp/opencode/ci-scan-src   # export of tracked files only; .env is not tracked
leaks found: 15  (12 unique fingerprints; exit 1)
$ gitleaks dir --no-banner --redact --max-target-megabytes 2 \
    --report-format json --report-path /tmp/opencode/gitleaks-worktree-current.json .
leaks found: 41  (includes untracked backend/.env and .agents/ files; exit 1)
$ GITLEAKS_BIN=/usr/local/bin/gitleaks \
  GITLEAKS_REPORT_PATH=/tmp/opencode/gitleaks-local-after-doc.json \
  bash scripts/scan-secrets.sh
no leaks found (exit 0; /tmp/opencode/gitleaks-local-after-doc.json is [])
```

The 12 tracked-tree fingerprints were inspected individually. Eleven are Daraja **sandbox** examples: shortcode `174379`, passkeys containing literal `...yourpasskey`, and Base64 Basic auth that decodes to `your_consumer_key:your_consumer_secret` (plus `YOUR_ACCESS_TOKEN`); the guide explicitly states that credentials are not copied from these examples. The twelfth is a prose false positive in `backend/IMPLEMENTATION_PLAN.txt:279` (the phrase "private-key scaffolding", no credential value). Those exact fingerprints are the only entries in the new `.gitleaksignore`; no real secret or unknown hit was suppressed. Untracked local-only hits (`backend/.env`, `.agents/`) were **not** added to the ignore file and are absent from a CI checkout.

CI change: `.github/workflows/netlify-deploy.yml` now installs pinned `gitleaks` v8.30.1 with `go install`, adds `$(go env GOPATH)/bin` to `PATH`, and runs `bash scripts/scan-secrets.sh` as a **blocking** step before lint/typecheck/test/build/bundle-budget. This matches the deploy workflow's existing blocking quality-gate policy; it is deliberately stronger than the non-blocking Lighthouse budget in `perf-budget.yml`. The redacted JSON report is uploaded as an artifact on failure. The gate scans the checked-out working tree only — it does **not** scan git history, so the historical Firebase/GCP lead (OBS-03) remains a separate manual rotation check. `scripts/scan-secrets.sh` runs offline with an already-installed binary (no network, credentials, or dashboard); if gitleaks is missing it exits 127 with an install hint.

### 2.4 Static auth-gate / sink checks — RAN

`python3 /tmp/opencode/route-audit.py` listed mutating route registrations without an inline or file-level auth token. Review of the list showed that most are intentional public flows (bookings, leads, newsletter, surveys, auth/login/refresh, webhooks with signature/token checks) or use guards declared as variables (e.g. `...admin`, `...requireRoleManage`, `requireClientAuth`).

Additional sink grep:

```
$ rg -n '\$queryRawUnsafe|queryRawUnsafe|execSync|child_process|eval\(|new Function\(' backend/src
backend/src/shared/middleware/rateLimiter.ts:222:  const allowed = Number(await redis.eval(
```

Only the Redis Lua script was found; no raw SQL string building, shell execution, or JS dynamic evaluation in backend source. `rg -n 'fetch\([^)]*req\.|axios\.[a-z]+\([^)]*req\.' backend/src` returned no matches (no obvious direct user-controlled outbound URL in a single expression; a full taint analysis was not performed).

Positive controls observed in source (not exploitation-tested): `helmet` with CSP at `backend/src/app.ts:152`, CORS allowlist at `:166`, CSRF double-submit at `:219-220` and `csrf.ts`, token-type separation in `shared/middleware/auth.ts:18` and `client-portal.ts:45`, webhook verification in `finance/routes/webhooks.ts:43-56`, and cache poisoning guard in `shared/middleware/cache.ts:35-43`.

---

## 3. Findings

### 3.1 Exploit-validated findings

**None.** Strix did not run to completion and no live target was supplied. Nothing in this report may be described as a verified vulnerability or a passed OWASP category.

### 3.2 Unvalidated static observations (with proof-of-concept references)

These are review leads derived from source. The "PoC" columns describe requests that were **not executed**; they are references for a future authorized live test.

| ID | Observation | Evidence | PoC reference (not executed) | Mapping |
|---|---|---|---|---|
| OBS-01 | Chat conversation lookup accepts a UUID alone as the sole authorization factor. A party who learns/guesses a `conversationId` can read the full visitor transcript and append messages to that conversation. | `backend/src/modules/ai/routes/chatbot.ts:91-110` (schema refine allows `conversationId` alone), `:1050-1109` (history query by `id`), `:867-879` (chat reuses supplied `conversationId`; email mismatch check only applies when `visitorEmail` is supplied). | `POST /v1/chatbot/history` `{"conversationId":"<victim-uuid>"}` → transcript; `POST /v1/chatbot/chat` `{"conversationId":"<victim-uuid>","message":"…"}` → message appended. Requires knowing the UUID. | OWASP 2025 **A01 Broken Access Control**; API Security **API1 BOLA** |
| OBS-02 | Generic CRUD factory exposes create/update/delete with no role/permission check; the settings router mounts it behind `requireAuth` only, so any authenticated employee reaches the handlers. Current service is a stub that does not persist, so no impact is proven. | `backend/src/shared/utils/crud.ts:4-27`; `backend/src/modules/cms/routes/settings.ts:12-18`; `backend/src/app.ts:385` (`app.use('/v1/settings', requireAuth, settingsRouter())`). | With any employee bearer token: `POST /v1/settings {"key":"x","value":1}` / `PUT /v1/settings/x` reach the handler (currently 400/500 stub response). | OWASP 2025 **A01**; API Security **API5 Broken Function-Level Authorization** (also **API3** if the factory is reused with mass-assignable schemas) |
| OBS-03 | A `gcp-api-key` pattern was committed in a now-deleted legacy Firebase web config; a separate `generic-api-key` hit in an implementation plan was verified locally to be prose, not a credential. Rotation/validity **cannot be determined locally** and remains open. | Original gitleaks git report (file no longer present), commit `5ebadc4aec8fb231ec483fb35e621ad8439eb523`, `frontend/src/js/firebase-config.js:12`. Local re-check: `git show 5ebadc4:frontend/src/js/firebase-config.js` contains only standard Firebase web identifiers (`apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`, `measurementId`); the file was deleted in `8703ea5` and is absent from `git ls-files`. `git grep` across `backend/src`, `scripts`, `docs`, `.github`, `infrastructure` finds no Firebase/GCP credential references — only the JWT RS256 KMS comment (`backend/src/modules/identity/utils/token.ts:8`) and generic Gemini `x-goog-api-key` headers fed from configured API keys. Legacy `firebase.json` / `.firebaserc` remain tracked but contain a hosting config and project alias only. Current tracked-tree gitleaks scan: 0 leaks after the verified `.gitleaksignore` entries (`/tmp/opencode/gitleaks-local-after-doc.json`). | N/A — key validity/rotation must be checked in the provider dashboard, which was explicitly out of scope. No rotation was performed. | OWASP 2025 **A04 Cryptographic Failures** / **A02 Security Misconfiguration** |
| OBS-04 | A vulnerable DOMPurify version is used by both frontends for blog HTML rendering; SCA classifies it as low severity and no XSS payload was tested. | `pnpm audit` GHSA-mrv2-3pqr-j5jr; `frontend/web/src/features/marketing/components/blog/BlogArticleContent.tsx:37,50`; `blogContent.ts:9,96`. | Would require author-controlled HTML reaching the blog renderer; not exercised. | OWASP 2025 **A03 Software Supply Chain Failures** / **A05 Injection (XSS)** |

Observations that were checked and **not** treated as findings: webhook signature paths (fail-closed for `GENERIC` in production, shared-token checks on M-Pesa callbacks), token type separation, public JSON cache auth header guard, MFA/JWT secret production guards, and the client-portal queries (scoped by `clientId`). This is a note on reviewed code, not assurance that those controls are complete.

---

## 4. OWASP Top 10:2025 and API Security Top 10 coverage matrix

| Category | Coverage in this audit | Result |
|---|---|---|
| **A01 Broken Access Control** (incl. SSRF) | Static guard review + route triage; no live cross-user/tenant tests, no second account | **Not validated.** Leads OBS-01, OBS-02. SSRF: no direct taint match; full taint analysis not done. |
| **A02 Security Misconfiguration** | Source inspection of helmet/CORS/CSRF/cache; no deployment config or live header probe | **Not validated.** OBS-03 historical secret locally triaged, provider-side rotation decision still open. |
| **A03 Software Supply Chain Failures** | `pnpm audit --prod` completed; targeted follow-up in §2.2.1; blocking gitleaks CI gate added (§2.3.1) | **Tool/CI evidence only:** 110 advisories (22 high) at original scan → 0 production advisories after Zod 4 + scoped overrides; gitleaks gate passes on the checked-out tree with only verified placeholder fingerprints ignored. No exploit validation; build provenance/CI trust not assessed. |
| **A04 Cryptographic Failures** | Token/JWT source review; secret scan; local OBS-03 history triage | **Not validated.** JWT production secret guard present in source; deleted Firebase config left a historical key lead whose validity still needs provider verification. |
| **A05 Injection** | Static sink grep; no payloads sent | **Not validated.** No raw SQL/shell/eval sinks found in backend; XSS sink depends on vulnerable DOMPurify (OBS-04). |
| **A06 Insecure Design** | Limited manual review of booking/chat flows | **Not validated.** Needs threat modelling. |
| **A07 Authentication Failures** | Reviewed auth middleware, token types, MFA routes; no live auth tests | **Not validated.** No credential-stuffing/reset/MFA bypass testing. |
| **A08 Software or Data Integrity Failures** | Webhook signature code reviewed; no deserialization testing | **Not validated.** |
| **A09 Security Logging & Alerting Failures** | Not testable without the live logging/alerting pipeline | **Not assessed.** Do not mark as passed. |
| **A10 Mishandling of Exceptional Conditions** | Static review of error handlers and webhook fail-closed paths; no forced-error testing | **Not validated.** |
| **API1 BOLA** | Static lead OBS-01 only | **Not validated** (needs two visitor accounts and a known conversation ID). |
| **API2 Broken Authentication** | Same as A07 | **Not validated.** |
| **API3 Broken Object Property Level Authorization** | CRUD factory reviewed (OBS-02); no response/property testing | **Not validated.** |
| **API4 Unrestricted Resource Consumption** | Rate limiters observed in source; no load/resource tests | **Not validated.** |
| **API5 Broken Function-Level Authorization** | Static lead OBS-02 | **Not validated.** |
| **API6 Unrestricted Access to Sensitive Business Flows** | Not tested | **Not assessed.** |
| **API7 SSRF** | Same as A01 SSRF note | **Not validated.** |
| **API8 Security Misconfiguration** | Same as A02 | **Not validated.** |
| **API9 Improper Inventory Management** | No live endpoint inventory/shadow-API test | **Not assessed.** |
| **API10 Unsafe Consumption of APIs** | Not tested | **Not assessed.** |

---

## 5. Remediation checklist

Priority order assumes the observations are confirmed in a staging environment.

- [ ] **P0 — Restore a working scanner.** Update or replace the EOL `openai/openai/gpt-oss-20b` model in `~/.strix/cli-config.json` (or set a supported `STRIX_LLM` *and* matching provider credentials), verify `strix --version` + a one-target smoke scan, then run `strix -n -t <repo> -t <staging-url> --scan-mode deep --max-budget 30` with two visitor accounts and one admin account. No config change was made by this audit; Strix still cannot produce exploit-validated findings.
- [x] **P0 — OBS-01 (code remediated 2026-11-23):** public history now requires a browser-generated `deviceFingerprint`; every additional filter (UUID/contact details) is ANDed with it; `/chat` refuses to reuse a conversation by UUID alone without a matching fingerprint; `/history` is rate-limited. Evidence: `backend/src/modules/ai/utils/chatAccess.ts`, `backend/src/modules/ai/routes/chatbot.ts`, `backend/test/chatAccess.spec.ts` (3 tests). Re-test against staging is still pending.
- [x] **P0 — OBS-02 (code remediated 2026-11-23):** `/v1/settings` is mounted with `requireAuth` + `requireAccess('administration.settings', ['ADMIN','SUPER_ADMIN'])` in `backend/src/app.ts`; `createCrudRouter` has exactly one consumer and it is now guarded at the mount. Evidence: `backend/test/route-guards.spec.ts` structural assertion (5 tests total). Re-test against staging is still pending.
- [x] **P1 — Dependencies (A03):** Zod 4 migration completed (`zod ^4.6.7`, 79 backend import sites); direct advisories (`nodemailer`, `@modelcontextprotocol/sdk`, `multer`, `body-parser`, `dompurify` ≥3.4.17) and all three remaining moderate transitive advisories are patched by scoped overrides. `pnpm audit --prod --json` reports **0 advisories** (`/tmp/opencode/audit-prod-moderate-overrides.json`), with backend tsc clean (`/tmp/opencode/backend-tsc-zod4-fix.out`) and 55 files / 520 mocked tests passing (`/tmp/opencode/backend-tests-overrides.out`). SCA evidence only — see §2.2.1.
- [x] **P2 — Transitive toolchain majors (SCA scope):** `glob@13` → 14.0.2, `minimatch@10` → 11.0.1 and `@hono/node-server@1|2` → 2.1.6 are applied through scoped `pnpm-workspace.yaml` overrides; local Prisma generate/contract-emit and MCP import smoke output is indexed in §6. Live CLI/provider compatibility has not been asserted.
- [x] **P1 — OBS-03 (local portion):** historical Firebase config identifiers and paths were checked in git history; no current `backend/src`/`scripts`/`docs` reference to a GCP/Firebase credential was found (the `IMPLEMENTATION_PLAN.txt` hit is prose). `.gitleaksignore` contains only the 12 verified current-tree placeholder/false-positive fingerprints. A blocking gitleaks gate was added to `.github/workflows/netlify-deploy.yml` with the offline `scripts/scan-secrets.sh` helper; local run exits 0 with no leaks (`/tmp/opencode/gitleaks-local-after-doc.json`).
- [ ] **P1 — OBS-03 (live portion):** confirm validity of the historical key in the provider dashboard and rotate/revoke if it is live. Blocked here: no provider credentials or dashboard access, and no rotation was attempted. The legacy `firebase.json` / `.firebaserc` hosting files are also out of scope for this local pass.
- [ ] **P2 — Complete the real audit:** provide staging URL + test accounts (two ordinary users in different tenants/client IDs plus an admin), supply an OpenAPI spec if available, and re-run Strix with source + live target. Then map validated findings by category and re-test after fixes.
- [ ] **P2 — Coverage gaps:** explicitly schedule live tests for A09 logging/alerting, CI/CD supply-chain integrity (including the new gitleaks gate in a real GitHub run), business-logic abuse, rate-limit/resource exhaustion, and deployment-header/CORS verification.
- [ ] **P3 — Housekeeping:** keep `docs/SECURITY.md` absent-or-created intentionally; link this report from the canonical plan once the audit is upgraded from PARTIAL (canonical-plan edit is owned by another worker).

---

## 6. Evidence index

Evidence present **now** under `/tmp/opencode/` (all local files; no live target):

| File | Contents |
|---|---|
| `/tmp/opencode/audit-prod-zod4.json` | `pnpm audit --prod --json` after Zod 4: 3 moderate advisories, 0 high. |
| `/tmp/opencode/audit-prod-moderate-overrides.json` | Final `pnpm audit --prod --json`: 0 advisories, 455 production dependencies. |
| `/tmp/opencode/backend-tsc-zod4-fix.out` | Empty backend TypeScript output after the Zod 4 fixes. |
| `/tmp/opencode/backend-tests-overrides.out` | `npm run test:mocked`: 55 files / 520 tests passed. |
| `/tmp/opencode/typecheck-overrides.out`, `/tmp/opencode/lint-overrides.out`, `/tmp/opencode/build-overrides.out` | 12/12 typecheck, 12/12 lint (0 errors), 3/3 build. |
| `/tmp/opencode/web-tests-final-zod4.out`, `/tmp/opencode/e2e-final-zod4.out` | Web unit tests 4 files / 35 tests; E2E 11/11. |
| `/tmp/opencode/prisma-generate-overrides2.out`, `/tmp/opencode/prisma-contract-emit.out`, `/tmp/opencode/mcp-import-overrides2.out` | Local Prisma/MCP smoke output after the scoped overrides. |
| `/tmp/opencode/peers-check.out` | Pre-existing optional Prisma toolchain peer gaps. |
| `/tmp/opencode/gitleaks-worktree-current.json`, `/tmp/opencode/gitleaks-worktree-current.out` | Whole worktree scan (41 findings, includes untracked `backend/.env` and `.agents/`); redacted. |
| `/tmp/opencode/gitleaks-tracked-baseline.json`, `/tmp/opencode/gitleaks-tracked-baseline.out` | Tracked-file baseline: 15 findings / 12 unique fingerprints before `.gitleaksignore`; redacted. |
| `/tmp/opencode/gitleaks-local-after-doc.json`, `/tmp/opencode/gitleaks-local-after-doc.out` | `scripts/scan-secrets.sh` after `.gitleaksignore`: exit 0, empty report (`[]`), "no leaks found". |
| `/tmp/opencode/ci-scan-src/` | Temporary export of tracked files used for the CI-equivalent baseline. |

Referenced by the original audit but **no longer present** in `/tmp/opencode` (not recreated, not relied on here): `security-audit-log.txt`, `pnpm-audit.json`, `pnpm-audit.err`, `gitleaks-git-report.json`, `gitleaks-src-report.json`, `route-audit.py`, `probe-env.sh`, `run-strix*.sh`, and `security-scan-src/`. Their findings are summarised in §2 rather than re-derived.

Repository evidence changed by this follow-up: `.gitleaksignore`, `scripts/scan-secrets.sh`, `.github/workflows/netlify-deploy.yml`, and this file. No secret values are stored in any of them.

**Bottom line: 0 verified OWASP findings and no exploit-validated audit. Four unvalidated static observations remain tracked: OBS-01 and OBS-02 are remediated in code (staging re-test pending), OBS-03 is locally triaged but needs provider-side rotation verification, and OBS-04 has no remaining SCA advisory after the `dompurify` upgrade (no XSS payload was tested). Production dependency advisories are 0 by SCA evidence only; a blocking gitleaks gate protects the checked-out tree but does not cover git history. Strix remains blocked by an end-of-life model plus missing staging target/accounts. The Phase 5.2 "no OWASP report" gap is only partially closed by this document; a live, validated audit is still required.**
