import { createHash } from 'crypto';
import type { Db } from '../../db';
import { newId, ts } from '../../prisma/db';

export function providerEventDedupeKey(provider: string, externalEventId: string | null | undefined, fallback: unknown) {
  if (externalEventId && String(externalEventId).trim()) return `${provider}:${String(externalEventId).trim()}`;
  const hash = createHash('sha256').update(JSON.stringify(fallback)).digest('hex');
  return `${provider}:hash:${hash}`;
}

export async function recordProviderEvent(prisma: Db, input: {
  connectionId?: string | null;
  provider: string;
  domain: 'COMMUNICATIONS' | 'FINANCE';
  externalEventId?: string | null;
  eventType: string;
  signatureValid?: boolean;
  payload?: unknown;
  headers?: unknown;
  status?: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  error?: string | null;
}) {
  const dedupeKey = providerEventDedupeKey(input.provider, input.externalEventId, { t: input.eventType, p: input.payload });
  const existing = await prisma.orm.public.ProviderEvent.where({ dedupeKey } as any).first().catch(() => null);
  if (existing) return { event: existing, deduped: true };
  const event = await prisma.orm.public.ProviderEvent.create({
    id: newId(),
    connectionId: input.connectionId ?? null,
    provider: input.provider,
    domain: input.domain,
    externalEventId: input.externalEventId ?? null,
    eventType: input.eventType,
    signatureValid: Boolean(input.signatureValid),
    dedupeKey,
    payload: (input.payload ?? null) as any,
    headers: (input.headers ?? null) as any,
    status: input.status ?? 'RECEIVED',
    error: input.error ?? null,
    processedAt: input.status === 'PROCESSED' ? ts() : null,
    createdAt: ts(),
  } as any);
  return { event, deduped: false };
}
