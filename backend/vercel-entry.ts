// Vercel serverless entry. Bundled to api/index.js (ESM) by
// `npm run build:vercel` — the Prisma 8 packages are ESM-only, so the
// function must run as ESM rather than the CJS output of `tsc`.
// Workers, the agent scheduler and Socket.IO are NOT started here —
// they live in src/index.ts, which this file deliberately does not import.
import app from './src/app';

export default app;
