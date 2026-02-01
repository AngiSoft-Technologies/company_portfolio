// In-memory queue implementation (no Redis required)
// For production with high volume, consider adding Redis back

interface Job {
    id: string;
    name: string;
    data: any;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
}

class InMemoryQueue {
    private jobs: Map<string, Job> = new Map();
    private processors: Map<string, Function> = new Map();

    constructor(private name: string) {}

    async add(jobName: string, data: any) {
        const id = `${this.name}-${Date.now()}-${Math.random()}`;
        const job: Job = {
            id,
            name: jobName,
            data,
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date()
        };
        this.jobs.set(id, job);
        
        // Process immediately if processor exists
        const processor = this.processors.get(jobName);
        if (processor) {
            setImmediate(() => this.processJob(id, processor));
        }
        
        return { id };
    }

    private async processJob(jobId: string, processor: Function) {
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

    addProcessor(jobName: string, processor: Function) {
        this.processors.set(jobName, processor);
    }
}

const queues = new Map<string, InMemoryQueue>();

export function getQueue(name: string) {
    if (!queues.has(name)) {
        queues.set(name, new InMemoryQueue(name));
    }
    return queues.get(name)!;
}

export function createWorker(name: string, processor: Function) {
    const queue = getQueue(name);
    queue.addProcessor(name, processor);
    return { isRunning: true };
}
