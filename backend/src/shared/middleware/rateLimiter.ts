import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit per IP
    message: 'Too many requests, please try later.',
    standardHeaders: false, // Don't send RateLimit-* headers
    legacyHeaders: false, // Disable the X-RateLimit-* headers
});

export const contactLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 8, // public contact submissions per IP
    message: 'Too many messages sent. Please wait a few minutes before trying again.',
    standardHeaders: false,
    legacyHeaders: false,
});

// Alias to satisfy the contact-enquiries route import shape.
export const gContactLimiter = contactLimiter;

/**
 * Public unauthenticated form endpoints (bookings, inquiries, newsletter
 * subscribe, survey responses, portal magic-link, chatbot). Generous enough
 * for legitimate multi-step flows, tight enough to blunt spam/abuse.
 */
export const publicFormLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // requests per IP per window
    message: 'Too many requests. Please wait a few minutes before trying again.',
    standardHeaders: false,
    legacyHeaders: false,
});

/**
 * AI Boardroom mutations generate paid LLM replies and can queue approval
 * requests. Generous enough for a real meeting, tight enough to stop a stuck
 * UI or malicious client from burning the owner's budget.
 */
export const boardroomLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: 'Boardroom is busy. Please wait a few minutes before trying again.',
    standardHeaders: false,
    legacyHeaders: false,
});
