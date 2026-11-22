import { createWorker } from '../queue';
import prisma from '../db';
import { ts } from '../prisma/db';
import {
    dispatchProviderEvent,
    type ProviderEventRecord,
} from '../shared/services/providerEvents';

function errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

/**
 * Central provider-event dispatcher.
 *
 * Webhooks persist an immutable ProviderEvent and enqueue its id here. Domain
 * processors registered by communications/finance modules do the actual work;
 * this worker owns status transitions so a failed processor leaves the event
 * retryable instead of silently disappearing.
 */
export function startProviderEventsWorker() {
    const worker = createWorker('provider-events', async (job) => {
        const data = job.data as { eventId?: unknown };
        const eventId = typeof data.eventId === 'string' ? data.eventId : '';
        if (!eventId) return;

        const event: ProviderEventRecord | null = await prisma.orm.public.ProviderEvent
            .where({ id: eventId })
            .first()
            .catch(() => null) as ProviderEventRecord | null;
        if (!event || event.status === 'PROCESSED' || event.status === 'IGNORED') return;

        try {
            const result = await dispatchProviderEvent(prisma, event);
            if (result.processed) {
                await prisma.orm.public.ProviderEvent
                    .where({ id: eventId })
                    .update({ status: 'PROCESSED', processedAt: ts(), error: null });
                return;
            }
            await prisma.orm.public.ProviderEvent
                .where({ id: eventId })
                .update({ status: 'FAILED', error: 'No registered processor for provider event' });
        } catch (err: unknown) {
            await prisma.orm.public.ProviderEvent
                .where({ id: eventId })
                .update({
                    status: 'FAILED',
                    error: errorMessage(err).slice(0, 1000),
                })
                .catch(() => undefined);
            throw err;
        }
    });
    return worker.isRunning;
}
