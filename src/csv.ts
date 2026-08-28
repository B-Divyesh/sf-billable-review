import type { ImportResult, TimeEntry } from './types';

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

const aliases = {
  date: ['date', 'start date', 'start_date', 'started at', 'start'],
  client: ['client', 'client name', 'customer', 'customer name'],
  project: ['project', 'project name', 'task', 'task name'],
  description: ['description', 'notes', 'note', 'activity'],
  duration: ['duration', 'duration (h)', 'duration (decimal)', 'hours', 'time', 'duration seconds'],
  billable: ['billable', 'is billable', 'billing']
};

function findColumn(headers: string[], names: string[]): number {
  const normal = headers.map(header => header.toLowerCase().trim().replace(/^\ufeff/, ''));
  return normal.findIndex(header => names.includes(header));
}

export function parseDuration(value: string, header = ''): number {
  const clean = value.trim();
  if (!clean) return 0;
  if (clean.includes(':')) {
    const parts = clean.split(':').map(Number);
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
    return Math.round(parts[0] * 60 + parts[1]);
  }
  const numeric = Number(clean.replace(',', '.'));
  if (!Number.isFinite(numeric)) return 0;
  if (/second/i.test(header)) return Math.round(numeric / 60);
  if (/minute/i.test(header)) return Math.round(numeric);
  return Math.round(numeric * 60);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function normalizedDate(value: string): string {
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return isCalendarDate(iso[1]) ? iso[1] : '';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString().slice(0, 10);
}

function rowList(rows: number[]): string {
  return rows.length === 1 ? String(rows[0]) : `${rows.slice(0, -1).join(', ')} and ${rows.at(-1)}`;
}

function isBillable(value: string): boolean {
  return !['false', 'no', '0', 'non-billable', 'nonbillable'].includes(value.trim().toLowerCase());
}

export function importCsv(text: string, fileName = 'time-export.csv', now = new Date()): ImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('This CSV has no time rows. Export a report with a header row and try again.');
  const headers = rows[0].map(value => value.replace(/^\ufeff/, '').trim());
  const indexes = {
    date: findColumn(headers, aliases.date),
    client: findColumn(headers, aliases.client),
    project: findColumn(headers, aliases.project),
    description: findColumn(headers, aliases.description),
    duration: findColumn(headers, aliases.duration),
    billable: findColumn(headers, aliases.billable)
  };
  if (indexes.date < 0 || indexes.duration < 0) {
    const missing = [indexes.date < 0 ? 'date' : '', indexes.duration < 0 ? 'duration/hours' : ''].filter(Boolean).join(' and ');
    throw new Error(`Couldn’t find a ${missing} column. Rename those CSV headers and try again.`);
  }
  const batchId = `${now.valueOf()}-${fileName.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}`;
  let skipped = 0;
  const invalidDateRows: number[] = [];
  const invalidDurationRows: number[] = [];
  const entries: TimeEntry[] = [];
  rows.slice(1).forEach((values, index) => {
    const date = normalizedDate(values[indexes.date] || '');
    const minutes = parseDuration(values[indexes.duration] || '', headers[indexes.duration]);
    if (!date || minutes <= 0) {
      skipped += 1;
      if (!date) invalidDateRows.push(index + 2);
      if (minutes <= 0) invalidDurationRows.push(index + 2);
      return;
    }
    const original = Object.fromEntries(headers.map((header, column) => [header, values[column] || '']));
    const billable = indexes.billable < 0 || isBillable(values[indexes.billable] || '');
    entries.push({
      id: `${batchId}-${index + 1}`,
      batchId,
      importedAt: now.toISOString(),
      date,
      client: indexes.client >= 0 ? values[indexes.client] || '' : '',
      project: indexes.project >= 0 ? values[indexes.project] || '' : '',
      description: indexes.description >= 0 ? values[indexes.description] || '' : '',
      minutes,
      roundedMinutes: minutes,
      roundingIncrement: 0,
      billable,
      status: billable ? 'review' : 'written_off',
      invoiceRef: '',
      resolutionNote: billable ? '' : 'Marked non-billable in source CSV',
      original
    });
  });
  if (!entries.length) {
    const details = [
      invalidDateRows.length ? `dates on CSV ${invalidDateRows.length === 1 ? 'row' : 'rows'} ${rowList(invalidDateRows)}` : '',
      invalidDurationRows.length ? `durations on CSV ${invalidDurationRows.length === 1 ? 'row' : 'rows'} ${rowList(invalidDurationRows)}` : ''
    ].filter(Boolean).join(' and ');
    throw new Error(`No valid time rows were found. Check ${details || 'that dates and durations are filled in'} and try again.`);
  }
  const warnings: string[] = [];
  if (indexes.client < 0) warnings.push('No client column was found; entries need client review.');
  if (indexes.project < 0) warnings.push('No project column was found; entries need project review.');
  if (invalidDateRows.length) warnings.push(`CSV ${invalidDateRows.length === 1 ? 'row' : 'rows'} ${rowList(invalidDateRows)} ${invalidDateRows.length === 1 ? 'was' : 'were'} skipped because the ${invalidDateRows.length === 1 ? 'date is not a real calendar date' : 'dates are not real calendar dates'}.`);
  if (invalidDurationRows.length) warnings.push(`CSV ${invalidDurationRows.length === 1 ? 'row' : 'rows'} ${rowList(invalidDurationRows)} ${invalidDurationRows.length === 1 ? 'has' : 'have'} an empty or zero duration.`);
  return { entries, headers, skipped, warnings };
}

export function roundMinutes(minutes: number, increment: number): number {
  return increment ? Math.ceil(minutes / increment) * increment : minutes;
}

export function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Keep a derived accounting CSV from interpreting user-authored text as a
 * spreadsheet formula. The apostrophe is intentionally added only at export;
 * imported source values and JSON backups remain byte-for-byte unchanged.
 */
export function spreadsheetSafe(value: unknown): string {
  const text = String(value ?? '');
  return /^[\t\r]|^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}
