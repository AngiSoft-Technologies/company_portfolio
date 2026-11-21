import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  aiComplete: vi.fn(),
  loadAIConfig: vi.fn(),
}));

vi.mock('../src/prisma/db', () => ({ ts: () => new Date().toISOString(), newId: () => 'id' }));
vi.mock('../src/modules/ai/services/aiProvider', () => ({
  loadAIConfig: h.loadAIConfig,
  aiComplete: h.aiComplete,
  AIProviderError: class AIProviderError extends Error {},
}));

import { extractJsonObject, scoreLead, triageTicket } from '../src/modules/ai/services/aiAssist';

describe('extractJsonObject', () => {
  it('parses a bare JSON object', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('finds JSON embedded in prose and markdown fences', () => {
    const text = 'Here you go:\n```json\n{"score": 87, "reasons": ["budget"]}\n```\nDone.';
    expect(extractJsonObject(text)).toEqual({ score: 87, reasons: ['budget'] });
  });

  it('handles braces inside strings', () => {
    expect(extractJsonObject('{"note": "use {x} here", "ok": true}')).toEqual({ note: 'use {x} here', ok: true });
  });

  it('returns null for non-JSON output', () => {
    expect(extractJsonObject('no json here')).toBeNull();
    expect(extractJsonObject('{broken')).toBeNull();
  });
});

describe('aiAssist service', () => {
  beforeEach(() => {
    h.aiComplete.mockReset();
    h.loadAIConfig.mockReset();
  });

  it('returns ok:false when AI is not configured', async () => {
    h.loadAIConfig.mockResolvedValue({ config: { enabled: false, apiKey: '' }, source: 'env' });
    const res = await scoreLead({} as any, { name: 'A' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not configured/i);
  });

  it('parses provider JSON output into data', async () => {
    h.loadAIConfig.mockResolvedValue({ config: { enabled: true, apiKey: 'k' }, source: 'db' });
    h.aiComplete.mockResolvedValue('{"score": 91, "confidence": "high", "reasons": ["clear budget"], "recommendedAction": "call", "suggestedFollowUpHours": 4}');
    const res = await scoreLead({} as any, { name: 'Jane', budget: '50k' });
    expect(res.ok).toBe(true);
    expect(res.data?.score).toBe(91);
  });

  it('surfaces provider errors as ok:false', async () => {
    h.loadAIConfig.mockResolvedValue({ config: { enabled: true, apiKey: 'k' }, source: 'db' });
    h.aiComplete.mockRejectedValue(new Error('boom'));
    const res = await triageTicket({} as any, { subject: 's', body: 'b' });
    expect(res.ok).toBe(false);
  });
});
