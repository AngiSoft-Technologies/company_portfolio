import { createWorker } from '../queue';
import { sendMail as send } from '../services/email';

export function startEmailWorker() {
    try {
        const worker = createWorker('emails', async (job: any) => {
            const { to, subject, html, text } = job.data;
            console.log(`📧 Processing email job: ${job.id}`);
            await send({ to, subject, html, text });
            console.log(`✅ Email sent to ${to}`);
        });
        return worker;
    } catch (err) {
        console.warn('Email worker error:', err);
        return null;
    }
}
