import { z } from 'zod';
import { and } from '@prisma/orm-postgres/orm-client';

/**
 * A conversation UUID is an identifier, not an authorization credential.
 * Public chat-history reads are anchored to the browser-generated device
 * fingerprint; contact details and a UUID may narrow the query but can never
 * widen it to another visitor's transcript.
 *
 * FIX OBS-01 from docs/security/OWASP_AUDIT.md.
 */
export const chatHistorySchema = z.object({
  conversationId: z.string().uuid().optional(),
  visitorName: z.string().min(2).optional(),
  visitorEmail: z.string().email().optional(),
  visitorPhone: z.string().optional(),
  deviceFingerprint: z.string().min(8).max(200),
  limit: z.number().int().min(1).max(5).optional(),
});

export type ChatHistoryInput = z.infer<typeof chatHistorySchema>;

type AnyExpression = Parameters<typeof and>[0];
type ColumnExpression = { eq(value: string): AnyExpression };
export type ConversationExpression = {
  id: ColumnExpression;
  deviceFingerprint: ColumnExpression;
  visitorEmail: ColumnExpression;
  visitorPhone: ColumnExpression;
  visitorName: ColumnExpression;
};

/** Expression builders that must all be ANDed into the conversation query. */
export function conversationAccessFilters(
  input: ChatHistoryInput,
): Array<(c: ConversationExpression) => AnyExpression> {
  const filters: Array<(c: ConversationExpression) => AnyExpression> = [
    (c) => c.deviceFingerprint.eq(input.deviceFingerprint),
  ];

  if (input.conversationId) {
    filters.push((c) => c.id.eq(input.conversationId!));
  }
  if (input.visitorEmail && input.visitorPhone) {
    filters.push((c) => and(
      c.visitorEmail.eq(input.visitorEmail!),
      c.visitorPhone.eq(input.visitorPhone!),
    ));
  }
  if (input.visitorEmail && input.visitorName) {
    filters.push((c) => and(
      c.visitorEmail.eq(input.visitorEmail!),
      c.visitorName.eq(input.visitorName!),
    ));
  }
  return filters;
}
