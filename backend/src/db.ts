import dotenv from 'dotenv';
import { db, type Db, type Tx } from './prisma/db';
import { resolveDatabaseUrl } from './connectionUrl';

dotenv.config();

// ─── Resolve database URL (shared with prisma.config.ts) ───────
const resolvedDatabaseUrl = resolveDatabaseUrl();
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = resolvedDatabaseUrl;
}
const rawDatabaseUrl =
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || resolvedDatabaseUrl;

// ─── Environment detection ─────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const isNeonUrl = rawDatabaseUrl.includes('.neon.tech');

if (process.env.DATABASE_URL_REPLICA) {
    console.warn('⚠️ DATABASE_URL_REPLICA is set but Prisma 8 has no read-replica routing yet — ignoring.');
}

console.log(
    `🗄️  Database: ${isNeonUrl ? 'Neon Postgres (pooled)' : 'Postgres (direct)'} ` +
    `[${isProduction ? 'production' : 'development'}]`
);

// ─── Connection validation ─────────────────────────────────────
export async function validateDatabaseConnection(): Promise<boolean> {
    try {
        const plan = db.raw.sql`SELECT version() AS version`
            .returnsRow({ version: db.sql.public.AboutSection.columns.id })
            .build();
        const rows = await db.runtime().query(plan);
        const version = (rows as any[])[0]?.version ?? 'unknown';
        console.log(`✅ Database connection verified: ${String(version).split(' ').slice(0, 2).join(' ')}`);
        return true;
    } catch (err: any) {
        console.error('❌ Database connection failed:', err.message);
        return false;
    }
}

// ─── Graceful disconnect ───────────────────────────────────────
export async function disconnectDatabase(): Promise<void> {
    try {
        await db.close();
        console.log('🗄️  Database disconnected gracefully');
    } catch (err: any) {
        console.error('⚠️  Error disconnecting database:', err.message);
    }
}

// The shared Prisma 8 client. Route factories receive this instance.
export default db;
export { db, type Db, type Tx };
