# Netlify configuration

> **🛠 OPERATIONAL** — Current deployment reference.<br>
> Both app-level `netlify.toml` files and both `public/_redirects` files define
> the `/v1/*` proxy before the SPA fallback. Netlify deployments must be rebuilt
> after either file changes; a stale deploy still answers `/v1/*` with
> `index.html` and breaks every authenticated screen.

The effective Netlify configuration lives beside each application:

- `frontend/web/netlify.toml`
- `frontend/admin/netlify.toml`

The files in `infrastructure/netlify/` are synchronized deployment references. Netlify discovers the app-level files when each site's **Package directory** is set to the corresponding frontend directory, while the base directory remains the repository root.

The web site owns `angisoft.co.ke` and `www.angisoft.co.ke`. The admin site owns `admin.angisoft.co.ke` and `www.admin.angisoft.co.ke`. Both sites use `https://api.angisoft.co.ke` and `https://cdn.angisoft.co.ke`.

Both configurations proxy `/uploads/*` and `/v1/*` to the API before applying the SPA fallback. The `/v1/*` rule is duplicated in each app's `public/_redirects` so a build can never ship a stale SPA-only redirect table. The API can redirect legacy upload paths to the shared CDN. The preferred production setup is two separate Netlify sites.

Production verification (`docs/ANGISOFT_DIGITAL_HQ_PLAN.md` §17) must confirm that `https://admin.angisoft.co.ke/v1/health` and `https://www.angisoft.co.ke/v1/health` return JSON, not HTML. If they return HTML, the Netlify sites are still serving an older deploy and must be rebuilt.
