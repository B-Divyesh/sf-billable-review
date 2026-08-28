export type EntryStatus = 'review' | 'approved' | 'invoiced' | 'written_off';

export interface TimeEntry {
  id: string;
  batchId: string;
  importedAt: string;
  date: string;
  client: string;
  project: string;
  description: string;
  minutes: number;
  roundedMinutes: number;
  roundingIncrement?: Settings['rounding'];
  billable: boolean;
  status: EntryStatus;
  invoiceRef: string;
  resolutionNote: string;
  original: Record<string, string>;
}

export interface ImportResult {
  entries: TimeEntry[];
  headers: string[];
  skipped: number;
  warnings: string[];
}

export interface Settings {
  rounding: 0 | 6 | 15 | 30;
  staleDays: number;
}

export interface LicenseState {
  token: string;
  valid: boolean;
  checkedAt: number;
}
