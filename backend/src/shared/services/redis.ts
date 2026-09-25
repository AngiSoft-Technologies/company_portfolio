// Shared Redis connection handling.
//
// All Redis consumers (job queue, public cache, realtime adapter, readyz probe)
// resolve connection options through here so configuration stays consistent.
//
// Fly.io note: `fly redis create` provisions Upstash Redis on Fly's private
// IPv6 network — the hostname resolves to IPv6 only. ioredis/bullmq default to
// IPv4, so apps on Fly must force the network family:
//   REDIS_FAMILY=6
// On local/other hosts leave it unset (IPv4 works; family is auto-detected for
// *.upstash.io URLs as a convenience).

import Redis, { type RedisOptions } from 'ioredis';

/** Redis connection options (BullMQ/ioredis-compatible). */
export interface RedisConnectionOptions {
    url?: string;
    family?: 4 | 6;
    [key: string]: unknown;
}

export function getRedisUrl(): string | undefined {
    const url = process.env.REDIS_URL;
    return url && url.trim() ? url.trim() : undefined;
}

/** Network family to force. REDIS_FAMILY wins; else 6 for Upstash-on-Fly hosts. */
export function redisFamily(): 4 | 6 | undefined {
    const raw = process.env.REDIS_FAMILY;
    if (raw) {
        const n = parseInt(raw, 10);
        if (n === 4 || n === 6) return n;
    }
    const url = getRedisUrl();
    if (url && /\.upstash\.io/i.test(url)) return 6;
    return undefined;
}

/** Standard ioredis/BullMQ connection options, family applied when needed. */
export function redisConnectionOptions(): RedisConnectionOptions {
    const url = getRedisUrl();
    if (!url) return {};
    const opts: RedisConnectionOptions = { url };
    const family = redisFamily();
    if (family) opts.family = family;
    // Upstash doesn't support naive offline retry loops with lazyConnect quality
    // apps; keep defaults minimal and let callers tune what they need.
    return opts;
}

/** Build an ioredis client wired to the shared env config (caller owns close). */
export function createRedisClient(): Redis {
    const url = getRedisUrl();
    if (!url) throw new Error('REDIS_URL is not configured');
    const opts = redisConnectionOptions();
    const client = new Redis(opts as RedisOptions);
    client.on('error', () => { /* errors observed by each consumer */ });
    return client;
}

/**
 * Connectivity probe with a hard timeout. Never throws: returns false when
 * Redis is unreachable so callers degrade (skip the adapter, report readyz
 * degraded, fall back to in-process mode) instead of crash-looping the
 * machine on unhandled connection rejections.
 */
export async function probeRedis(timeoutMs = 2500): Promise<boolean> {
    const url = getRedisUrl();
    if (!url) return false;
    let client: Redis | null = null;
    try {
        client = createRedisClient();
        const pong = await Promise.race([
            new Promise<boolean>((resolve) => {
                client!.ping().then(() => resolve(true), () => resolve(false));
            }),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
        ]);
        return pong;
    } catch {
        return false;
    } finally {
        try { client?.disconnect(); } catch { /* already gone */ }
    }
}