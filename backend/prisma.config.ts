// prisma.config.ts — Prisma 8 (contract-first) project configuration.
//
// The ORM surface is configured here (not in a `datasource` block): the
// contract source, the database connection for plan/sign/migrate commands,
// and the migrations directory. Loaded by the `prisma` CLI (v8) for every
// command; the app runtime never reads this file — it imports the emitted
// contract + `postgres<Contract>` façade from src/prisma/db.ts.

import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

/**
 * Some platforms (Railway) inject DATABASE_URL wrapped in literal quotes,
 * which makes `new URL()` throw. Strip one pair of quotes/whitespace.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    '';

  if (!raw) return undefined;

  const stripped = raw
    .replace(/^"([\s\S]*)"$/, '$1')
    .replace(/^'([\s\S]*)'$/, '$1')
    .trim();

  if (!stripped) return undefined;

  try {
    const url = new URL(stripped);
    url.searchParams.delete('channel_binding');
    return url.toString();
  } catch {
    return stripped;
  }
}

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: { connection: resolveDatabaseUrl() },
  }),
});
