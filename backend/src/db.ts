import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';

dotenv.config();

// ─── Resolve database URL ──────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Provide a Postgres connection string in DATABASE_URL or NEON_DATABASE_URL.'
  );
}

// Ensure Prisma can always read DATABASE_URL from env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

// ─── Environment detection ─────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const isNeonUrl = databaseUrl.includes('.neon.tech');

// ─── Prisma log levels per environment ─────────────────────────
const logConfig: Prisma.LogLevel[] = isProduction
  ? ['warn', 'error']
  : ['query', 'info', 'warn', 'error'];

// ─── Connection string hardening ────────────────────────────────
// Ensure SSL is enabled for Neon (required) and add pooling params
function buildConnectionUrl(url: string): string {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const isPooler = host.includes('-pooler') || parsed.searchParams.get('pgbouncer') === 'true';

  // Neon requires SSL
  if (isNeonUrl && !parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'require');
  }

  // Prefer pgbouncer when using Neon pooler
  if (isNeonUrl && host.includes('-pooler') && !parsed.searchParams.has('pgbouncer')) {
    parsed.searchParams.set('pgbouncer', 'true');
  }

  // Connection pool tuning for production
  if (isProduction) {
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', isPooler ? '1' : '10');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '30');
    }
  }

  // Connect timeout to prevent hanging on unreachable DB
  if (!parsed.searchParams.has('connect_timeout')) {
    parsed.searchParams.set('connect_timeout', '10');
  }

  return parsed.toString();
}

const connectionUrl = buildConnectionUrl(databaseUrl);

// ─── Build Prisma client (singleton) ───────────────────────────
const prisma = new PrismaClient({
  datasources: { db: { url: connectionUrl } },
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
