# Netlify configuration

> **🛠 OPERATIONAL** — Current deployment reference.<br>
> **Required update (canonical plan Phase 0.7):** Admin `netlify.toml` must add `/api/*` proxy before SPA fallback.

The effective Netlify configuration lives beside each application:

- `frontend/web/netlify.toml`
- `frontend/admin/netlify.toml`

The files in `infrastructure/netlify/` are synchronized deployment references. Netlify discovers the app-level files when each site's **Package directory** is set to the corresponding frontend directory, while the base directory remains the repository root.

The web site owns `angisoft.co.ke` and `www.angisoft.co.ke`. The admin site owns `admin.angisoft.co.ke` and `www.admin.angisoft.co.ke`. Both sites use `https://api.angisoft.co.ke` and `https://cdn.angisoft.co.ke`.

Both configurations proxy `/uploads/*` to the API before applying the SPA fallback. The API can redirect legacy upload paths to the shared CDN. The preferred production setup is two separate Netlify sites.

**Admin `netlify.toml` must add:**
```toml
[[redirects]]
  from = "/api/*"
  to = "https://api.angisoft.co.ke/api/:splat"
  status = 200
  force = true
```
(Before the `/*` → `/index.html` SPA fallback)
