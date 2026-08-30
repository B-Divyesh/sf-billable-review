import assert from 'node:assert/strict';

const checkoutUrl = 'https://api.sociobot.in/api/v1/products/billable-review/checkout';
const verifyUrl = token => `https://api.sociobot.in/api/v1/products/billable-review/verify?license=${encodeURIComponent(token)}`;

const checkout = await fetch(checkoutUrl, { method: 'HEAD', redirect: 'manual' });
assert.notEqual(checkout.status, 404, 'Registered checkout must not return 404.');
assert.equal(checkout.status, 303, `Expected checkout HTTP 303, received ${checkout.status}.`);
const checkoutLocation = checkout.headers.get('location');
assert.ok(checkoutLocation, 'Checkout redirect must include Location.');
assert.equal(new URL(checkoutLocation).hostname, 'checkout.dodopayments.com');

const verification = await fetch(verifyUrl(`billable-review-policy-${Date.now()}`));
assert.ok([200, 429].includes(verification.status), `Verification must return 200 or 429, received ${verification.status}.`);

if (verification.status === 200) {
  assert.deepEqual(await verification.json(), { expires_at: null, reason: 'invalid', valid: false });
  assert.equal(verification.headers.get('cache-control'), 'no-store');
  process.stdout.write('Live billing passed: checkout 303 to Dodo; a normal verification returned 200 with the invalid-token policy.\n');
} else {
  const retryAfter = Number(verification.headers.get('retry-after'));
  assert.ok(Number.isFinite(retryAfter) && retryAfter > 0, 'A saturated 429 must include a positive Retry-After value.');
  process.stdout.write(`Live billing passed: checkout 303 to Dodo; a saturated verification returned 429 with Retry-After ${retryAfter}.\n`);
}
