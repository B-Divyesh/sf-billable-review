# Billable Review — repair 6 handoff

## Status: repaired and release-ready

This repair addresses the only release blocker in independent report commit `17b2a5c92cff5ed81ffbd5493b2c2e972d034668` for candidate `8035eb6c6a8d073018248865e809c66dcd3f7256`. The product scope, local-first review flow, US$19 product mapping, hosted Dodo checkout, and all previously passing behavior are preserved.

## Failure reproduced

The unchanged report commit was tested before code changes. One `npm run test:billing-live` invocation happened to receive 30 HTTP 200 responses and then 429. An immediate second invocation failed on request 2 with `429 !== 200` and the assertion “Verification request 2 should be within the 30-request allowance.” This reproduces the verifier's request-3 failure and proves that a fixed 30-request client allowance is not an observable contract on the shared gateway.

## Root-cause repair

- Removed the fixed 30-request promise from `README.md`, `.factory/billing.md`, and the live billing test.
- Documented the real boundary: normal verification may return 200; a saturated gateway returns 429 with a positive `Retry-After`; clients cannot assume a fixed allowance.
- Changed the app to wait for `Retry-After` and retry once. It uses a short fallback if browser CORS policy hides that response header.
- Kept the free ledger rendered and usable while verification waits. Persistent saturation keeps the cached verdict and shows a calm retry-later message instead of treating 429 as an invalid license.
- Kept verification at most once per day after a verdict. Checkout returns and manual restores still make an immediate check.
- Kept the exact checkout URL `https://api.sociobot.in/api/v1/products/billable-review/checkout`; live HEAD still redirects with HTTP 303 to `checkout.dodopayments.com`.

## Regression coverage

`.factory/claims.json` now contains 11 claims with exactly one tagged browser regression each. The new `@claim:billing-saturation` test records request times and returns 429 with `Retry-After: 1`, then 200. It asserts the calm waiting notice, imports a real CSV while waiting, observes the delayed retry after at least 900 ms, and confirms the paid state without a reload. The existing `@claim:lifetime-license` test still covers the normal 200 response, 24-hour cache, and 151-row paid import. The existing `@claim:checkout-boundary` test still reproduces checkout 404 and proves that failure cannot lift the free limit.

## Verification evidence

Run on Node.js 22.23.2 with Playwright 1.58.2 and its preinstalled Chromium:

- `npm ci` — 72 packages installed; 0 vulnerabilities.
- `npm test` — 19/19 unit tests passed.
- `npm run check` — strict TypeScript passed. This repository has no separate lint configuration.
- `npm run build` — passed and produced `dist/` with direct routes, manifest, service worker, policy file, and build identity.
- `npm run test:e2e` — 40/40 browser tests passed across desktop Chromium and the 390 × 844 mobile project.
- `npm run test:claims` — claim mapping passed; 22/22 desktop/mobile claim runs passed.
- `npm run test:pwa-update` — update notice, activation, and stale-cache cleanup passed.
- `npm run test:billing-live` — passed against the registered product and normal 200 verification policy. The 429 branch requires a positive `Retry-After` whenever shared saturation is encountered.
- `EXPECTED_COMMIT=f8edc97a5ce383987d1d504c43bca02fac39b44c npm run test:release-live` — passed against the first repair deployment: exact clean identity, 390 px return-token flow, Axe, CORS/cache policy, and the real 200-or-429 verification policy.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173 <evidence-dir>` — 200; 547 ms network-idle; no console/page errors; title and `lang`; one h1/main; no missing alt text or unnamed buttons.
- Lighthouse 13.0.1 mobile — performance 100, accessibility 100, best practices 100, SEO 100; LCP 1,549 ms, CLS 0, total blocking time 0 ms, speed index 947 ms.

Browser coverage includes the complete CSV workflow, free and paid row boundaries, desktop and 390 px layout, keyboard file actions, focus/touch targets, Axe scans, malformed-input recovery, backup round trips, demo isolation, outgoing-request privacy, offline reload/export, and service-worker update. There is no package consumer, CLI, sign-in flow, app backend, or AI feature to test.

Production payload is 36,348 bytes JavaScript (12.67 KB gzip), 17,234 bytes CSS (4.55 KB gzip), no webfont payload, and 21,259 bytes for the mobile AVIF hero. These remain within the product budgets.

## Deployment and live acceptance

The final build is published as the existing `pwa-offline` static artifact at `https://billable-review.sociobot.in`; repository-root files are not deployed. `/build.json` is generated from the final clean commit. Live acceptance uses:

```sh
npm run test:billing-live
EXPECTED_COMMIT="$(git rev-parse HEAD)" npm run test:release-live
/opt/fleet/lib/verify-url.sh https://billable-review.sociobot.in <evidence-dir>
```

## Known gaps and next steps

The billing service is a shared external gateway, so a particular client can observe 200 or 429 depending on current saturation. That variability is now the documented and tested contract. No release-blocking product gap remains.
