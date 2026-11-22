# 📚 DOCUMENTATION INDEX - AngiSoft Admin CMS

> **🛠 OPERATIONAL** — Restructure navigation. Canonical plan is `ANGISOFT_DIGITAL_HQ_PLAN.md`.

## Quick Navigation

**Just Getting Started?** → Start with **`ANGISOFT_DIGITAL_HQ_PLAN.md`** (canonical plan)

**Want Quick Reference?** → See [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

**Ready to Test?** → Go to [TESTING_GUIDE.md](TESTING_GUIDE.md) (requires `TEST_DATABASE_URL`)

**Need Full Details?** → Read `ANGISOFT_DIGITAL_HQ_PLAN.md` §3 (Target Architecture), §4 (Phased Delivery), §5 (Data Model)

**Current Status?** → Check `ANGISOFT_DIGITAL_HQ_PLAN.md` §2 (Current Reality) + §2.2 (delivery ledger)

**What Changed?** → View [CHANGELOG.md](CHANGELOG.md)

---

## Document classification

Every Markdown document in this repository carries exactly one status badge in its
header. The badge is authoritative — where a document disagrees with the canonical
plan, the plan wins.

| Badge | Meaning | Count | Documents |
|-------|---------|-------|-----------|
| 🟢 **CANONICAL** | Normative now | 3 | `ANGISOFT_DIGITAL_HQ_PLAN.md`, `ANGISOFT_DESIGN_SYSTEM_RULES.md`, `REVAMP_PLAN.md` |
| 🎯 **TARGET** | Normative target; partly implemented | 3 | `ANGISOFT_PERMISSION_ASSIGNMENT_MODEL.md`, `ANGISOFT_ASSIGNMENT_SCOPE_MATRIX.md`, `ANGISOFT_DASHBOARD_WIDGET_MATRIX.md` |
| 🔄 **REGENERATE** | Useful structure; must be rebuilt against current code | 4 | `ANGISOFT_CAPABILITY_MAP.md`, `PUBLIC_CONTENT_ADMIN_MATRIX.md`, `ANGISOFT_CURRENT_DEPARTMENTS.md`, `ANGISOFT_POSITION_REQUIREMENTS.md` |
| 📜 **HISTORICAL** | Read-only baseline; do not cite for current status | 6 | `ADMIN_AND_STAFF_CODEBASE_AUDIT.md`, `SYSTEM_REVIEW_AND_ROADMAP.md`, `SYSTEM_ARCHITECTURE.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `IMPLEMENTATION_ROADMAP.md` |
| 💡 **HYPOTHESIS** | Ideation / content backlog only | 3 | `BRAND_EXPANSION_STRATEGY.md`, `CHATBOT_GUIDE.md`, `SERVICES_DATABASE.md` |
| ✅ **COMPLETE** | Frozen milestone summary | 8 | `MILESTONE_PHASE_2.md`, `PHASE_2_COMPLETION.md`, `SESSION_SUMMARY.md`, `VERIFICATION_CHECKLIST.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, `DOCUMENTATION_GUIDE.md`, `REDIS_REMOVAL.md` |
| 🛠 **OPERATIONAL** | Current reference / runbook | 22 | `NETLIFY.md`, `BACKUP_RESTORE.md`, `TESTING_GUIDE.md`, `QUICK_REFERENCE.md`, `QUICK_START_PHASE_3.md`, `DESIGN_PROVENANCE.md`, `ANGISOFT_PERMISSION_CATALOGUE.md`, `PAYMENTS.md`, `PAYPAL_DOCS_SUMMARY.md`, `PAYPAL_RESOURCE_UTILIZATION_PLAN.md`, `META_DOCS_SUMMARY.md`, `META_RESOURCE_UTILIZATION_PLAN.md`, `DARAJA_RESOURCE_UTILIZATION_PLAN.md`, `SECRETS_ARCHITECTURE.md`, `about-page-backend.md`, `about-page-data-matrix.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `CODE_OF_CONDUCT.md`, plus this index |

Full rules: `ANGISOFT_DIGITAL_HQ_PLAN.md` §11 (Reconciliation Rules) and §15 (Document Migration Checklist).

---

## 📖 Documentation Files

### 1. **`ANGISOFT_DIGITAL_HQ_PLAN.md`** ⭐ START HERE
**Purpose:** The single authoritative plan for the Digital Headquarters
**Read Time:** 20 minutes
**Best For:** Understanding what to build, in what order, and why
**Content:**
- Current reality + Phase 0 delivery record (§2, §2.2)
- Target architecture and 5-phase delivery plan
- Canonical permission registry and precedence rules
- Content Coverage Ledger regenerated from live routes
- Department/position registry, dashboard contract, design authority
- Document reconciliation rules and migration checklist

### 2. **`AGENTS.md`** — repository conventions, commands, deployment quirks

### 3. **`ANGISOFT_DESIGN_SYSTEM_RULES.md`** — the normative design law

### 4. **`PAYMENTS.md`** — PayPal, PayHero and Daraja money movement

- [`PAYPAL_DOCS_SUMMARY.md`](PAYPAL_DOCS_SUMMARY.md) — summary of the supplied PayPal docs.
- [`PAYPAL_RESOURCE_UTILIZATION_PLAN.md`](PAYPAL_RESOURCE_UTILIZATION_PLAN.md) — what we use, defer or decline, and why.
- [`DARAJA_RESOURCE_UTILIZATION_PLAN.md`](DARAJA_RESOURCE_UTILIZATION_PLAN.md) — inventories the 27 locally available Daraja Markdown files, reconciled config keys, decisions/gaps and pre-production checklist; not a claim that the pack is complete or that Phase 7 is production-ready.
- [`daraja-guide/`](daraja-guide/README.md) — all 27 community Daraja docs vendored in-repo (verbatim), with a provenance note and the C1–C7 decisions that override them. Non-authoritative; the utilization plan is the inventory of record.

### 5. **`SECRETS_ARCHITECTURE.md`** — root secrets vs database vault

- Authoritative split of all `backend/.env` keys, keyring rotation procedure, seed command
  (`npm run config:seed`), API routes and the `/settings/vault` SUPER_ADMIN screen.

### 6. **`META_DOCS_SUMMARY.md`** — all Meta developer resources (not only WhatsApp)

- [`META_DOCS_SUMMARY.md`](META_DOCS_SUMMARY.md) — consolidated understanding of every
  Meta doc family: core APIs, auth, webhooks, AI/MCP, social, messaging, marketing,
  commerce, work, data portability, gaming and privacy.
- [`META_RESOURCE_UTILIZATION_PLAN.md`](META_RESOURCE_UTILIZATION_PLAN.md) — all 59
  resources mapped to an AngiSoft use, status and owner; WhatsApp is one channel among
  many.

The seven-badge classification table above is authoritative for every Markdown file
in this repository. Use it instead of the per-file summaries that previously lived
here — those described the pre-restructure single-frontend layout and carried
obsolete completion percentages.

- **Build/delivery questions** → `AGENTS.md` (commands, deployment quirks) + `ANGISOFT_DIGITAL_HQ_PLAN.md` §2.2 (what has shipped)
- **Adding or changing a document** → follow §11 and §15 of `ANGISOFT_DIGITAL_HQ_PLAN.md`
