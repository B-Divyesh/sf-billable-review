# Billable Review — repair 5 handoff

## Status

Release blockers from verifier report commit `5660e726e528511bcd5cca123fd4295e05d337f9` are repaired. The implementation commit is `be16fb30174cf491682008398ed31acd0140a8b6`. Every behavior that the verifier passed remains covered.

The deployable artifact now publishes `/build.json` and shows its short commit in the footer. The final deployed candidate can therefore be checked against one immutable full SHA instead of an ambiguous work-order reference.

## Checkout failure reproduction and repair

The old behavior was reproduced before editing:

```text
npm run test:e2e -- --grep @claim:checkout-outage-recovery
2 passed
```

That regression supplied the verifier's exact `404 {"error":"enabled factory product","status":404}` response. The old app displayed “Imports are uncapped” and stored all 151 rows. This was the prohibited checkout-outage bypass.

At 01:58 UTC on 30 August 2026, the newly registered production endpoint returned:

```text
HEAD https://api.sociobot.in/api/v1/products/billable-review/checkout
HTTP/2 303
Location: https://checkout.dodopayments.com/session/cks_…
```

The response is no longer 404 and the redirect host is the Dodo Live checkout. The app now uses a plain link to this exact Sociobot URL. The checkout worker, availability cache, HEAD probe, outage copy, and limit-bypass branch were removed. An unverified browser always retains the 150-row limit, including after the exact former 404 and a stale `unavailable` session value. Existing rows and exports remain safe.

Regression: `@claim:checkout-boundary` reproduces the old 404, seeds the old cache state, checks the exact buy URL, and proves only 150 of 151 rows are stored. `@claim:free-limit` independently proves the boundary. `@claim:lifetime-license` proves a valid return token is stored, removed from the URL, verified without reload, checked only once across a reload, and permits 151 rows.

## Billing allowance and return contract

The billing contract is documented in [billing.md](billing.md). The app makes one verification request on a new checkout return or explicit restore and no more than one automatic request per verified token in 24 hours.

`npm run test:billing-live` checks the registered production service using unique invalid tokens and no purchase. On 30 August 2026 it proved:

- checkout returned HTTP 303 to `checkout.dodopayments.com`;
- verification requests 1–30 returned HTTP 200 and `Cache-Control: no-store`;
- request 31 returned HTTP 429 with `Retry-After: 4`;
- an invalid response was exactly `{ "expires_at": null, "reason": "invalid", "valid": false }`.

`npm run test:release-live` is the post-deploy check. Given `EXPECTED_COMMIT=<final SHA>`, it requires live `/build.json` to match that SHA with `dirty: false`, runs the return-token and valid-verdict fixture against that exact deployed JavaScript, and checks the real invalid-token verification endpoint and origin-specific CORS. No live charge was created.

## Clean local verification

Run:

```sh
npm ci
npm test
npm run check
npm run build
npm run test:e2e
npm run test:claims
npm run test:pwa-update
npm run test:billing-live
```

Observed on Node `v22.23.2`, npm `10.9.8`, and Playwright `1.58.2`:

- clean install: 72 packages, zero audit vulnerabilities;
- unit tests: 19/19 passed;
- strict TypeScript check: passed; this small repository has no separate lint configuration;
- production build: passed with `dist/index.html` at the root;
- browser integration: 38/38 passed, 19 each on desktop Chromium and 390×844 mobile;
- claim mapping: 10 claims each map to one regression; 20/20 claim browser runs passed;
- PWA update: notification, activation, and stale-cache deletion passed;
- live billing: checkout, invalid verification, 30-request allowance, 429, and `Retry-After` passed;
- package/consumer installation: not applicable to this static PWA.

The clean implementation build reported `dirty: false`. JavaScript was 34,691 bytes (12,146 bytes gzip), CSS was 17,234 bytes (4,566 bytes gzip), and the mobile AVIF hero was 21,259 bytes. These remain below the 200 KB JS, 50 KB CSS, and 300 KB image budgets.

## Browser, accessibility, privacy, and offline evidence

- Factory `verify-url.sh` against the production preview returned HTTP 200 in 543 ms with zero console/page errors, `lang="en"`, one h1, one main, complete image alt attributes, and no unnamed buttons.
- Desktop 1440×1000 and mobile 390×844 screenshots were visually reviewed. The first action, illustration, pricing, and footer fit without horizontal overflow.
- Playwright Axe found zero violations in empty, populated, and demo states on both projects. Keyboard tests operate CSV import and backup restore; dialog focus/error/return behavior and 44 px touch targets pass.
- The privacy regression records the complete normal review flow and observes no third-party request. Checkout receives no time rows; verification sends only the license token.
- A fresh browser-owned context installs the service worker, reloads offline, restores IndexedDB rows, edits a row, and exports CSV. A separate update test proves activation and stale-cache cleanup.
- The static policy limits `connect-src` and `form-action` to the Sociobot API, denies framing and unused permissions, revalidates `sw.js` and `/build.json`, and applies immutable caching to hashed assets.

## Scope and known gaps

The artifact remains a Vite + TypeScript local-first PWA deployed from `dist/`; no backend, sign-in, raw payment provider, tracker, or cloud time-entry path was added. The researched brief and visual thesis are unchanged.

There are no known release-blocking product gaps. The live test intentionally does not place a real paid order or trigger a refund; the registered Dodo redirect, deterministic successful return contract, and real invalid/limited verification paths cover the application boundary without making a charge.
