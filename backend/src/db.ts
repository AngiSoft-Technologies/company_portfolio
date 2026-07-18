import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import { resolveDatabaseUrl } from './connectionUrl';

dotenv.config();

// ─── Resolve database URL (shared with prisma.config.ts) ───────
// resolveDatabaseUrl() applies Neon-aware hardening. Ensure Prisma can
// always read a usable DATABASE_URL from env at runtime.
const resolvedDatabaseUrl = resolveDatabaseUrl();
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}
const rawDatabaseUrl =
  process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || resolvedDatabaseUrl;

// ─── Environment detection ─────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const isNeonUrl = rawDatabaseUrl.includes('.neon.tech');

// ─── Prisma log levels per environment ─────────────────────────
const logConfig: Prisma.LogLevel[] = isProduction
  ? ['warn', 'error']
  : ['query', 'info', 'warn', 'error'];

// ─── Build Prisma client (singleton) ───────────────────────────
// Prisma 7 reads the connection URL from DATABASE_URL (set earlier
// from the shared resolver). The `datasources.url` constructor option
// is no longer supported for a URL-less schema.
const prisma = new PrismaClient({
  log: logConfig,
});

console.log(
  `🗄️  Database: ${isNeonUrl ? 'Neon Postgres (pooled)' : 'Postgres (direct)'} ` +
    `[${isProduction ? 'production' : 'development'}]`
);

// ─── Connection validation ─────────────────────────────────────
export async function validateDatabaseConnection(): Promise<boolean> {
  try {
    const result: any[] = await prisma.$queryRaw`SELECT version()`;
    const version = result[0]?.version ?? 'unknown';
    console.log(`✅ Database connection verified: ${version.split(' ').slice(0, 2).join(' ')}`);
    return true;
  } catch (err: any) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// ─── Graceful disconnect ───────────────────────────────────────
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🗄️  Database disconnected gracefully');
  } catch (err: any) {
    console.error('⚠️  Error disconnecting database:', err.message);
  }
}

export default prisma;
