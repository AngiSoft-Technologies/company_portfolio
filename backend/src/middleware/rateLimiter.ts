import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const authRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit per IP
    message: 'Too many requests, please try later.',
    keyGenerator: ipKeyGenerator,
    skip: (req) => req.method === 'OPTIONS',
});
