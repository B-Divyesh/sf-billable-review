import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
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
