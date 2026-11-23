import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Redis } from 'ioredis';
import { createRedisClient, getRedisUrl } from '../services/redis';

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

/* -------------------------------------------------------------------------- */
/* AI chatbot: short-window flood control + durable daily budget               */
/* -------------------------------------------------------------------------- */

const positiveInt = (raw: string | undefined, fallback: number): number => {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const positiveNumber = (raw: string | undefined, fallback: number): number => {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const nonNegativeInt = (raw: string | undefined, fallback: number): number => {
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
};

const bodyString = (req: Request, key: string): string | undefined => {
    const value = (req.body as Record<string, unknown> | undefined)?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/**
 * Dedicated short-window limiter for paid chatbot calls.
 *
 * `publicFormLimiter` already caps requests per IP over 10 minutes; this one
 * adds a tighter, per-IP *and* per-session (device fingerprint / conversation)
 * burst window so a single visitor cannot hammer the model in a few seconds.
 * The session id only partitions an IP bucket — it never raises the global
 * public-form ceiling.
 *
 * Env: AI_CHAT_WINDOW_MS (default 60s), AI_CHAT_MAX_PER_WINDOW (default 8).
 */
export const aiChatLimiter = rateLimit({
    windowMs: positiveInt(process.env.AI_CHAT_WINDOW_MS, 60_000),
    max: positiveInt(process.env.AI_CHAT_MAX_PER_WINDOW, 8),
    standardHeaders: false,
    legacyHeaders: false,
    message: 'The assistant is receiving too many messages. Please wait a moment and try again.',
    keyGenerator: (req: Request) => {
        const ip = ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
        const session = bodyString(req, 'deviceFingerprint') || bodyString(req, 'conversationId') || 'anon';
        return `${ip}:${session}`;
    },
});

interface SpendConfig {
    dailyTokens: number;
    dailyCostMicros: number;
    costPerMillionUsd: number;
    outputTokens: number;
    promptOverheadTokens: number;
    prefix: string;
    failClosed: boolean;
}

/** Config is read per request so operators can tune limits without a rebuild. */
function spendConfig(): SpendConfig {
    return {
        dailyTokens: positiveInt(process.env.AI_SPEND_DAILY_TOKENS, 150_000),
        dailyCostMicros: Math.round(positiveNumber(process.env.AI_SPEND_DAILY_COST_USD, 2) * 1_000_000),
        costPerMillionUsd: positiveNumber(process.env.AI_SPEND_COST_PER_MILLION_TOKENS, 0.5),
        outputTokens: positiveInt(process.env.AI_CHAT_MAX_OUTPUT_TOKENS, 500),
        promptOverheadTokens: nonNegativeInt(process.env.AI_SPEND_PROMPT_OVERHEAD_TOKENS, 2_400),
        prefix: (process.env.AI_SPEND_REDIS_PREFIX || 'chatbot:spend').trim(),
        failClosed: process.env.AI_SPEND_FAIL_CLOSED !== 'false',
    };
}

/**
 * Conservative pre-flight estimate: incoming message + system/context overhead
 * + the configured maximum reply length. We reserve *before* calling the model
 * so an over-budget request never reaches a paid provider.
 */
export function estimateChatTokens(
    message: string,
    outputTokens = positiveInt(process.env.AI_CHAT_MAX_OUTPUT_TOKENS, 500),
): number {
    const promptOverhead = nonNegativeInt(process.env.AI_SPEND_PROMPT_OVERHEAD_TOKENS, 2_400);
    return Math.ceil(String(message ?? '').length / 4) + promptOverhead + outputTokens;
}

export interface SpendCheck {
    allowed: boolean;
    /** token | cost = daily cap reached; store = limit store unavailable. */
    reason?: 'token' | 'cost' | 'store';
    retryAfterSeconds?: number;
    tokensUsed?: number;
    costMicrosUsed?: number;
}

/** Atomic reserve in Redis: reject without incrementing when either cap would break. */
const RESERVE_LUA = `
local tokens = tonumber(ARGV[1])
local cost = tonumber(ARGV[2])
local tokenCap = tonumber(ARGV[3])
local costCap = tonumber(ARGV[4])
local resetAt = tonumber(ARGV[5])
local usedTokens = tonumber(redis.call('GET', KEYS[1]) or '0')
local usedCost = tonumber(redis.call('GET', KEYS[2]) or '0')
if usedTokens + tokens > tokenCap or usedCost + cost > costCap then
  return 0
end
redis.call('INCRBY', KEYS[1], tokens)
redis.call('INCRBY', KEYS[2], cost)
redis.call('EXPIREAT', KEYS[1], resetAt)
redis.call('EXPIREAT', KEYS[2], resetAt)
return 1
`;

interface MemoryBucket {
    tokens: number;
    costMicros: number;
    resetAtMs: number;
}

const memorySpend = new Map<string, MemoryBucket>();
let cachedSpendRedis: Redis | null | undefined;

function spendRedis(): Redis | null {
    if (cachedSpendRedis !== undefined) return cachedSpendRedis;
    if (!getRedisUrl()) {
        cachedSpendRedis = null;
        return null;
    }
    try {
        cachedSpendRedis = createRedisClient();
    } catch {
        cachedSpendRedis = null;
    }
    return cachedSpendRedis;
}

/** Test seam: clears the dev fallback / cached Redis handle, not durable data. */
export function resetAiSpendStateForTests(): void {
    memorySpend.clear();
    if (cachedSpendRedis) {
        try { cachedSpendRedis.disconnect(); } catch { /* already gone */ }
    }
    cachedSpendRedis = undefined;
}

/**
 * Reserve `estimatedTokens` against the shared UTC-daily AI budget.
 *
 * Redis (already configured for BullMQ/cache) is the durable source of truth in
 * production. Without REDIS_URL we use a process-local Map for dev/test only.
 * On a Redis error we fail closed by default — never silently grant paid work.
 */
export async function checkAiSpend(estimatedTokens: number, now = Date.now()): Promise<SpendCheck> {
    const cfg = spendConfig();
    const tokens = Math.max(1, Math.floor(estimatedTokens));
    // cost/M tokens * tokens = micro-USD (e.g. 0.5 * 1000 = 500µ$ = $0.0005).
    const costMicros = Math.ceil(tokens * cfg.costPerMillionUsd);
    const dayStart = Math.floor(now / 86_400_000) * 86_400_000;
    const resetAtMs = dayStart + 86_400_000;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
    const tokenKey = `${cfg.prefix}:${dayStart}:tokens`;
    const costKey = `${cfg.prefix}:${dayStart}:cost`;

    const deniedReason = (usedTokens: number, usedCostMicros: number): 'token' | 'cost' | undefined => {
        if (usedTokens + tokens > cfg.dailyTokens) return 'token';
        if (usedCostMicros + costMicros > cfg.dailyCostMicros) return 'cost';
        return undefined;
    };

    const redis = spendRedis();
    if (redis) {
        try {
            const allowed = Number(await redis.eval(
                RESERVE_LUA,
                2,
                tokenKey,
                costKey,
                String(tokens),
                String(costMicros),
                String(cfg.dailyTokens),
                String(cfg.dailyCostMicros),
                String(Math.ceil(resetAtMs / 1000)),
            )) === 1;
            if (allowed) {
                return { allowed: true, retryAfterSeconds };
            }
            const [rawTokens, rawCost] = await Promise.all([redis.get(tokenKey), redis.get(costKey)]);
            return {
                allowed: false,
                reason: deniedReason(Number(rawTokens ?? 0), Number(rawCost ?? 0)),
                retryAfterSeconds,
            };
        } catch (error) {
            console.error('AI spend limit store error:', error);
            if (!cfg.failClosed) return { allowed: true, retryAfterSeconds };
            return { allowed: false, reason: 'store', retryAfterSeconds };
        }
    }

    // Dev/test fallback. Node is single-threaded between awaits, so this read
    // and write is atomic enough for the local process.
    for (const [key, bucket] of memorySpend) {
        if (bucket.resetAtMs <= now) memorySpend.delete(key);
    }
    const bucket: MemoryBucket = memorySpend.get(tokenKey) ?? { tokens: 0, costMicros: 0, resetAtMs };
    const reason = deniedReason(bucket.tokens, bucket.costMicros);
    if (reason) {
        return {
            allowed: false,
            reason,
            retryAfterSeconds,
            tokensUsed: bucket.tokens,
            costMicrosUsed: bucket.costMicros,
        };
    }
    bucket.tokens += tokens;
    bucket.costMicros += costMicros;
    memorySpend.set(tokenKey, bucket);
    return { allowed: true, retryAfterSeconds, tokensUsed: bucket.tokens, costMicrosUsed: bucket.costMicros };
}

/**
 * Fail-closed budget gate for the chatbot message endpoint. Must run after
 * body validation so the message can be measured.
 */
export const aiSpendLimiter: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await checkAiSpend(estimateChatTokens(bodyString(req, 'message') ?? ''));
        if (result.allowed) {
            next();
            return;
        }
        res.setHeader('Retry-After', String(result.retryAfterSeconds ?? 60));
        if (result.reason === 'store') {
            res.status(503).json({
                error: 'The assistant is briefly unavailable while its usage budget is being checked. Please try again shortly or contact our team directly.',
                code: 'AI_SPEND_UNAVAILABLE',
            });
            return;
        }
        res.status(429).json({
            error: 'The assistant has reached its daily usage limit. Please try again tomorrow or contact our team directly.',
            code: 'AI_SPEND_LIMIT_REACHED',
        });
    } catch (error) {
        console.error('AI spend limiter failure:', error);
        res.status(503).json({
            error: 'The assistant is briefly unavailable while its usage budget is being checked. Please try again shortly or contact our team directly.',
            code: 'AI_SPEND_UNAVAILABLE',
        });
    }
};
