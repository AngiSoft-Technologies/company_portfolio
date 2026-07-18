# About Page — Backend Architecture

How the public **About Us** page is backed by PostgreSQL + Prisma, served over
`GET /api/about-sections`, and edited from the admin CMS.

> **Source of truth.** The frontend hook `frontend/src/hooks/useAboutPage.js` is
> the canonical contract (`ABOUT_SECTION_KEYS`, `ABOUT_SCHEMA_VERSION`, and
> `defaultAbout`). The backend seeds and serves *exactly* what that hook expects.
> `backend/prisma/about-default-data.ts` is auto-generated from the hook so the
> two never drift (`npm run extract:about-default`).

---

## 1. Data model

### `AboutSection` (Prisma / PostgreSQL)

```prisma
model AboutSection {
  id        String   @id @default(uuid())
  key       String   @unique
  title     String
  enabled   Boolean  @default(true)
  sortOrder Int      @default(0)
  content   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([sortOrder])
  @@index([enabled])
}
```

- **`key`** — one of the 26 canonical `ABOUT_SECTION_KEYS`. Unique, stable.
- **`enabled`** — public API returns rows where `enabled = true` only.
- **`sortOrder`** — drives the page composer order (0 … 25).
- **`content`** — section-specific payload as JSONB. The whole object is the
  value the frontend reads (`about[key] = section.content`). No deep merge.

### Why one hybrid table, not 26 tables

Every section has a different shape, but the *lifecycle* (enable / reorder /
edit / publish) is identical. Storing each as a row with a `Json` `content`
column gives:

- one endpoint, one serializer, one admin screen;
- ordering/visibility managed by `sortOrder` / `enabled` columns (queryable,
  index-backed) instead of embedded in JSON;
- repeated content (industries, clients, technologies, timeline, services,
  numbers, partnerships, solutions) lives *inside* `content` as arrays — no
  careless duplicate models.

## 2. Migration

`prisma/migrations/20260717120000_align_about_section_columns/`

Aligned the physical columns with the frontend contract:

```sql
ALTER TABLE "AboutSection" RENAME COLUMN "order" TO "sortOrder";
ALTER TABLE "AboutSection" RENAME COLUMN "published" TO "enabled";
DROP INDEX "AboutSection_order_idx";
DROP INDEX "AboutSection_published_idx";
CREATE INDEX "AboutSection_sortOrder_idx" ON "AboutSection"("sortOrder");
CREATE INDEX "AboutSection_enabled_idx" ON "AboutSection"("enabled");
```

## 3. Endpoints

Base path: `/api/about-sections` (mounted in `src/index.ts` via
`aboutSectionsRouter()`).

### Public (no auth)
`GET /api/about-sections`
→ `{ data: [ { id, key, enabled, sortOrder, content }, … ] }`
(enabled rows only, ordered by `sortOrder` ascending).

Both an array and a `{ data: [...] }` shape are accepted by the frontend; this
API returns the wrapped form.

### Admin (auth + RBAC — `ADMIN`, `MARKETING`, `CONTENT_CREATOR`)
Mounted under `/api/about-sections/admin`:

| Method | Path              | Purpose                                  |
|--------|-------------------|------------------------------------------|
| GET    | `/admin`          | list **all** (incl. disabled), for CMS   |
| POST   | `/admin`          | create section (key, title, content…)    |
| PATCH  | `/admin/:key`     | partial update                           |
| PUT    | `/admin/:key`     | replace content                          |
| DELETE | `/admin/:key`     | delete section                           |
| POST   | `/admin/reorder`  | bulk reorder `[{ key, sortOrder }]`      |

Validation is zod-based (`createSectionSchema`, `updateSectionSchema`,
`reorderSchema`). Errors are thrown as `Error` with a `statusCode` property and
handled by the global error middleware.

### Serializer
`serializeSection(row)` → `{ id, key, enabled, sortOrder, content }`, matching
exactly what `buildAboutFromSections` destructures in the hook.

## 4. Seeding

`backend/prisma/seed.ts` → `seedAboutSections(aboutValue)`:

1. Loads the canonical contract from `about-default-data.ts` (generated from the
   hook). Falls back to a 26-key minimal object if generation is unavailable.
2. Upserts the 26 canonical section keys from `ABOUT_SECTION_KEYS` (NOT
   `Object.keys(defaultAbout)`), so the stray metadata key `schemaVersion` is
   never persisted as a row.
3. `sortOrder` = position in the canonical order; `enabled = true`; `content` =
   the section payload from the hook.
4. Controlled by env `OVERWRITE_PUBLIC_CONTENT=1` → also refresh `content` on
   existing rows; the title/order columns are always refreshed.

Also writes a legacy `site_about` `Setting` blob (consumed by `site.ts` and the
chatbot context), so existing consumers keep working. The About *page* itself
uses the section rows, not that blob.

## 5. Frontend wiring (read path)

`useAboutPage.js`:

```
GET /api/about-sections  →  buildAboutFromSections(response)
  → filter enabled && ABOUT_SECTION_KEYS.includes(key)
  → sort by sortOrder
  → about[key] = section.content
```

`clientStats`, `clientHighlights`, and `testimonials` are likewise read from the
same `AboutSection` source (testimonials via `/api/testimonials`).

## 6. Images / media

- Backend-served assets: `backend/uploads/public/images/about/...` → URL
  `/uploads/public/images/about/...` (static mount in `app.ts`).
- Frontend static assets: `frontend/public/images/about/...` → URL
  `/images/about/...`.
- Every image path is stored **as data inside `content`** (with `alt` text and
  optional desktop/mobile variants) — never hardcoded in components.
- Missing files degrade gracefully via `SmartImage` / `resolveAssetUrl()`.
- The authoritative missing-asset checklist:
  `backend/uploads/public/images/about/REQUIRED_ASSETS.md`.
  **31 of 60 referenced images are not yet on disk** (29 present). Drop real
  files at those paths; do not fabricate clients, partners, or stats.

## 7. Regenerating the canonical data

```bash
cd backend
npm run extract:about-default   # hook -> prisma/about-default-data.ts
npx prisma db seed              # -> 26 canonical rows
```
