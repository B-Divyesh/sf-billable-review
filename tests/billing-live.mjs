import assert from 'node:assert/strict';

const checkoutUrl = 'https://api.sociobot.in/api/v1/products/billable-review/checkout';
const verifyUrl = token => `https://api.sociobot.in/api/v1/products/billable-review/verify?license=${encodeURIComponent(token)}`;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const checkout = await fetch(checkoutUrl, { method: 'HEAD', redirect: 'manual' });
assert.notEqual(checkout.status, 404, 'Registered checkout must not return 404.');
assert.equal(checkout.status, 303, `Expected checkout HTTP 303, received ${checkout.status}.`);
const checkoutLocation = checkout.headers.get('location');
assert.ok(checkoutLocation, 'Checkout redirect must include Location.');
assert.equal(new URL(checkoutLocation).hostname, 'checkout.dodopayments.com');

let first = await fetch(verifyUrl(`billable-review-allowance-${Date.now()}-1`));
if (first.status === 429) {
  const retryAfter = Number(first.headers.get('retry-after'));
  assert.ok(Number.isFinite(retryAfter) && retryAfter > 0, 'A 429 must include a positive Retry-After value.');
  await wait((retryAfter + 1) * 1000);
  first = await fetch(verifyUrl(`billable-review-allowance-${Date.now()}-restart`));
}

const responses = [first];
for (let request = 2; request <= 31; request += 1) {
  responses.push(await fetch(verifyUrl(`billable-review-allowance-${Date.now()}-${request}`)));
}

for (const [index, response] of responses.slice(0, 30).entries()) {
  assert.equal(response.status, 200, `Verification request ${index + 1} should be within the 30-request allowance.`);
}
const limited = responses[30];
assert.equal(limited.status, 429, 'Verification request 31 must be rate limited.');
assert.ok(Number(limited.headers.get('retry-after')) > 0, 'Rate-limited verification must include Retry-After.');

const firstBody = await responses[0].json();
assert.deepEqual(firstBody, { expires_at: null, reason: 'invalid', valid: false });
assert.equal(responses[0].headers.get('cache-control'), 'no-store');

process.stdout.write(`Live billing passed: checkout 303 to Dodo; verification requests 1–30 returned 200; request 31 returned 429 with Retry-After ${limited.headers.get('retry-after')}.\n`);
