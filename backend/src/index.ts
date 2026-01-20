import app from './app';
import { startEmailWorker } from './workers/emailWorker';
import { startFileProcessor } from './workers/fileProcessor';
import { startReconciliationWorker } from './workers/reconciliationWorker';

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// start background workers
try { startEmailWorker(); } catch (err) { console.warn('Email worker not started', err); }
try { startFileProcessor(); } catch (err) { console.warn('File processor not started', err); }
try { startReconciliationWorker(); } catch (err) { console.warn('Reconciliation worker not started', err); }
