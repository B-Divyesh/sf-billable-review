import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const csv = `Start date,Client,Project,Description,Duration,Billable
2026-06-01,Acme Studio,Annual report,Layout review,01:15:00,Yes
2026-08-20,,Annual report,Client call,00:30:00,Yes`;

test('imports, resolves, persists and exports time rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the hours');
  await page.locator('[data-import]').setInputFiles({ name: 'clockify.csv', mimeType: 'text/csv', buffer: new TextEncoder().encode(csv) });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('destination');
  await expect(page.getByText('Acme Studio').first()).toBeVisible();
  await expect(page.getByText('Needs category').first()).toBeVisible();
  await page.getByRole('button', { name: /Review Layout review/ }).click();
  await page.getByLabel('Client').fill('Acme Studio');
  await page.getByLabel('Project').fill('Annual report');
  await page.getByLabel('Up to 15 minutes').check().catch(() => {});
  await page.getByRole('button', { name: 'Save outcome' }).click();
  await expect(page.getByText('Approved').first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export approved CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/billable-review.*\.csv/);
  await page.reload();
  await expect(page.getByText('Layout review')).toBeVisible();
});

test('has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
});

test('loads its saved shell while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
