# Netlify redirect rules — shared reference for the two apps.
#
# Both frontend/web and frontend/admin are built by Netlify from their own
# directories. Each app carries a netlify.toml (in infrastructure/netlify/ as
# the canonical copy). The rules below are identical in both apps and MUST be
# declared BEFORE the SPA catch-all:
#
#   1. /uploads/*  -> https://api.angisoft.co.ke/uploads/:splat   (proxy assets to backend)
#   2. /*          -> /index.html                                 (SPA fallback)
#
# If admin is ever served from a subpath (admin.angisoft.co.ke), add a
# redirect from /admin/* to the admin app or a Netlify site-level proxy. The
# preferred production shape is two separate Netlify sites.