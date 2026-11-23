import { describe, it, expect } from 'vitest';
import {
  chatHistorySchema,
  conversationAccessFilters,
  type ConversationExpression,
} from '../src/modules/ai/utils/chatAccess';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

/** Minimal Prisma expression recorder: `c.field.eq(value)` -> [field, value]. */
function expressionRecorder() {
  const calls: Array<[string, string]> = [];
  const column = (field: string) => ({
    eq: (value: string) => {
      calls.push([field, value]);
      return { field, value };
    },
  });
  // The recorder returns plain objects instead of Prisma expression nodes;
  // the cast is confined to this test's fake query builder.
  const c = {
    id: column('id'),
    deviceFingerprint: column('deviceFingerprint'),
    visitorEmail: column('visitorEmail'),
    visitorPhone: column('visitorPhone'),
    visitorName: column('visitorName'),
  } as unknown as ConversationExpression;
  return { calls, c };
}

describe('public chatbot history access (OBS-01)', () => {
  it('rejects a conversation UUID without the device possession factor', () => {
    expect(chatHistorySchema.safeParse({ conversationId: CONVERSATION_ID }).success).toBe(false);
    expect(chatHistorySchema.safeParse({
      conversationId: CONVERSATION_ID,
      visitorEmail: 'visitor@example.com',
      visitorName: 'Visitor',
    }).success).toBe(false);
  });

  it('accepts a fingerprint-only history request', () => {
    const parsed = chatHistorySchema.safeParse({ deviceFingerprint: 'fp-1234567890' });
    expect(parsed.success).toBe(true);
  });

  it('always anchors the query to the device fingerprint, even with a UUID', () => {
    const input = chatHistorySchema.parse({
      conversationId: CONVERSATION_ID,
      deviceFingerprint: 'fp-1234567890',
      visitorEmail: 'visitor@example.com',
      visitorPhone: '+254700000000',
    });
    const filters = conversationAccessFilters(input);
    expect(filters.length).toBe(3); // fingerprint + id + email/phone

    const { calls, c } = expressionRecorder();
    filters[0](c);
    expect(calls[0]).toEqual(['deviceFingerprint', 'fp-1234567890']);

    calls.length = 0;
    filters[1](c);
    expect(calls[0]).toEqual(['id', CONVERSATION_ID]);
  });
});
