import rateLimit from 'express-rate-limit';
import { Request } from 'express';

export const authRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit per IP
    message: 'Too many requests, please try later.',
    keyGenerator: (req: Request): string => {
        return req.ip || req.socket.remoteAddress || 'unknown';
    },
    skip: (req: Request) => req.method === 'OPTIONS',
});
