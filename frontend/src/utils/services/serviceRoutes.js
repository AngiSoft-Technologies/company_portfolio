// Canonical URL/route helpers for the Services experience.
// All Services links flow through here so routing stays consistent.
// Detail pages use slug-based routes: /services/:slug

export const SERVICES_BASE = '/services';

/** Build the canonical detail route for a service (by slug). */
export function getServiceRoute(service) {
    const slug = typeof service === 'string' ? service : service?.slug;
    if (!slug) return SERVICES_BASE;
    return `${SERVICES_BASE}/${encodeURIComponent(slug)}`;
}

/** Build the route for a category filter (uses query param, not a separate page). */
export function getCategoryRoute(categorySlug) {
    if (!categorySlug || categorySlug === 'all') return SERVICES_BASE;
    return `${SERVICES_BASE}?category=${encodeURIComponent(categorySlug)}`;
}

/** List route. */
export function getServicesRoute() {
    return SERVICES_BASE;
}

/** Booking route carrying the selected service as a query param.
 *  The canonical booking page is `/booking` (alias of `/book`). */
export function getServiceBookingPath(service) {
    const slug = typeof service === 'string' ? service : service?.slug;
    const base = '/booking';
    if (!slug) return base;
    return `${base}?service=${encodeURIComponent(slug)}`;
}

/** Contact route used by CTAs. Prefer the dedicated /contact page. */
export function getContactRoute() {
    return '/contact';
}

/** Booking route used by primary CTAs. */
export function getBookingRoute() {
    return '/book';
}

/** Pricing route carrying the selected service as a query param. */
export function getServicePricingPath(service) {
    const slug = typeof service === 'string' ? service : service?.slug;
    const base = '/pricing';
    if (!slug) return base;
    return `${base}?service=${encodeURIComponent(slug)}`;
}

/** WhatsApp deep link with a service-specific prefilled enquiry message. */
export function getServiceWhatsappLink(service, phone = '254710398690') {
    const title = typeof service === 'string' ? service : service?.title || 'your services';
    const message = `Hello AngiSoft, I would like to enquire about ${title}.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
