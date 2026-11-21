# AngiSoft Technologies — Digital Headquarters Master Plan

> **🟢 CANONICAL** — Single source of truth for product delivery, permission model, department workspaces, portfolio studio, and document reconciliation.  
> Supersedes: all prior roadmaps, status summaries, implementation plans.  
> Derived from: Live code, Prisma contract, `AGENTS.md` (§Platform Restructure Plan), `REVAMP_PLAN.md`, 2026-08-14 system review.  
> Last verified: 2026-11-16 (commit `e9af194`)

**Status:** **Canonical Plan — Single Source of Truth**  
**Authority:** This document supersedes all prior roadmaps, status summaries, and implementation plans.  
**Derived from:** Live code, Prisma contract, `AGENTS.md` (§Platform Restructure Plan), `REVAMP_PLAN.md`, and the 2026-08-14 system review.  
**Last verified:** 2026-11-16 (commit `e9af194`) — **Phase 0 implemented** (§2.2).

---

## 1. Vision Statement

Build **AngiSoft Technologies' complete online digital headquarters**: one connected platform that unifies

- **Company Portfolio** — public marketing, services, products, staff showcase
- **Client Portal** — secure client accounts, booking follow-up, project visibility, testimonials
- **Staff Operating System** — role-driven workspaces, assignments, dashboards, portfolio studio
- **Professional Portfolio Platform** — customizable, themeable staff portfolios published on the public site

All backed by a single PostgreSQL database, a single API, shared TypeScript packages, and a unified permission model.

---

## 2. Current Reality (Verified 2026-11-16)

> Phase 0 shipped on 2026-11-16. The statuses below describe the platform **as
> found**; see §2.2 for what has since been closed and what remains.

| Layer | Status | Evidence |
|-------|--------|----------|
| **Monorepo structure** | ✅ Complete (Phases 0–4) | `AGENTS.md` — pnpm + Turborepo, 9 shared packages, 2 frontend apps, 10 backend modules |
| **Public website** | 🟡 ~50% | 37 routes, 373 TSX files; content DB-driven; About-page work in progress (uncommitted) |
| **Admin application** | 🟡 ~45% | 26 screens, 9 feature areas; API integration broken in production (no Bearer tokens, no `/api/*` proxy) |
| **Backend API** | 🟡 ~55% | 279 endpoints, 10 domain modules, 6 shared areas; effective-permission resolver exists but not wired to middleware |
| **Database schema** | ✅ Rich (69 models) | Prisma 8 contract at `backend/src/prisma/contract.prisma`; Departments, Positions, Assignments, EmployeePermission, PermissionPreset all present |
| **Authentication** | 🟡 ~35% | JWT + refresh cookies exist; in-memory token store in `@angisoft/api-client`; **2FA endpoints without UI; CSRF middleware exists but not mounted**; AdminLogin discards access token |
| **RBAC** | 🟡 ~25% | Three incompatible permission vocabularies (seed, hardcoded catalogue, route guards); canonical `getEffectivePermissions` resolver built but not authoritative |
| **Client portal** | 🟡 ~20% | Magic-link JWT only; no real login, no refresh, no testimonial submission |
| **CMS coverage** | 🟡 ~60% | Most content editable; **Pricing packages, Industries admin, Solutions admin now exist** but pricing still JSON-based; CompanyStats, Announcements missing from current admin |
| **CRM / Sales** | 🟡 ~15% | Leads, enquiries, tickets, chat exist; **no pipeline, opportunities, quotes, 360 view** |
| **E-commerce / ERP / HR** | ❌ 0% | No models, routes, or UI for orders, invoices, expenses, contracts, candidates, leave |
| **Staff portfolios** | 🟡 ~35% | Frontend supports section ordering/visibility/themes; **backend does not persist most customization** |
| **Operations / CI** | 🟡 ~20% | GitHub Actions builds/deploys **without lint, typecheck, or tests**; backend tests hit production DB |

### 2.1 Delivery status ledger (updated 2026-11-16)

Track what the canonical phases have actually delivered, so this document always
answers "where are we?" without reading code.

| Phase | Status | Remaining |
|-------|--------|-----------|
| **Phase 0 — Security Foundation** | ✅ Implemented | Deploy, then verify in production (§17) |
| **Phase 1 — Unified Identity & Workspace Shell** | ✅ Implemented | `Employee.preferences` JSONB column live; theme persists server-side |
| Phase 2 — Department Workspaces | ✅ Implemented | All department workspaces + permission registry live; CRM/invoicing/expenses/leave/attendance/payroll-v1 shipped |
| Phase 3 — Portfolio Studio | ✅ Implemented | `EmployeePortfolioConfig` + publish/version flow + studio editor (drag-order, themes, testimonials/featuredWork/caseStudies/certifications/CV editors) + public rendering + moderation |
| Phase 4 — Automation & Intelligence | ✅ Implemented | Workflow triggers (booking→project, payment→invoice, SLA→alert), approval rules + multi-step approval chains (`ApprovalRequest`), cross-dept reports, AI assist, renewals + automation worker |
| Phase 5 — Production Hardening | 🔄 Mostly done | Prerender, code splitting, bundle budgets, security hardening, observability, backup schedule + drill, backend lifecycle tests, browser-level E2E (`e2e/` Playwright, 11 specs); Lighthouse + admin route×theme sweep remain |
| **Phase 6 — AI Workforce** | ✅ Implemented | 12-agent roster (coordinator, marketing×2, sales, customer-care, monitoring, finance, HR, analytics, security, PA, relationships/contracts) with 24/7 scheduled runs, structured reports, owner notifications, SUPER_ADMIN AI Boardroom at `/admin/boardroom`, admin UI at `/agents`, `agents.*` permissions |

### Critical Production Blockers (P0 — must fix before any feature work)

1. **Admin API/auth integration broken** — admin app uses relative URLs, no Bearer token, no `/api/*` proxy in `netlify.toml`
2. **Chatbot admin endpoints unguarded** — `GET /chatbot/conversations`, `GET /chatbot/conversations/:id`, `PUT /chatbot/conversations/:id` lack authentication
3. **Privileged cache poisoning** — `publicJsonCache` varies by role via `optionalAuth`; authenticated unpublished responses can be served publicly
4. **Tests hit production Neon** — `backend/test/integration.spec.ts` broadly deletes records; `pnpm test` currently unsafe
5. **Route shadowing** — `GET /:id` before `GET /admin`/`GET /staff` in bookings, projects, contact-enquiries
6. **Frontend/backend contract mismatches** — admin screens call nonexistent/mismatched endpoints
7. **Permission precedence bug** — `SUPER_ADMIN` wildcard check bypasses explicit DENY in `effectivePermissions.ts`
8. **CSRF not mounted** — middleware exists but not in Express stack

---

## 2.2 Phase 0 implementation record (2026-11-16)

Every P0 blocker is closed in code. Each row names the file that proves it.

| # | Fix | Implementation | Proof |
|---|-----|----------------|------|
| 0.1 | CSRF protection mounted | `csrfInit` + `csrfProtect` wired in `backend/src/app.ts`; cookie lifetime 30d; cookieless requests pass (no ambient credentials to abuse) | `test/security.spec.ts` → "CSRF double-submit" |
| 0.2 | DENY beats `SUPER_ADMIN` wildcard | `has()` in `effectivePermissions.ts` checks explicit DENY **before** the `*` wildcard | → "effectivePermissions precedence" |
| 0.3 | Chatbot admin endpoints guarded | `requireAuth` + `requirePermission('chatbot.view_all')` on list/get/update in `modules/ai/routes/chatbot.ts` | → "chatbot admin endpoints" |
| 0.4 | Cache never serves authenticated responses | `isCacheable()` in `shared/middleware/cache.ts` bails on any `Authorization` header or session cookie | → "public JSON cache isolation" |
| 0.5 | Tests isolated from production | `connectionUrl.ts` requires `TEST_DATABASE_URL` when `NODE_ENV=test`; vitest forces test mode; `integration.spec.ts` skips when unset and validates the DB name; destructive deletes narrowed to test-owned rows | `vitest run` → 17 passed / 4 skipped |
| 0.6 | Route shadowing fixed | `GET /admin` moved before `GET /:id` (bookings), `/staff` before `/:id` (projects), `/admin` before `/:id` (contact-enquiries) | → "route ordering" |
| 0.7 | Admin API integration | `useCrud`, `saveJson`, logout, and every screen routed through `@angisoft/api-client` (Bearer + CSRF + refresh); `/api/*` proxy added to **both** Netlify configs; `VITE_API_BASE_URL` removed so calls are same-origin | `docs/NETLIFY.md` §Routing |
| 0.8 | AdminLogin retains the token | `setAccessToken(accessToken)` after login | `AdminLogin.tsx` |
| + | API contract mismatches | 13 admin endpoints corrected (health, dashboards, ai-config, staff-access, staff/employees, bookings admin + stage/status, client-projects PATCH, chatbot) | §6 Content Coverage Ledger |
| + | Guards no longer lock out roles | `requireAccess(permission, fallbackRoles)` replaces stacked role+permission guards | `shared/middleware/roles.ts` |
| + | CI quality gate | lint → typecheck → test before build/deploy | `.github/workflows/netlify-deploy.yml` |

## 2.3 Phase 1 implementation record (2026-11-17)

Phase 1 replaces three incompatible permission vocabularies with one registry and
makes access decisions visible in the admin app instead of hardcoded in routes.

| # | Task | Implementation | Proof |
|---|------|----------------|-------|
| 1.1 | One canonical permission registry | `modules/identity/services/permissionRegistry.ts` holds **123** typed definitions (group / risk / scope / order), `PERMISSION_GROUPS`, `groupedPermissions()`, `validateRegistryIntegrity()`. `prisma/seed.ts` seeds `Permission` rows and role grants from it, and aborts if the registry is inconsistent. | `test/permission-registry.spec.ts` (14 specs) |
| 1.2 | All route guards migrated | Every `requireRoles(...)` call removed from route files; guards now use `requireAccess(permission, fallbackRoles)`. Includes bespoke gates in `ai-config.ts` (local `requireAdmin`), `payment-console.ts` (local `allow(roles)`) and `site.ts` (per-section permissions). `/api/roles/catalogue` exposes the grouped registry to the UI. | `test/route-guards.spec.ts` (5 specs: no `requireRoles`, every guard key canonical, no retired key reused) |
| 1.3 | Role & Permissions admin UI | `frontend/admin/src/features/settings/RolesAdmin.tsx` at `/settings/roles`: create/rename roles, grant permissions from the registry (grouped, filterable, risk-badged), see assignment counts. Writes `RolePermission` rows and clears both permission caches. | Plan §14 Phase 1 metric |
| 1.4 | Staff Access screen complete | `StaffAccess.tsx` now renders the **full registry catalogue** with tri-state `Inherit / Grant / Deny` per permission, plus identity (department, position, seniority, public title) and assignment scopes. | Plan §14 Phase 1 metric |
| 1.5 | Nav + guards wired to effective permissions | `lib/permissions.tsx` provides `EffectiveAccessProvider` / `useCan()` over `/api/staff-dashboard/effective-access`. `AdminLayout` nav links declare the permission they need; empty groups disappear. `can()` treats unknown as allowed but DENY as final, so the shell never blanks out. | `AdminLayout.tsx`, `permissions.tsx` |
| 1.6 | Unified `/workspace` shell | `features/dashboard/Workspace.tsx` renders server-provided widgets with real assignment counts; a granted permission with zero records shows an empty state + CTA instead of hiding the module (plan §8). | `Workspace.tsx` |
| 1.7 | Preferences & theme persistence | ✅ Done. `Employee.preferences` JSONB column exists (migration `20261119T2153`, verified live); `GET /api/staff-dashboard/effective-access` returns normalized `preferences`; `PUT /api/staff-dashboard/profile` merges preference patches; admin `theme.tsx` restores the server theme on login and persists `theme` on toggle. | `staff-dashboard.ts`, `theme.tsx` |
| + | Legacy grants keep working during migration | `canonicalKey()` is applied on both sides of the resolver (`effectivePermissions.ts`, legacy `permissions.ts`), so a grant stored as `content.manage` still satisfies a guard checking `publications.review`. | `permissionRegistry.spec.ts` alias specs |
| + | Role fallback cannot bypass DENY | `requireAccess` checks `isDenied()` **before** the role fallback, so an explicit DENY blocks even a fallback role and even `SUPER_ADMIN`. Precedence is now true for every route, migrated or not. | `test/require-access.spec.ts` (7 specs) |
| + | Dashboard contract | `/api/staff-dashboard/permissions` now returns `assignmentCounts`; new `/api/staff-dashboard/effective-access` returns the versioned §8 payload (permissions with source/scope, counts, widgets, preferences). | `staff-dashboard.ts` |

---

## 2.4 Phase 6 implementation record — AI Workforce (2026-11-21)

The company now fields **automated agents alongside human staff**: 12 agents
covering coordination, marketing (content + growth), sales, customer care,
monitoring, finance, HR, analytics, security, executive assistance and
relationships/contracts — all reporting to the owner.

| Piece | Implementation | Proof |
|-------|----------------|-------|
| Roster | `modules/agents/services/agentRegistry.ts` — 12 typed definitions (key, name, role, department, kind, schedule cadence); `ensureAgentsSeeded()` materializes `Agent` rows idempotently without overwriting admin edits and staggers first runs | `test/agents.spec.ts` registry specs |
| Schema | `Agent` + `AgentRun` models in `contract.prisma`; migration `migrations/app/20261120T2340_ai_workforce` (additive, offline-planned) | `npx prisma migration plan` output |
| Run engine | `modules/agents/services/agentRunner.ts` — deterministic DB collectors per agent → structured `{summary, metrics, highlights, actions, recommendations}`; optional LLM narrative via `aiProvider` when configured; every run writes `AgentRun`, updates `lastRunAt`/`nextRunAt`, and notifies SUPER_ADMIN/ADMIN employees through `createNotification` | `test/agents.spec.ts` run specs |
| Scheduler | `workers/agentScheduler.ts` — 60s sweep (`AGENT_SCHEDULER_INTERVAL_MS`), runs due agents sequentially with per-agent failure isolation; registered in `index.ts` and `worker.ts` | `startAgentScheduler()` |
| Admin API | `/api/admin/agents` — list roster+latest run, run history (`?agentKey=`), agent detail, `POST /:key/run` (manual, `force` overrides pause), `PATCH /:key` (status/schedule/config). Guards: `agents.view`/`agents.run`/`agents.manage` with ADMIN fallback | `test/agents.spec.ts` HTTP specs |
| Permissions | `agents.view` (LOW), `agents.run` (MEDIUM), `agents.manage` (HIGH) added to the canonical registry under group **AI Workforce**; ADMIN gets all, MARKETING + HR get `agents.view`; catalogue regenerated (163 keys / 35 groups) | `test/permission-registry.spec.ts` |
| Admin UI | `features/agents/AgentsAdmin.tsx` at `/agents` — roster cards (status, schedule, last-run summary), Run now / Pause / Resume actions, recent-runs feed; nav item gated by `agents.view` | `AgentsAdmin.tsx`, `AdminLayout.tsx` |
| Proactive layer | `modules/agents/services/proactive.ts` + `agentOutreach.ts` — after each successful report, agents act within hard bounds (below) | `test/agent-proactive.spec.ts` (7 specs) |

**Proactive operating model (added 2026-11-22).** Collectors stay read-only;
a separate proactive phase executes bounded outward actions after every
successful run:

- **Owner reporting** — every agent emails its report to the owner's personal
  inbox (`ADMIN_EMAIL`/`OWNER_EMAIL`, falling back to the first
  SUPER_ADMIN/ADMIN employee), throttled to ~one digest per agent per day via
  the `agent.report_emailed` ledger. Anomalies (e.g. failing agent runs) page
  the owner immediately via `alertOwner`.
- **Outreach email** — human-voiced, first-person templates sent through the
  existing Zoho `sendMail` queue. Hard cap of 5 outbound emails per agent per
  run; every send is deduplicated for 7 days per (agent, entity) through
  `AuditLog` rows (`agent.outreach`), so a 2-hourly agent never double-pings
  the same person.
- **Per-agent actions** — marketing-growth: intro/follow-up emails to fresh
  leads + auto-creates `Opportunity` records for qualified leads;
  marketing-content: SEO-gap audit (missing `seoTitle`/`seoDesc`) + creates a
  draft `BlogPost` when the editorial calendar runs dry; sales-agent: follow-up
  emails on opportunities stale >14 days; customer-care: acknowledgement emails
  to new enquiries (marked `in_review`) + internal AI triage notes on
  unassigned tickets; finance: payment reminders for overdue invoices;
  hr: stale-leave nudges to reviewers; monitoring: immediate owner alerts;
   relationships: internal contract/NDA review checklists on flagged tickets,
   with every outward document or accepted term queued for owner approval.
- **SMS** — optional generic HTTPS gateway via `SMS_GATEWAY_URL` /
  `SMS_GATEWAY_TOKEN` / `SMS_TO` env vars; no-op until configured. Voice calls
  are intentionally out of scope (no telephony provider integrated).

**Branded mail & documents (added 2026-11-21).**

- All outbound email is wrapped in one responsive, inline-styled HTML shell
  (`backend/src/shared/services/emailTemplate.ts`) with the AngiSoft logo,
  brand bar, title/eyebrow header, CTA button, and a footer carrying contact
  details plus Privacy Policy / Terms links. Brand colours come from the
  shared UI tokens. `EMAIL_LOGO_URL` overrides the default CDN logo.
- The shell is applied centrally in `sendMailDirect` — every `sendMail` caller
  gets branding automatically; already-branded templates and `layout: 'raw'`
  are respected. The email queue worker forwards the full options object so
  queued mail keeps its CTA/footer/attachments.
- `renderBrandedDocument` produces print-ready branded HTML (logo header,
  clauses, signature blocks) for NDAs, letters and contract drafts. The
  relationships agent attaches such a draft to an owner-approval email — it
  is never sent or signed externally without SUPER_ADMIN approval.

**Training & 24/7 operation (added 2026-11-22).**

- **Charters** — `modules/agents/services/agentCharters.ts` is the written
  training manual for every agent: mandate, explicit decision rights
  (autonomous / approval-required / escalate-to-owner), standard workflow and
  KPIs. Charters are injected into the LLM narrative prompt, exposed on
  `/api/admin/agents` (`charter` field), and rendered in the admin UI as a
  "Role charter & decision rights" disclosure per agent card.
- **PA agent (`pa` / "Pia")** — Executive Assistant & AI
  Workforce Coach (12h cadence). Its collector produces a workforce scorecard
  (per-agent runs/failures/staleness vs. cadence, escalation compliance); its
  proactive routine writes dated coaching notes into an underperforming
  agent's `config.paCoaching` (capped at 8, evidence-cited, charter-referencing)
  and escalates agents that stay at-risk to the owner.
- **Relationships agent (`relationships` / "Nexus")** — 12th roster member,
  Relationships & Contracts Officer (12h cadence). It scans enquiries, leads,
  tickets and opportunities for partnership/NDA/contract signals, prepares
  structured briefs and internal risk checklists, and drafts NDAs, letters and
  proposals for review. Its charter forbids sending, signing or amending a
  binding document without SUPER_ADMIN approval.
- **24/7** — `fly.toml` now keeps `min_machines_running = 1` so the scheduler
  survives scale-to-zero; sweep cap raised to 20 agents per pass. Cadences run
  around the clock (monitoring 30 min → security weekly).

**Production-readiness hardening (added 2026-11-21).** The run engine now uses
a Redis-backed per-agent claim plus a global concurrency semaphore, so scheduled,
event and manual triggers cannot overlap the same employee. The leader lock has
a heartbeat, stale `running` rows are reaped, each run has a hard deadline and
failure classification, and manual/event runs no longer postpone the scheduled
cadence. Outputs carry structured quality signals (`quality`, `proactive`,
`degraded`, `errorClass`); prompts delimit untrusted data; article drafting is
gated by a quality/legal check and defaults to a draft plus approval item; and
`output.completed` is separated from `output.actions` so accomplished work is
never mirrored back into the Approvals queue. Outreach budgets are per-agent and
dedupe claims are atomic-ish through Redis with an AuditLog fallback.

**AI Boardroom (added 2026-11-21).** `GET /api/admin/boardroom/sessions`,
`POST /sessions`, `POST /sessions/:id/messages` and `POST /sessions/:id/finalize`
are mounted behind `requireAuth`, a strict SUPER_ADMIN role check,
`agents.manage`, CSRF and a dedicated rate limiter. Sessions are stored as
`AgentRun` rows with `agentKey='boardroom'` — no migration — and hold the
transcript, recent agent reports, suggestions, minutes and approval-gated action
items in `output`. Live events use the existing Socket.IO server and a private
`boardroom:<sessionId>` room; the admin UI at `/admin/boardroom` offers
per-agent/whole-board questions, voice input/output via browser Web Speech APIs
with text fallback, and minute finalization. Agent reports are quoted as
untrusted context, never instructions; the model cannot call tools or write to
the database.

**Design rule:** agents observe, report, and take only bounded low-risk
actions — capped, deduplicated, and ledgered. Financial mutations, publishing,
and anything consequential remain recommendations for the owner or the
Approvals queue.

---

## 3. Target Architecture (The "10/10" Definition)

A staff member can:
1. Be invited, given a role + permissions through the admin UI, and only see/do what that role allows — all DB-driven
2. Access a unified workspace (`/workspace`) with modules determined by their department, position, and assignments
3. Manage the entire business from the admin panel: CMS, CRM, bookings/projects, finance, HR, AI, analytics
4. Have secure auth: access tokens in memory, refresh in `httpOnly + SameSite=Strict` cookies, CSRF, 2FA with UI, no hardcoded secrets
5. Clients have real accounts (secure login), follow bookings, submit ratings/testimonials (moderated)
6. Public site is polished: scroll restoration, professional blog, responsive, accessible, performant
7. Operations are safe: CI runs tests + migrations, seed never auto-runs prod, durable queue, audit UI, pagination + rate limiting
8. Everything is database-driven — content, roles, permissions, pricing, navigation managed from UI

---

## 4. Phased Delivery Plan

### Phase 0 — Security Foundation ✅ **IMPLEMENTED 2026-11-16** (see §2.2 for the per-item record)
| ID | Task | Acceptance |
|----|------|------------|
| 0.1 | Mount CSRF middleware in `app.ts`; double-submit via `@angisoft/api-client` | All mutating requests require valid CSRF token |
| 0.2 | Fix `SUPER_ADMIN` precedence: DENY always wins, even for wildcard | Explicit DENY on `SUPER_ADMIN` blocks the action |
| 0.3 | Guard chatbot admin endpoints (`conversations` list/get/update) | `requireAuth` + `requirePermission('chatbot.view_all')` |
| 0.4 | Isolate cached public responses from authenticated context | `publicJsonCache` bypasses `optionalAuth`; cache key excludes auth |
| 0.5 | Add `TEST_DATABASE_URL` env; rewrite integration tests to use it | `pnpm test` never touches production Neon |
| 0.6 | Fix route shadowing: move `/:id` after `/admin`, `/staff` in bookings, projects, contact-enquiries | Admin/staff list endpoints reachable |
| 0.7 | Admin app: proxy `/api/*` in `netlify.toml`; use `@angisoft/api-client` with Bearer token | Admin login retains access token; all admin calls authenticated |
| 0.8 | AdminLogin: store returned access token via `setAccessToken` | Session survives reload via refresh flow |

### Phase 1 — Unified Identity & Workspace Shell (Week 2–3)
| ID | Task | Acceptance |
|----|------|------------|
| 1.1 | One canonical permission registry: DB-backed `Permission` table with risk/scope metadata | All route guards, UI, presets, seeds derive from this single source |
| 1.2 | Migrate all route guards to `requirePermission(key)` using canonical resolver | No hardcoded `requireRoles(...)`; every guard testable |
| 1.3 | Build Role & Permissions admin UI (`/admin/settings/roles`) | Create/rename/archive roles; assign permissions; assign roles to staff |
| 1.4 | Fix Staff Access screen: load assignments, save identity (dept/position) | `/admin/staff/:id/access` works end-to-end |
| 1.5 | Wire nav + route guards to effective permissions (frontend calls `/api/staff-dashboard/permissions`) | Menu items, buttons, screens respect effective permissions |
| 1.6 | Unified workspace shell at `/workspace` with department/position-driven navigation | Each employee sees only their modules; global search, inbox, notifications, tasks |
| 1.7 | User preferences & theme persistence (light/dark/custom) via `@angisoft/ui` | Preferences saved to `Employee` profile |

### Phase 2 — Department Workspaces (Week 3–6)
**Order: Sales/CRM → Project Delivery → Client Success → Finance → HR → Marketing → Executive**

| Area | Key Deliverables |
|------|------------------|
| **Sales & CRM** | Lead pipeline stages, Opportunity/Deal model, Proposal/Quotation builder, Contract records, Follow-up reminders, Lead assignment, Sales targets/forecasts, Conversion analytics, Handoff to booking/project |
| **Project Delivery** | Project templates, Workload/capacity board, Delivery calendar, Client approvals/sign-off, Change requests, SLA/deadline alerts, Risk/blocker tracking, Retrospective reports, Standard quotation/onboarding workflows |
| **Client Success** | Unified inbox (chat + email + tickets + enquiries), SLA policies, Escalation rules, Canned responses, Knowledge base, Client satisfaction reporting, Renewal/account-health tracking, Client contacts/organizations |
| **Finance** | Quotes, Invoices, Credit notes, Expenses, Tax handling, AR/AP, Financial reports, Payroll, Commission handling, Payment reminders, Expense approvals — **requires Decimal money migration first** |
| **HR** | Onboarding, Contracts/documents, Leave/absence, Attendance, Performance reviews, Goals, Appraisals, Payroll integration, Training/skills, Directory privacy controls, Offboarding |
| **Marketing Workflows** | Content calendar, Campaign management, Content briefs/approval, Asset library, SEO checklist, Social publishing, Campaign performance, Lead-to-campaign attribution |
| **Executive Reporting** | Cross-department dashboards, KPI cards from effective-access payload, Drill-down to assignments, Audit visibility |

### Phase 3 — Portfolio Studio (Week 4–5, parallel with Phase 2)
| ID | Task | Acceptance |
|----|------|------------|
| 3.1 | Persistent portfolio configuration model (`EmployeePortfolioConfig`) | Sections, order, visibility, custom titles, theme, layout persisted |
| 3.2 | Theme templates (3+) using `@angisoft/ui` tokens (light, dark, brand accents) | Employee selects theme; live preview |
| 3.3 | Layout templates (2+) with drag-and-drop section ordering | Employee arranges sections; saved per theme |
| 3.4 | Portfolio editor UI in `/workspace/portfolio-studio` | Edit content blocks, featured work, case studies, testimonials, certifications, CV download |
| 3.5 | SEO + social previews, custom portfolio URL (`/staff/:username`), optional subdomain | Published portfolios indexable; admin approval workflow |
| 3.6 | Version history, draft/publish workflow, print/PDF styling | Full editorial control |

### Phase 4 — Automation & Intelligence (Week 5–8)
| ID | Task |
|----|------|
| 4.1 | Workflow triggers (booking→project, payment→invoice, SLA breach→alert) |
| 4.2 | Approval rules engine (quotation, expense, leave, content) |
| 4.3 | Dashboard widgets from effective-access payload (counts, scopes, assignments) |
| 4.4 | Cross-department reporting (pipeline, delivery, finance, satisfaction) |
| 4.5 | AI assistance: lead scoring, support triage, content suggestions, code review |

### Phase 5 — Production Hardening (Week 6–8, parallel)
| ID | Task |
|----|------|
| 5.1 | End-to-end tests for complete business lifecycle (lead→booking→project→invoice→support→renewal) |
| 5.2 | Security audit (OWASP Top 10, API Security Top 10) |
| 5.3 | Backup/restore drills, PITR verification |
| 5.4 | Observability: audit log UI, structured logs, Sentry alerts, slow-query monitoring |
| 5.5 | Performance: Lighthouse budgets, self-hosted fonts, image dimensions, reduced-motion, no sourcemaps in prod |
| 5.6 | Prerender execution at build time; per-page `<title>`/OG/JSON-LD from `router/prerender.ts` |
| 5.7 | Vite-imagetools/AVIF pipeline; scoped per-feature CSS polish; admin MUI DataGrid adoption |
| 5.8 | ~~Documentation consolidation: single canonical reference per domain~~ ✅ Done — permission catalogue regenerated from live registry (160 keys), content matrix + quick reference refreshed, index reclassified |

---

## 5. Data Model & Permission Registry (Canonical)

### 5.1 Core Entities (from Prisma contract — 69 models)
Key models for the Digital HQ:
- **Identity**: `Employee`, `Department`, `Position`, `EmployeeRoleAssignment`, `AppRole`, `Permission`, `RolePermission`, `EmployeePermission` (GRANT/DENY), `PermissionPreset`
- **Assignments**: `ProductTeamMember`, `ProjectEmployee`, `Booking.assignedToId`, `ContactEnquiry.assigneeId`, `BlogPost.authorId` / `StaffBlog.employeeId`
- **Content**: `Service`, `Product`, `BlogPost`, `StaffBlog`, `Project`, `ClientProject`, `Industry`, `Solution`, `AboutSection`, `HomeSection`, `CompanyStat`, `Faq`, `Testimonial`, `ServiceCategory`, `ProductFaq`
- **Operations**: `Booking`, `BookingEvent`, `Lead`, `ContactEnquiry`, `SupportTicket`, `Survey`, `ChatConversation`, `ChatMessage`
- **Finance**: `Payment`, `PaymentChannel`, `PaymentWallet`, `Payout`, `Invoice` (planned), `Quote` (planned), `Expense` (planned)
- **Files/Realtime/AI**: `File`, `Notification`, `AnalyticsEvent`, `AiConfig`

### 5.2 Canonical Permission Registry
Single source of truth: `backend/src/modules/identity/services/permissionRegistry.ts` — **123 typed definitions across 28 groups**.

Metadata (`display`, `description`, `group`, `risk`, `scopeRequiresAssignment`, `order`) lives **in code**, because the `Permission` table currently has only `id`, `key` and `description`. `prisma/seed.ts` writes `Permission` rows and role grants from the registry and aborts if `validateRegistryIntegrity()` reports a problem, so the DB stays a projection of the code rather than a second source of truth. Adding metadata columns is a Phase 2 migration and changes nothing downstream.

All three legacy vocabularies (seed, hardcoded catalogue, route guards) **migrated to this registry** with a documented key map:

| Mechanism | Purpose |
|-----------|---------|
| `LEGACY_KEY_ALIASES` | Old key → canonical key. Applied by `canonicalKey()` on both sides of the resolver and on write, so a grant stored as `content.manage` still satisfies a guard checking `publications.review`. |
| `ROLE_DEFAULT_PERMISSIONS` | Starter bundle per system role, seeded into `RolePermission`. Preserves the access each role had under the old `requireRoles(...)` guards. |
| `requireAccess(permission, fallbackRoles)` | Route guard: permission **or** a fallback system role, with **explicit DENY checked first** so the fallback can never resurrect a denied key. |
| `GET /api/roles/catalogue` | Grouped registry for the admin UI, so the screen can never drift from the keys the guards enforce. |

| Scope | Meaning |
|-------|---------|
| `global` | Any record (e.g., `services.create`) |
| `assigned` | Only records the employee is assigned to via join table (e.g., `projects.update_assigned`) |
| `own` | Only records they authored/own (e.g., `profile.update_own`) |

### 5.3 Effective-Permission Precedence (Final, Tested)
**Higher number = higher precedence. DENY always wins regardless of source.**

| Precedence | Source | Description |
|------------|--------|-------------|
| 60 | `SYSTEM` | `SUPER_ADMIN` gets `*` wildcard |
| 50 | `DENY` | Explicit `EmployeePermission` with `effect='DENY'` (not expired) |
| 40 | `GRANT` | Explicit `EmployeePermission` with `effect='GRANT'` (not expired) |
| 30 | `ASSIGNMENT` | Derived from assignment rows (`ProductTeamMember`, `ProjectEmployee`, `Booking.assignedToId`, `ContactEnquiry.assigneeId`) |
| 20 | `PRESET` | `Position.defaultPermissionKeys` (starter bundles) |
| 10 | `ROLE` | `EmployeeRoleAssignment → AppRole → RolePermission → Permission.key` |

**Test requirement:** A `SUPER_ADMIN` with an explicit DENY on `roles.manage` **must be blocked** from the roles admin screen.

### 5.4 Position Presets vs. PermissionPreset
- **Position.defaultPermissionKeys** = starter bundle for a job title (e.g., "Flutter Developer" gets `projects.update_assigned`, `products.update_assigned`)
- **PermissionPreset** = reusable grant template applied by admin (writes `EmployeePermission` GRANT rows)
- Both are **additive**; neither overrides explicit DENY/GRANT.

### 5.5 Phase 2 data-model delta (2026-11-17) — **DESIGNED, NOT YET MIGRATED**

Phase 2 builds the Sales/CRM department workspace: **lead → opportunity → quotation → booking → project → invoice → support**.
The pipeline already exists in pieces (`Lead`, `Booking` with a 9-stage machine, `Payment`, `ClientProject`,
`ContactEnquiry`, `SupportTicket`). What is missing are the two commercial documents between a
qualified lead and a paid invoice — **Opportunity**, **Quote** and **Invoice** — and a money type
that cannot silently lose a cent.

This section is the reviewable design that precedes the migration. It is **additive only**: every
change is a `CREATE TABLE` / `ADD COLUMN` / type widening, never a destructive rewrite.

#### 5.5.1 New models

| Model | Purpose | Key fields |
|-------|---------|------------|
| `Opportunity` | A qualified lead moving through the commercial pipeline | `id`, `publicReference` (unique), `title`, `leadId?`, `clientId?`, `bookingId?`, `stage`, `value` **Numeric(18,2)**, `currency`, `probability` (Int 0–100), `expectedCloseDate?`, `assignedToId?`, `lostReason?`, `notes?`, `source?`, `createdAt`, `updatedAt` |
| `Quote` | A priced proposal sent to a client | `id`, `publicReference` (unique), `number` (unique), `opportunityId?`, `bookingId?`, `clientId?`, `status`, `subtotal`/`discount`/`tax`/`total` **Numeric(18,2)**, `currency`, `validUntil?`, `issuedAt?`, `acceptedAt?`, `notes?`, `createdById?`, `createdAt`, `updatedAt` |
| `QuoteLineItem` | One priced line on a quote | `id`, `quoteId`, `description`, `quantity` (Int), `unitPrice` **Numeric(18,2)**, `lineTotal` **Numeric(18,2)**, `serviceId?`, `productId?`, `sortOrder` (Int) |
| `Invoice` | A demand for payment against accepted work | `id`, `publicReference` (unique), `number` (unique), `quoteId?`, `bookingId?`, `clientProjectId?`, `clientId?`, `status`, `subtotal`/`tax`/`total`/`amountPaid`/`balanceDue` **Numeric(18,2)**, `currency`, `issuedAt?`, `dueAt?`, `paidAt?`, `notes?`, `createdAt`, `updatedAt` |
| `InvoiceLineItem` | One billed line on an invoice | `id`, `invoiceId`, `description`, `quantity` (Int), `unitPrice` **Numeric(18,2)**, `lineTotal` **Numeric(18,2)**, `sortOrder` (Int) |

`Lead` gains `stage`, `value` **Numeric(18,2)**, `currency`, `qualificationNotes`, `lostReason`
so a lead can be qualified before it becomes an opportunity. The `Lead → Opportunity` link is one-way
(`Opportunity.leadId`) so a lead can have several opportunities without a join table.

**Stage vocabularies** are plain `String` columns with values enforced by the backend, matching how
`Booking.currentStage` and `BookingEvent.type` already work — the catalog can grow without a migration:

- `Opportunity.stage` — `new → qualified → proposal_sent → negotiation → won | lost`
- `Quote.status` — `draft → sent → accepted | declined | expired | superseded`
- `Invoice.status` — `draft → issued → partially_paid → paid | overdue | void`

#### 5.5.2 Money: `Float` → `Numeric(18,2)`

Seven money columns are `Float` today. They become `numeric(18,2)`.

| Table | Column | Current | New |
|-------|--------|---------|-----|
| `Booking` | `priceEstimate` | `Float?` | `Numeric(18,2)?` |
| `Booking` | `budgetAmount` | `Float?` | `Numeric(18,2)?` |
| `Booking` | `quotedAmount` | `Float?` | `Numeric(18,2)?` |
| `Payment` | `amount` | `Float` | `Numeric(18,2)` |
| `PaymentWallet` | `balance` | `Float` | `Numeric(18,2)` |
| `Payout` | `amount` | `Float` | `Numeric(18,2)` |
| `Service` | `priceFrom` | `Float?` | `Numeric(18,2)?` |

**The runtime type changes from `number` to a branded string.** The Prisma 8 `pg/numeric@1` codec
decodes a numeric column to canonical decimal **text** (`"1234.50"`), not a JS number — the type is
`Numeric<18, 2>` = `BrandedString<{ __numericPrecision: 18; __numericScale: 2 }>`. The contract source
syntax for this dialect is `Numeric(18, 2)`; bare `Decimal` and `Decimal(precision: …, scale: …)`
are rejected by the rc.15 parser, and a numeric column **without** `typeParams` fails at runtime with
`CODEC_PARAMETERIZATION_MISMATCH`, so precision and scale are mandatory.

Consequences, all of them deliberate:

1. **Arithmetic must be exact.** Float money drifts (`0.1 + 0.2 !== 0.3`); a `numeric` column does not.
2. **Reads that feed arithmetic need an explicit conversion.** The backend gets a single money helper
   module rather than ad-hoc `Number(...)` calls:
   - `toMoney(value: number | string): string` — canonical 2-decimal string for writes.
   - `fromMoney(value: string | null): number` — for display and legacy paths that still need a number.
   - `sumMoney(values): string`, `addMoney(a, b): string` — computed in **integer minor units**
     (cents), never in floats.
3. **The TypeScript compiler enforces the change.** A `numeric` field is a branded string, so every
   arithmetic site that keeps treating it as a number becomes a compile error rather than a silent
   rounding bug.

**Blast radius** (all sites must be converted in the same commit as the type change):

| Site | Current | Required after |
|------|---------|----------------|
| `billing/services/payments/index.ts` — `amount: payment.amount` (write) | `number` | `toMoney(payment.amount)` |
| `billing/services/payments/payheroService.ts` — `balance: Number(...)` (write) | `number` | `toMoney(...)` |
| `billing/routes/payment-console.ts` — `balance: w.balance` (write) | `number` | `toMoney(w.balance)` |
| `cms/controllers/servicesController.ts` — `priceFrom` (write) | `number` | `toMoney(data.priceFrom)` |
| `cms/routes/services.ts` — `priceFrom` zod schema | `z.coerce.number()` | coerce to string on write, keep number at the API edge |
| `bookings/routes/bookings.ts` — `budgetAmount`, `quotedAmount`, `priceEstimate` | `Number(...)` | `toMoney(...)` on write |
| `workers/reconciliationWorker.ts` — provider amounts | `/ 100` float math | `toMoney(...)` after the cent conversion |
| `ai/routes/chatbot.ts` — price in prompt text | string interpolation | unchanged (a string renders correctly) |

#### 5.5.3 Migration order (safe, reversible, one concern per commit)

1. **Commit A — additive schema.** `CREATE TABLE` for `Opportunity`, `Quote`, `QuoteLineItem`,
   `Invoice`, `InvoiceLineItem`; `ALTER TABLE "Lead" ADD COLUMN …`. Money columns are **left as
   `Float`** in this commit, so the new pipeline can be built and exercised against the existing type.
2. **Commit B — money helper + contract.** Add the money helper module, change the seven columns in
   `src/prisma/contract.prisma` to `Numeric(18, 2)`, re-emit the contract artifacts
   (`npx prisma contract emit` — offline, it never touches the database), and convert every site in
   the blast-radius table. **The database is still `float8` at this point**, so the contract and the
   live schema disagree.
3. **Commit C — the actual type change.** Hand-written SQL migration
   (`ALTER TABLE … ALTER COLUMN … TYPE numeric(18,2) USING round(<col>::numeric, 2)`) applied to
   Neon, followed by the same `prisma contract emit`. The `USING round(…, 2)` clause is what makes
   the conversion safe: it rounds to cents in the database instead of truncating, and it is the only
   way Postgres will convert `float8 → numeric` without an explicit cast for every row.
4. **Commit D — verification.** Re-run the totals check (§17) and the payment round-trip tests
   against a disposable database, then re-seed.

**Safety rules for Commit C:**
- `numeric` widening never loses precision beyond the 2-decimal rounding, and the rounding is
  explicit and auditable — but the pre- and post-migration column totals are compared before the
  migration is accepted. A mismatch of more than one cent on any table is a **rollback**, not a
  rounding to be accepted silently.
- The migration is **additive in effect**: the previous `float8` values remain recoverable from a
  pre-migration dump, and the whole change is a single reversible `ALTER` per table.
- `PaymentWallet.balance` is the one column where a mismatch is expected and meaningful — it is a
  *cached provider balance*, refreshed on every sync, so it is snapshotted before the migration and
  compared after, not treated as authoritative.

#### 5.5.4 Permissions required by Phase 2

New canonical keys, added to `permissionRegistry.ts` in the same commit as the routes that use them:

| Key | Guards |
|-----|--------|
| `opportunities.view` / `.create` / `.update` / `.delete` | The pipeline board |
| `quotes.view` / `.create` / `.update` / `.send` / `.accept` / `.delete` | Quotation authoring and sending |
| `invoices.view` / `.create` / `.update` / `.issue` / `.void` | Invoice lifecycle |
| `sales.pipeline.view` | The department-wide pipeline dashboard |

`ROLE_DEFAULT_PERMISSIONS` gains the matching entries for `ADMIN` (all keys) and `MARKETING`
(the whole sales chain), so the seeded roles match the access they had under the old `requireRoles`
guards.

---

## 6. Content Coverage Ledger (Regenerated from Current Routes)

| Public Page | Model(s) | Public API | Admin API | Admin UI | Gate Permission | UI Status | Schema Status |
|-------------|----------|------------|-----------|----------|-----------------|-----------|---------------|
| Home | `HomeSection`, `CompanyStat` | `/api/site/home`, `/api/company-stats` | `/api/home-sections`, `/api/company-stats` | `HomeSectionsAdmin`, `CompanyStatsAdmin` | `pages.update_home` | ❌ Missing | ✅ Exists |
| About | `AboutSection` | `/api/site/about` | `/api/about-sections` | `AboutAdmin` | `pages.update_about` | ✅ Exists | ✅ Exists |
| Services List | `Service`, `ServiceCategory` | `/api/services`, `/api/service-categories` | `/api/services/admin`, `/api/service-categories` | `ServicesAdmin`, `ServiceCategoriesAdmin` | `services.update` | ✅ Exists | ✅ Exists |
| Service Detail | `Service`, `ServiceFaq` | `/api/services/:slug` | `/api/services/:id`, `/api/service-faqs` | `ServicesAdmin`, `FaqsAdmin` | `services.update` | ✅ Exists | ✅ Exists |
| Pricing | `PricingPackage`, `Service.pricing` (JSON legacy) | `/api/pricing-packages`, `/api/services` | `/api/pricing-packages/admin`, `/api/services/:id/pricing` | `PricingPackagesAdmin`, `PricingAdmin`, `ServicesAdmin` | `services.manage_pricing` | ✅ Exists | ✅ Exists |
| Products List | `Product` | `/api/products` | `/api/products/admin` | `ProductsAdmin` | `products.update` | ✅ Exists | ✅ Exists |
| Product Detail | `Product`, `ProductFaq` | `/api/products/:slug` | `/api/products/:id`, `/api/product-faqs` | `ProductsAdmin`, `ProductFaqsAdmin` | `products.update` | ✅ Exists | ✅ Exists |
| Blog List | `BlogPost` | `/api/blogs` | `/api/blogs/admin` | `BlogAdmin` | `publications.review` | ✅ Exists | ✅ Exists |
| Staff List | `Employee` | `/api/staff` | `/api/admin/staff` | `StaffManagement`, `StaffAccess` | `staff.view` | ✅ Dept/pos via StaffAccess | ✅ Exists |
| Staff Detail | `Employee`, `EmployeePortfolioItem` | `/api/staff/:usernameOrId` | `/api/employee-profiles` | `StaffDashboard` (self) | `profile.update_own` | ✅ Self only | ✅ Exists |
| Industries | `Industry` | `/api/industries` | `/api/industries/admin` | `IndustriesAdmin` | `pages.update_industries` | ✅ Exists | ✅ Exists |
| Solutions | `Solution` | `/api/solutions` | `/api/solutions/admin` | `SolutionsAdmin` | `pages.update_solutions` | ✅ Exists | ✅ Exists |
| Booking | `Booking`, `Service` | `POST /api/bookings` | `/api/bookings/admin` | `BookingsManagement` | `bookings.view_all` | ✅ Exists | ✅ Exists |
| Testimonials | `Testimonial` | `/api/testimonials` | `/api/testimonials/admin` | `TestimonialsAdmin` | `reviews.moderate` | ✅ Exists | ✅ Exists |
| FAQs | `Faq`, `ServiceFaq` | `/api/faqs` | `/api/faqs`, `/api/service-faqs` | `FaqsAdmin` | `services.manage_faqs` | ✅ Exists | ✅ Exists |
| Careers | `JobPosting` | `/api/careers` | `/api/careers/admin` | `CareersAdmin` | `careers.manage` | ✅ Exists | ✅ Exists |
| Announcements | `Announcement` | `/api/announcements` | `/api/announcements/admin` | `AnnouncementsAdmin` | `pages.update_announcements` | ✅ Exists | ✅ Exists |
| Company Stats | `CompanyStat` | `/api/company-stats` | `/api/company-stats/admin` | `CompanyStatsAdmin` | `company_stats.view` | ✅ Exists | ✅ Exists |
| Contact | `ContactEnquiry` | `POST /api/contact-enquiries` | `/api/contact-enquiries/admin` | `ContactsAdmin` | `enquiries.view_all` | ✅ Exists | ✅ Exists |
| Client Portal | `ClientAccessToken`, `ClientProject` | `/api/client-portal/*` | `/api/client-projects/admin` | `ClientProjectsManagement` | `client_projects.view_all` | ✅ Partial | ✅ Exists |
| AI Chatbot | `ChatConversation` | `/api/chatbot/*` | `/api/chatbot/conversations` | `ChatConversationsAdmin` | `chatbot.view_all` | ✅ Exists | ✅ Exists |

**Legend:** ✅ = Live & complete, ⚠️ = Partial/needs work, ❌ = Missing entirely

---

## 7. Department & Position Registry (Seeded)

### 7.1 Active Departments (from `seed-professional.ts`)
1. **Software Engineering** — Flutter, Full-Stack, Backend, Database, Systems Analyst
2. **Design & Creative** — UI/UX Designer, Graphic Designer, Brand Designer, Motion Designer
3. **Data & Analytics** — Data Engineer, ML Engineer, BI Analyst
4. **Content & Communications** — Technical Writer, Content Strategist, SEO Specialist, Social Media Manager
5. **Client Operations & Support** — Client Success Manager, Support Specialist, Client Operations Coordinator, Technical Account Manager

### 7.2 Active Positions (seeded, with `displayTitleTemplate`)
| Position | Department | Template | Default Permission Keys (starter) |
|----------|------------|----------|-----------------------------------|
| Founder & Lead Software Developer | Software Engineering | "Founder & Lead Software Developer" | `*` (via SUPER_ADMIN role) |
| Flutter / Mobile Developer | Software Engineering | "Flutter Developer" | `projects.update_assigned`, `products.update_assigned`, `publications.create` |
| Full-Stack Developer | Software Engineering | "Full-Stack Developer" | `projects.update_assigned`, `services.update_assigned`, `publications.create` |
| Backend Developer | Software Engineering | "Backend Developer" | `projects.update_assigned`, `services.update_assigned` |
| Database Developer | Software Engineering | "Database Developer" | `projects.update_assigned`, `analytics.view_dashboard` |
| Systems Analyst | Software Engineering | "Systems Analyst" | `projects.view_assigned`, `services.view_assigned`, `analytics.view_dashboard` |
| UI/UX Designer | Design & Creative | "UI/UX Designer" | `publications.create`, `media.upload`, `pages.update_*` |
| Graphic Designer | Design & Creative | "Graphic Designer" | `media.upload`, `pages.update_home` |
| Data Engineer | Data & Analytics | "Data Engineer" | `analytics.view_dashboard`, `analytics.export` |
| ML Engineer | Data & Analytics | "ML Engineer" | `analytics.view_dashboard`, `ai.configure` |
| Technical Writer | Content & Communications | "Technical Writer" | `publications.create`, `publications.review`, `pages.update_*` |
| Content Strategist | Content & Communications | "Content Strategist" | `publications.review`, `publications.publish`, `pages.update_*` |
| Client Success Manager | Client Operations | "Client Success Manager" | `bookings.view_assigned`, `enquiries.respond`, `client_projects.view_assigned` |
| Support Specialist | Client Operations | "Support Specialist" | `enquiries.respond`, `chatbot.view_all`, `tickets.manage` |
| Client Operations Coordinator | Client Operations | "Operations Coordinator" | `bookings.change_stage`, `enquiries.view_assigned`, `client_projects.add_progress` |

**Future/Deferred:** Product Manager, Sales Engineer, DevOps Engineer, Cybersecurity Specialist, HR Business Partner, Recruiter, Payroll Administrator, Learning & Development, Finance Manager, Accountant, Legal Counsel, Office Manager.

---

## 8. Dashboard Contract (Versioned Payload)

**Endpoint:** `GET /api/staff-dashboard/effective-access`  
**Response (v1):**
```typescript
interface EffectiveAccessPayload {
  version: 1;
  employeeId: string;
  systemRole: string;
  departmentId?: string;
  positionId?: string;
  permissions: {
    key: string;
    effect: 'GRANT' | 'DENY';
    source: 'SYSTEM' | 'DENY' | 'GRANT' | 'ASSIGNMENT' | 'PRESET' | 'ROLE';
    assignedScope?: { type: 'product'|'project'|'booking'|'enquiry'|'publication'; id: string };
  }[];
  assignmentCounts: {
    products: number;
    projects: number;
    bookings: number;
    enquiries: number;
    publications: number;
  };
  widgets: string[]; // e.g., ["My Products", "My Projects", "Assigned Bookings", "Customer Messages"]
  preferences: { theme: string; layout: string; };
}
```
**Widget generation** (frontend): filter `ANGISOFT_DASHBOARD_WIDGET_MATRIX.md` widget catalogue by `permissions` + `assignmentCounts > 0`.  
**Empty-widget rule:** permission held but zero assignments → show empty state with "Create first [record]" CTA, not hidden.

---

## 9. Design Authority

| Layer | Authority |
|-------|-----------|
| **Prose rules** | `docs/ANGISOFT_DESIGN_SYSTEM_RULES.md` (normative) |
| **Tokens, themes, CSS variables** | `packages/ui/src/tokens/` + `packages/ui/src/themes/` (numeric implementation authority) |
| **Provenance register** | `docs/DESIGN_PROVENANCE.md` (audit trail) |
| **Component library** | `@angisoft/ui` — all new UI must use shared components; admin migrates off local `Spinner`/`EmptyState` |

**Conflict resolution:** Numeric token values (spacing, line-height, motion duration) override prose rules. Prose rules govern composition, behavior, and brand intent.

---

## 10. Brand & Content Truth

- **Customer-facing service categories** (from `BRAND_EXPANSION_STRATEGY.md`) ≠ **Internal departments** (from `ANGISOFT_CURRENT_DEPARTMENTS.md`). They are maintained separately.
- **Testimonial templates** in `BRAND_EXPANSION_STRATEGY.md` are **non-publishable hypotheses** — require owner approval, real attribution, and verification before seeding.
- **Pricing tiers** in USD are obsolete; current model is KES/booking-driven.
- All public business content (services, products, pricing, copy, media) **must be managed via CMS/API** — never hardcoded in components.

---

## 11. Reconciliation Rules for All Documents

Every document in the repository must carry one of these status badges at the top:

| Badge | Meaning | Documents |
|-------|---------|-----------|
| `🟢 CANONICAL` | Normative now; conflicts resolved in favor of this doc | `ANGISOFT_DESIGN_SYSTEM_RULES.md`, `ANGISOFT_DIGITAL_HQ_PLAN.md` (this doc) |
| `🎯 TARGET` | Normative target; partially implemented | `ANGISOFT_PERMISSION_ASSIGNMENT_MODEL.md`, `ANGISOFT_ASSIGNMENT_SCOPE_MATRIX.md`, `ANGISOFT_DASHBOARD_WIDGET_MATRIX.md` |
| `🔄 REGENERATE` | Useful structure; must be regenerated against current code | `ANGISOFT_CAPABILITY_MAP.md`, `PUBLIC_CONTENT_ADMIN_MATRIX.md`, `ANGISOFT_CURRENT_DEPARTMENTS.md`, `ANGISOFT_POSITION_REQUIREMENTS.md` |
| `📜 HISTORICAL` | Read-only baseline; do not cite for current status | `ADMIN_AND_STAFF_CODEBASE_AUDIT.md`, `SYSTEM_REVIEW_AND_ROADMAP.md`, `SYSTEM_ARCHITECTURE.md`, `ARCHITECTURE.md` |
| `💡 HYPOTHESIS` | Commercial ideation / content backlog only | `BRAND_EXPANSION_STRATEGY.md`, `CHATBOT_GUIDE.md`, `SERVICES_DATABASE.md` |
| `✅ COMPLETE` | Milestone summary; frozen | `MILESTONE_PHASE_2.md`, `PHASE_2_COMPLETION.md`, `SESSION_SUMMARY.md`, `VERIFICATION_CHECKLIST.md`, `PROJECT_STATUS.md` |
| `🛠 OPERATIONAL` | Current runbooks / references | `NETLIFY.md`, `TESTING_GUIDE.md`, `QUICK_REFERENCE.md`, `QUICK_START_PHASE_3.md`, `DOCUMENTATION_GUIDE.md`, `DOCUMENTATION_INDEX.md`, `REDIS_REMOVAL.md`, `.github/copilot-instructions.md` |

### Citation Hierarchy (for implementation claims)
1. **Live code + Prisma contract** (`backend/src/prisma/contract.prisma`)
2. `AGENTS.md` (§Platform Restructure Plan, §Project Structure, §Commands)
3. `REVAMP_PLAN.md` (target architecture)
4. This plan (`ANGISOFT_DIGITAL_HQ_PLAN.md`)
5. Reviewed document **only for rationale, requirement, or historical evidence** — never for live status

---

## 12. Cross-Document Conflicts (Resolved Here)

| Conflict | Resolution (Canonical) |
|----------|------------------------|
| Three permission vocabularies | Single DB-backed `Permission` registry with metadata; all guards/UI/seeds migrated |
| `SUPER_ADMIN` bypasses DENY | DENY always wins (precedence 50 > SYSTEM 60 in conflict); tested |
| `Position.defaultPermissionKeys` vs `PermissionPreset` | Position = starter bundle; Preset = reusable admin template; both additive |
| `assigneeId` vs `assignedStaffId` (ContactEnquiry) | `assigneeId` canonical; `assignedStaffId` deprecated; migration script |
| `BlogPost` vs `StaffBlog` | `BlogPost` = marketing blog; `StaffBlog` = staff publications; separate admin surfaces |
| Service assignment | Not currently modeled; `services.update_assigned` requires `ServiceTeamMember` (Phase 2 gate) |
| Dashboard endpoint mismatch | `/api/staff-dashboard` (backend) vs `/api/admin/staff-dashboard` (frontend) → standardize on `/api/staff-dashboard` |
| Admin API base URL | Admin app **must** use `@angisoft/api-client`; API calls are **same-origin** through the Netlify `/api/*` proxy — do **not** set `VITE_API_BASE_URL` (it would make the `SameSite=Strict` refresh cookie cross-site and break silent refresh) |
| Money as `Float` | **Blocker for Finance/ERP** — migration to `Decimal` required before Phase 2 Finance |
| CI runs without checks | GitHub Actions must run `pnpm lint`, `pnpm typecheck`, `pnpm test` before deploy |

---

## 13. Immediate Next Actions — **Phase 2 (in progress)**

Phase 0 (§2.2) and Phase 1 (§2.3) are complete. Phase 2's data-model delta is designed (§5.5);
the implementation follows the four-commit order in §5.5.3 so the money type change is never
mixed into the additive schema change.

| Priority | Action | Owner | Gate |
|----------|--------|-------|------|
| **P1 (2.1)** | Commit A — additive schema: `Opportunity`, `Quote`, `QuoteLineItem`, `Invoice`, `InvoiceLineItem`, `Lead` extension | Backend | Migration is additive only; existing routes unaffected |
| **P1 (2.2)** | Commit B — money helper + contract `Numeric(18,2)` + convert the §5.5.2 blast radius | Backend | `tsc` clean; contract emits offline; DB still `float8` |
| **P1 (2.3)** | Commit C — the `float8 → numeric(18,2)` migration on Neon | Backend + Ops | Pre/post column totals match within one cent |
| **P1 (2.4)** | Commit D — verification: totals check, payment round-trip, re-seed | Backend | §17 checklist green |
| P2 (2.5) | Sales pipeline routes + permissions (`opportunities.*`, `quotes.*`, `invoices.*`, `sales.pipeline.view`) | Backend | Each route has a 401/403 spec |
| P2 (2.6) | Sales workspace UI on the `/workspace` shell (pipeline board, quote editor, invoice list) | Frontend (admin) | Widgets driven by `effective-access` only |
| ~~P1 (1.7)~~ | ✅ Done — `Employee.preferences` JSONB column live; theme/layout persist via `effective-access` + `PUT /profile` | Backend + Frontend (admin) | Preference survives reload |
| ~~P2~~ | ✅ Done — both regenerated/refreshed against live routes (2026-11-20/21) | Docs | No stale `frontend/src/**` paths remain |
| ~~P2~~ | ✅ Done — no `isRole(`/`role !== 'ADMIN'` remains in `bookings.ts` | Backend | Grep clean |
| ~~P3~~ | ✅ Done — `test/route-coverage.spec.ts` (21 specs) covers bookings staff/admin, client-projects, notifications, uploads, staff-dashboard + employee-profiles auth gates; `test/agents.spec.ts` (9 specs) covers the AI workforce | Backend | Each router has 401/403 + happy-path specs |
| ~~P6~~ | ✅ Done — AI Workforce: 12-agent roster, scheduler, run engine, `/api/admin/agents`, `/agents` UI, SUPER_ADMIN AI Boardroom (§2.4) | Full stack | Roster seeded; runs notify owner; boardroom minutes mirror into approvals; spec suite green |

---

## 14. Success Metrics (Definition of Done per Phase)

| Phase | Metric |
|-------|--------|
| **Phase 0** | `pnpm test` passes on isolated test DB; zero P0 security findings; admin login works in production; chatbot admin endpoints return 401 without auth |
| **Phase 1** | Role/Permission admin UI creates a role that actually gates a route; Staff Access screen loads/saves; workspace shell shows only permitted modules |
| **Phase 2** | One department workspace (Sales CRM) completes full lifecycle: lead→opportunity→quotation→booking→project→invoice→support |
| **Phase 3** | Employee publishes a themed, customized portfolio at `/staff/:username` with admin approval |
| **Phase 4** | Automated workflow triggers fire correctly; dashboard widgets reflect real assignments |
| **Phase 5** | Lighthouse ≥ 90 on all Core Web Vitals; zero critical security findings; CI gate blocks broken builds; documentation audit passes |

---

## 15. Appendix: Document Migration Checklist

| Document | Action | Target Badge |
|----------|--------|--------------|
| `ANGISOFT_DESIGN_SYSTEM_RULES.md` | Keep as-is; add `🟢 CANONICAL` badge | 🟢 CANONICAL |
| `ANGISOFT_PERMISSION_ASSIGNMENT_MODEL.md` | Amend precedence (DENY > SYSTEM for SUPER_ADMIN); add `🎯 TARGET` badge | 🎯 TARGET |
| `ANGISOFT_ASSIGNMENT_SCOPE_MATRIX.md` | Update to current fields/models; add `🎯 TARGET` badge | 🎯 TARGET |
| `ANGISOFT_DASHBOARD_WIDGET_MATRIX.md` | Align keys to canonical registry; add `🎯 TARGET` badge | 🎯 TARGET |
| `ANGISOFT_CAPABILITY_MAP.md` | Maintained as the live capability ledger (kept current per shipped feature) | 🔄 REGENERATE |
| `ANGISOFT_PERMISSION_CATALOGUE.md` | ✅ Done — regenerated as a mirror of `permissionRegistry.ts` (160 keys, 35 groups); `🛠 OPERATIONAL` | 🛠 OPERATIONAL |
| `PUBLIC_CONTENT_ADMIN_MATRIX.md` | ✅ Regenerated 2026-11-20 against live routes; refreshed for shipped admin UIs | ✅ Regenerated |
| `ANGISOFT_CURRENT_DEPARTMENTS.md` | Callouts updated; seeded departments are the live registry (rationale doc retained) | 🔄 REGENERATE |
| `ANGISOFT_POSITION_REQUIREMENTS.md` | Align to seeded positions + canonical permissions; add `🔄 REGENERATE` badge | 🔄 REGENERATE |
| `ADMIN_AND_STAFF_CODEBASE_AUDIT.md` | Add `📜 HISTORICAL` badge; do not modify body | 📜 HISTORICAL |
| `SYSTEM_REVIEW_AND_ROADMAP.md` | Add `📜 HISTORICAL` badge; extract unresolved risks to this plan | 📜 HISTORICAL |
| `SYSTEM_ARCHITECTURE.md` | Add `📜 HISTORICAL` badge; do not modify body | 📜 HISTORICAL |
| `ARCHITECTURE.md` | Add `📜 HISTORICAL` badge; do not modify body | 📜 HISTORICAL |
| `BRAND_EXPANSION_STRATEGY.md` | Add `💡 HYPOTHESIS` badge; separate service categories from departments | 💡 HYPOTHESIS |
| `CHATBOT_GUIDE.md` | Add `💡 HYPOTHESIS` badge; note unguarded endpoints now fixed | 💡 HYPOTHESIS |
| `SERVICES_DATABASE.md` | Add `💡 HYPOTHESIS` badge; content backlog only | 💡 HYPOTHESIS |
| `MILESTONE_PHASE_2.md` | Add `✅ COMPLETE` badge; freeze | ✅ COMPLETE |
| `PHASE_2_COMPLETION.md` | Add `✅ COMPLETE` badge; freeze | ✅ COMPLETE |
| `SESSION_SUMMARY.md` | Add `✅ COMPLETE` badge; freeze | ✅ COMPLETE |
| `VERIFICATION_CHECKLIST.md` | Add `✅ COMPLETE` badge; freeze | ✅ COMPLETE |
| `PROJECT_STATUS.md` | Add `✅ COMPLETE` badge; freeze | ✅ COMPLETE |
| `NETLIFY.md` | Add `🛠 OPERATIONAL` badge; update admin proxy config | 🛠 OPERATIONAL |
| `TESTING_GUIDE.md` | Add `🛠 OPERATIONAL` badge; update for test DB isolation | 🛠 OPERATIONAL |
| `QUICK_REFERENCE.md` | Add `🛠 OPERATIONAL` badge; update URLs | 🛠 OPERATIONAL |
| `QUICK_START_PHASE_3.md` | Add `🛠 OPERATIONAL` badge; align to Phase 1 tasks | 🛠 OPERATIONAL |
| `DOCUMENTATION_GUIDE.md` | Add `🛠 OPERATIONAL` badge; point to this plan as canonical | 🛠 OPERATIONAL |
| `DOCUMENTATION_INDEX.md` | Add `🛠 OPERATIONAL` badge; restructure navigation | 🛠 OPERATIONAL |
| `REDIS_REMOVAL.md` | Add `🛠 OPERATIONAL` badge; note BullMQ/Redis restored for prod | 🛠 OPERATIONAL |
| `ROADMAP.md` | **Archive** — superseded by this plan; add `📜 HISTORICAL` badge | 📜 HISTORICAL |
| `IMPLEMENTATION_ROADMAP.md` | **Archive** — superseded by this plan; add `📜 HISTORICAL` badge | 📜 HISTORICAL |
| `CONTRIBUTING.md` | Update setup commands to monorepo (pnpm, turbo); add `🛠 OPERATIONAL` badge | 🛠 OPERATIONAL |
| `README.md` | Update architecture table to current monorepo; add `🛠 OPERATIONAL` badge | 🛠 OPERATIONAL |
| `backend/README.md` | Update to module structure; add `🛠 OPERATIONAL` badge | 🛠 OPERATIONAL |
| `frontend/web/README.md` | Update to `angisoft-web` structure; add `🛠 OPERATIONAL` badge | 🛠 OPERATIONAL |
| `infrastructure/netlify/README.md` | Add `🛠 OPERATIONAL` badge | 🛠 OPERATIONAL |

---

**End of Canonical Plan.**  
All implementation work proceeds from this document. Document updates follow the migration checklist above. No other document carries authoritative status for current or target state.

---

## 17. Production verification checklist (after next deploy)

```bash
# 1. Admin API is the API, not the SPA (must be JSON, not HTML)
curl -sI https://admin.angisoft.co.ke/api/health | head -1
curl -s  https://admin.angisoft.co.ke/api/chatbot/conversations | head -c 200   # expect 401 JSON

# 2. Web chatbot reaches the API too
curl -sI https://www.angisoft.co.ke/api/health | head -1

# 3. Cache isolation (public read still cacheable, authenticated read not)
curl -sI https://api.angisoft.co.ke/api/faqs | grep -i cache-control
curl -sI -H 'Authorization: Bearer x' https://api.angisoft.co.ke/api/faqs | grep -ci cache-control  # expect 0

# 4. Run the suite against a disposable database
TEST_DATABASE_URL='postgresql://…/angisoft_test' pnpm test
```

After deploying, re-run the seed so `Permission` rows and role grants match the
canonical registry (`prisma/seed.ts` is idempotent and aborts on an inconsistent
registry):

```bash
cd backend && npx prisma db seed
```

Without it, roles keep the old coarse grants. They still resolve — `canonicalKey()`
maps them — but new keys added in Phase 1 (e.g. `careers.applications.respond`,
`ai_config.update`) stay ungranted until the seed runs.
