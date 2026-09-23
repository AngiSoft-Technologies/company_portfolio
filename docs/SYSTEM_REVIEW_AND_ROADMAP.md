# AngiSoft Platform — Real Findings & Production-Readiness Plan

**Author:** Senior full-stack review (JS stack: React 19 + Vite, Express + TS, Prisma 7 + Postgres/Neon)
**Date:** 2026-08-14 (verified by direct code inspection)
**Owner's verdict that this document accepts as ground truth:** the system is **~3/10** — only the public pages in `frontend/src` are ~50% done (built by the owner); the CMS, CRM, ERP, e-commerce, and the internal "software company" operating system are far from production.

> This document replaces earlier optimistic drafts. Earlier drafts over-credited the system based on backend tables and session docs that self-report "85% complete." Those claims were **wrong from the user's seat**. This version reports only what works end-to-end.

---

## 1. The real scorecard (what actually works vs. what doesn't)

### What genuinely works (the ~50% that's real)

- **Public pages** (`frontend/src/pages/`, `frontend/src/components/`) — built by the owner, fetch from `/api/*`, database-driven, with a real theme (`ThemeContext.jsx`), layout (`AppLayout.jsx`), and content seeded from `backend/prisma/seed.ts` (hero, about, contact, footer, branding, navigation, industries, tech platforms, pricing, booking copy, 11 services, 4 products, FAQs, testimonials, blog posts, job postings).
- **Backend foundation** — Express + TS + Prisma, auth endpoints, content CRUD routes, booking stage machine, client-project workflow, uploads, health. These are *implemented as code* but are not fully usable end-to-end (see gaps).

### What does NOT work from the user's seat (the 7/10 that's missing)

| # | Area | Reality (verified) |
|---|---|---|
| 1 | **RBAC admin UI** | **No role-management screen exists.** No `/admin/roles`, no UI to create roles, create permissions, assign permissions to roles, or define what a permission does. Backend tables exist (`AppRole`, `Permission`, `RolePermission`, `EmployeeRoleAssignment`, `EmployeePermission`, `Department`, `Position`, `PermissionPreset`) and `roles.ts` has CRUD endpoints — but the admin never calls them. |
| 2 | **RBAC contract consistency** | Three **incompatible permission key systems**: seed hardcodes `'content.view'`, `'staff.manage'` (`seed.ts:69-94`); frontend catalogue uses `'staff.view'`, `'staff.assign_permissions'` (`staff-access.ts:35-112`); backend routes check `'services.create'`, `'projects.update_assigned'` (`services.ts`, `projects.ts`). A role granted one set doesn't gate routes checking another. |
| 3 | **Staff Access screen** | `StaffAccess.jsx` exists but is **broken end-to-end**: assignments never load (`StaffAccess.jsx:102` reads `current.assignments`, backend returns `current.assignmentScopes` at `staff-access.ts:302-307`), and saving identity fails (frontend sends `{identity:{...}}`, backend schema expects flat `departmentId/positionId/...` at `staff-access.ts:121-135`). |
| 4 | **2FA** | Backend endpoints exist (`/api/auth/2fa/enroll|verify`, `twofactor.ts`) but **the frontend has zero references to 2FA** (grep across `frontend/src`: no matches). No enroll UI, no login prompt, no backup-code screen. Users cannot enable or use it. |
| 5 | **Token storage / multi-account** | `adminToken`, `clientPortalToken`, booking IDs, visitor data all in **localStorage** across ~15 files (`AdminLogin.jsx:26`, `ClientPortalAccess.jsx:24`, `routes.jsx:80,92`, `httpClient.js:38,108`, etc.). localStorage is shared across tabs and readable by any injected script. **No multi-account support** — two admins on one browser overwrite one token slot. sessionStorage used only for booking drafts. IndexedDB: unused. |
| 6 | **CSRF** | **No CSRF protection anywhere.** Refresh cookie is `httpOnly` but `sameSite:'lax'` only (`auth.ts:40`); grep for `csrf|x-csrf|xsrf` = zero results. |
| 7 | **JWT secret fallback** | HS256 with hardcoded fallback `'dev_secret'` (`token.ts:22`) and `'supersecretkey'` in legacy `middleware/auth.js:2`. If `JWT_SECRET` is unset in prod, tokens are signed with a public key. |
| 8 | **Stripe webhook signing** | `payments.ts:17-28` trusts raw body when `STRIPE_WEBHOOK_SECRET` is missing; `create-intent` is unauthenticated and ignores `idempotencyKey` (`payments.ts:73-86`). |
| 9 | **Client follow-up / booking** | Client "portal" is a one-time magic-link JWT in localStorage with no refresh/revocation; public booking status uses **email-as-credential** (`bookings.ts:348-377`). No real client login flow. |
| 10 | **Client ratings / testimonials** | **No public path to submit a testimonial or rating.** `testimonials.ts:62` `POST /` requires `ADMIN`/`MARKETING`. Clients can only react ("helpful"). |
| 11 | **Scroll restoration** | **Broken.** No `ScrollRestoration`, no `scrollTo(0,0)` on route change (grep confirms; the only `window.scrollTo` is an in-page story animation `AboutNumberStory.jsx:381`). Navigating from the bottom of one page lands at the bottom of the next. |
| 12 | **State management** | Redux/RTK installed but **never wired** (no store, no `<Provider>` in `main.jsx`). State is per-page `useState` + module caches. No cross-tab sync, no session abstraction. |
| 13 | **Blog display** | 20+ components and per-type templates exist, but owner reports the presentation is not professional. Treat as needing UX/design pass. |
| 14 | **Admin cockpit defects** | Dead endpoint calls (`/api/admin/me`, `/api/admin-messages`, `/api/logs/*`, `/api/version*` — none exist in backend), hardcoded dashboard status + `+12%` trend, web-triggered "Upgrade Backend/Frontend Dependencies" buttons in `SystemPanel.jsx:89-118`. |
| 15 | **Data-model correctness** | Money stored as `Float` (`Payment.amount`, `Booking.priceEstimate/budgetAmount/quotedAmount`, `Service.priceFrom` — `schema.prisma:211,250,253,316,348`). `settingsController.ts` is a non-persisting stub. Heavy `Json` columns for queryable data (pricing, features, settings). |
| 16 | **Operations** | `start:prod` runs migrate+seed every boot; in-memory queue (jobs lost on restart); only 2 test files, no backend CI, no payments/webhook tests; `sourcemap:true` in prod build (`vite.config.js:52`). |

---

## 2. The vision vs. reality (what the owner wants vs. what exists)

| Owner's requirement | Current reality | Status |
|---|---|---|
| Public company profile, services, products, blog, staff, testimonials | Public pages fetch from `/api/*`, seeded content | ~50% (owner-built, needs polish) |
| Public can book services and follow progress | Booking form + stage machine exist; **client follow-up is email-token, not a real account** | ~40% |
| Client portal with login | One-time magic-link JWT in localStorage, no refresh/revocation | ~20% |
| Clients rate the company / give testimonials | **No public submission path** (admin-only creation) | 0% |
| **CMS** — admins manage all content via UI | CRUD screens exist for most models, but are thin generic forms (`AdminCrudPage.jsx`), no role gating, dead endpoints | ~40% |
| **RBAC** — create roles, permissions, assign to roles via UI, DB-driven | **No UI. Backend tables + 3 incompatible key systems.** | ~10% |
| **CRM** — leads, contacts, opportunities, pipeline, activities | Scattered tables (`Lead`, `ContactEnquiry`, `SupportTicket`, `ProductInquiry`, `ChatConversation`) + minimal routes; **no pipeline, no unified 360 view, no admin screens for most** | ~10% |
| **ERP** — invoices, orders, expenses, accounting, inventory | **No models, no routes, no UI** (verified: none of these exist in `schema.prisma`) | 0% |
| **E-commerce** — cart, checkout, orders, fulfillment | **No cart/order/order-line/stock models.** `Product` is a catalog; `Payment` is booking-only. | ~5% |
| **SaaS / software company** — products as revenue | Products are static showcase pages (`pages/products/*.jsx`) with hardcoded copy, not a licensed/subscribed product system | ~5% |
| **HR / hiring** — employee lifecycle, contracts | `JobPosting` CRUD exists; **no candidates, applications, contracts, onboarding, payroll, leave** | ~10% |
| Employees' public resumes on site | `Employee` profile fields + `StaffDetail.jsx` exist, driven by seeded/self-managed data | ~30% |
| Secure auth (2FA, CSRF, no localStorage tokens) | Backend 2FA endpoints **without UI**; no CSRF; tokens in localStorage | ~30% |
| Production-grade operations | In-memory queue, seed-on-deploy, no CI, 2 test files, hardcoded secrets fallback | ~20% |

---

## 3. What "100% production-ready" means (definition)

1. **A staff member can be invited, given a role + permissions through the admin UI, and only see/do what that role allows** — all DB-driven, no code changes to add a role.
2. **Any admin can manage the entire business from the admin panel**: content (CMS), clients (CRM), bookings/projects, products/orders (e-commerce), invoices/expenses (ERP), and people (HR).
3. **Clients have a real account** (secure login, no email-as-credential), can follow bookings, receive updates, and submit ratings/testimonials that get moderated.
4. **Security is sound**: access tokens in memory, refresh in `httpOnly + SameSite=Strict` cookies, CSRF tokens, 2FA with UI, no hardcoded secrets, webhook signatures enforced, no money in `Float`.
5. **The public site is polished**: scroll restoration, professional blog/article presentation, responsive + accessible (WCAG), performant.
6. **Operations are safe**: CI runs tests + migrations, seed is never auto-run on prod, durable queue, logs/audit visible in admin, pagination + rate limiting + caching.
7. **Everything is database-driven** — content, roles, permissions, pricing, navigation — managed from UI, with seeds for first-run only.

---

## 4. The plan to get from ~10% (admin/internal) to 100% production

### Phase 0 — Fix the security foundation (do first, nothing else is safe on top)
1. **Token model rewrite**: access token in memory only; refresh token in `httpOnly` + `SameSite=Strict` cookie; add CSRF double-submit token; support multiple accounts per browser via real sessions.
2. **JWT hardening**: fail startup in production when `JWT_SECRET` missing; remove fallback secrets; prefer RS256 keypair (env PEM or KMS) per existing `token.ts` scaffolding.
3. **Stripe**: enforce webhook signing (fail closed), authenticate + authorize `create-intent`, implement real idempotency.
4. **2FA UI**: enroll screen, login prompt, backup codes — wiring the existing backend endpoints.
5. **Remove localStorage tokens** from all ~15 files; replace with the session service.

### Phase 1 — Make RBAC real (the owner's #1 requirement)
1. **One canonical permission key set** — reconcile seed keys, frontend catalogue, and route guards into a single DB-seeded catalogue.
2. **Build the Role & Permissions admin UI**: manage roles (create/rename/archive), manage permissions (create, name, description, key, group), assign permissions to roles, assign roles to staff — all DB-driven.
3. **Fix `StaffAccess.jsx`** contract bugs (assignments load + identity save) so the existing screen works.
4. **Seed roles/permissions from DB** (positions, presets, defaults) — never hardcode in code.
5. **Wire nav + route guards** to effective permissions (`frontend` calls the `effectivePermissions` endpoint).

### Phase 2 — CMS completion (make the admin manage everything)
1. Fix dead admin endpoint calls (`/api/admin/me`, `/api/admin-messages`, logs, version) — wire or remove.
2. Replace hardcoded dashboard status/trends with real `/health` + computed stats; remove the dependency-upgrade buttons.
3. Harden the generic CRUD (`AdminCrudPage.jsx`): pagination, server-side search, accessible delete confirmations, optimistic updates, role-gated visibility.
4. Add missing admin CRUD: Industries, Solutions, Pricing packages (documented as missing in `docs/PUBLIC_CONTENT_ADMIN_MATRIX.md`).
5. Polish blog/article presentation (owner-flagged as unprofessional) + scroll restoration.

### Phase 3 — Client experience (real accounts + feedback)
1. Client login/session (reuse auth foundation from Phase 0) replacing email-as-credential + magic-link-only.
2. Booking follow-up within the portal; notifications.
3. **Public testimonial/rating submission** with moderation queue (new `POST /api/testimonials` public path + admin approve/reject).
4. Support tickets visible to clients.

### Phase 4 — CRM build
1. Normalize: `Organization → Contact → Lead/Opportunity → Client/Booking` with a shared identity.
2. Opportunity/deal records with pipeline stages + probability; activities/tasks; communication history.
3. Admin CRM screens (leads, opportunities, pipeline board, 360 view) — role-scoped, reusing RBAC.

### Phase 5 — E-commerce build (owner to confirm scope)
- **If sellable products:** `Cart`, `CartItem`, `Order`, `OrderLine`, `Stock`, `Fulfillment`, `Refund`, `Coupon`, customer purchase history; Stripe Checkout/Subscriptions with webhook idempotency.
- **If lead-gen only:** rename internal capability to "product showcase/inquiry" to stop overstating.

### Phase 6 — ERP build (bounded)
1. `Quote`, `Invoice`, `InvoiceLineItem`, `PaymentAllocation`, `Expense`, tax/currency, financial reporting.
2. `Supplier`, `PurchaseOrder`, `Inventory/StockMovement`, `Warehouse` only if physical/stock products.
3. Money migration to `Decimal` first (prerequisite).

### Phase 7 — HR / hiring build
1. `Candidate`/`Application` with CV + files, pipeline stages, interviews, consent/retention, recruiter permissions.
2. `Offer`/`EmploymentContract` (versioned, signatures, dates, audit), onboarding, leave, attendance, compensation, offboarding — gated by `HR` role.

### Phase 8 — SaaS / product platform (long-term)
- Product licensing, subscriptions, entitlements, per-tenant data — layered on the e-commerce/ERP work.

### Phase 9 — Production operations
1. CI (backend build + test + migration check), payments/webhook/booking integration tests.
2. Separate migrate vs. seed; never auto-seed prod.
3. Durable queue (Redis/BullMQ) + worker process; pagination + rate limiting; Redis caching for public reads; slow-query monitoring.
4. Observability: audit log UI, structured logs, Sentry alerts; backup/PITR + restore drills.
5. Web quality: a11y (axe), Lighthouse budgets, self-hosted fonts, image dimensions, reduced-motion, modal focus traps, no sourcemaps in prod.

### Phase 10 — State management & caching (cross-cutting)
1. Wire Redux Toolkit + RTK Query (typed API client) — global session, caching, cross-tab coordination.
2. HTTP cache headers for public GETs; `no-store` on authenticated endpoints; static-asset service worker (never cache auth/private data).
3. Multi-tab/account handling via the session service.

---

## 5. Priority order (what to build first, with why)

| Order | Work | Why first |
|---|---|---|
| 1 | **Phase 0 security** (tokens, CSRF, JWT, Stripe, 2FA UI) | Nothing else is safe to build on a broken auth/storage model |
| 2 | **Phase 1 RBAC UI** (roles/permissions admin, fix StaffAccess) | Owner's explicit requirement: DB-driven roles managed via UI |
| 3 | **Phase 3 client** (accounts, booking follow-up, testimonials) | Revenue path + owner-flagged missing client features |
| 4 | **Phase 2 CMS completion** (dead endpoints, dashboard, CRUD, blog polish) | Makes the admin trustworthy for day-to-day |
| 5 | **Phase 4 CRM** → **Phase 5 e-commerce** → **Phase 6 ERP** → **Phase 7 HR** | Business domains, each reusing RBAC + money-as-Decimal |
| 6 | **Phase 9 ops** + **Phase 10 state/caching** | Production safety + performance, can run in parallel |
| 7 | **Phase 8 SaaS** | Long-term; depends on e-commerce/ERP |

---

## 6. Honest bottom line

- **The only ~50%-complete, owner-built part is the public frontend.** Everything the owner experiences beyond that — RBAC, CMS depth, CRM, ERP, e-commerce, HR, secure auth, client feedback — is either missing UI, broken contracts, or entirely unbuilt (verified: no models/routes/UI for ERP, e-commerce orders, contracts, candidates).
- **This is not a polish job; it is a build-out.** Realistic path: secure foundation first (Phase 0, ~1–2 weeks), RBAC UI second (Phase 1, ~1–2 weeks), then the client + CMS phases, then CRM/e-commerce/ERP/HR each as multi-week builds.
- **The owner's 3/10 self-assessment is fair and is the baseline this plan is built on.** When the admin can create roles, assign permissions, manage all content, run CRM/ERP/e-commerce/HR, and clients have secure accounts with feedback flows — that is the 10/10 definition above.
