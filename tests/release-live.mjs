import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = (process.env.RELEASE_URL || 'https://billable-review.sociobot.in').replace(/\/$/, '');
const expectedCommit = process.env.EXPECTED_COMMIT;
assert.match(expectedCommit || '', /^[0-9a-f]{40}$/, 'Set EXPECTED_COMMIT to the final candidate SHA.');

const identityResponse = await fetch(`${baseUrl}/build.json`, { cache: 'no-store' });
assert.equal(identityResponse.status, 200);
const identity = await identityResponse.json();
assert.equal(identity.product, 'billable-review');
assert.equal(identity.commit, expectedCommit);
assert.equal(identity.dirty, false);

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', error => browserErrors.push(error.message));

  await page.route('https://api.sociobot.in/api/v1/products/billable-review/verify?license=release-fixture-valid', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) })
  );
  await page.goto(`${baseUrl}/?license=release-fixture-valid`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Lifetime unlocked' }).waitFor();
  assert.equal(new URL(page.url()).searchParams.has('license'), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('sb_license:billable-review')), 'release-fixture-valid');
  assert.equal(await page.locator('[data-build-commit]').textContent(), expectedCommit.slice(0, 7));
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('img:not([alt])').count(), 0);
  assert.equal(await page.locator('body').evaluate(element => element.scrollWidth === element.clientWidth), true);
  const axe = await new AxeBuilder({ page }).analyze();
  assert.equal(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).length, 0);
  assert.deepEqual(browserErrors, []);
  await context.close();
} finally {
  await browser.close();
}

const invalidToken = `billable-review-final-${expectedCommit.slice(0, 12)}-invalid`;
const verification = await fetch(`https://api.sociobot.in/api/v1/products/billable-review/verify?license=${invalidToken}`, {
  headers: { Origin: baseUrl }
});
if (verification.status === 429) {
  const retryAfter = Number(verification.headers.get('retry-after'));
  assert.ok(Number.isFinite(retryAfter) && retryAfter > 0, 'A saturated 429 must include a positive Retry-After value.');
} else {
  assert.equal(verification.status, 200);
  assert.equal(verification.headers.get('cache-control'), 'no-store');
  assert.equal(verification.headers.get('access-control-allow-origin'), baseUrl);
  assert.deepEqual(await verification.json(), { expires_at: null, reason: 'invalid', valid: false });
}

process.stdout.write(`Live release passed for ${identity.commit}: mobile return-token verification, identity, accessibility, and the real 200-or-429 response policy.\n`);
