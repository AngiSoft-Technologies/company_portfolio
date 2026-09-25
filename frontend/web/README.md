# AngiSoft Frontend

React + Vite single-page application for the AngiSoft Technologies website.

## Tech Stack

- **React 19** with React Router v7
- **Vite 7** for build and dev server
- **Tailwind CSS 4** + RippleUI + MUI components
- **Redux Toolkit** for state management
- **Axios** for API calls (proxied to backend in dev)
- **Nivo + Chart.js** for data visualizations
- **Formik + Yup** for forms and validation

## Project Structure

```
frontend/
├── public/              Static assets
├── netlify/             Netlify functions
├── src/
│   ├── admin/           Admin CMS pages
│   ├── components/
│   │   ├── cards/       Reusable card components
│   │   ├── landing/     Homepage sections
│   │   ├── modern/      Styled UI components
│   │   └── sections/    Page sections (Staff, Projects, etc.)
│   ├── pages/           Route-level page components
│   └── assets/          Images and static files
├── index.html           Entry point
├── vite.config.js       Vite + proxy config
└── tailwind.config.js   Tailwind theme
```

## Development

```bash
npm install
npm run dev          # http://localhost:5173 (proxies /api → localhost:5000)
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

Create a `.env` file in this directory:

```
VITE_API_BASE_URL=http://localhost:5000
```

In production (Netlify), set this to your Railway backend URL.

## Deployment

Deployed to **Netlify** via `.github/workflows/netlify-deploy.yml` on push to `main`.

Build config is in `../netlify.toml` — `npm ci && npm run build`, publishes `dist/`.

## Coding Conventions

- 2-space indentation with semicolons
- React components use `PascalCase` filenames (e.g., `StaffDetail.jsx`)
- Custom hooks use `useX` naming (e.g., `useAuth`)
- Follow existing file style for consistency
