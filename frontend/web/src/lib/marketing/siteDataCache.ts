import { apiGet } from '@/lib/httpClient';

/**
 * Per-page dedupe for read-only public-site endpoints.
 *
 * Mirrors the module-scoped promise cache in `hooks/marketing/useSiteCopy.ts`:
 * the first caller starts the request, every later caller for the same
 * endpoint reuses the in-flight promise and then the resolved value. This
 * keeps the four shell/home components from each fetching their own copy of
 * the same CMS data (notably `/site/branding`, requested by both Header and
 * Footer) without adding a provider or changing what any component renders.
 *
 * Failures are evicted so a later mount retries, matching the previous
 * per-component behaviour where each consumer owned its own request.
 */
interface CacheRecord {
  promise: Promise<unknown>;
}

const responseCache = new Map<string, CacheRecord>();

export function cachedGet<T>(endpoint: string): Promise<T | null> {
  const cached = responseCache.get(endpoint);
  if (cached) return cached.promise as Promise<T | null>;

  const request = apiGet<T>(endpoint)
    .then((data) => {
      const value = (data ?? null) as T | null;
      // Replace the in-flight promise with an already-resolved one so later
      // callers still receive a Promise but skip the network entirely.
      responseCache.set(endpoint, { promise: Promise.resolve(value) });
      return value;
    })
    .catch((error: unknown) => {
      // Do not latch failures: a retry from a later mount is still possible.
      responseCache.delete(endpoint);
      throw error;
    });

  responseCache.set(endpoint, { promise: request });
  return request;
}

/** Test-only helper: reset module state between isolated cases. */
export function clearSiteDataCache(): void {
  responseCache.clear();
}
