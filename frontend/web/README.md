# AngiSoft Frontend (Web)

> **🛠 OPERATIONAL** — Update to `angisoft-web` monorepo structure.<br>
> **Canonical plan:** `docs/ANGISOFT_DIGITAL_HQ_PLAN.md`

React + Vite single-page application for the AngiSoft Technologies public website + client portal.

## Tech Stack

- **React 19** with React Router v7
- **Vite 8.3.8** (`@vitejs/plugin-react` 6.3.0) for build and dev server
- **Tailwind CSS 4** via the first-party `@tailwindcss/vite` plugin (`tailwindcss()`); `@tailwindcss/postcss` and `autoprefixer` are removed
- **MUI 7** available for complex forms
- **@angisoft/api-client** for API calls (in-memory tokens, refresh cookie flow, CSRF)
- **@angisoft/ui** for design tokens, themes, components
- **@angisoft/realtime** for live queries
- **@angisoft/offline** for service worker
- **Formik + Yup** for forms and validation

## Project Structure

```
frontend/web/
├── public/              Static assets (sw.js registered via @angisoft/offline)
├── netlify/             Netlify functions (if any)
├── src/
│   ├── features/        Feature-based modules
│   │   ├── marketing/   Public marketing pages (components/pages)
│   │   ├── auth/        Client portal auth (request/access)
│   │   ├── bookings/    Public booking flow
│   │   ├── client-portal/  Client project tracking
│   │   └── ai-assistant/   ChatBot component
│   ├── router/          routes.tsx + prerender.ts (route/meta list for SSG)
│   ├── lib/             httpClient (legacy), marketing constants, detail paths
│   ├── styles/          Global CSS + per-feature CSS
│   ├── main.tsx         Entry point
│   └── index.css        Tailwind import + CSS variables
├── index.html           Entry point
├── vite.config.ts       Vite + proxy (/v1 canonical, /uploads, /socket.io → :5000; /api is legacy compatibility)
├── netlify.toml         Netlify config (redirects: /uploads/* → API, SPA fallback)
└── package.json         angisoft-web
```

## Development

```bash
npm install
npm run dev          # http://localhost:5173 (proxies /v1 → localhost:5000; /api is legacy-only)
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest (jsdom) |

### Environment Variables

Optional — create a `.env` file in this directory to point the Vite dev proxy at
a non-default backend. Application requests use `/v1/*`; `/api` remains a legacy
compatibility proxy only:

```
VITE_API_BASE_URL=http://localhost:5000
```

**Production hosting leaves this unset.** Netlify proxies `/v1/*` and
`/uploads/*` to the API, so API traffic is same-origin and the browser sends the
`SameSite=Strict` refresh cookie. Setting an absolute base reintroduces
cross-origin cookie breakage — see `docs/NETLIFY.md` §Routing.

## Deployment

Deployed to **Netlify** via `.github/workflows/netlify-deploy.yml` on push to `main`.

Build config is in `../netlify.toml` — `npm ci && npm run build`, publishes `dist/`.

## Coding Conventions

- 2-space indentation with semicolons
- React components use `PascalCase` filenames (e.g., `StaffDetail.jsx`)
- Custom hooks use `useX` naming (e.g., `useAuth`)
- Follow existing file style for consistency
