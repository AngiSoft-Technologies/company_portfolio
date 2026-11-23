# AngiSoft Capability Map

> **🔄 REGENERATE** — Rebuilt against live code on **2026-11-23**; structural counts refreshed after the legal/notifications closeouts. Evidence: `backend/src/app.ts` (**100** API mounts), `backend/src/prisma/contract.prisma` (**148 models**, `namespace public`), `frontend/web/src/router/routes.tsx` (41 route entries), `frontend/admin/src/app.tsx` (**86** route entries), `backend/prisma/seed-professional.ts`, `backend/src/modules/identity/services/permissionRegistry.ts` (**213 keys / 37 groups** at verification time — re-count before signoff).
>
> States: **Live** = shipped in code · **Partial** = works with known gaps · **Planned** = in the canonical plan, not built.
> Canonical plan: `ANGISOFT_DIGITAL_HQ_PLAN.md`. Content↔admin detail: `PUBLIC_CONTENT_ADMIN_MATRIX.md`. Production gates: `PRODUCTION_READINESS.md`.

---

## 1. Public marketing site (`frontend/web`)

Verified route entries in `frontend/web/src/router/routes.tsx`; all business content is read from `/v1/*`.

| Capability | Public surface | Data source | State |
|---|---|---|---|
| Home / hero / sections | `/` | `/v1/site/home`, `/v1/company-stats` | Live |
| About | `/about` | `/v1/site/about`, `/v1/about-sections` | Live |
| Services catalogue + detail | `/services`, `/services/:slug` | `/v1/services`, `/v1/service-categories`, `/v1/service-faqs` | Live |
| Categories / technology | `/solution/:slug`, `/technology/:slug` | `/v1/solutions`, `/v1/service-categories` | Live |
| Pricing | `/pricing` | `/v1/pricing-packages`, `/v1/site/pricing` | Live — `PricingPackage` model + admin CRUD + public package cards |
| Products + detail | `/products`, `/products/:slug` | `/v1/products`, `/v1/product-faqs` | Live |
| Blog / Learning | `/blog`, `/blog/:slug` | `/v1/blogs`, `/v1/blog-categories` | Live |
| Staff directory + portfolios | `/staff`, `/staff/:usernameOrId` | `/v1/staff`, `/v1/employee-profiles/portfolio-config/public/:employeeId` | Live — published `EmployeePortfolioConfig` renders themes/layouts/structured blocks; moderation screen `/portfolio-approvals` |
| Industries + detail | `/industries`, `/industries/:slug`, `/industry/:slug` | `/v1/industries`, `/v1/site/industries`, `/v1/projects` | Live — "Work in {industry}" project strip |
| Solutions + detail | `/solutions`, `/solutions/:slug` | `/v1/solutions` | Live |
| Projects + detail | `/projects`, `/project/:slug` | `/v1/projects` | Live |
| Testimonials | `/testimonials` | `/v1/testimonials` | Live (moderated) |
| Careers | `/careers` | `/v1/careers` | Live |
| Contact + pitch-an-idea | `/contact` | `POST /v1/contact-enquiries` | Live — public POST behind `publicFormLimiter` |
| Booking + tracking | `/book`, `/booking`, `/booking/:id`, `/bookings`, `/bookings/:reference`, `/track-booking` | `/v1/bookings` | Live — consent gate on `/book`; token-gated deposit endpoint |
| Newsletter confirm/unsubscribe | `/newsletter/confirm`, `/newsletter/unsubscribe` | `/v1/newsletter` | Live |
| Legal | `/privacy`, `/privacy-policy`, `/terms`, `/terms-conditions`, `/consent` | `GET /v1/legal/{privacy,terms}` + `PUT /v1/site/legal-{privacy,terms}` (ADMIN) + `/v1/consent` | **DONE (code)** — structured CMS sections rendered as React text nodes, checked-in fallback, admin editor at `/legal-pages`; no HTML stored |
| Client consent | `/consent` | `/v1/consent` | Live — required before booking/portal request |
| i18n | header switcher, 21 locales, RTL for `ar`/`fa` | `@angisoft/i18n` (115 keys/locale) | Live — native-speaker review still recommended (`I18N.md`) |

## 2. Client portal (`frontend/web`)

| Capability | Surface | State |
|---|---|---|
| Client auth | `/portal/request`, `/portal/access`, `/portal/login` → `POST /v1/client-portal/{session,login,refresh}` + `setClientAccessToken` | **Live** — password login (`/v1/client-portal/login`, opt-in via authenticated password setup) plus rotating dedicated client refresh cookie; magic links retained for existing clients (`backend/test/client-portal-auth.spec.ts`) |
| Project tracking | `/portal`, `/portal/projects/:id` (milestones, activities, comments, deliverables) | Live |
| Booking follow-up | dashboard booking cards + `/v1/client-portal/bookings` | Live |
| Billing visibility | `/v1/client-portal/{quotes,invoices}` | Live |
| Testimonial submission | `POST /v1/client-portal/testimonials` (moderated) | Live |
| Invoice payment | `POST /v1/client-portal/invoices/:id/pay` (PAYPAL, PAYHERO, Daraja/MPESA) | Live in code — **no live provider credentials/transactions yet** (0 `FinanceTransaction` rows in production) |
| Notifications | `/v1/client-portal/notifications*` | Live |
| Renewals | renewal health rollup + reminder (`/v1/admin/renewals`) | Live |
| Payments catalogue | `/v1/payments/methods`; token-gated booking deposit `POST /v1/bookings/reference/:ref/deposit` | Partial — admin console is read-only |
| Chatbot spend limits + review UI | `aiChatLimiter` (burst/IP) + `aiSpendLimiter` (daily token/USD caps, fail-closed store) in `shared/middleware/rateLimiter.ts`; admin review at `/chat-conversations` (`ChatbotConversationsAdmin`), guarded history/reply endpoints | **DONE (code)** — spend caps and human-in-the-loop review UI shipped; **deferred:** per-user/per-org spend ledger and live provider-billing verification (external) |

## 3. Staff operating system (`frontend/admin`)

All 86 route entries are in `frontend/admin/src/app.tsx`. Nav visibility is driven by `EffectiveAccessProvider` (`useCan()`), with explicit DENY final.

| Capability | Surface | Permissions | State |
|---|---|---|---|
| Dashboard + workspace widgets | `/`, `/dashboard`, `/workspace`, `/staff-dashboard` | `effective-access` driven | Live — server-side widget catalogue, empty states on zero assignments |
| Permission registry + tri-state grants | `/staff-access`, `/settings/roles` | `staff.assign_permissions`, `administration.roles` | Live in code — **production `Permission` table has only 16 legacy keys**; seed must be applied |
| Staff management | `/staff`, `/staff-access` | `staff.*` | Partial — dept/pos assignment lives in `StaffAccess`, not `StaffManagement` |
| Content CMS | `/sections`, `/about`, `/services`, `/service-categories`, `/products`, `/faqs`, `/careers`, `/testimonials`, `/industries`, `/solutions`, `/pricing`, `/pricing-packages`, `/announcements`, `/company-stats`, `/blogs`, `/offices`, `/settings`, `/legal-pages` | per-content keys (`pages.update_site_chrome` for legal) | Live — privacy/terms edited as structured JSON, never HTML |
| Bookings / client projects | `/bookings`, `/client-projects`, `/projects` | `bookings.*`, `client_projects.*`, `projects.*` | Live |
| Sales pipeline | `/opportunities`, `/quotes`, `/invoices`, `/leads` (data) | `opportunities.*`, `quotes.*`, `invoices.*`, `sales.pipeline.view` | Live |
| Contacts / enquiries / tickets | `/contacts`, `/support-tickets`, `/product-inquiries`, `/renewals` | `enquiries.*`, `support_tickets.*`, `product_inquiries.*` | Live |
| Chatbot conversations | `/chat` | `chatbot.view_all` | Live — endpoints guarded since Phase 0 |
| Payments / money movement | `/payments`, `/payments/console`, `/money-movement`, `/expenses` | `payments.*`, `expenses.*` | Live (read-only console; no write UI claimed) |
| Finance Command Center | `/finance-hub`, `/finance`, `/finance/{connections,accounts,transactions,payouts,reconciliation,refunds-disputes,reports,settings}` | `finance.*` (HIGH for money actions) | Live in code — **0 `ProviderConnection` / 0 `FinanceTransaction` rows in production** |
| Communications Command Center | `/communications`, `/communications/{overview,inbox,email,whatsapp,telegram,social,templates,rules,contacts,settings}`, `/webhook-inbox` | `communications.*` | Live in code — provider credentials/callbacks not provisioned |
| Email vault | `/settings/vault` | `administration.settings` | Live — runtime config in `Setting` table (`config:seed` dry-run 137 keys; live write unverified) |
| AI config / assist / workforce | `/ai`, `/ai-assist`, `/agents`, `/boardroom` | `ai_config.*`, endpoint-mirrored, `agents.*`, SUPER_ADMIN-only boardroom | Live — 12-agent roster; `AgentRun` 644 rows at the 2026-11-23 20:41 EAT read (timestamped, not an invariant — tracker §4) |
| File uploads | `/uploads` | `media.*` | Live — Tigris/S3 with immutable cache headers |
| Audit / reports / approvals | `/audit-log`, `/reports`, `/approvals`, `/system`, `/security` | `administration.audit`, `approvals.*` | Live |
| HR / ERP | `/leave-requests`, `/attendance`, `/payroll`, `/staff`; recruiting/contracts/orders under `/v1/hr/*` (`backend/src/modules/hr/**`); performance/goals/training/directory-privacy/offboarding under `/v1/hr/performance/*` | `leave.*`, `attendance.*`, `payroll.*`, `staff.*`, HR-scoped permissions | Live v1 **plus recruiting/contracts/orders and performance/lifecycle slices (code + contract models)** — additive migrations `20261123040000_hr_recruiting_contracts_orders` and `20261123060000_phase2_delivery_slices` pending approval |
| Portfolio studio | `/workspace/portfolio-studio`, `/portfolio-approvals` | `profile.update_own`, `staff.view` | Live — order/visibility/themes/structured blocks/version history |
| MFA UI | `/security` + forced enrollment in `/login` | — | Live — TOTP, email/SMS/WhatsApp OTP, passkeys, backup codes; backend `/v1/auth/mfa/*` |
| Newsletter / surveys | `/newsletters`, `/surveys` | `newsletters.*`, `surveys.*` | Live |
| Notifications | `/notifications` | self-service `GET/POST /v1/notifications` | Live — personal inbox/preferences screen, no new admin-wide permission |

## 4. Backend modules (`backend/src/modules`)

`identity` (auth, MFA, employees, roles, permissions, staff-dashboard, leave, attendance, payroll, employee-emails, certifications) · `crm` (leads, opportunities, quotes, invoices, client-portal, newsletters, surveys, support-tickets, renewals, product-inquiries, contact-enquiries) · `projects` (projects, client-projects, careers) · `bookings` (bookings, events, tracking) · `cms` (services, categories, blogs, staff-blogs, products, product-faqs, industries, solutions, faqs, testimonials, careers, announcements, company-stats, home/about sections, site settings, certifications, pricing-packages, offices, catalog-feed) · `billing` (payments, payment-console, money-movement, mpesa, mpesa-callbacks, payouts, wallets, expenses) · `files` (uploads → Tigris/S3) · `notifications` · `ai` (chatbot, ai-config, ai-assist) · `analytics` · `agents` + `boardroom` (Phase 6) · `communications` + `finance` (Phase 7) · `i18n` (shared package).

Cross-cutting: `shared/routes/{admin,health,runtime-config,approvals,webhookInbox,consent}` and `shared/middleware/{auth,roles,csrf,cache,rateLimiter,validation,errorHandler}`. All route guards use `requireAccess(permission, fallbackRoles)` or `requirePermission`; `effectivePermissions.has()` checks explicit DENY before every grant path including the SUPER_ADMIN wildcard.

## 5. Contract roots (verified 2026-11-23)

`backend/src/prisma/contract.prisma` declares `namespace public` with **148 models**:

- **Identity/permissions**: `Employee`, `Department`, `Position`, `AppRole`, `Permission`, `RolePermission`, `EmployeePermission`, `EmployeeRoleAssignment`, `PermissionPreset`, `EmployeeEmail`, `MfaMethod`, `MfaChallenge`, `WebAuthnCredential`, `TwoFactorBackupCode`.
- **Commercial pipeline**: `Lead`, `Opportunity`, `Quote`, `QuoteLineItem`, `Invoice`, `InvoiceLineItem`, `Booking`, `Payment`, `Payout`, `Expense`, `PricingPackage`, `PayrollRun`, `Payslip`, `SalaryStructure`, `ApprovalRequest`.
- **Phase 7 (all present in contract AND live Neon per main-session MCP check)**: `ProviderConnection`, `ProviderSecret`, `ProviderEvent`, `ExternalSyncCursor`, `CommunicationAccount`, `CommunicationGrant`, `Contact`, `ContactIdentity`, `Conversation`, `ConversationMessage`, `RoutingRule`, `EmailDraft`, `EmailSendAsIdentity`, `EmailThread`, `EmailFolder`, `EmailAttachment`, `CommunicationTemplate`, `FinanceAccount`, `LedgerEntry`, `FinanceTransaction`, `ReconciliationRun`, `ReconciliationItem`, `Refund`, `Dispute`, `Settlement`, `Beneficiary`, `PayoutApproval`.
- **ERP/HR closeout (contract only; additive migration `20261123040000_hr_recruiting_contracts_orders` not applied live)**: `JobRequisition`, `Candidate`, `Offer`, `Contract`, `SalesOrder`, `SalesOrderLineItem`.
- **Portfolio/CMS**: `EmployeePortfolioConfig`, `EmployeePortfolioItem`, `Certification`, `EmployeeProfileStat`, all public content models, `HomePageSection` (note: contract name is `HomePageSection`, not `HomeSection`).

## 6. Gaps still open (see `PRODUCTION_READINESS.md` for the full tracker)

1. **Permission seed not applied in production** — 16 legacy keys vs 213 in code; canonical keys stay ungranted until `npx prisma db seed` runs.
2. **No live provider provisioning/money movement** — 0 `ProviderConnection`/`FinanceTransaction` rows; vault dry-run only.
3. **Integration suite not run** — no disposable `TEST_DATABASE_URL`; mocked suite passes 67 files/613 tests with `integration.spec.ts` excluded.
4. **Lighthouse budgets failing** — final local run after safe fixes scored 0.59 (LCP 1621.6ms pass / CLS 0.0028 pass / TBT 24670.7ms fail) on a saturated 2-CPU host; blank control already fails TBT at 477ms (`/tmp/opencode/lighthouse-final-safe-fixes.json`), deployed stale release worse. No pass claimed; the **mocked** authenticated admin route×theme matrix is green (82 routes × 3 themes, 246 checks in 18 chunks + 1 persistence test; E2E 30/30), while the **live authenticated** matrix still needs redeploy/credentials.
5. **Security audit PARTIAL** — `SECURITY_AUDIT.md` points to `security/OWASP_AUDIT.md`; 0 exploit-validated findings, not signed off.
6. **Chatbot spend limits / review UI — DONE (code):** burst/IP limiter, daily token + USD caps with fail-closed store, and the `/chat-conversations` review UI are shipped. **Deferred:** per-user/per-org spend ledger (no contradictory "Partial" claim in §2) and live provider-billing verification, which is external.
7. **i18n native review, MUI DataGrid adoption** — native review/MUI migration deferred by design; AVIF/WebP image pipeline is shipped.

> Fast-moving note: this turn has active code changes (i18n dictionaries, Phase 7 scripts, permission registry). Counts above are a point-in-time snapshot — re-run the greps before any release signoff.

## 7. Phase 2 minimum delivery slices — code + contract + mounts (local evidence)

Additive vertical slices implemented 2026-11-23, **mounted locally, not live, and not permission-seeded**:

- **20 new contract models** in `backend/src/prisma/contract.prisma` (now 148 models total): project delivery (`ProjectTemplate`, `EmployeeCapacity`, `ProjectChangeRequest`, `ProjectRisk`, `ProjectRetrospective`, `ProjectSignOff`), finance (`CreditNote`, `TaxRate`, `ArApEntry`, `CommissionEntry`), HR (`PerformanceReview`, `Goal`, `TrainingRecord`, `DirectoryPrivacySetting`, `Offboarding`), marketing (`Campaign`, `ContentCalendarEntry`, `ContentBrief`, `AssetLibraryItem`, `AttributionLink`). Money/rate fields are `Numeric(18, 2)` decimal text — no floats.
- **Local-only migration evidence**: `backend/prisma/migrations/20261123060000_phase2_delivery_slices/migration.sql` — 20 `CREATE TABLE IF NOT EXISTS` plus indexes, no destructive SQL; **NOT applied to any Neon branch**.
- **Mounted guarded routes** in `backend/src/app.ts`: `/v1/project-delivery` (6 resources), `/v1/finance/accounting` (4), `/v1/hr/performance` (5, before `/v1/hr`), `/v1/marketing` (5). Source factories: `projects/routes/delivery-slices.ts`, `finance/routes/accounting-slices.ts`, `hr/routes/performance-slices.ts`, `cms/routes/marketing-slices.ts`. Guards use only existing permission keys (`projects.*`, `invoices.*`, `staff.*`, `publications.*`) with no registry changes.
- **Verification after mounting**: backend `npx tsc --noEmit` exit 0 (`/tmp/opencode/tsc-after-product-mounts.out`); 4 focused DB-free specs / 16 tests pass (`/tmp/opencode/product-focused-after-mount.out`); `git diff --check` clean. No production enablement is claimed.
