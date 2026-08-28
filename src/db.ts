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
    tx.objectStore(STORE).clear();
    entries.forEach(entry => tx.objectStore(STORE).put(entry));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
