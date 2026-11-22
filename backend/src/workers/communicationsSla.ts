import prisma from '../db';
import { ts, tsMs } from '../prisma/db';
import { createWorker } from '../queue';
import { logAudit } from '../shared/services/audit';
import { createNotification } from '../modules/notifications/services/notifications';

/** Flag overdue conversations once, and alert assignee + watchers. */
export const COMMUNICATIONS_SLA_QUEUE = 'communications-sla';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export async function sweepCommunicationsSla(): Promise<number> {
  const now = ts();
  const conversations = await prisma.orm.public.Conversation
    .where((c: any) => c.slaBreachedAt.isNull())
    .where((c: any) => c.slaDueAt.lt(now))
    .limit(200)
    .all()
    .then((rows: any[]) => rows, () => [] as any[]) as any[];
  let flagged = 0;
  for (const conversation of conversations) {
    if (String(conversation.status ?? '').toUpperCase() === 'CLOSED') continue;
    const updated = await prisma.orm.public.Conversation
      .where({ id: conversation.id, slaBreachedAt: null } as any)
      .update({ slaBreachedAt: now, priority: 'HIGH', updatedAt: now } as any)
      .catch(() => null) as any;
    if (!updated) continue;
    flagged += 1;
    const notified = new Set<string>();
    if (conversation.assigneeId) notified.add(String(conversation.assigneeId));
    const participants = await prisma.orm.public.ConversationParticipant
      .where({ conversationId: conversation.id } as any).all().then((rows: any[]) => rows, () => [] as any[]) as any[];
    for (const participant of participants) notified.add(String(participant.employeeId));
    for (const employeeId of notified) {
      await createNotification(
        employeeId,
        'communications.sla.breached',
        'Conversation SLA breached',
        `A ${conversation.channel} conversation has exceeded its response SLA.`,
        '/admin/communications/inbox',
        { conversationId: conversation.id, accountId: conversation.accountId },
      ).then(() => undefined, () => undefined);
    }
    await logAudit({
      action: 'communications.conversation.sla_breached',
      entity: 'Conversation',
      entityId: conversation.id,
      meta: {
        accountId: conversation.accountId,
        channel: conversation.channel,
        dueAt: conversation.slaDueAt,
        breachedAt: now,
        overdueMinutes: Math.max(0, Math.round((tsMs(now) - tsMs(conversation.slaDueAt)) / 60_000)),
      },
    });
  }
  return flagged;
}

export function registerCommunicationsSlaWorker() {
  return createWorker(COMMUNICATIONS_SLA_QUEUE, async (job) => {
    if (job.data?.conversationId) {
      const conversation = await prisma.orm.public.Conversation.where({ id: String(job.data.conversationId) } as any)
        .first().catch(() => null) as any;
      if (conversation && !conversation.slaBreachedAt && tsMs(conversation.slaDueAt) <= Date.now()) {
        await sweepCommunicationsSla();
      }
      return;
    }
    await sweepCommunicationsSla();
  });
}

export function startCommunicationsSlaMonitor(): NodeJS.Timeout | null {
  registerCommunicationsSlaWorker();
  const interval = Number(process.env.COMMUNICATIONS_SLA_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const timer = setInterval(() => {
    sweepCommunicationsSla().catch((err) => console.warn('[communications] SLA sweep failed:', err instanceof Error ? err.message : err));
  }, interval);
  timer.unref?.();
  return timer;
}
