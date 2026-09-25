// Public JSON response cache (Redis when available, in-memory fallback).
//
// Only unauthenticated GET endpoints from an explicit allowlist are cached, so
// we can never leak auth- or user-scoped data. Cached AND origin responses get
// `Cache-Control: public, s-maxage=<TTL>` so a CDN in front of the API can also
// cache them. Any cache failure falls through to a live render.

import { Request, Response, NextFunction } from 'express';
import { getCacheAdapter, cacheKey, purgeCache } from '../services/cache';

const ENABLED = process.env.CACHE_ENABLED !== 'false';
const TTL_SECONDS = Math.max(0, Number(process.env.PUBLIC_CACHE_TTL || 60));

/** Public, unauthenticated content endpoints safe for CDN-level caching. */
const PUBLIC_CACHE_ROUTES = [
    '/api/services',
    '/api/projects',
    '/api/blogs',
    '/api/testimonials',
    '/api/faqs',
    '/api/solutions',
    '/api/industries',
    '/api/announcements',
    '/api/company-stats',
    '/api/home-sections',
    '/api/about-sections',
    '/api/certifications',
    '/api/careers',
    '/api/products',
    '/api/product-faqs',
];

function isCacheable(req: Request): boolean {
    if (req.method !== 'GET') return false;
    const path = req.path;
    return PUBLIC_CACHE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

function setCacheHeaders(res: Response) {
    if (TTL_SECONDS > 0) {
        res.setHeader('Cache-Control', `public, s-maxage=${TTL_SECONDS}`);
    }
}

export function publicJsonCache() {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!isCacheable(req)) return next();

        setCacheHeaders(res);
        if (!ENABLED || TTL_SECONDS === 0) return next();

        const cache = await getCacheAdapter();
        const key = cacheKey(req.originalUrl);
        try {
            const hit = (await cache.get(key)) as { status?: number; body?: unknown } | undefined;
            if (hit && typeof hit.status === 'number' && hit.body !== undefined) {
                return res.status(hit.status).json(hit.body);
            }
        } catch {
            return next(); // cache read failed — serve live
        }

        const sendJson = res.json.bind(res);
        res.json = ((body: unknown) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                cache
                    .set(key, { status: res.statusCode, body }, TTL_SECONDS * 1000)
                    .catch(() => {});
            }
            return sendJson(body);
        }) as typeof res.json;

        return next();
    };
}

/** Invalidate cached pages under a URL prefix after content mutations. */
export { purgeCache };