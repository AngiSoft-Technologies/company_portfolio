/**
 * Register the service worker for PWA/offline support.
 * Worker lives at /sw.js in each app's public dir and is served relative to
 * the app origin.
 */
export function registerServiceWorker(path = '/sw.js'): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(path).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export const OFFLINE_QUEUE_NAME = 'angisoft-sync-queue';

/**
 * Minimal IndexedDB-backed sync queue. Push() stores an operation so it can be
 * replayed when connectivity returns. Used by the offline-first sync engine.
 */
export class SyncQueue {
  private dbName = 'angisoft-sync';
  private store = 'queue';

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.store)) {
          db.createObjectStore(this.store, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async push(op: { url: string; method: string; body?: unknown }): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readwrite');
      tx.objectStore(this.store).add(op);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async drain(): Promise<unknown[]> {
    if (typeof indexedDB === 'undefined') return [];
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readonly');
      const req = tx.objectStore(this.store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export default registerServiceWorker;