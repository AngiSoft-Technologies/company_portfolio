import app from './app';
import { validateDatabaseConnection, disconnectDatabase } from './db';
import { initRealtime, closeRealtime } from './shared/services/realtime';
import { getAllowedOrigins } from './shared/config/origins';
import { loadRuntimeConfig } from './shared/services/runtimeConfig';
import { startEmailWorker } from './workers/emailWorker';
import { startFileProcessor } from './workers/fileProcessor';
import { startReconciliationWorker } from './workers/reconciliationWorker';
import { startProviderEventsWorker } from './workers/providerEventsWorker';
import { startMpesaStkRecoveryWorker } from './workers/mpesaStkRecovery';
import { startCommunicationsMailSync } from './workers/communicationsMailSync';
import { startCommunicationsScheduledSends } from './workers/communicationsScheduledSends';
import { startCommunicationsSlaMonitor } from './workers/communicationsSla';
import { startCommunicationsTokenRefresh } from './workers/communicationsTokenRefresh';
import { startCommunicationsWebhookRetry } from './workers/communicationsWebhookRetry';
import { startSlaMonitor } from './workers/slaMonitor';
import { startRenewalMonitor } from './workers/renewalMonitor';
import { startAttendanceDeriveMonitor } from './workers/attendanceDerive';
import { startAgentScheduler } from './workers/agentScheduler';
import { stopAgentRuntime } from './workers/agentRuntime';
import { closeWorkers } from './queue';

const PORT = Number.parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  // Validate database connection before accepting traffic
  const dbOk = await validateDatabaseConnection();
  if (!dbOk) {
    console.error('🚫 Cannot start server: database is unreachable');
    process.exit(1);
  }

  await loadRuntimeConfig(true);
  setInterval(() => void loadRuntimeConfig(true).catch(() => undefined), 30_000).unref();

  const server = app.listen(PORT, HOST, () =>
    console.log(`🚀 Server running on http://${HOST}:${PORT}`)
  );

  // Realtime (Socket.IO) on the same HTTP server.
  try { initRealtime(server, getAllowedOrigins()); console.log('📡 Realtime (Socket.IO) initialized'); }
  catch (err: any) { console.warn('⚠️ Realtime:', err.message); }

  // Start background workers (using in-memory queue). Interval monitors return
  // their timers so shutdown can stop them before the DB pool closes.
  const monitorTimers: (NodeJS.Timeout | null)[] = [];
  try { monitorTimers.push(startSlaMonitor()); console.log('✅ SLA monitor started'); } catch (err: any) { console.warn('⚠️ SLA monitor:', err.message); }
  try { monitorTimers.push(startRenewalMonitor()); console.log('✅ Renewal monitor started'); } catch (err: any) { console.warn('⚠️ Renewal monitor:', err.message); }
  try { monitorTimers.push(startAttendanceDeriveMonitor()); console.log('✅ Attendance derive monitor started'); } catch (err: any) { console.warn('⚠️ Attendance derive monitor:', err.message); }
  try { startEmailWorker(); console.log('✅ Email worker started'); } catch (err: any) { console.warn('⚠️ Email worker:', err.message); }
  try { startFileProcessor(); console.log('✅ File processor started'); } catch (err: any) { console.warn('⚠️ File processor:', err.message); }
  try { startReconciliationWorker(); console.log('✅ Reconciliation worker started'); } catch (err: any) { console.warn('⚠️ Reconciliation worker:', err.message); }
  try { startProviderEventsWorker(); console.log('✅ Provider events worker started'); } catch (err: any) { console.warn('⚠️ Provider events worker:', err.message); }
  try { startMpesaStkRecoveryWorker(); console.log('✅ M-Pesa STK recovery worker started'); } catch (err: any) { console.warn('⚠️ M-Pesa STK recovery worker:', err.message); }
  try { monitorTimers.push(startCommunicationsMailSync()); console.log('✅ Communications mail sync started'); } catch (err: any) { console.warn('⚠️ Communications mail sync:', err.message); }
  try { monitorTimers.push(startCommunicationsScheduledSends()); console.log('✅ Communications scheduled sends started'); } catch (err: any) { console.warn('⚠️ Communications scheduled sends:', err.message); }
  try { monitorTimers.push(startCommunicationsSlaMonitor()); console.log('✅ Communications SLA monitor started'); } catch (err: any) { console.warn('⚠️ Communications SLA:', err.message); }
  try { monitorTimers.push(startCommunicationsTokenRefresh()); console.log('✅ Communications token refresh started'); } catch (err: any) { console.warn('⚠️ Communications token refresh:', err.message); }
  try { monitorTimers.push(startCommunicationsWebhookRetry()); console.log('✅ Communications webhook retry started'); } catch (err: any) { console.warn('⚠️ Communications webhook retry:', err.message); }
  try { startAgentScheduler(); console.log('✅ Agent scheduler started'); } catch (err: any) { console.warn('⚠️ Agent scheduler:', err.message); }

  // Graceful shutdown on SIGTERM / SIGINT
  const shutdown = async (signal: string) => {
    console.log(`\n📦 ${signal} received — shutting down gracefully…`);
    server.close(async () => {
      // Stop pollers/monitors BEFORE closing the pool — otherwise in-flight
      // cycles reject with "Postgres client is closed" during shutdown.
      await stopAgentRuntime().catch(() => undefined);
      for (const t of monitorTimers) if (t) clearInterval(t);
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
