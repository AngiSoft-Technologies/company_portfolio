// Queue facade.
//
// Production path (REDIS_URL set): BullMQ backed by Redis, so jobs survive
// restarts and can be processed across instances.
//
// Fallback (no REDIS_URL — local dev / tests): a simple in-memory queue that
// drains synchronously via setImmediate. No extra infra required.
//
// Both paths expose the same contract so callers never know which is active:
//   getQueue(name).add(jobName, data) -> Promise<{ id }>
//   createWorker(name, processor)     -> { isRunning }
//   getWorkers()                      -> [{ name, running }]
//   closeWorkers()                    -> graceful shutdown (Redis path)

import { Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redisConnectionOptions } from '../shared/services/redis';

interface QueueJob {
    id: string;
    name: string;
    data: Record<string, unknown>;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
}

type JobProcessor = (job: QueueJob) => Promise<unknown> | unknown;

export interface QueueHandle {
    add(jobName: string, data: unknown): Promise<{ id: string }>;
}

/** True when Redis is configured; flips the queue to the BullMQ backend. */
function useRedis(): boolean {
    return Boolean(process.env.REDIS_URL);
}

// ─── BullMQ (Redis) backend ────────────────────────────────────────────────

let bullMQQueueMap: Map<string, Queue> | null = null;
let bullMQWorkerMap: Map<string, Worker> | null = null;

function redisConnection(): ConnectionOptions {
    return redisConnectionOptions() as ConnectionOptions;
}

function getBullQueue(name: string): Queue {
    if (!bullMQQueueMap) {
        bullMQQueueMap = new Map();
        bullMQWorkerMap = new Map();
    }
    let queue = bullMQQueueMap.get(name) as Queue | undefined;
    if (!queue) {
        queue = new Queue(name, { connection: redisConnection() });
        // Surface connection errors without letting an unhandled 'error' event
        // crash the process when Redis is unreachable.
        queue.on('error', (err) => console.warn(`[queue:${name}] error:`, err?.message || err));
        bullMQQueueMap.set(name, queue);
    }
    return queue;
}

function toCompatJob(job: {
    id?: string;
    name: string;
    data?: unknown;
    attemptsMade?: number;
    timestamp?: number;
    opts?: { attempts?: number };
}): QueueJob {
    return {
        id: (job.id ?? `job-${Date.now()}`) as string,
        name: job.name,
        data: (job.data ?? {}) as Record<string, unknown>,
        attempts: job.attemptsMade ?? 0,
        maxAttempts: job.opts?.attempts ?? 3,
        createdAt: new Date(job.timestamp ?? Date.now()),
    };
}

async function closeRedisWorkers(): Promise<void> {
    const workers = bullMQWorkerMap;
    const queues = bullMQQueueMap;
    bullMQWorkerMap = null;
    bullMQQueueMap = null;
    if (workers && workers.size > 0) {
        await Promise.all(Array.from(workers.values()).map((w) => w.close()));
    }
    if (queues && queues.size > 0) {
        await Promise.all(Array.from(queues.values()).map((q) => q.close()));
    }
}

// ─── In-memory (fallback) backend ─────────────────────────────────────────

class InMemoryQueue implements QueueHandle {
    private jobs: Map<string, QueueJob> = new Map();
    private processors: Map<string, JobProcessor> = new Map();

    constructor(private name: string) {}

    async add(jobName: string, data: unknown) {
        const id = `${this.name}-${Date.now()}-${Math.random()}`;
        const job: QueueJob = {
            id,
            name: jobName,
            data: (data ?? {}) as Record<string, unknown>,
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date(),
        };
        this.jobs.set(id, job);

        // Prefer the processor registered for the *queue* (the createWorker key)
        // and fall back to a job-name-specific processor. Previously the lookup
        // only used jobName ('send'), so jobs were queued but never drained.
        const processor = this.processors.get(this.name) ?? this.processors.get(jobName);
        if (processor) {
            setImmediate(() => this.processJob(id, processor));
        }

        return { id };
    }

    private async processJob(jobId: string, processor: JobProcessor) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        try {
            await processor(job);
            this.jobs.delete(jobId);
        } catch (err) {
            job.attempts++;
            if (job.attempts >= job.maxAttempts) {
                console.error(`Job ${jobId} failed after ${job.maxAttempts} attempts:`, err);
                this.jobs.delete(jobId);
            }
        }
    }

    addProcessor(jobName: string, processor: JobProcessor) {
        this.processors.set(jobName, processor);
    }
}

const inMemoryQueues = new Map<string, InMemoryQueue>();

function getInMemoryQueue(name: string): InMemoryQueue {
    if (!inMemoryQueues.has(name)) {
        inMemoryQueues.set(name, new InMemoryQueue(name));
    }
    return inMemoryQueues.get(name)!;
}

// ─── Shared state + public facade ────────────────────────────────────────

const runningWorkers = new Map<string, boolean>();

export function getQueue(name: string): QueueHandle {
    if (useRedis()) {
        return {
            add: async (jobName, data) => {
                const job = await getBullQueue(name).add(jobName, data);
                return { id: job.id as string };
            },
        };
    }
    return getInMemoryQueue(name);
}

export function createWorker(name: string, processor: JobProcessor) {
    runningWorkers.set(name, true);

    if (useRedis()) {
        if (!bullMQWorkerMap) {
            bullMQWorkerMap = new Map();
            bullMQQueueMap = new Map();
        }
        const worker = new Worker(
            name,
            async (job) => {
                await processor(toCompatJob(job));
            },
            { connection: redisConnection() }
        );
        worker.on('failed', (job, err) => {
            console.error(`Queue job failed (${name}/${job?.id}):`, err);
        });
        worker.on('error', (err) => {
            console.warn(`[worker:${name}] error:`, err?.message || err);
        });
        bullMQWorkerMap.set(name, worker);
        return { isRunning: true };
    }

    getInMemoryQueue(name).addProcessor(name, processor);
    return { isRunning: true };
}

/** Snapshot of started workers, used by /health/readyz. */
export function getWorkers() {
    return Array.from(runningWorkers.entries()).map(([name, running]) => ({ name, running }));
}

/** Gracefully stops every worker + closes queue connections (Redis path). */
export async function closeWorkers() {
    if (useRedis()) {
        await closeRedisWorkers();
    }
    runningWorkers.clear();
}