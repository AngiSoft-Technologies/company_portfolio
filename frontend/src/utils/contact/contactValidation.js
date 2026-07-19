// Shared field-level validation mirroring the backend Zod schema.
// Each validator returns an array of error strings (empty = valid).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BOOKING_RE = /^[A-Za-z0-9-]+$/;

export function validateName(value) {
    const v = (value || '').trim();
    if (!v) return ['Please enter your name.'];
    if (v.length < 2) return ['Name is too short.'];
    return [];
}

export function validateEmail(value) {
    const v = (value || '').trim();
    if (!v) return ['Please enter your email address.'];
    if (!EMAIL_RE.test(v)) return ['Please enter a valid email address.'];
    return [];
}

export function validatePhone(value, preferredResponseMethod) {
    const needs = preferredResponseMethod === 'phone' || preferredResponseMethod === 'whatsapp';
    const v = (value || '').trim();
    if (needs && !v) {
        return ['Please enter a phone number so we can reach you via this method.'];
    }
    if (v && v.replace(/[^0-9+]/g, '').length < 7) {
        return ['Please enter a valid phone number.'];
    }
    return [];
}

export function validateEnquiryType(value) {
    if (!value) return ['Please choose what your enquiry is about.'];
    return [];
}

export function validateSubject(value) {
    const v = (value || '').trim();
    if (!v) return ['Please enter a subject.'];
    if (v.length < 3) return ['Subject is too short.'];
    return [];
}

export function validateMessage(value) {
    const v = (value || '').trim();
    if (!v) return ['Please enter your message.'];
    if (v.length < 10) return ['Message must be at least 10 characters.'];
    if (v.length > 5000) return ['Message must be under 5000 characters.'];
    return [];
}

export function validateBookingReference(value) {
    const v = (value || '').trim();
    if (v && !BOOKING_RE.test(v)) {
        return ['Booking reference may only contain letters, numbers and hyphens.'];
    }
    return [];
}

export function validateHoneypot(value) {
    if ((value || '').trim() !== '') return ['Submission rejected.'];
    return [];
}

// Validate the whole form; returns { fieldName: [msgs] }.
export function validateForm(values) {
    const errors = {};
    const set = (field, msgs) => {
        if (msgs && msgs.length) errors[field] = msgs;
    };

    set('name', validateName(values.name));
    set('email', validateEmail(values.email));
    set('phone', validatePhone(values.phone, values.preferredResponseMethod));
    set('enquiryType', validateEnquiryType(values.enquiryType));
    set('subject', validateSubject(values.subject));
    set('message', validateMessage(values.message));
    set('bookingReference', validateBookingReference(values.bookingReference));
    set('company', validateHoneypot(values.company));

    return errors;
}

export default validateForm;
