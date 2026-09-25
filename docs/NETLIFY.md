# Netlify Deployment

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

Both sites use Node.js 24. The app configurations set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to `https://api.angisoft.co.ke`, so both frontends use the shared backend. These are public browser configuration values, not secrets.

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

Both app configurations proxy `/uploads/*` to the API before applying the SPA fallback. Do not add a catch-all rule before the uploads rule.
