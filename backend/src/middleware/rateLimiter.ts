import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit per IP
    message: 'Too many requests, please try later.',
    standardHeaders: false, // Don't send RateLimit-* headers
    legacyHeaders: false, // Disable the X-RateLimit-* headers
});
