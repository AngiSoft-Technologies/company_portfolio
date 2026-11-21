import { createWorker } from '../queue';
import { sendMailDirect } from '../shared/services/email';

export function startEmailWorker() {
    try {
        const worker = createWorker('emails', async (job: any) => {
            console.log(`📧 Processing email job: ${job.id} → ${job.data?.to}`);
            await sendMailDirect(job.data);
        });
        return worker;
    } catch (err) {
        console.warn('Email worker error:', err);
        return null;
    }
}
