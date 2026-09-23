import { useRef, useState, useCallback } from 'react';
import { apiPost } from '../js/httpClient';

/**
 * Submits a contact enquiry to POST /api/contact-enquiries (public, no auth).
 *
 * The shared httpClient may reject on transport/non-2xx; we wrap it so this
 * hook NEVER throws and always returns/resolves a normalized result:
 *   { ok, status, data, error }
 * matching the rest of the contact pipeline's expectations, while still
 * reusing the real apiPost client.
 */
async function safePost(url, body) {
    try {
        const res = await apiPost(url, body);
        if (!res) return { ok: false, status: 0, data: null, error: 'No response from server.' };
        return res;
    } catch (err) {
        const status = err?.status || err?.response?.status || 0;
        const data = err?.data || err?.response?.data || null;
        const error = err?.message || (typeof err === 'string' ? err : 'Network error. Please try again.');
        return { ok: false, status, data, error };
    }
}

function extractFields(data) {
    // Backend 400 shape: { error, fields: { fieldName: [msgs] } }
    if (data && data.fields && typeof data.fields === 'object') return data.fields;
    if (data && Array.isArray(data.fieldErrors)) {
        return data.fieldErrors.reduce((acc, f) => {
            acc[f.field] = f.messages || [f.message];
            return acc;
        }, {});
    }
    return {};
}

/**
 * @param {object} entryContext normalized context from useContactEntryContext
 */
export function useContactSubmission(entryContext = {}) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const abortRef = useRef(false);

    const submit = useCallback(async (formValues, startedAt) => {
        abortRef.current = false;
        setLoading(true);
        setError(null);
        setFieldErrors({});
        setSuccess(false);

        const payload = {
            name: formValues.name?.trim(),
            email: formValues.email?.trim(),
            phone: formValues.phone?.trim(),
            preferredResponseMethod: formValues.preferredResponseMethod,
            enquiryType: formValues.enquiryType,
            subject: formValues.subject?.trim(),
            message: formValues.message?.trim(),
            bookingReference: formValues.bookingReference?.trim() || undefined,
            preferredContactTime: formValues.preferredContactTime?.trim() || undefined,
            organisation: formValues.organisation?.trim() || undefined,
            company: formValues.company || '', // honeypot
            formStartedAt: startedAt,
            source: entryContext?.source || 'contact-page',
            sourcePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
        };

        // Attach derived entity context.
        if (entryContext?.serviceSlug) payload.serviceSlug = entryContext.serviceSlug;
        if (entryContext?.productSlug) payload.productSlug = entryContext.productSlug;
        // The form also allows in-form selection.
        if (formValues.serviceSlug && !payload.serviceSlug) payload.serviceSlug = formValues.serviceSlug;
        if (formValues.productSlug && !payload.productSlug) payload.productSlug = formValues.productSlug;

        const res = await safePost('/contact-enquiries', payload);

        if (abortRef.current) return { ok: false, aborted: true };

        // Spam / honeypot / too-fast handled by backend; surfaces as error.
        if (res.ok) {
            setResult(res.data);
            setSuccess(true);
            setLoading(false);
            return { ok: true, data: res.data };
        }

        const status = res.status;
        const data = res.data || {};

        if (status === 400) {
            const fields = extractFields(data);
            setFieldErrors(fields);
            const msg = typeof data.error === 'string' ? data.error : 'Please correct the highlighted fields.';
            setError(msg);
            setLoading(false);
            return { ok: false, status, fieldErrors: fields, error: msg };
        }

        if (status === 429) {
            const msg = data?.message || data?.error || 'Too many requests. Please wait a few minutes before trying again.';
            setError(msg);
            setLoading(false);
            return { ok: false, status, error: msg };
        }

        // Duplicate, server error, network — do NOT clear the form.
        const msg = data?.message || data?.error || res.error || 'Something went wrong sending your enquiry. Please try again.';
        setError(msg);
        setLoading(false);
        return { ok: false, status, error: msg };
    }, [entryContext]);

    return { submit, loading, result, error, fieldErrors, success, setSuccess };
}

export default useContactSubmission;
