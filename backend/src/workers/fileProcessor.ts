import { createWorker } from '../queue';
import prisma from '../db';

export function startFileProcessor() {
    try {
        const worker = createWorker('file-processing', async (job: any) => {
            const { fileId } = job.data;
            console.log('processing file', fileId);
            // TODO: download file from storage, generate thumbnail, upload, update DB
            await prisma.file.update({ where: { id: fileId }, data: { metadata: { processedAt: new Date() } } }).catch(() => null);
        });
        worker.on('completed', (job: any) => console.log('file job completed', job.id));
        worker.on('failed', (job: any, err: any) => console.error('file job failed', job.id, err));
        return worker;
    } catch (err) {
        console.warn('File processor not started, REDIS_URL not configured');
        return null;
    }
}
