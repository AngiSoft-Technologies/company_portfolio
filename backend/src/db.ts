import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { readReplicas } from '@prisma/extension-read-replicas';
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
// Prisma 7 requires a driver adapter (or Accelerate URL) at runtime.
// PrismaNeon builds its own Neon pool from the config object.
const adapter = new PrismaNeon({ connectionString: resolvedDatabaseUrl });

const basePrisma = new PrismaClient({
  adapter,
  log: logConfig,
});

// ─── Neon read replicas (optional, env-gated) ──────────────────
// When DATABASE_URL_REPLICA is set (comma-separated list), create one replica
// Prisma client per URL; @prisma/extension-read-replicas routes all reads to
// replicas while writes + $transaction stay on the primary. When unset (the
// default) behavior is byte-for-byte the old single-endpoint client.
function buildReplicas() {
  const replicaUrls = (process.env.DATABASE_URL_REPLICA || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!replicaUrls.length) return [];
  if (isProduction) {
    console.log(`🔄 Read replicas enabled (${replicaUrls.length} replica${replicaUrls.length > 1 ? 's' : ''})`);
    return replicaUrls.map((url) => new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) }));
  }
  // In dev we have no replica to point at and silently routing reads to a fake
  // URL would break every page — fall back to the pool with a warning.
  console.warn('⚠️ DATABASE_URL_REPLICA set but NODE_ENV is not production — ignoring replicas.');
  return [];
}

const replicas = buildReplicas();
const prisma = (replicas.length
  ? (basePrisma.$extends(readReplicas({ replicas })) as unknown as PrismaClient)
  : basePrisma) as PrismaClient;

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
