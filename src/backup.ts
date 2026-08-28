import type { EntryStatus, Settings, TimeEntry } from './types';

export interface Backup {
  version: 1;
  entries: TimeEntry[];
  settings?: Settings;
}

const statuses: readonly EntryStatus[] = ['review', 'approved', 'invoiced', 'written_off'];
const roundingValues: readonly Settings['rounding'][] = [0, 6, 15, 30];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(item => typeof item === 'string');
}

function isEntry(value: unknown): value is TimeEntry {
  if (!isRecord(value)) return false;
  const status = value.status as EntryStatus;
  const outcomeIsComplete =
    (status !== 'invoiced' || (typeof value.invoiceRef === 'string' && value.invoiceRef.trim().length > 0)) &&
    (status !== 'written_off' || (typeof value.resolutionNote === 'string' && value.resolutionNote.trim().length > 0));
  return typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.batchId === 'string' && typeof value.importedAt === 'string' && !Number.isNaN(Date.parse(value.importedAt)) &&
    isDate(value.date) && typeof value.client === 'string' && typeof value.project === 'string' &&
    typeof value.description === 'string' && typeof value.minutes === 'number' && Number.isInteger(value.minutes) && value.minutes > 0 &&
    typeof value.roundedMinutes === 'number' && Number.isInteger(value.roundedMinutes) && value.roundedMinutes > 0 && typeof value.billable === 'boolean' &&
    (value.roundingIncrement === undefined || (typeof value.roundingIncrement === 'number' && roundingValues.includes(value.roundingIncrement as Settings['rounding']))) &&
    typeof value.status === 'string' && statuses.includes(status) && outcomeIsComplete &&
    (value.billable || status === 'written_off') && typeof value.invoiceRef === 'string' && typeof value.resolutionNote === 'string' && isStringMap(value.original);
}

function isSettings(value: unknown): value is Settings {
  return isRecord(value) && typeof value.rounding === 'number' && roundingValues.includes(value.rounding as Settings['rounding']) &&
    typeof value.staleDays === 'number' && Number.isInteger(value.staleDays) && value.staleDays >= 1 && value.staleDays <= 365;
}

/**
 * Accept only a complete, serializable backup before any write transaction is
 * opened. This boundary protects the existing local ledger from malformed
 * user-selected files.
 */
export function parseBackup(text: string): Backup {
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    throw new Error('That is not a valid Billable Review backup.');
  }
  if (!isRecord(candidate) || candidate.version !== 1 || !Array.isArray(candidate.entries) ||
    !candidate.entries.every(isEntry) || new Set(candidate.entries.map(entry => entry.id)).size !== candidate.entries.length ||
    ('settings' in candidate && !isSettings(candidate.settings))) {
    throw new Error('That is not a valid Billable Review backup.');
  }
  return candidate as unknown as Backup;
}
