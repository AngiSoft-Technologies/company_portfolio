import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';

const connectionString = process.env.REDIS_URL || '';
let connection: IORedis.Redis | null = null;
if (connectionString) connection = new IORedis(connectionString);

export function getQueue(name: string) {
    if (!connection) throw new Error('REDIS_URL not configured');
    // ensure scheduler
    new QueueScheduler(name, { connection });
    return new Queue(name, { connection });
}

export function createWorker(name: string, processor: any) {
    if (!connection) throw new Error('REDIS_URL not configured');
    return new Worker(name, processor, { connection });
}
