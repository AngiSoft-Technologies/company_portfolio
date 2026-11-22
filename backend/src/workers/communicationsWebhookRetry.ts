import prisma from '../db';
import { ts } from '../prisma/db';
import { createWorker, getQueue } from '../queue';
import { processProviderEvent } from '../modules/communications/services/eventProcessor';

/** Retry queue + sweep for recorded provider events that failed processing. */

export const COMMUNICATIONS_WEBHOOK_QUEUE = 'communications-webhooks';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export async function retryPendingCommunicationsEvents(): Promise<number> {
  const staleBefore = ts(Date.now() - 60_000);
  const events = await prisma.orm.public.ProviderEvent
    .where((e: any) => e.domain.eq('COMMUNICATIONS'))
    .where((e: any) => e.status.eq('FAILED'))
    .limit(100)
    .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
  const received = await prisma.orm.public.ProviderEvent
    .where((e: any) => e.domain.eq('COMMUNICATIONS'))
    .where((e: any) => e.status.eq('RECEIVED'))
    .where((e: any) => e.createdAt.lte(staleBefore))
    .limit(100)
    .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
  let retried = 0;
  for (const event of [...events, ...received]) {
    try {
      await processProviderEvent(prisma, event);
      retried += 1;
    } catch (err) {
      console.warn(`[communications] event retry failed (${event.id}):`, err instanceof Error ? err.message : err);
    }
  }
  return retried;
}

export function registerCommunicationsWebhookWorker() {
  return createWorker(COMMUNICATIONS_WEBHOOK_QUEUE, async (job) => {
    const eventId = job.data?.eventId ? String(job.data.eventId) : null;
    if (!eventId) return;
    const event = await prisma.orm.public.ProviderEvent.where({ id: eventId } as any).first().catch(() => null) as any;
    if (!event) return;
    await processProviderEvent(prisma, event);
  });
}

export function startCommunicationsWebhookRetry(): NodeJS.Timeout | null {
  registerCommunicationsWebhookWorker();
  const interval = Number(process.env.COMMUNICATIONS_WEBHOOK_RETRY_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const timer = setInterval(() => {
    retryPendingCommunicationsEvents().catch((err) => console.warn('[communications] webhook retry sweep failed:', err instanceof Error ? err.message : err));
  }, interval);
  timer.unref?.();
  void getQueue(COMMUNICATIONS_WEBHOOK_QUEUE); // Ensure the queue exists on boot.
  return timer;
}
