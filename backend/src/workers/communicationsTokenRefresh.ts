import prisma from '../db';
import { ts } from '../prisma/db';
import { createWorker } from '../queue';
import { refreshZohoAccessToken } from '../modules/communications/services/zohoMail';

/** Refresh expiring provider access tokens before mail sync/send calls fail. */

export const COMMUNICATIONS_TOKEN_REFRESH_QUEUE = 'communications-token-refresh';
const DEFAULT_INTERVAL_MS = 50 * 60 * 1000;

export async function refreshCommunicationsTokens(): Promise<number> {
  const connections = await prisma.orm.public.ProviderConnection
    .where({ domain: 'COMMUNICATIONS' } as any).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
  let refreshed = 0;
  for (const connection of connections) {
    if (!['CONNECTED', 'DEGRADED'].includes(String(connection.status))) continue;
    if (connection.provider !== 'ZOHO_MAIL') continue;
    try {
      await refreshZohoAccessToken(prisma, connection.id);
      refreshed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'token refresh failed';
      await prisma.orm.public.ProviderConnection.where({ id: connection.id }).update({
        status: 'DEGRADED', lastError: message.slice(0, 300), updatedAt: ts(),
      } as any).then(() => undefined, () => undefined);
      console.warn(`[communications] token refresh failed for ${connection.id}:`, message);
    }
  }
  return refreshed;
}

export function registerCommunicationsTokenRefreshWorker() {
  return createWorker(COMMUNICATIONS_TOKEN_REFRESH_QUEUE, async (job) => {
    const connectionId = job.data?.connectionId ? String(job.data.connectionId) : null;
    if (connectionId) await refreshZohoAccessToken(prisma, connectionId);
    else await refreshCommunicationsTokens();
  });
}

export function startCommunicationsTokenRefresh(): NodeJS.Timeout | null {
  registerCommunicationsTokenRefreshWorker();
  const interval = Number(process.env.COMMUNICATIONS_TOKEN_REFRESH_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const timer = setInterval(() => {
    refreshCommunicationsTokens().catch((err) => console.warn('[communications] token refresh sweep failed:', err instanceof Error ? err.message : err));
  }, interval);
  timer.unref?.();
  return timer;
}
