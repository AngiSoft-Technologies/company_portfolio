/**
 * Shared Postgres connection-URL resolution.
 *
 * Prisma 7 removed `url` from the schema datasource, so the URL must be
 * supplied by the CLI config (prisma.config.ts) and the runtime client
 * (src/db.ts). Both call into this single resolver to keep the connection
 * hardening rules from drifting apart.
 */
import dotenv from 'dotenv';

dotenv.config();

/**
 * Strip wrapping quotes/whitespace that some platforms (e.g. Railway) inject
 * into a variable's *value* when it was entered with surrounding quotes.
 * `new URL('"postgresql://…"')` throws, which Prisma surfaces misleadingly as
 * "datasource.url property is required" — stripping here avoids that.
 */
function sanitizeUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed
    .replace(/^"([\s\S]*)"$/, '$1')
    .replace(/^'([\s\S]*)'$/, '$1')
    .trim();
}

/** Resolve the raw DATABASE_URL (Neon fallback supported). */
export function getRawDatabaseUrl(): string {
  const candidates = [process.env.DATABASE_URL, process.env.NEON_DATABASE_URL];
  for (const url of candidates) {
    if (url && url.trim()) {
      return sanitizeUrl(url);
    }
  }
  // `prisma generate` reads the URL but never opens a connection, so a
  // placeholder lets the client build in environments (e.g. the Dockerfile's
  // generate step) where the real DATABASE_URL is only injected later at
  // migrate/seed/runtime. Actual DB calls will then fail loudly with a clear
  // connection error rather than a config-load crash.
  console.warn(
    '[connectionUrl] DATABASE_URL not set (or empty); using placeholder for client generation only.'
  );
  return 'postgresql://user:password@localhost:5432/app';
}

/**
 * Apply Neon-aware hardening: force SSL, prefer pgbouncer for the Neon
 * pooler, and tune connection pool / timeouts for production.
 */
export function resolveDatabaseUrl(): string {
  const raw = getRawDatabaseUrl();
  const isNeonUrl = raw.includes('.neon.tech');
  const isProduction = process.env.NODE_ENV === 'production';

  const parsed = new URL(raw);
  const isPooler =
    parsed.hostname.includes('-pooler') ||
    parsed.searchParams.get('pgbouncer') === 'true';

  if (isNeonUrl && !parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'require');
  }

  if (
    isNeonUrl &&
    parsed.hostname.includes('-pooler') &&
    !parsed.searchParams.has('pgbouncer')
  ) {
    parsed.searchParams.set('pgbouncer', 'true');
  }

  if (isProduction) {
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', isPooler ? '1' : '10');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '30');
    }
  }

  if (!parsed.searchParams.has('connect_timeout')) {
    parsed.searchParams.set('connect_timeout', '10');
  }

  return parsed.toString();
}
