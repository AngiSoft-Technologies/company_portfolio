// Default subjects + helper guidance per enquiry type.
// `value` is the stable machine value sent to the backend (enquiryType).
// `cardLabel` is shown on the intent selector.

export const ENQUIRY_TYPES = [
    { value: 'service', cardLabel: 'Services', label: 'A Service', helper: 'Tell us which service you need and what you want to achieve.' },
    { value: 'product', cardLabel: 'Products', label: 'A Product', helper: 'Ask about a product, features, pricing or availability.' },
    { value: 'pricing', cardLabel: 'Pricing', label: 'Pricing', helper: 'Request pricing, a quote or a custom package.' },
    { value: 'support', cardLabel: 'Support', label: 'Support', helper: 'Get help with something you already have with us.' },
    { value: 'partnership', cardLabel: 'Partnership', label: 'Partnership', helper: 'Explore collaboration, reseller or joint opportunities.' },
    { value: 'careers', cardLabel: 'Careers', label: 'Careers', helper: 'Ask about open roles or how to join AngiSoft.' },
    { value: 'general', cardLabel: 'General', label: 'Something Else', helper: 'Anything else you would like to discuss.' },
];

export const DEFAULT_SUBJECT = {
    service: 'Enquiry about a service',
    product: 'Enquiry about a product',
    pricing: 'Pricing & quote request',
    support: 'Support request',
    partnership: 'Partnership enquiry',
    careers: 'Careers enquiry',
    general: 'General enquiry',
};

export const HELPER_TEXT = ENQUIRY_TYPES.reduce((acc, t) => {
    acc[t.value] = t.helper;
    return acc;
}, {});

export function defaultSubjectFor(type) {
    return DEFAULT_SUBJECT[type] || DEFAULT_SUBJECT.general;
}

export function helperFor(type) {
    return HELPER_TEXT[type] || HELPER_TEXT.general;
}

export function enquiryLabel(type) {
    const match = ENQUIRY_TYPES.find((t) => t.value === type);
    return match ? match.label : 'General';
}

export default ENQUIRY_TYPES;
