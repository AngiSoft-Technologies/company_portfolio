import { getRedisUrl, redisConnectionOptions } from './redis';

// Cache service.
//
// Redis-first (REDIS_URL set) with an in-memory fallback so caching is safe to
// enable before Redis is provisioned and in tests. Entries are JSON bodies plus
// the HTTP status; TTLs keep everything self-expiring, and every backend is
// fail-soft — a cache error never breaks the request.

interface CacheEntry {
    status: number;
    body: unknown;
}

export interface CacheAdapter {
    get(key: string): Promise<unknown>;
    set(key: string, entry: CacheEntry, ttlMs: number): Promise<void>;
    delPrefix(prefix: string): Promise<void>;
    ping(): Promise<boolean>;
}

const CACHE_PREFIX = 'cache:';

// ─── In-memory fallback ─────────────────────────────────────────────────────

class InMemoryCache implements CacheAdapter {
    private store = new Map<string, { entry: CacheEntry; expiresAt: number }>();

    async get(key: string): Promise<unknown> {
        const hit = this.store.get(key);
        if (!hit) return undefined;
        if (hit.expiresAt < Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return hit.entry;
    }

    async set(key: string, entry: CacheEntry, ttlMs: number): Promise<void> {
        this.store.set(key, { entry, expiresAt: Date.now() + ttlMs });
    }

    async delPrefix(prefix: string): Promise<void> {
        for (const key of Array.from(this.store.keys())) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    async ping(): Promise<boolean> {
        return true;
    }

    get size(): number {
        return this.store.size;
    }
}

// ─── Redis backend ──────────────────────────────────────────────────────────

class RedisCache implements CacheAdapter {
    constructor(private client: import('ioredis').Redis) {}

    async get(key: string): Promise<unknown> {
        const raw = await this.client.get(key);
        if (!raw) return undefined;
        try {
            return JSON.parse(raw) as CacheEntry;
        } catch {
            await this.client.del(key).catch(() => {});
            return undefined;
        }
    }

    async set(key: string, entry: CacheEntry, ttlMs: number): Promise<void> {
        await this.client.set(key, JSON.stringify(entry), 'PX', ttlMs);
    }

    async delPrefix(prefix: string): Promise<void> {
        const keys = await this.client.keys(`${prefix}*`).catch(() => [] as string[]);
        if (keys.length > 0) await this.client.del(...keys).catch(() => {});
    }

    async ping(): Promise<boolean> {
        try {
            return (await this.client.ping()) === 'PONG';
        } catch {
            return false;
        }
    }
}

// ─── Singleton adapter selection ────────────────────────────────────────────

let adapter: CacheAdapter | null = null;
const memoryAdapter = new InMemoryCache();

async function getRedisAdapter(): Promise<CacheAdapter | null> {
    const url = getRedisUrl();
    if (!url) return null;
    if (adapter) return adapter;
    try {
        const { default: Redis } = await import('ioredis');
        const client = new Redis(url, {
            ...(redisConnectionOptions() as Record<string, unknown>),
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
        });
        client.on('error', (err) => {
            console.warn('[cache] redis error:', err.message);
        });
        adapter = new RedisCache(client);
        return adapter;
    } catch (err) {
        console.warn('[cache] redis init failed, using in-memory fallback:', err);
        return null;
    }
}

/** Resolve the active cache backend (never throws). */
export async function getCacheAdapter(): Promise<CacheAdapter> {
    const redis = await getRedisAdapter();
    return redis ?? memoryAdapter;
}

/** Public cache key prefix (exported for readyz/ops polish). */
export function cacheKey(originalUrl: string): string {
    return `${CACHE_PREFIX}${originalUrl}`;
}

/** Remove every entry under a URL prefix (e.g. after an admin content update). */
export async function purgeCache(prefix: string): Promise<void> {
    const cache = await getCacheAdapter();
    const full = prefix.startsWith(CACHE_PREFIX) ? prefix : `${CACHE_PREFIX}${prefix}`;
    try {
        await cache.delPrefix(full);
    } catch (err) {
        console.warn('[cache] purge failed:', err);
    }
}