import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connectionString = process.env.REDIS_URL || '';
let connection: Redis | null = null;
if (connectionString) connection = new Redis(connectionString);

export function getQueue(name: string) {
    if (!connection) throw new Error('REDIS_URL not configured');
    return new Queue(name, { connection });
}

export function createWorker(name: string, processor: any) {
    if (!connection) throw new Error('REDIS_URL not configured');
    return new Worker(name, processor, { connection });
}
