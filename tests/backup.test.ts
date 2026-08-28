import { describe, expect, it } from 'vitest';
import { parseBackup } from '../src/backup';

const validEntry = {
  id: 'entry-1', batchId: 'batch-1', importedAt: '2026-08-28T00:00:00.000Z', date: '2026-08-01',
  client: 'Acme', project: 'Website', description: 'Planning', minutes: 60, roundedMinutes: 60,
  billable: true, status: 'review', invoiceRef: '', resolutionNote: '', original: { Date: '2026-08-01' }
};

describe('backup validation', () => {
  it('accepts a complete version-one backup', () => {
    expect(parseBackup(JSON.stringify({ version: 1, entries: [validEntry] }))).toMatchObject({ version: 1, entries: [validEntry] });
  });

  it('accepts saved settings and a row-specific rounding increment', () => {
    const backup = { version: 1, entries: [{ ...validEntry, roundingIncrement: 15 }], settings: { rounding: 30, staleDays: 1 } };
    expect(parseBackup(JSON.stringify(backup))).toMatchObject(backup);
  });

  it('rejects an incomplete entry before any storage replacement can begin', () => {
    expect(() => parseBackup('{"version":1,"entries":[{}]}')).toThrow('That is not a valid Billable Review backup.');
  });

  it('rejects duplicate entry keys that IndexedDB could not safely restore', () => {
    expect(() => parseBackup(JSON.stringify({ version: 1, entries: [validEntry, validEntry] }))).toThrow('That is not a valid Billable Review backup.');
  });
});
