import { describe, expect, it } from 'vitest';
import { csvEscape, importCsv, parseCsv, parseDuration, roundMinutes, spreadsheetSafe } from '../src/csv';

describe('CSV parser', () => {
  it('parses quoted commas and escaped quotes', () => {
    expect(parseCsv('Date,Description\n2026-08-01,"Call, then ""notes"""')).toEqual([
      ['Date', 'Description'],
      ['2026-08-01', 'Call, then "notes"']
    ]);
  });

  it('recognizes Toggl-style columns and preserves source values', () => {
    const csv = 'Start date,Client,Project,Description,Duration,Billable\n2026-07-01,Northstar,Website,"Planning, kickoff",01:30:00,Yes';
    const result = importCsv(csv, 'toggl.csv', new Date('2026-08-28T00:00:00Z'));
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ client: 'Northstar', project: 'Website', minutes: 90, billable: true });
    expect(result.entries[0].original.Description).toBe('Planning, kickoff');
  });

  it('recognizes decimal hours and skips unusable rows', () => {
    const csv = 'Date,Customer,Task,Hours\n2026-08-01,Acme,Design,1.25\nbad,Acme,Admin,0';
    const result = importCsv(csv);
    expect(result.entries[0].minutes).toBe(75);
    expect(result.skipped).toBe(1);
  });

  it('rejects impossible ISO calendar dates with CSV row guidance', () => {
    const csv = 'Date,Client,Project,Hours\n2026-02-30,Acme,Site,1\n2026-99-99,Acme,Site,1';
    expect(() => importCsv(csv)).toThrow('Check dates on CSV rows 2 and 3');
  });

  it('keeps a valid leap-day row while skipping an impossible date', () => {
    const csv = 'Date,Client,Project,Hours\n2024-02-29,Acme,Site,1\n2026-02-29,Acme,Site,1';
    const result = importCsv(csv);
    expect(result.entries.map(entry => entry.date)).toEqual(['2024-02-29']);
    expect(result.warnings).toContain('CSV row 3 was skipped because the date is not a real calendar date.');
  });

  it('keeps non-billable source rows out of the open ledger', () => {
    const result = importCsv('Date,Hours,Billable\n2026-08-01,1,No');
    expect(result.entries[0]).toMatchObject({ billable: false, status: 'written_off', resolutionNote: 'Marked non-billable in source CSV' });
  });

  it('explains missing required columns', () => {
    expect(() => importCsv('Client,Notes\nAcme,Work')).toThrow(/date and duration/);
  });
});

describe('review math and export', () => {
  it('rounds upward explicitly', () => {
    expect(roundMinutes(61, 15)).toBe(75);
    expect(roundMinutes(61, 0)).toBe(61);
  });

  it('normalizes duration forms', () => {
    expect(parseDuration('01:30:30')).toBe(91);
    expect(parseDuration('1.5', 'Duration (h)')).toBe(90);
    expect(parseDuration('3600', 'Duration seconds')).toBe(60);
  });

  it('escapes exported values safely', () => {
    expect(csvEscape('Planning, "round 2"')).toBe('"Planning, ""round 2"""');
  });

  it('neutralizes every spreadsheet formula prefix without changing ordinary text', () => {
    expect(['=2+2', ' +CMD', '-1+2', '@SUM(1+1)', '\tDDE', '\rDDE'].map(spreadsheetSafe)).toEqual([
      "'=2+2", "' +CMD", "'-1+2", "'@SUM(1+1)", "'\tDDE", "'\rDDE"
    ]);
    expect(spreadsheetSafe('Planning, round 2')).toBe('Planning, round 2');
  });
});
