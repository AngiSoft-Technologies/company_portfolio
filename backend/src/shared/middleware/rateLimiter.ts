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
