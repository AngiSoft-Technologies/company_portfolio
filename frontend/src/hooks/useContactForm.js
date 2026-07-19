import { useRef, useState, useCallback } from 'react';
import { validateForm } from '../utils/contact/contactValidation';
import { defaultSubjectFor } from '../utils/contact/contactSubjects';

const INITIAL = {
    name: '',
    email: '',
    phone: '',
    preferredResponseMethod: 'email',
    enquiryType: '',
    subject: '',
    serviceSlug: '',
    productSlug: '',
    message: '',
    bookingReference: '',
    preferredContactTime: '',
    organisation: '',
    company: '', // honeypot
};

/**
 * Controlled contact form state with field-level validation mirroring the
 * backend Zod schema. Honeypot `company` and `formStartedAt` are managed here.
 */
export function useContactForm({ context } = {}) {
    const [values, setValues] = useState(() => ({
        ...INITIAL,
        enquiryType: context?.enquiryType || '',
        subject: context?.subject || (context?.enquiryType ? defaultSubjectFor(context.enquiryType) : ''),
        serviceSlug: context?.serviceSlug || '',
        productSlug: context?.productSlug || '',
        bookingReference: context?.bookingReference || '',
    }));
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const firstInvalidRef = useRef(null);
    const formStartedAt = useRef(Date.now());

    const setField = useCallback((name, value) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const validateAll = useCallback(() => {
        const full = { ...values, formStartedAt: formStartedAt.current };
        const found = validateForm(full);
        setErrors(found);
        return { valid: Object.keys(found).length === 0, errors: found };
    }, [values]);

    const reset = useCallback(() => {
        setValues({ ...INITIAL });
        setErrors({});
        setTouched({});
        formStartedAt.current = Date.now();
        firstInvalidRef.current = null;
    }, []);

    const markTouched = useCallback((name) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
    }, []);

    return {
        values,
        errors,
        touched,
        setField,
        markTouched,
        validateAll,
        reset,
        firstInvalidRef,
        getFormStartedAt: () => formStartedAt.current,
    };
}

export default useContactForm;
