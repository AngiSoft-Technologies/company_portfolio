// Safely normalize the /api/site/contact response into a stable shape.
// The backend Setting value may be missing/partial — never fabricate
// operational details (office hours, response times). Use verified fallbacks.

const VERIFIED = {
    phone: '+254710398690',
    email: 'info@angisoft.co.ke',
    whatsapp: '+254710398690',
    address: '',
    city: 'Nairobi',
    country: 'Kenya',
};

const asString = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return fallback;
};

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

/**
 * Normalizes raw contact Setting data. Email/phone/whatsapp/city/country get
 * verified fallbacks; other fields fall back to empty so we never show
 * fabricated info.
 */
export function normalizeContactData(raw) {
    const data = raw && typeof raw === 'object' ? raw : {};

    const phone = asString(data.phone, VERIFIED.phone);
    const email = asString(data.email, VERIFIED.email);
    const whatsapp = asString(data.whatsapp, VERIFIED.whatsapp);

    // Sanitize the WhatsApp value into a tel-friendly +254... form.
    const whatsappDigits = whatsapp.replace(/[^0-9+]/g, '');
    const whatsappClean = whatsappDigits.startsWith('+')
        ? whatsappDigits
        : `+${whatsappDigits.replace(/^0+/, '254')}`;

    const city = asString(data.city, VERIFIED.city);
    const country = asString(data.country, VERIFIED.country);

    let social = asArray(data.social);
    social = social
        .map((item) => (item && typeof item === 'object' ? item : null))
        .filter(Boolean)
        .map((item) => ({
            platform: asString(item.platform),
            url: asString(item.url),
        }))
        .filter((item) => item.platform && item.url);

    let contactMethods = asArray(data.contactMethods);

    const mapUrl = asString(data.mapUrl || data.location?.mapUrl || '');
    // Only treat as usable if it looks like a real embed/url.
    const safeMapUrl = /^https?:\/\//i.test(mapUrl) ? mapUrl : '';

    return {
        phone,
        email,
        whatsapp: whatsappClean,
        address: asString(data.address),
        city,
        country,
        workingHours: asString(data.workingHours),
        responseGuidance: asString(data.responseGuidance),
        social,
        contactMethods,
        mapUrl: safeMapUrl,
    };
}

export default normalizeContactData;
