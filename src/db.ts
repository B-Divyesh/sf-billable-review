import type { TimeEntry } from './types';

const DB_NAME = 'billable-review';
const STORE = 'entries';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getEntries(): Promise<TimeEntry[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as TimeEntry[]);
    request.onerror = () => reject(request.error);
  });
}

export async function putEntries(entries: TimeEntry[]): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    entries.forEach(entry => tx.objectStore(STORE).put(entry));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function replaceEntries(entries: TimeEntry[]): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const fail = () => {
      // A failed request must abort the transaction so the preceding clear is
      // rolled back. IndexedDB transactions are atomic once explicitly
      // aborted, including quota and key-path failures.
      try { tx.abort(); } catch { /* The browser has already aborted it. */ }
    };
    const clear = tx.objectStore(STORE).clear();
    clear.onerror = fail;
    entries.forEach(entry => {
      const request = tx.objectStore(STORE).put(entry);
      request.onerror = fail;
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not replace local entries.'));
    tx.onabort = () => reject(tx.error || new Error('Could not replace local entries.'));
  });
}
