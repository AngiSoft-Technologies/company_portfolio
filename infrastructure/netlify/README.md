# Netlify configuration

The effective Netlify configuration lives beside each application:

- `frontend/web/netlify.toml`
- `frontend/admin/netlify.toml`

The files in `infrastructure/netlify/` are synchronized deployment references. Netlify discovers the app-level files when each site's **Package directory** is set to the corresponding frontend directory, while the base directory remains the repository root.

The web site owns `angisoft.co.ke` and `www.angisoft.co.ke`. The admin site owns `admin.angisoft.co.ke` and `www.admin.angisoft.co.ke`. Both sites use `https://api.angisoft.co.ke` and `https://cdn.angisoft.co.ke`.

Both configurations proxy `/uploads/*` to the API before applying the SPA fallback. The API can redirect legacy upload paths to the shared CDN. The preferred production setup is two separate Netlify sites.
