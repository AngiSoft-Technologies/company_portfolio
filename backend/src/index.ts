import app from './app';
import { startEmailWorker } from './workers/emailWorker';
import { startFileProcessor } from './workers/fileProcessor';
import { startReconciliationWorker } from './workers/reconciliationWorker';

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Start background workers (using in-memory queue)
try { startEmailWorker(); console.log('✅ Email worker started'); } catch (err: any) { console.warn('⚠️ Email worker:', err.message); }
try { startFileProcessor(); console.log('✅ File processor started'); } catch (err: any) { console.warn('⚠️ File processor:', err.message); }
try { startReconciliationWorker(); console.log('✅ Reconciliation worker started'); } catch (err: any) { console.warn('⚠️ Reconciliation worker:', err.message); }
