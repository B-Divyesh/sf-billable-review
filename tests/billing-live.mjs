import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const checkoutUrl = 'https://api.sociobot.in/api/v1/products/billable-review/checkout';
const productUrl = 'https://billable-review.sociobot.in';

const checkout = await fetch(checkoutUrl, { method: 'HEAD', redirect: 'manual' });
assert.notEqual(checkout.status, 404, 'Registered checkout must not return 404.');
assert.equal(checkout.status, 303, `Expected checkout HTTP 303, received ${checkout.status}.`);
const checkoutLocation = checkout.headers.get('location');
assert.ok(checkoutLocation, 'Checkout redirect must include Location.');
assert.equal(new URL(checkoutLocation).hostname, 'checkout.dodopayments.com');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(productUrl, { waitUntil: 'networkidle' });
  const saturation = await page.evaluate(async () => {
    let successfulRequests = 0;
    for (let request = 1; request <= 40; request += 1) {
      const token = `billable-review-browser-policy-${Date.now()}-${request}`;
      const response = await fetch(`https://api.sociobot.in/api/v1/products/billable-review/verify?license=${encodeURIComponent(token)}`);
      if (response.status === 429) {
        return { status: response.status, successfulRequests, retryAfter: response.headers.get('retry-after') };
      }
      if (response.status !== 200) return { status: response.status, successfulRequests, retryAfter: null };
      const result = await response.json();
      if (result.valid !== false || result.reason !== 'invalid') return { status: -1, successfulRequests, retryAfter: null };
      successfulRequests += 1;
    }
    return { status: 0, successfulRequests, retryAfter: null };
  });

  assert.equal(saturation.status, 429, `Expected a browser-origin 429 within 40 requests, received ${saturation.status}.`);
  const retryAfter = Number(saturation.retryAfter);
  assert.ok(
    Number.isFinite(retryAfter) && retryAfter > 0,
    `The browser saw 429 after ${saturation.successfulRequests} successful requests but could not read a positive Retry-After value.`
  );
  process.stdout.write(`Live billing passed: checkout 303 to Dodo; ${saturation.successfulRequests} browser requests preceded a readable Retry-After ${retryAfter}.\n`);
} finally {
  await browser.close();
}
