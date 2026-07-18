// Canonical route helpers for the Pricing experience.
// All Pricing page links flow through here so routing stays consistent.
//
// The canonical booking route is /booking (NOT /book). This matches the app
// router (routes.jsx) and the site_pricing.cta.primaryButton.url value.

export const PRICING_BASE = '/pricing';
export const BOOKING_BASE = '/booking';
export const SERVICES_BASE = '/services';

/** Build the canonical Pricing route, optionally deep-linked to a service. */
export function getPricingRoute(serviceSlug) {
    if (!serviceSlug) return PRICING_BASE;
    return `${PRICING_BASE}?service=${encodeURIComponent(serviceSlug)}`;
}

/** Build the canonical booking route carrying the selected service. */
export function getServiceBookingPath(serviceSlug) {
    const base = BOOKING_BASE;
    if (!serviceSlug) return base;
    return `${base}?service=${encodeURIComponent(serviceSlug)}`;
}

/** Build the canonical service detail route (by slug). */
export function getServiceRoute(serviceSlug) {
    if (!serviceSlug) return SERVICES_BASE;
    return `${SERVICES_BASE}/${encodeURIComponent(serviceSlug)}`;
}

/** Read the `?service=` deep-link when present. */
export function readServiceParam(searchParams) {
    return searchParams?.get('service') || '';
}

export default {
    PRICING_BASE,
    BOOKING_BASE,
    SERVICES_BASE,
    getPricingRoute,
    getServiceBookingPath,
    getServiceRoute,
    readServiceParam,
};
