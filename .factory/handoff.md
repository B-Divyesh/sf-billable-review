# Billable Review — repair 7 handoff

## Status: FAIL — do not release

Implementation `99647d3930ec5ed57ee8b20d1098f6a2b44b77b0` is committed, pushed, and deployed at `https://billable-review.sociobot.in`. The live `/build.json` reports that exact commit with `dirty: false`.

The product workflow and three repository findings are repaired. The shared Sociobot gateway still does not expose `Retry-After` through CORS. That external defect keeps the release blocked. The later handoff commit is documentation only and does not require another product deployment.

## Current findings

1. **Checkout HTTP 500 — resolved externally.** Fresh HEAD and browser GET requests return HTTP 303 to `checkout.dodopayments.com`. The hosted page shows Billable Review, US$19.00, and a one-time license. No paid transaction was made, so redirect evidence does not prove entitlement delivery or revocation.
2. **Browser-readable `Retry-After` — still blocked externally.** A clean browser made 30 successful verification requests. Request 31 returned 429. The raw response contained `Retry-After: 1`, but omitted `Access-Control-Expose-Headers`; browser JavaScript read `null`. `npm run test:billing-live` fails on this exact outcome.
3. **Desktop navigation targets — fixed.** Header links now have a 44×44 px minimum target. Local browser coverage checks landing and demo navigation; the deployed release check measures the same outcome at 1280 px.
4. **AVIF media type — fixed.** Static Web Apps now maps `.avif` to `image/avif`. The deployed hero returns `Content-Type: image/avif`, asserted by the release test.

## Implementation changes

- Removed the guessed three-second license retry. The app retries once only when the browser can read a valid `Retry-After` of at most 30 seconds. A hidden header now causes one request, a calm retry-later message, and no interruption to the free ledger.
- Added outcome-based browser checks for exposed and hidden rate-limit headers, live CORS visibility, desktop navigation geometry, and deployed AVIF media type.
- Updated the billing and claims contracts to describe the safe browser behavior without promising a fixed shared-gateway allowance.
- Added the required verb-first catalog description and copied it to `/work/.evidence/catalog-description.txt`.
- Wrote the live US$19 one-time offer metadata to `/work/.evidence/billing-offer.json` for the separate billing operator.

## Clean verification

Setup used `npm ci` with Playwright 1.58.2. Audit reported zero vulnerabilities.

- `npm test` — 19/19 unit tests passed.
- `npm run check` — TypeScript passed.
- `npm run build` — passed and produced `dist/`.
- `npm run test:e2e` — 40/40 desktop and 390 px browser tests passed.
- Every exact command in `.factory/claims.json` — 11/11 claims passed separately, 2/2 projects each.
- `npm run test:claims` — mapping passed; 22/22 browser runs passed.
- `npm run test:pwa-update` — update notice, activation, and stale-cache cleanup passed.
- `EXPECTED_COMMIT=99647d3930ec5ed57ee8b20d1098f6a2b44b77b0 npm run test:release-live` — passed build identity, AVIF MIME, mobile license-return fixture, live Axe, desktop targets, and response policy.
- Factory `verify-url.sh` — HTTP 200 in 813 ms; no console/page errors; title, language, h1, main, image alt, and button-name checks passed.
- `npm run test:billing-live` — **failed as expected** because the browser could not read `Retry-After` on the live 429.

Production payload: 36,363 bytes JavaScript (12.67 KB gzip), 17,327 bytes CSS (4.55 KB gzip), no webfonts, and a 21,259-byte mobile AVIF. Lighthouse mobile scored 100 performance, 100 accessibility, 100 best practices, and 100 SEO; FCP 1.0 s, LCP 1.3 s, TBT 20 ms, CLS 0, and Speed Index 1.0 s.

## Cold browser exercise

Fresh 1440×1000 desktop and 390×844 phone contexts showed the title “Billable Review — review time before invoicing,” the job “Review unbilled time before invoicing,” the freelancer audience, and **Try it with sample data** before scrolling.

The sample opened in one click with five stored rows and the persistent “Demo — sample data, nothing is saved” banner. A row was linked to `QA-INV-2026`; the CSV export contained that reference, and the edit survived reload. **Reset demo** removed the edit. **Start for real** returned to an empty real ledger with zero rows. Neither viewport overflowed. Normal demo traffic remained same-origin.

Direct `/`, `/demo`, `/privacy`, `/terms`, and `/404` routes returned their expected titles, one h1, and one main. A missing URL returned the designed page with HTTP 404. Keyboard focus, reduced motion, 200% text, live Axe, offline demo reload, legal links, manifest, worker, robots, sitemap, and security/cache headers passed.

## Remaining external action

Add `Access-Control-Expose-Headers: Retry-After` to Sociobot gateway 429 responses for `https://billable-review.sociobot.in`. Then rerun `npm run test:billing-live`; it must see the positive header from browser JavaScript. After that, complete a controlled purchase, return-token verification, restore, and revocation exercise before independent release verification.
