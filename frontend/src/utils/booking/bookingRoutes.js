// Canonical booking URL/route helpers.
// All booking links flow through here so query params + sources stay consistent.
// Detail/progress pages use the public reference: /bookings/:publicReference

export const BOOKING_BASE = '/booking';
export const BOOKINGS_BASE = '/bookings';
export const BOOKING_HISTORY_BASE = '/bookings';
export const BOOKING_LOOKUP_PATH = '/track-booking';

const enc = encodeURIComponent;

/** Build a booking context path. `context` may carry slug/requestType/source. */
export function getBookingPath(context = {}) {
    const params = new URLSearchParams();
    if (context.serviceSlug) params.set('service', context.serviceSlug);
    if (context.packageSlug) params.set('package', context.packageSlug);
    if (context.productSlug) params.set('product', context.productSlug);
    if (context.requestType) params.set('request', context.requestType);
    if (context.source) params.set('source', context.source);
    if (context.ref) params.set('ref', context.ref);
    const qs = params.toString();
    return qs ? `${BOOKING_BASE}?${qs}` : BOOKING_BASE;
}

/** Service Details / Services List → booking with that service preselected. */
export function getServiceBookingPath(service, source = 'service-detail') {
    const slug = typeof service === 'string' ? service : service?.slug;
    return getBookingPath({ serviceSlug: slug, source });
}

/** Pricing → booking with service + package preselected. */
export function getPackageBookingPath(service, packageRecord) {
    const serviceSlug = typeof service === 'string' ? service : service?.slug;
    const packageSlug = typeof packageRecord === 'string' ? packageRecord : packageRecord?.slug;
    return getBookingPath({ serviceSlug, packageSlug, source: 'pricing' });
}

/** Product page → booking with product context. */
export function getProductBookingPath(product, requestType = 'request') {
    const slug = typeof product === 'string' ? product : product?.slug;
    return getBookingPath({ productSlug: slug, requestType, source: 'product-detail' });
}

/** Booking table → progress page for a single booking (by public reference). */
export function getBookingProgressPath(booking) {
    const ref = typeof booking === 'string' ? booking : booking?.publicReference;
    if (!ref) return BOOKINGS_BASE;
    return `${BOOKINGS_BASE}/${enc(ref)}`;
}

/** Progress page with the secure guest tracking token. */
export function getBookingProgressWithTokenPath(booking, token) {
    const base = getBookingProgressPath(booking);
    if (!token) return base;
    return `${base}?token=${enc(token)}`;
}

/** Customer booking history list. */
export function getBookingHistoryPath() {
    return BOOKING_HISTORY_BASE;
}

/** Guest lookup form. */
export function getBookingLookupPath() {
    return BOOKING_LOOKUP_PATH;
}
