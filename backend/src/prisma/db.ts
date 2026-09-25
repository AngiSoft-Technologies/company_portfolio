// Prisma 8 runtime client (singleton).
//
// The contract artifacts (contract.json / contract.d.ts) are emitted by
// `prisma contract emit` from src/prisma/contract.prisma and committed to the
// repo. This module is the single place the app touches the Prisma 8 façade:
//
//   import { db } from '../prisma/db';       // or re-exported via ../db
//   await db.orm.public.User.where({ id }).first();
//
// Never instantiate the façade per request: the module-level export owns the
// connection pool for the process. Callers that need a fresh lifetime (scripts,
// workers) can `await using` their own instance instead.

import postgres from '@prisma/orm-postgres/runtime';
import crypto from 'crypto';
import type { TimestampString } from '@prisma/orm-postgres/target/codec-types';
import { resolveDatabaseUrl } from '../connectionUrl';
import type { Contract } from './contract';
import contractJson from './contract.json';

export type Db = ReturnType<typeof postgres<Contract>>;
export type DbClient = Db;
/** Transaction handle type (tx.orm / tx.sql / tx.query / tx.execute). */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Runtime timestamp column type (ISO text — the contract's String codecs). */
export type Timestamp = TimestampString<3>;

/**
 * Convert a Date/ISO string/epoch-ms into the branded TimestampString<3> the
 * contract's date columns expect (ISO text in, ISO text out).
 */
export function ts(value: Date | string | number = new Date()): TimestampString<3> {
    const iso = typeof value === 'string' ? value : new Date(value).toISOString();
    return iso as TimestampString<3>;
}

/**
 * Primary key for new rows. The inferred contract has no execution default on
 * `id` (the live DB never had one — Prisma 7 supplied uuid() client-side), so
 * every create() must pass an id explicitly.
 */
export function newId(): string {
    return crypto.randomUUID();
}

const url = resolveDatabaseUrl();
if (!url) {
    // Mirror the old fail-fast behavior: a boot without DATABASE_URL is a
    // configuration error, not a runtime degradation.
    throw new Error('DATABASE_URL is not configured');
}
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
}

export const db = postgres<Contract>({
    contractJson,
    url,
    poolOptions: {
        connectionTimeoutMillis: 20_000,
        idleTimeoutMillis: 30_000,
    },
});

export default db;
