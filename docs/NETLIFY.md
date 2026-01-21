# Netlify Deployment Guide ✅

## Summary
This repo contains a monorepo-style app where the frontend is in `frontend/` (Vite). The Netlify config builds from the `frontend` folder and publishes the static `frontend/dist` output as a site.

## What I added
- `netlify.toml` (repo root) — instructs Netlify to build from `frontend` and sets an SPA redirect.
- `frontend/public/_redirects` — ensures client-side routing works.
- `.github/workflows/netlify-deploy.yml` — optional GitHub Action to build and deploy using a Netlify auth token & site id.

## Quick manual deploy with Netlify CLI
1. Install CLI: `npm i -g netlify-cli`
2. Login: `netlify login`
3. Initialize site (one-time): `netlify init` → select team → link existing site or create new → set build command to `npm run build --prefix frontend` and publish directory `frontend/dist` (or leave defaults and edit later)
4. Build & deploy manually:
   - `npm ci --prefix frontend && npm run build --prefix frontend`
   - `netlify deploy --prod --dir=frontend/dist` (or use the site flag `--site=SITE_ID`)

## Continuous deploy (recommended)
- Connect the repository to Netlify via the Netlify UI (Site → New site → From Git). Set:
  - Base directory: `frontend`
  - Build command: `npm run build --prefix frontend`
  - Publish directory: `frontend/dist`
- Add environment variables in Netlify (Site → Site settings → Build & deploy → Environment → Environment variables):
  - `VITE_API_BASE_URL` → `https://your-backend.example.com/api`

## Notes & recommendations
- This project expects a separate backend (see `backend/`), so host that on a server/platform (Render / Fly / DigitalOcean / Heroku / Cloud Provider). Set `VITE_API_BASE_URL` to its publicly accessible URL.
- Do NOT commit secrets to `netlify.toml` — set them in Netlify UI or GitHub Actions secrets.
- If you want serverless functions on Netlify instead of a separate backend, we can create a `netlify/functions` folder and convert selected endpoints.

---
If you'd like, I can:
1. Set the `VITE_API_BASE_URL` placeholder in a `netlify.toml` production context (not recommended for secrets), or
2. Help you create serverless function handlers for a few simple endpoints, or
3. Walk through connecting the repo to Netlify and set environment variables and secrets via CLI or UI. 

Tell me which next step you prefer. 🔧