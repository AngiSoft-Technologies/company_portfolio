import prisma from '../db';
import { ts, tsMs } from '../prisma/db';
import { createWorker, getQueue } from '../queue';
import { logAudit } from '../shared/services/audit';
import { sendMail as sendZohoMail } from '../modules/communications/services/zohoMail';

/**
 * Scheduled email sends. EmailDraft has no dedicated schedule column, so
 * drafts created with status SCHEDULED store a JSON envelope in `body`:
 *   { scheduledAt, body, html?, from? }
 * A claim (status SENDING) makes replay idempotent.
 */

export const COMMUNICATIONS_SCHEDULED_QUEUE = 'communications-scheduled-sends';
const DEFAULT_INTERVAL_MS = 60 * 1000;

function parseEnvelope(body: unknown): { scheduledAt?: string; body?: string; html?: string; from?: string } {
  if (typeof body !== 'string') return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function processScheduledDraft(draftId: string): Promise<boolean> {
  const draft = await prisma.orm.public.EmailDraft.where({ id: draftId } as any).first().catch(() => null) as any;
  if (!draft || String(draft.status) !== 'SCHEDULED') return false;
  const envelope = parseEnvelope(draft.body);
  if (envelope.scheduledAt && tsMs(envelope.scheduledAt) > Date.now()) return false;
  const claimed = await prisma.orm.public.EmailDraft
    .where({ id: draft.id, status: 'SCHEDULED' } as any).update({ status: 'SENDING', updatedAt: ts() } as any)
    .catch(() => null) as any;
  if (!claimed) return false;
  try {
    const result = await sendZohoMail(prisma, {
      accountId: draft.accountId,
      to: draft.toAddresses ?? [],
      cc: draft.ccAddresses ?? [],
      subject: draft.subject ?? '(no subject)',
      body: envelope.body ?? '',
      html: envelope.html,
      from: envelope.from,
      actorId: draft.createdById,
    });
    await prisma.orm.public.EmailDraft.where({ id: draft.id }).update({ status: 'SENT', updatedAt: ts() } as any).then(() => undefined, () => undefined);
    await logAudit({
      actorId: draft.createdById ?? null, action: 'communications.email.scheduled.send',
      entity: 'EmailDraft', entityId: draft.id,
      meta: { accountId: draft.accountId, providerMessageId: result.id ?? null },
    });
    return true;
  } catch (err) {
    await prisma.orm.public.EmailDraft.where({ id: draft.id }).update({ status: 'SCHEDULED', updatedAt: ts() } as any).then(() => undefined, () => undefined);
    await logAudit({
      actorId: draft.createdById ?? null, action: 'communications.email.scheduled.failed',
      entity: 'EmailDraft', entityId: draft.id,
      meta: { reason: err instanceof Error ? err.message.slice(0, 300) : 'send failed' },
    });
    throw err;
  }
}

export async function sweepScheduledCommunicationsSends(): Promise<number> {
  const drafts = await prisma.orm.public.EmailDraft
    .where((d: any) => d.status.eq('SCHEDULED')).limit(100).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
  let sent = 0;
  for (const draft of drafts) {
    const envelope = parseEnvelope(draft.body);
    if (envelope.scheduledAt && tsMs(envelope.scheduledAt) > Date.now()) continue;
    try {
      if (await processScheduledDraft(draft.id)) sent += 1;
    } catch (err) {
      console.warn(`[communications] scheduled send ${draft.id} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export function registerCommunicationsScheduledWorker() {
  return createWorker(COMMUNICATIONS_SCHEDULED_QUEUE, async (job) => {
    if (job.data?.draftId) await processScheduledDraft(String(job.data.draftId));
    else await sweepScheduledCommunicationsSends();
  });
}

export function startCommunicationsScheduledSends(): NodeJS.Timeout | null {
  registerCommunicationsScheduledWorker();
  const interval = Number(process.env.COMMUNICATIONS_SCHEDULED_SEND_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const timer = setInterval(() => {
    sweepScheduledCommunicationsSends().catch((err) => console.warn('[communications] scheduled sweep failed:', err instanceof Error ? err.message : err));
  }, interval);
  timer.unref?.();
  void getQueue(COMMUNICATIONS_SCHEDULED_QUEUE);
  return timer;
}
