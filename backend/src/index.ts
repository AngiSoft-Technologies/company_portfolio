import app from './app';
import { validateDatabaseConnection, disconnectDatabase } from './db';
import { initRealtime, closeRealtime } from './services/realtime';
import { getAllowedOrigins } from './config/origins';
import { startEmailWorker } from './workers/emailWorker';
import { startFileProcessor } from './workers/fileProcessor';
import { startReconciliationWorker } from './workers/reconciliationWorker';
import { closeWorkers } from './queue';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // Validate database connection before accepting traffic
  const dbOk = await validateDatabaseConnection();
  if (!dbOk) {
    console.error('🚫 Cannot start server: database is unreachable');
    process.exit(1);
  }

  const server = app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );

  // Realtime (Socket.IO) on the same HTTP server.
  try { initRealtime(server, getAllowedOrigins()); console.log('📡 Realtime (Socket.IO) initialized'); }
  catch (err: any) { console.warn('⚠️ Realtime:', err.message); }

  // Start background workers (using in-memory queue)
  try { startEmailWorker(); console.log('✅ Email worker started'); } catch (err: any) { console.warn('⚠️ Email worker:', err.message); }
  try { startFileProcessor(); console.log('✅ File processor started'); } catch (err: any) { console.warn('⚠️ File processor:', err.message); }
  try { startReconciliationWorker(); console.log('✅ Reconciliation worker started'); } catch (err: any) { console.warn('⚠️ Reconciliation worker:', err.message); }

  // Graceful shutdown on SIGTERM / SIGINT
  const shutdown = async (signal: string) => {
    console.log(`\n📦 ${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await closeWorkers();
      closeRealtime();
      await disconnectDatabase();
      console.log('👋 Server stopped');
      process.exit(0);
    });
    // Force exit after 10 s if graceful shutdown stalls
    setTimeout(() => {
      console.error('⏰ Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Redis (cache / queue / adapter) is an enhancement, not a hard dependency.
// A rejected provider command (e.g. MaxRetriesPerRequestError while Redis is
// down) must degrade the feature, never kill the machine — a crash here is
// what restart-looped the Fly machines. Log loudly so `fly logs` surfaces it.
process.on('unhandledRejection', (reason: any) => {
  console.error('⚠️ Unhandled rejection (process continuing):', reason?.stack || reason?.message || reason);
});

bootstrap().catch((err) => {
  console.error('💥 Bootstrap failed:', err);
  process.exit(1);
});
