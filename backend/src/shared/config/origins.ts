/**
 * CORS / realtime origin allow-list. Single source of truth used by both the
 * Express CORS middleware and the Socket.IO handshake so they never drift.
 */
const DEFAULT_ORIGINS = [
  'https://angisoft.co.ke',
  'https://www.angisoft.co.ke',
  'https://admin.angisoft.co.ke',
  'https://www.admin.angisoft.co.ke',
  'https://client.angisoft.co.ke',
  'https://www.client.angisoft.co.ke',
  'https://www.angisoft.co.ke',
  // Local dev (Vite default + API port)
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

export function getAllowedOrigins(): string[] {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_ORIGINS;
}