// Vercel serverless entry: exposes the Express app (src/app.ts) as a
// single Node function. Workers, the agent scheduler and Socket.IO are
// NOT started here — they live in src/index.ts, which this file
// deliberately does not import. See backend/vercel.json for the
// catch-all rewrite that routes every path to this function.
import app from '../src/app';

export default app;
