import prisma from '../db';
import { createWorker, getQueue } from '../queue';
import { syncMailbox } from '../modules/communications/services/zohoMail';

/** Periodic Zoho mailbox sync worker. Wired centrally by the parent session. */

export const COMMUNICATIONS_MAIL_SYNC_QUEUE = 'communications-mail-sync';
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

export async function syncAllCommunicationsMailboxes(): Promise<number> {
  const connections = await prisma.orm.public.ProviderConnection
    .where({ domain: 'COMMUNICATIONS', provider: 'ZOHO_MAIL' } as any)
    .all().then((rows: any[]) => rows, () => [] as any[]) as any[];
  let synced = 0;
  for (const connection of connections) {
    if (!['CONNECTED', 'DEGRADED'].includes(String(connection.status))) continue;
    try {
      await syncMailbox(prisma, connection.id, {});
      synced += 1;
    } catch (err) {
      console.warn(`[communications] mail sync failed for ${connection.id}:`, err instanceof Error ? err.message : err);
    }
  }
  return synced;
}

export function registerCommunicationsMailSyncWorker() {
  return createWorker(COMMUNICATIONS_MAIL_SYNC_QUEUE, async (job) => {
    const connectionId = job.data?.connectionId ? String(job.data.connectionId) : null;
    if (connectionId) await syncMailbox(prisma, connectionId, {});
    else await syncAllCommunicationsMailboxes();
  });
}

export function startCommunicationsMailSync(): NodeJS.Timeout | null {
  registerCommunicationsMailSyncWorker();
  const interval = Number(process.env.COMMUNICATIONS_MAIL_SYNC_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const timer = setInterval(() => {
    syncAllCommunicationsMailboxes().catch((err) => console.warn('[communications] mail sync sweep failed:', err instanceof Error ? err.message : err));
  }, interval);
  timer.unref?.();
  // Enqueue a boot sync through the same idempotent path.
  getQueue(COMMUNICATIONS_MAIL_SYNC_QUEUE).add('sync-all', {}).then(() => undefined, () => undefined);
  return timer;
}
