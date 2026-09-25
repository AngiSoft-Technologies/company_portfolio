import { createWorker } from '../queue';
import { sendMailDirect } from '../shared/services/email';

export function startEmailWorker() {
    try {
        const worker = createWorker('emails', async (job: any) => {
            const { to, subject, html, text, purpose } = job.data;
            console.log(`📧 Processing email job: ${job.id} → ${to}`);
            await sendMailDirect({ to, subject, html, text, purpose });
        });
        return worker;
    } catch (err) {
        console.warn('Email worker error:', err);
        return null;
    }
}
