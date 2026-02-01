import { createWorker } from '../queue';
import prisma from '../db';

export function startFileProcessor() {
    try {
        const worker = createWorker('file-processing', async (job: any) => {
            const { fileId } = job.data;
            console.log(`📁 Processing file: ${fileId}`);
            // TODO: download file from storage, generate thumbnail, upload, update DB
            await prisma.file.update({ 
                where: { id: fileId }, 
                data: { metadata: { processedAt: new Date().toISOString() } } 
            }).catch(() => null);
            console.log(`✅ File processed: ${fileId}`);
        });
        return worker;
    } catch (err) {
        console.warn('File processor error:', err);
        return null;
    }
}
