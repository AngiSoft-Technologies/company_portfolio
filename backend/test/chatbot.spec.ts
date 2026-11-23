import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Focused coverage for the chatbot's production spend guards. The Redis client
 * is mocked so these tests never contact Upstash; the in-memory fallback is
 * exercised with no REDIS_URL, exactly as it behaves in dev/test.
 */
const h = vi.hoisted(() => ({
  redisUrl: undefined as string | undefined,
  evalMock: vi.fn(),
  getMock: vi.fn(),
  disconnectMock: vi.fn(),
}));

vi.mock('../src/shared/services/redis', () => ({
  getRedisUrl: () => h.redisUrl,
  createRedisClient: () => ({
    eval: h.evalMock,
    get: h.getMock,
    disconnect: h.disconnectMock,
  }),
}));

import {
  aiChatLimiter,
  aiSpendLimiter,
  checkAiSpend,
  estimateChatTokens,
  resetAiSpendStateForTests,
} from '../src/shared/middleware/rateLimiter';

const MESSAGE = 'a'.repeat(40); // 10 input tokens at the configured 4 chars/token
const TOKENS_PER_REQUEST = 20; // 10 input + 10 max output (prompt overhead stubbed to 0)

function spendApp() {
  const app = express();
  app.use(express.json());
  app.post('/chat', aiSpendLimiter, (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('chatbot AI spend caps', () => {
  beforeEach(() => {
    h.redisUrl = undefined;
    h.evalMock.mockReset();
    h.getMock.mockReset();
    h.disconnectMock.mockReset();
    resetAiSpendStateForTests();
    vi.stubEnv('AI_SPEND_PROMPT_OVERHEAD_TOKENS', '0');
    vi.stubEnv('AI_CHAT_MAX_OUTPUT_TOKENS', '10');
    vi.stubEnv('AI_SPEND_DAILY_TOKENS', '100');
    vi.stubEnv('AI_SPEND_DAILY_COST_USD', '100');
    vi.stubEnv('AI_SPEND_COST_PER_MILLION_TOKENS', '1');
    vi.stubEnv('AI_SPEND_REDIS_PREFIX', 'test:chatbot:spend');
    vi.stubEnv('AI_SPEND_FAIL_CLOSED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAiSpendStateForTests();
  });

  it('estimates input + output tokens conservatively', () => {
    expect(estimateChatTokens(MESSAGE)).toBe(TOKENS_PER_REQUEST);
    vi.stubEnv('AI_SPEND_PROMPT_OVERHEAD_TOKENS', '100');
    expect(estimateChatTokens(MESSAGE)).toBe(120);
  });

  it('reserves against the in-memory fallback and denies after the daily token cap', async () => {
    for (let i = 0; i < 5; i += 1) {
      const result = await checkAiSpend(TOKENS_PER_REQUEST);
      expect(result.allowed).toBe(true);
    }
    const denied = await checkAiSpend(TOKENS_PER_REQUEST);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('token');
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    expect(denied.tokensUsed).toBe(100);
  });

  it('enforces the USD cap independently of the token cap', async () => {
    vi.stubEnv('AI_SPEND_DAILY_TOKENS', '100000');
    vi.stubEnv('AI_SPEND_DAILY_COST_USD', '0.00004');
    // 40 micro-USD per request: two fit, the third exceeds 40µ$.
    expect((await checkAiSpend(TOKENS_PER_REQUEST)).allowed).toBe(true);
    expect((await checkAiSpend(TOKENS_PER_REQUEST)).allowed).toBe(true);
    const denied = await checkAiSpend(TOKENS_PER_REQUEST);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('cost');
  });

  it('returns a clear client message and 429 when the budget is exhausted', async () => {
    const app = spendApp();
    for (let i = 0; i < 5; i += 1) {
      const ok = await request(app).post('/chat').send({ message: MESSAGE });
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).post('/chat').send({ message: MESSAGE });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('AI_SPEND_LIMIT_REACHED');
    expect(blocked.body.error).toMatch(/daily usage limit/i);
    expect(blocked.headers['retry-after']).toBeTruthy();
  });

  it('uses Redis atomically when configured and fails closed on store errors', async () => {
    h.redisUrl = 'redis://localhost:6379';
    resetAiSpendStateForTests();
    h.evalMock.mockResolvedValueOnce(1);
    expect((await checkAiSpend(TOKENS_PER_REQUEST)).allowed).toBe(true);
    expect(h.evalMock).toHaveBeenCalledTimes(1);
    const args = h.evalMock.mock.calls[0];
    expect(args[1]).toBe(2); // token + cost keys
    expect(String(args[2])).toContain('test:chatbot:spend');

    h.evalMock.mockResolvedValueOnce(0);
    h.getMock.mockImplementationOnce(async () => '100').mockImplementationOnce(async () => '100');
    const capped = await checkAiSpend(TOKENS_PER_REQUEST);
    expect(capped.allowed).toBe(false);
    expect(capped.reason).toBe('token');

    h.evalMock.mockRejectedValueOnce(new Error('redis down'));
    const unavailable = await checkAiSpend(TOKENS_PER_REQUEST);
    expect(unavailable.allowed).toBe(false);
    expect(unavailable.reason).toBe('store');

    vi.stubEnv('AI_SPEND_FAIL_CLOSED', 'false');
    h.evalMock.mockRejectedValueOnce(new Error('redis down'));
    expect((await checkAiSpend(TOKENS_PER_REQUEST)).allowed).toBe(true);
  });
});

describe('chatbot short-window limiter', () => {
  it('caps bursts per IP + session without blocking other sessions', async () => {
    const app = express();
    app.use(express.json());
    app.post('/chat', aiChatLimiter, (_req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 8; i += 1) {
      const ok = await request(app).post('/chat').send({ message: 'hi', deviceFingerprint: 'device-one' });
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).post('/chat').send({ message: 'hi', deviceFingerprint: 'device-one' });
    expect(blocked.status).toBe(429);

    const otherSession = await request(app).post('/chat').send({ message: 'hi', deviceFingerprint: 'device-two' });
    expect(otherSession.status).toBe(200);
  });
});
