import { createWorker } from '../queue';
import { sendMail as send } from '../services/email';

export function startEmailWorker() {
    try {
        const worker = createWorker('emails', async (job: any) => {
            const { to, subject, html, text } = job.data;
            await send({ to, subject, html, text });
        });
        worker.on('completed', (job: any) => console.log('email job completed', job.id));
        worker.on('failed', (job: any, err: any) => console.error('email job failed', job.id, err));
        return worker;
    } catch (err) {
        console.warn('Email worker not started, REDIS_URL not configured');
        return null;
    }
}
