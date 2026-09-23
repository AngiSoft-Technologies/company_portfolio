// Pricing display helpers for the Services experience.
import { formatPrice } from './normalizeService';

/**
 * Display price for a service. Falls back to a "Get a quote" prompt when
 * no price is set (common for bespoke/custom work).
 * @param {object} service - normalized service
 * @returns {{ label: string, hasPrice: boolean }}
 */
export function getPriceDisplay(service) {
    const label = getServicePriceLabel(service);
    return { label, hasPrice: Boolean(formatPrice(service?.priceFrom, service?.currency)) };
}

/**
 * String label for a service's price. Returns a formatted amount when a
 * `priceFrom` exists, otherwise a "Quote on request" prompt (common for
 * bespoke/custom work). Used by the Service Detail sections.
 * @param {object} service - normalized service
 * @returns {string}
 */
export function getServicePriceLabel(service) {
    const label = formatPrice(service?.priceFrom, service?.currency);
    if (label) return label;
    return 'Quote on request';
}

/**
 * Lower/upper bounds across a set of services, useful for a price summary.
 * @param {object[]} services
 * @returns {{ min: number|null, max: number|null }}
 */
export function getPriceRange(services = []) {
    const prices = services.map((s) => s.priceFrom).filter((p) => typeof p === 'number');
    if (!prices.length) return { min: null, max: null };
    return { min: Math.min(...prices), max: Math.max(...prices) };
}
