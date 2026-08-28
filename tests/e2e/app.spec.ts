import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function tabTo(page: import('@playwright/test').Page, target: import('@playwright/test').Locator): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(element => element === document.activeElement)) return;
  }
  throw new Error('Expected control was not reachable with Tab.');
}

test('imports, resolves, persists and exports time rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the hours');
  await page.locator('[data-import]').setInputFiles('tests/fixtures/clockify.csv');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('destination');
  await expect(page.getByText('Acme Studio').first()).toBeVisible();
  await expect(page.getByText('Needs category').first()).toBeVisible();
  await page.getByRole('button', { name: /Review Layout review/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Client', exact: true }).fill('Acme Studio');
  await dialog.getByRole('textbox', { name: 'Project', exact: true }).fill('Annual report');
  await dialog.getByLabel('Rounding').selectOption('15');
  await dialog.getByRole('button', { name: 'Save outcome' }).click();
  await expect(page.getByText('Approved').first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export approved CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/billable-review.*\.csv/);
  await page.reload();
  await expect(page.getByText('Layout review', { exact: true })).toBeVisible();
});

test('has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const emptyResults = await new AxeBuilder({ page: page as never }).analyze();
  expect(emptyResults.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await page.getByLabel('Choose a time CSV').setInputFiles('tests/fixtures/clockify.csv');
  const boardResults = await new AxeBuilder({ page: page as never }).analyze();
  expect(boardResults.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
});

test('makes no third-party requests in the local review workflow', async ({ page }) => {
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

test('groups review rows by client, project, and date', async ({ page }) => {
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

test('loads its saved shell while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
