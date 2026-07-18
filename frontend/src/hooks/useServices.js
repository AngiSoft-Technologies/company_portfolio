// Canonical Services data hook.
// Fetches the published Service list from the API and normalizes it.
// This is the single source of truth for the Services List page.
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { normalizeServices } from '../utils/services/normalizeService';
import { deriveCategories, splitFeatured } from '../utils/services/serviceFilters';

// Module-level cache so repeat visits paint instantly. Services data is
// editorial (changes rarely), so a short TTL keeps it fresh without paying the
// slow /services round-trip on every navigation.
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache = { services: null, timestamp: 0 };

function readCache() {
    if (!cache.services) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache.services;
}

function writeCache(services) {
    cache = { services, timestamp: Date.now() };
}

/**
 * Load all published services from /api/services.
 * @returns {{ services, categories, featuredServices, loading, error, refetch }}
 */
export function useServices() {
    const initial = readCache();
    const [services, setServices] = useState(initial || []);
    const [loading, setLoading] = useState(!initial);
    const [error, setError] = useState(null);

    const fetchServices = useCallback(async ({ force = false } = {}) => {
        // On a cached mount we still validate in the background, but the UI is
        // already painted — so we don't flip `loading` back on.
        if (!force && readCache()) {
            try {
                const data = await apiGet('/services');
                const list = Array.isArray(data) ? data : (data?.services || []);
                const normalized = normalizeServices(list);
                writeCache(normalized);
                setServices(normalized);
            } catch {
                // keep showing the cached list on a background refresh failure
            }
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await apiGet('/services');
            const list = Array.isArray(data) ? data : (data?.services || []);
            const normalized = normalizeServices(list);
            writeCache(normalized);
            setServices(normalized);
        } catch (err) {
            setError(err?.message || 'Failed to load services');
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const categories = deriveCategories(services);
    const { featured, rest } = splitFeatured(services);

    return {
        services,
        categories,
        featuredServices: featured,
        otherServices: rest,
        loading,
        error,
        refetch: () => fetchServices({ force: true }),
    };
}

/**
 * Fetch a single service by slug. Thin helper used by useServiceDetail.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function fetchServiceBySlug(slug) {
    if (!slug) return null;
    try {
        const raw = await apiGet(`/services/${encodeURIComponent(slug)}`);
        return raw;
    } catch {
        return null;
    }
}

export default useServices;
