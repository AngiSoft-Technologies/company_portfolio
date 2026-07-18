// Loads and normalizes everything the Pricing page needs from real backend data.
//
// Sources (no prices invented — all come from the API):
//   - /api/site/pricing : editorial pricing content (Setting site_pricing)
//   - /api/services      : published Service records (each with priceFrom)
//
// The two fetches run in parallel; a failure on one source must not blank the
// page, so we use Promise.allSettled and surface a real error state.

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { normalizeServices } from '../utils/services/normalizeService';
import { buildPricingModel } from '../utils/pricing/normalizePricing';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache = { model: null, timestamp: 0 };

function readCache() {
    if (!cache.model) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache.model;
}
function writeCache(model) {
    cache = { model, timestamp: Date.now() };
}

/**
 * @returns {{
 *   content: object|null,
 *   services: object[],
 *   pricedServices: object[],
 *   unpricedServices: object[],
 *   hasContent: boolean,
 *   hasServiceData: boolean,
 *   loading: boolean,
 *   error: Error|null,
 *   refetch: (opts?: { force?: boolean }) => void
 * }}
 */
export function usePricing() {
    const initial = readCache();
    const [model, setModel] = useState(initial || null);
    const [loading, setLoading] = useState(!initial);
    const [error, setError] = useState(null);

    const load = useCallback(async ({ force = false } = {}) => {
        const cached = readCache();
        if (!force && cached) {
            setModel(cached);
            setLoading(false);
            return;
        }
        if (force) setLoading(true);

        try {
            const [pricingRes, servicesRes] = await Promise.allSettled([
                apiGet('/site/pricing'),
                apiGet('/services'),
            ]);

            const sitePricing =
                pricingRes.status === 'fulfilled' && pricingRes.value
                    ? pricingRes.value
                    : null;

            const rawServices =
                servicesRes.status === 'fulfilled'
                    ? Array.isArray(servicesRes.value)
                        ? servicesRes.value
                        : (servicesRes.value?.services || [])
                    : [];

            // Normalize + keep only published services (matches useServices).
            const services = (normalizeServices(rawServices) || []).filter(
                (s) => s.published !== false
            );

            const next = buildPricingModel({ sitePricing, services });
            writeCache(next);
            setModel(next);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load pricing'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            // Paint from cache instantly, then validate in the background.
            if (readCache()) {
                const data = await Promise.allSettled([apiGet('/site/pricing'), apiGet('/services')]);
                if (!active) return;
                const sitePricing = data[0].status === 'fulfilled' ? data[0].value : null;
                const rawServices = data[1].status === 'fulfilled'
                    ? (Array.isArray(data[1].value) ? data[1].value : (data[1].value?.services || []))
                    : [];
                const services = (normalizeServices(rawServices) || []).filter((s) => s.published !== false);
                const next = buildPricingModel({ sitePricing, services });
                writeCache(next);
                setModel(next);
                setLoading(false);
            } else {
                await load();
            }
        })();
        return () => {
            active = false;
        };
    }, [load]);

    const refetch = useCallback((opts) => load({ force: true, ...opts }), [load]);

    return {
        content: model?.content || null,
        services: model?.services || [],
        pricedServices: model?.pricedServices || [],
        unpricedServices: model?.unpricedServices || [],
        hasContent: model?.hasContent || false,
        hasServiceData: model?.hasServiceData || false,
        loading,
        error,
        refetch,
    };
}

export default usePricing;
