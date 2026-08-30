import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function tabTo(page: import('@playwright/test').Page, target: import('@playwright/test').Locator): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(element => element === document.activeElement)) return;
  }
  throw new Error('Expected control was not reachable with Tab.');
}

test('@claim:csv-workflow imports, resolves, persists and exports time rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Review unbilled time');
  await page.locator('[data-import]').setInputFiles('tests/fixtures/clockify.csv');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Review unbilled time');
  await expect(page.getByText('Acme Studio').first()).toBeVisible();
  await expect(page.getByText('Needs category').first()).toBeVisible();
  await page.getByRole('button', { name: /Review Layout review/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Client', exact: true }).fill('Acme Studio');
  await dialog.getByRole('textbox', { name: 'Project', exact: true }).fill('Annual report');
  await dialog.getByLabel('Rounding').selectOption('30');
  await dialog.getByRole('button', { name: 'Save outcome' }).click();
  await expect(page.getByText('Approved').first()).toBeVisible();
  await expect(page.getByText('1.50 h', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('was 1.25 h', { exact: true }).first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export approved CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/billable-review.*\.csv/);
  await page.reload();
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();
});

test('has no automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  const emptyResults = await new AxeBuilder({ page: page as never }).analyze();
  expect(emptyResults.violations).toEqual([]);
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  const boardResults = await new AxeBuilder({ page: page as never }).analyze();
  expect(boardResults.violations).toEqual([]);
  await page.goto('/demo');
  const demoResults = await new AxeBuilder({ page: page as never }).analyze();
  expect(demoResults.violations).toEqual([]);
});

test('shows the immutable build identity emitted with the artifact', async ({ page }) => {
  await page.goto('/');
  const identity = await page.evaluate(async () => {
    const response = await fetch('/build.json');
    return response.json() as Promise<{ product: string; commit: string; dirty: boolean }>;
  });
  expect(identity.product).toBe('billable-review');
  expect(identity.commit).toMatch(/^[0-9a-f]{40}$/);
  await expect(page.locator('[data-build-commit]')).toHaveText(identity.commit.slice(0, 7));
});

test('@claim:lifetime-license verifies and unlocks a checkout-return license without a reload', async ({ page }) => {
  let verificationCalls = 0;
  await page.route('https://api.sociobot.in/api/v1/products/billable-review/verify?license=qa-valid-token', async route => {
    verificationCalls += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok' }) });
  });
  await page.goto('/?license=qa-valid-token');
  await expect(page.getByRole('button', { name: 'Lifetime unlocked' })).toBeVisible();
  await expect(page.getByText('US$19 once removes the import limit.')).toBeVisible();
  expect(verificationCalls).toBe(1);
  expect(new URL(page.url()).searchParams.has('license')).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('sb_license:billable-review'))).toBe('qa-valid-token');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Lifetime unlocked' })).toBeVisible();
  expect(verificationCalls).toBe(1);

  const rows = Array.from({ length: 151 }, (_, index) =>
    `2026-08-01,Acme,Licensed,Licensed row ${index + 1},1,true`
  );
  await page.getByLabel('Choose a time CSV').setInputFiles({
    name: 'licensed-import.csv', mimeType: 'text/csv',
    buffer: Buffer.from(['Date,Client,Project,Description,Hours,Billable', ...rows].join('\n'))
  });
  await expect(page.locator('.entry-row')).toHaveCount(151);
});

test('@claim:checkout-boundary keeps the import cap when checkout returns the former 404', async ({ page }) => {
  let checkoutChecks = 0;
  await page.route('https://api.sociobot.in/api/v1/products/billable-review/checkout', async route => {
    checkoutChecks += 1;
    await route.fulfill({
      status: 404,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ error: 'enabled factory product', status: 404 })
    });
  });
  await page.goto('/');
  const formerFailureStatus = await page.evaluate(async checkoutUrl =>
    (await fetch(checkoutUrl, { method: 'HEAD' })).status,
  'https://api.sociobot.in/api/v1/products/billable-review/checkout');
  expect(formerFailureStatus).toBe(404);
  await page.evaluate(() => sessionStorage.setItem('sb_license:billable-review:checkout', 'unavailable'));
  await expect(page.getByRole('link', { name: 'Buy lifetime — $19' })).toHaveAttribute(
    'href',
    'https://api.sociobot.in/api/v1/products/billable-review/checkout'
  );

  const rows = Array.from({ length: 151 }, (_, index) =>
    `2026-08-01,Acme,Boundary,Boundary row ${index + 1},1,true`
  );
  const csv = ['Date,Client,Project,Description,Hours,Billable', ...rows].join('\n');
  await page.getByLabel('Choose a time CSV').setInputFiles({
    name: 'checkout-boundary.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv)
  });

  await expect(page.getByRole('status')).toContainText('150 rows imported');
  await expect(page.getByRole('status')).toContainText('Unlock lifetime for the rest');
  await expect(page.locator('.entry-row')).toHaveCount(150);
  expect(checkoutChecks).toBe(1);
});

test('@claim:free-limit keeps the 150-row boundary', async ({ page }) => {
  await page.goto('/');
  const rows = Array.from({ length: 151 }, (_, index) =>
    `2026-08-01,Acme,Free tier,Free row ${index + 1},1,true`
  );
  await page.getByLabel('Choose a time CSV').setInputFiles({
    name: 'free-limit.csv', mimeType: 'text/csv',
    buffer: Buffer.from(['Date,Client,Project,Description,Hours,Billable', ...rows].join('\n'))
  });
  await expect(page.getByRole('status')).toContainText('150 rows imported');
  await expect(page.locator('.entry-row')).toHaveCount(150);

  await page.getByLabel('Import another CSV').setInputFiles({
    name: 'one-more.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Date,Hours,Description\n2026-08-02,1,One more row')
  });
  await expect(page.getByRole('dialog')).toContainText('free ledger holds 150 rows');
  await expect(page.locator('.entry-row')).toHaveCount(150);
});

test('@claim:demo-sandbox opens sample data without reading or replacing the real ledger', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('billable-review', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entry = {
        id: 'real-only', batchId: 'real', importedAt: '2026-08-30T00:00:00.000Z', date: '2026-08-29',
        client: 'Private client', project: 'Private project', description: 'Private ledger row', minutes: 60,
        roundedMinutes: 60, roundingIncrement: 0, billable: true, status: 'review', invoiceRef: '',
        resolutionNote: '', original: { Date: '2026-08-29' }
      };
      const tx = request.result.transaction('entries', 'readwrite');
      tx.objectStore('entries').put(entry);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    };
  }));

  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page).toHaveTitle('Demo — Billable Review');
  await expect(page.getByLabel('Demo workspace')).toContainText('Demo — sample data, nothing is saved');
  await expect(page.getByText('Client revisions', { exact: true })).toBeVisible();
  await expect(page.getByText('Private ledger row', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.getByText('Private ledger row', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Demo workspace')).toHaveCount(0);
});

test('reopens invoiced and written-off rows with their saved outcomes', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');

  await page.getByRole('button', { name: /Review Layout review/ }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Link invoice').check();
  await dialog.getByLabel(/Invoice reference or write-off reason/).fill('INV-42');
  await dialog.getByLabel('Rounding').selectOption('15');
  await dialog.getByRole('button', { name: 'Save outcome' }).click();

  await page.getByRole('button', { name: 'Reconciled' }).click();
  await page.getByRole('button', { name: /Review Layout review/ }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Link invoice')).toBeChecked();
  await expect(dialog.getByLabel(/Invoice reference or write-off reason/)).toHaveValue('INV-42');
  await expect(dialog.getByLabel('Rounding')).toHaveValue('15');
  await dialog.getByRole('button', { name: 'Save outcome' }).click();

  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('button', { name: /Review Client call/ }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Write off').check();
  await dialog.getByLabel(/Invoice reference or write-off reason/).fill('Outside scope');
  await dialog.getByLabel('Rounding').selectOption('30');
  await dialog.getByRole('button', { name: 'Save outcome' }).click();

  await page.getByRole('button', { name: 'Reconciled' }).click();
  await page.getByRole('button', { name: /Review Client call/ }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Write off')).toBeChecked();
  await expect(dialog.getByLabel(/Invoice reference or write-off reason/)).toHaveValue('Outside scope');
  await expect(dialog.getByLabel('Rounding')).toHaveValue('30');
  await dialog.getByRole('button', { name: 'Save outcome' }).click();

  const stored = await page.evaluate(async () => new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const request = indexedDB.open('billable-review');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const all = request.result.transaction('entries').objectStore('entries').getAll();
      all.onerror = () => reject(all.error);
      all.onsuccess = () => resolve(all.result);
    };
  }));
  expect(stored.find(entry => entry.description === 'Layout review')).toMatchObject({ status: 'invoiced', invoiceRef: 'INV-42', roundedMinutes: 75, roundingIncrement: 15 });
  expect(stored.find(entry => entry.description === 'Client call')).toMatchObject({ status: 'written_off', resolutionNote: 'Outside scope', roundedMinutes: 30, roundingIncrement: 30 });
});

test('rejects impossible dates before storage and invoice export', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/impossible-dates.csv');
  await expect(page.getByRole('status')).toContainText('CSV rows 2 and 3 were skipped because the dates are not real calendar dates.');
  await expect(page.locator('.entry-row')).toHaveCount(1);
  await expect(page.locator('time.group-date[datetime="2026-02-28"]')).toBeVisible();

  await page.getByRole('button', { name: /Review Valid day/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save outcome' }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export approved CSV' }).click();
  const download = await downloadEvent;
  const exportPath = await download.path();
  expect(exportPath).not.toBeNull();
  const exported = await readFile(exportPath!, 'utf8');
  expect(exported).toContain('2026-02-28');
  expect(exported).not.toContain('2026-02-30');
  expect(exported).not.toContain('2026-99-99');
});

test('@claim:source-preservation neutralizes spreadsheet formulas only in the derived invoice CSV', async ({ page }) => {
  await page.goto('/');
  const source = 'Date,Client,Project,Description,Hours\n2026-08-01,=2+2,@SUM(1+1),+CMD,1';
  await page.getByLabel('Choose a time CSV').setInputFiles({ name: 'formula-prefixes.csv', mimeType: 'text/csv', buffer: Buffer.from(source) });
  await page.getByRole('button', { name: /Review \+CMD/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save outcome' }).click();

  const invoiceDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export approved CSV' }).click();
  const invoicePath = await (await invoiceDownload).path();
  expect(invoicePath).not.toBeNull();
  const invoiceCsv = await readFile(invoicePath!, 'utf8');
  expect(invoiceCsv).toContain("2026-08-01,'=2+2,'@SUM(1+1),'+CMD,1.00,1.00,Approved,");
  expect(invoiceCsv).not.toContain('2026-08-01,=2+2,@SUM(1+1),+CMD');

  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON backup' }).click();
  const backupPath = await (await backupDownload).path();
  expect(backupPath).not.toBeNull();
  const backup = JSON.parse(await readFile(backupPath!, 'utf8')) as { entries: Array<{ client: string; project: string; description: string }> };
  expect(backup.entries[0]).toMatchObject({ client: '=2+2', project: '@SUM(1+1)', description: '+CMD' });
});

test('restores exported review settings with entry data', async ({ page }) => {
  await page.goto('/');
  const backup = {
    version: 1,
    entries: [{
      id: 'restored-1', batchId: 'backup-1', importedAt: '2026-08-28T00:00:00.000Z', date: '2026-08-01',
      client: 'Acme', project: 'Site', description: 'Restored work', minutes: 60, roundedMinutes: 60,
      roundingIncrement: 0, billable: true, status: 'review', invoiceRef: '', resolutionNote: '', original: { Date: '2026-08-01' }
    }],
    settings: { rounding: 30, staleDays: 1 }
  };
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  await page.getByLabel('Restore JSON backup').setInputFiles({ name: 'settings-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('status')).toContainText('1 row restored from backup.');
  await page.getByRole('button', { name: 'Rounding: 30 min up' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Default rounding')).toHaveValue('30');
  await expect(dialog.getByLabel('Flag entries stale after')).toHaveValue('1');
});

test('@claim:backup-roundtrip exports and restores the complete local ledger', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON backup' }).click();
  const backupPath = await (await backupDownload).path();
  expect(backupPath).not.toBeNull();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Erase local data' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Review unbilled time');

  await page.getByLabel('Choose a time CSV').setInputFiles({
    name: 'temporary.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Date,Hours,Description\n2026-08-01,1,Temporary row')
  });
  await page.getByLabel('Restore JSON backup').setInputFiles(backupPath!);
  await expect(page.getByRole('status')).toContainText('2 rows restored from backup');
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();
  await expect(page.getByText('Temporary row', { exact: true })).toHaveCount(0);
});

test('gives secondary actions and legal links full-size touch targets', async ({ page }) => {
  await page.goto('/');
  const footerBoxes = await page.locator('.footer-links a').evaluateAll(links => links.map(link => {
    const rect = link.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(footerBoxes).toHaveLength(3);
  for (const box of footerBoxes) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }

  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  await page.locator('[data-select]').first().check();
  const bulkBoxes = await page.locator('.bulk-bar button').evaluateAll(buttons => buttons.map(button => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(bulkBoxes).toHaveLength(2);
  for (const box of bulkBoxes) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole('button', { name: 'Get lifetime' }).click();
  const licenseLinkBoxes = await page.locator('.license-panel .legal-links a').evaluateAll(links => links.map(link => {
    const rect = link.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(licenseLinkBoxes).toHaveLength(2);
  for (const box of licenseLinkBoxes) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});

test('@claim:local-only makes no third-party requests in the local review workflow', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') outbound.push(request.url());
  });
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  expect(outbound).toEqual([]);
});

test('keeps existing rows when a malformed backup is rejected', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();

  await page.getByLabel('Restore JSON backup').setInputFiles('tests/fixtures/malformed-backup.json');
  await expect(page.getByRole('status')).toContainText('That is not a valid Billable Review backup.');
  await page.reload();
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();
});

test('rejects an invoiced backup row without a reference before replacing stored data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  const invalidBackup = {
    version: 1,
    entries: [{
      id: 'invalid-invoice', batchId: 'backup-1', importedAt: '2026-08-28T00:00:00.000Z', date: '2026-08-01',
      client: 'Acme', project: 'Site', description: 'Missing reference', minutes: 60, roundedMinutes: 60,
      roundingIncrement: 0, billable: true, status: 'invoiced', invoiceRef: '', resolutionNote: '', original: { Date: '2026-08-01' }
    }]
  };
  await page.getByLabel('Restore JSON backup').setInputFiles({ name: 'invalid-invoice.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalidBackup)) });
  await expect(page.getByRole('status')).toContainText('That is not a valid Billable Review backup.');
  await page.reload();
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();
  await expect(page.getByText('Missing reference', { exact: true })).toHaveCount(0);
});

test('@claim:date-groups groups review rows by client, project, and date', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/date-groups.csv');
  await expect(page.locator('.entry-group')).toHaveCount(3);
  await expect(page.locator('time.group-date[datetime="2026-07-01"]')).toBeVisible();
  await expect(page.locator('time.group-date[datetime="2026-08-26"]')).toHaveCount(2);
});

test('file imports and backup restore are reachable by keyboard', async ({ page }) => {
  await page.goto('/');
  const firstImport = page.getByLabel('Choose a time CSV');
  await tabTo(page, firstImport);
  await expect(firstImport).toBeFocused();
  const picker = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await (await picker).setFiles('tests/fixtures/clockify.csv');
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();

  const anotherImport = page.getByLabel('Import another CSV');
  const restore = page.getByLabel('Restore JSON backup');
  await tabTo(page, anotherImport);
  await expect(anotherImport).toBeFocused();
  await tabTo(page, restore);
  await expect(restore).toBeFocused();
});

test('@claim:offline-reload loads its saved shell and exports while offline', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Review Layout review/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save outcome' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export approved CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/billable-review.*\.csv/);
  await context.close();
});
