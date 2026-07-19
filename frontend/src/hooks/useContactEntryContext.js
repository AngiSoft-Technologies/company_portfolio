import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { defaultSubjectFor } from '../utils/contact/contactSubjects';

const KNOWN_TYPES = ['service', 'product', 'pricing', 'support', 'partnership', 'careers', 'general'];

const cleanType = (value) => {
    const v = (value || '').trim().toLowerCase();
    return KNOWN_TYPES.includes(v) ? v : '';
};

const slugOf = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.slug || value.id || value._id || '';
};

/**
 * Resolves the arrival context for the contact page, in priority order:
 *   1) explicit props (deep-link from another page)
 *   2) router location.state (Link state)
 *   3) URL query params (type, service, product, package, booking, subject, source)
 *   4) manual defaults
 *
 * No personal data (name/email/message) is ever read from the URL.
 * Returns a normalized context object consumed by the form/intent/card.
 */
export function useContactEntryContext({ entry } = {}) {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const context = useMemo(() => {
        // 1) props
        const fromProps = entry && typeof entry === 'object' ? entry : null;

        // 2) router state
        const state = location?.state && typeof location.state === 'object' ? location.state : {};

        // 3) query params
        const q = {
            type: searchParams.get('type'),
            service: searchParams.get('service'),
            product: searchParams.get('product'),
            pkg: searchParams.get('package'),
            booking: searchParams.get('booking'),
            subject: searchParams.get('subject'),
            source: searchParams.get('source'),
        };

        const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '') ?? '';

        const enquiryType = cleanType(first(fromProps?.enquiryType, state?.enquiryType, q.type));
        const service = first(fromProps?.service, fromProps?.serviceSlug, state?.service, state?.serviceSlug, q.service);
        const product = first(fromProps?.product, fromProps?.productSlug, state?.product, state?.productSlug, q.product);
        const pkgSlug = first(fromProps?.packageSlug, state?.packageSlug, q.pkg);
        const bookingReference = first(fromProps?.bookingReference, state?.bookingReference, q.booking);
        const subject = first(fromProps?.subject, state?.subject, q.subject);
        const source = first(fromProps?.source, state?.source, q.source);

        return {
            enquiryType,
            service: slugOf(service),
            serviceSlug: slugOf(service),
            product: slugOf(product),
            productSlug: slugOf(product),
            packageSlug: slugOf(pkgSlug),
            bookingReference,
            subject: subject || (enquiryType ? defaultSubjectFor(enquiryType) : ''),
            source,
        };
    }, [entry, location?.state, searchParams]);

    return context;
}

export default useContactEntryContext;
