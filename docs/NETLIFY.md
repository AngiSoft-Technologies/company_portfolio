# Netlify Deployment

> **🛠 OPERATIONAL** — Current deployment reference; update admin proxy config per Phase 0.7.<br>
> **Required change (canonical plan `ANGISOFT_DIGITAL_HQ_PLAN.md` Phase 0.7):** Admin `netlify.toml` must add `[[redirects]]` for `/v1/*` → `https://api.angisoft.co.ke/v1/:splat` before SPA fallback.

The web and admin applications are separate Vite sites built from the pnpm workspace. Dependency installation and build commands run from the repository root.

## Production domains

| Site | Netlify custom domains | API | Public CDN |
| --- | --- | --- | --- |
| Web | `angisoft.co.ke`, `www.angisoft.co.ke` | `https://api.angisoft.co.ke` | `https://cdn.angisoft.co.ke` |
| Admin | `admin.angisoft.co.ke`, `www.admin.angisoft.co.ke` | `https://api.angisoft.co.ke` | `https://cdn.angisoft.co.ke` |

Both sites use the same Fly.io backend and Tigris CDN. Attach the two domain names to each matching Netlify site; do not point the admin site at the web project or vice versa.

## Site configuration

Create or update two Netlify sites linked to this repository. Leave **Base directory** empty (the repository root), then set **Package directory** and the matching build settings:

| Site | Package directory | Build command | Publish directory | Functions directory |
| --- | --- | --- | --- | --- |
| Web | `frontend/web` | `pnpm install --frozen-lockfile && pnpm --filter angisoft-web build` | `frontend/web/dist` | `frontend/web/netlify/functions` |
| Admin | `frontend/admin` | `pnpm install --frozen-lockfile && pnpm --filter angisoft-admin build` | `frontend/admin/dist` | Not set; no admin functions directory exists |

The corresponding configuration files are `frontend/web/netlify.toml` and `frontend/admin/netlify.toml`. Netlify searches the package directory first, so these files apply to the corresponding site. The infrastructure copies are in `infrastructure/netlify/`.

Both sites use Node.js 24. `VITE_SOCKET_URL` is set to `https://api.angisoft.co.ke` so both frontends reach the shared backend over Socket.IO. `VITE_CDN_BASE_URL` points the web site at `https://cdn.angisoft.co.ke`. **`VITE_API_BASE_URL` is deliberately not set** — see §Routing below for why that matters. These are public browser configuration values, not secrets.

## Backend and CDN

The Fly.io app must allow all four production frontend origins in `CORS_ORIGIN` when that variable is set:

```text
https://angisoft.co.ke,https://www.angisoft.co.ke,https://admin.angisoft.co.ke,https://www.admin.angisoft.co.ke
```

Set `S3_PUBLIC_BASE_URL=https://cdn.angisoft.co.ke` on Fly.io. The API remains the compatibility route for existing `/uploads/*` URLs; public storage responses are served by the shared CDN.

## Local build verification

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter angisoft-web build
pnpm --filter angisoft-admin build
```

## Optional GitHub deployment

`.github/workflows/netlify-deploy.yml` builds both applications and deploys the web site with `NETLIFY_SITE_ID` and the admin site with `NETLIFY_ADMIN_SITE_ID`. Configure `NETLIFY_AUTH_TOKEN` and both site ID secrets in GitHub Actions.

## Routing

Both app configurations proxy `/uploads/*` **and `/v1/*`** to the API before applying the SPA fallback. Do not add a catch-all rule before the uploads rule.

### Versioned API base

The backend mounts every endpoint under `/v1` (for example
`https://api.angisoft.co.ke/v1/services`). There is intentionally no `/api`
alias — callers must use the versioned path. Browser apps keep calling the
same-origin relative form (`/v1/services`) and Netlify forwards it to the
versioned backend URL above; `@angisoft/api-client` rewrites any legacy
`/api/...` input to `/v1/...` as a defensive measure, but new code must use
`/v1`. Provider webhook URLs (PayPal, PayHero, Safaricom Daraja, Zoho) must
also be updated to their `/v1` equivalents in each provider dashboard.

### Why `/v1/*` must be proxied

The backend issues the refresh token as a **host-only, `SameSite=Strict`** cookie (`backend/src/shared/middleware/auth.ts`). A browser will not send a `SameSite=Strict` cookie on a cross-site request, so an app calling `https://api.angisoft.co.ke/v1/...` directly from `admin.angisoft.co.ke` never transmits it — silent refresh fails and staff sessions die on every reload.

Proxying `/v1/*` makes API traffic **first-party**, which fixes cookie delivery and removes the CORS preflight entirely:

```toml
[[redirects]]
  from = "/v1/*"
  to = "https://api.angisoft.co.ke/v1/:splat"
  status = 200
  force = true
```

**Consequence — neither app sets `VITE_API_BASE_URL`.** `@angisoft/api-client` only resolves an absolute base when that variable is explicitly set; otherwise it uses same-origin relative URLs. Setting it reintroduces the broken cross-origin cookie behaviour. `VITE_SOCKET_URL` remains `https://api.angisoft.co.ke` because Socket.IO connects cross-origin by design and does not depend on the refresh cookie.
