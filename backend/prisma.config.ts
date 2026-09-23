import type { PrismaConfig } from 'prisma';

/**
 * Prisma 7 config.
 *
 * Runs inside the Prisma CLI's own module context, so it must be fully
 * self-contained: no cross-directory imports, no third-party modules.
 * Reads the connection URL straight from the environment (Railway injects
 * DATABASE_URL at runtime). A single pair of wrapping quotes/whitespace is
 * stripped because some platforms store the value with literal quotes, which
 * makes `new URL()` throw and Prisma report "url property is required".
 */
function resolveDatabaseUrl(): string {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    '';

  const stripped = raw
    .replace(/^"([\s\S]*)"$/, '$1')
    .replace(/^'([\s\S]*)'$/, '$1')
    .trim();

  if (!stripped) {
    // `prisma generate` reads the URL but never connects, so a placeholder
    // keeps the client buildable when the real URL is injected later.
    console.warn(
      '[prisma.config] DATABASE_URL not set; using placeholder for client generation only.'
    );
    return 'postgresql://user:password@localhost:5432/app';
  }
  return stripped;
}

const config: PrismaConfig = {
  datasource: {
    url: resolveDatabaseUrl(),
  },
};

export default config;
