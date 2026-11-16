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
|-------|--------|-----------|
| Phase 1 — Unified Identity & Workspace Shell | ⬜ Not started | Permission registry, access UI, `/workspace` shell |
| Phase 2 — Department Workspaces | ⬜ Not started | Sales/CRM first |
| Phase 3 — Portfolio Studio | ⬜ Not started | Persistent portfolio config model |
| Phase 4 — Automation & Intelligence | ⬜ Not started | — |
| Phase 5 — Production Hardening | 🔄 Partial | CI gate added; perf/SEO/E2E remain |

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

### 17. Production verification checklist (after next deploy)

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
| 5.8 | Documentation consolidation: single canonical reference per domain |

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
Single source: `Permission` table + metadata columns (`group`, `risk`, `scope`, `model`, `endpoint`, `adminSurface`, `defaultRole`, `scopeRequired`).  
All three legacy vocabularies (seed, hardcoded catalogue, route guards) **migrated to this registry** with a documented key map.

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

---

## 6. Content Coverage Ledger (Regenerated from Current Routes)

| Public Page | Model(s) | Public API | Admin API | Admin UI | Gate Permission | UI Status | Schema Status |
|-------------|----------|------------|-----------|----------|-----------------|-----------|---------------|
| Home | `HomeSection`, `CompanyStat` | `/api/site/home`, `/api/company-stats` | `/api/home-sections`, `/api/company-stats` | `HomeSectionsAdmin`, `CompanyStatsAdmin` | `pages.update_home` | ❌ Missing | ✅ Exists |
| About | `AboutSection` | `/api/site/about` | `/api/about-sections` | `AboutAdmin` | `pages.update_about` | ✅ Exists | ✅ Exists |
| Services List | `Service`, `ServiceCategory` | `/api/services`, `/api/service-categories` | `/api/services/admin`, `/api/service-categories` | `ServicesAdmin`, `ServiceCategoriesAdmin` | `services.update` | ✅ Exists | ✅ Exists |
| Service Detail | `Service`, `ServiceFaq` | `/api/services/:slug` | `/api/services/:id`, `/api/service-faqs` | `ServicesAdmin`, `FaqsAdmin` | `services.update` | ✅ Exists | ✅ Exists |
| Pricing | `Service.pricing` (JSON) | `/api/services` | `/api/services/:id` | `ServicesAdmin` (JSON editor) | `services.manage_pricing` | ⚠️ JSON only | ⚠️ No package model |
| Products List | `Product` | `/api/products` | `/api/products/admin` | `ProductsAdmin` | `products.update` | ✅ Exists | ✅ Exists |
| Product Detail | `Product`, `ProductFaq` | `/api/products/:slug` | `/api/products/:id`, `/api/product-faqs` | `ProductsAdmin`, `ProductFaqsAdmin` | `products.update` | ✅ Exists | ✅ Exists |
| Blog List | `BlogPost` | `/api/blogs` | `/api/blogs/admin` | `BlogsAdmin` | `publications.review` | ✅ Exists | ✅ Exists |
| Staff List | `Employee` | `/api/staff` | `/api/admin/staff` | `StaffManagement` | `staff.view` | ⚠️ No dept/pos UI | ✅ Exists |
| Staff Detail | `Employee`, `EmployeePortfolioItem` | `/api/staff/:usernameOrId` | `/api/employee-profiles` | `StaffDashboard` (self) | `profile.update_own` | ✅ Self only | ✅ Exists |
| Industries | `Industry` | `/api/industries` | `/api/industries/admin` | `IndustriesAdmin` | `pages.update_industries` | ✅ Exists | ✅ Exists |
| Solutions | `Solution` | `/api/solutions` | `/api/solutions/admin` | `SolutionsAdmin` | `pages.update_solutions` | ✅ Exists | ✅ Exists |
| Booking | `Booking`, `Service` | `POST /api/bookings` | `/api/bookings/admin` | `BookingsManagement` | `bookings.view_all` | ✅ Exists | ✅ Exists |
| Testimonials | `Testimonial` | `/api/testimonials` | `/api/testimonials/admin` | `TestimonialsAdmin` | `reviews.moderate` | ✅ Exists | ✅ Exists |
| FAQs | `Faq`, `ServiceFaq` | `/api/faqs` | `/api/faqs`, `/api/service-faqs` | `FaqsAdmin` | `services.manage_faqs` | ✅ Exists | ✅ Exists |
| Careers | `JobPosting` | `/api/careers` | `/api/careers/admin` | `CareersAdmin` | `careers.manage` | ✅ Exists | ✅ Exists |
| Announcements | `Announcement` | `/api/announcements` | **Missing** | **Missing** | `pages.update_announcements` | ❌ Missing | ✅ Exists |
| Company Stats | `CompanyStat` | `/api/company-stats` | **Missing** | **Missing** | `pages.update_home` | ❌ Missing | ✅ Exists |
| Contact | `ContactEnquiry` | `POST /api/contact-enquiries` | `/api/contact-enquiries/admin` | **Missing** | `enquiries.view_all` | ❌ Missing | ✅ Exists |
| Client Portal | `ClientAccessToken`, `ClientProject` | `/api/client-portal/*` | `/api/client-projects/admin` | `ClientProjectsManagement` | `client_projects.view_all` | ✅ Partial | ✅ Exists |
| AI Chatbot | `ChatConversation` | `/api/chatbot/*` | `/api/chatbot/conversations` | **Missing** | `chatbot.view_all` | ❌ Missing | ✅ Exists |

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
| `🔄 REGENERATE` | Useful structure; must be regenerated against current code | `ANGISOFT_CAPABILITY_MAP.md`, `ANGISOFT_PERMISSION_CATALOGUE.md`, `PUBLIC_CONTENT_ADMIN_MATRIX.md`, `ANGISOFT_CURRENT_DEPARTMENTS.md`, `ANGISOFT_POSITION_REQUIREMENTS.md` |
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

## 13. Immediate Next Actions — **Phase 1 (starts here)**

Phase 0 is complete (§2.2). The workQueue below is the Phase 1 backlog.

| Priority | Action | Owner | Gate |
|----------|--------|-------|------|
| P1 | Build the permission key migration map (3 vocabularies → 1 registry) | Backend + Docs | Every existing key has exactly one canonical target |
| P1 | Seed the canonical `Permission` registry + role defaults | Backend | `npx prisma db seed` produces the map's keys |
| P1 | Migrate `requireRoles(...)` guards to `requireAccess`/`requirePermission` | Backend | Each migrated route has a spec |
| P1 | Regenerate `PUBLIC_CONTENT_ADMIN_MATRIX.md` + `ANGISOFT_CAPABILITY_MAP.md` against live routes | Docs | No stale `frontend/src/**` paths remain |
| P1 | Return `assignmentCounts` from `/api/staff-dashboard/permissions` | Backend | Dashboard widget spec (§8) is satisfiable |
| P2 | Build Role & Permissions admin UI (`/admin/settings/roles`) | Frontend (admin) | Phase 1.3 |
| P2 | Unified `/workspace` shell + permission-driven nav | Frontend (admin) | Phase 1.6 |

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
| `ANGISOFT_CAPABILITY_MAP.md` | Regenerate against live routes/schema/admin; add `🔄 REGENERATE` badge | 🔄 REGENERATE |
| `ANGISOFT_PERMISSION_CATALOGUE.md` | Convert to canonical registry + key migration map; add `🔄 REGENERATE` badge | 🔄 REGENERATE |
| `PUBLIC_CONTENT_ADMIN_MATRIX.md` | Regenerate from current routes (table in §6); add `🔄 REGENERATE` badge | 🔄 REGENERATE |
| `ANGISOFT_CURRENT_DEPARTMENTS.md` | Update to seeded departments; add `🔄 REGENERATE` badge | 🔄 REGENERATE |
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