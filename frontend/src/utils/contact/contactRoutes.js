// Context-aware contact routing helpers.
// Produce /contact URLs that carry arrival context via query params so the
// Contact page can preselect enquiry type / subject / related entity.
// Personal data (name/email/message) is NEVER placed in the URL.

const slugOf = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.slug || value.id || value._id || '';
};

const build = (params) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') qs.set(key, String(val));
    });
    const query = qs.toString();
    return query ? `/contact?${query}` : '/contact';
};

/** Generic entry — accepts a normalized entry-context object. */
export function getContactPath(context = {}) {
    const {
        enquiryType,
        service,
        product,
        bookingReference,
        subject,
        source,
    } = context;
    return build({
        type: enquiryType || '',
        service: service ? slugOf(service) : '',
        product: product ? slugOf(product) : '',
        booking: bookingReference || '',
        subject: subject || '',
        source: source || '',
    });
}

export function getServiceContactPath(service, source = 'service-detail') {
    return getContactPath({
        enquiryType: 'service',
        service,
        source,
    });
}

export function getProductContactPath(product, source = 'product-detail') {
    return getContactPath({
        enquiryType: 'product',
        product,
        source,
    });
}

export function getPricingContactPath(service, source = 'pricing') {
    return getContactPath({
        enquiryType: 'pricing',
        service,
        source,
    });
}

export function getBookingFollowUpContactPath(booking, source = 'booking-progress') {
    const reference = booking?.publicReference || booking?.reference || booking?.id || '';
    return getContactPath({
        enquiryType: 'support',
        bookingReference: reference,
        subject: reference ? `Following up on booking ${reference}` : '',
        source,
    });
}

export default getContactPath;
