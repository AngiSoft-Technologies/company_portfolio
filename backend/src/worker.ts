// Dedicated background-worker entrypoint for deployment platforms that run
// queue workers as a separate process group (e.g. Fly.io's `worker` group).
//
//   web    → node dist/index.js      (HTTP + realtime + workers)
//   worker → node dist/worker.js     (workers only; no HTTP listener)
//
// Sharing one image between both groups is fine — BullMQ workers with the same
// Redis queue simply split the workload, so running work in both places only
// adds consumers, never duplicate processing of the same job.

import { validateDatabaseConnection, disconnectDatabase } from './db';
import { startEmailWorker } from './workers/emailWorker';
import { startFileProcessor } from './workers/fileProcessor';
import { startReconciliationWorker } from './workers/reconciliationWorker';
import { closeWorkers, getWorkers } from './queue';

async function bootstrap() {
  const dbOk = await validateDatabaseConnection();
  if (!dbOk) {
    console.error('🚫 Cannot start worker: database is unreachable');
    process.exit(1);
  }

  for (const [label, start] of [
    ['email', startEmailWorker],
    ['file processor', startFileProcessor],
    ['reconciliation', startReconciliationWorker],
  ] as const) {
    try {
      start();
      console.log(`✅ ${label} worker started`);
    } catch (err: any) {
      console.warn(`⚠️ ${label} worker:`, err.message);
    }
  }

  console.log('👤 Worker only — no HTTP listener. Active groups:', getWorkers());

  // Keep the process alive; BullMQ workers hold their own Redis connections.
  const keepAlive = setInterval(() => {}, 2 ** 31 - 1);

  const shutdown = async (signal: string) => {
    console.log(`\n📦 ${signal} received — shutting down workers gracefully…`);
    clearInterval(keepAlive);
    await closeWorkers();
    await disconnectDatabase();
    console.log('👋 Worker stopped');
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('💥 Worker bootstrap failed:', err);
  process.exit(1);
});