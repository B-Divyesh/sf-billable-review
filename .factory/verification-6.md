# Billable Review — independent verification 6

## Verdict: FAIL

**Candidate:** `8035eb6c6a8d073018248865e809c66dcd3f7256`  
**Live URL:** https://billable-review.sociobot.in  
**Verified:** 30 August 2026 (UTC)

The deployed `/build.json` reports this exact full commit and `"dirty": false`; the live artifact therefore matches the candidate. The CSV-review PWA, demo, privacy boundary, accessibility, offline behavior, and all declared claims passed. The release nevertheless **fails** because the documented Sociobot license-verification allowance cannot be verified: its live contract test was rate-limited before 30 requests on two fresh attempts. This is a release-blocking external API/deployment defect under the work order.

## Cold first read — PASS

On a new desktop browser context, the first screen says:

- It does: “Review unbilled time before invoicing.”
- It is for: freelancers exporting timer CSVs who need each billable row linked to an invoice or write-off.
- Click first: the adjacent, one-click **Try it with sample data** link.

The action opens `/demo`, a separate review board with realistic rows and the persistent “Demo — sample data, nothing is saved” banner, Reset demo, and Start for real controls. The first-read, plain-words, and demo-sandbox gates pass.

## Tests and build evidence

Fresh checkout setup used `npm ci` (72 packages; npm audit reported zero vulnerabilities).

- `npm test`: **PASS** — 19 unit tests.
- `npm run check`: **PASS** — strict TypeScript.
- `npm run build`: **PASS** — deployable `dist/` created.
- Full Playwright suite (`npx playwright test --workers=4 --fully-parallel`): **PASS** — 38 expected, 0 unexpected, 0 flaky (73.3 s). This runs the repository’s complete desktop and 390 px mobile browser suite.
- `npm run test:claims`: **PASS** — claims mapping validator passed and all 20 desktop/mobile claim runs passed (26.9 s).
- `npm run test:pwa-update`: **PASS** — update notice, activation, and stale-cache cleanup.
- `EXPECTED_COMMIT=8035eb6c6a8d073018248865e809c66dcd3f7256 npm run test:release-live`: **PASS** — build identity, mobile return-token path, live accessibility/policy, and invalid-license endpoint.
- `npm run test:billing-live`: **FAIL** twice; see the release blocker below.

Each exact command declared by `.factory/claims.json` was also run individually from the demo-capable local preview. All ten passed on desktop and mobile:

`csv-workflow`, `date-groups`, `source-preservation`, `backup-roundtrip`, `local-only`, `offline-reload`, `demo-sandbox`, `free-limit`, `lifetime-license`, and `checkout-boundary`.

## Independent browser QA — PASS except billing allowance

- Normal flow: imported representative Clockify data, grouped/reviewed it, changed visible rounding, saved an invoice reference, exported approved CSV, and exercised persisted state through the automated full suite.
- Invalid/recovery: the live impossible-date CSV retained its valid row and announced that rows 2 and 3 were skipped; selecting “Link invoice” without a reference announced “Add the invoice reference before saving” and moved focus to that field. Malformed backup and free-limit recovery are covered in the full suite.
- Demo isolation: live `/demo` contained 3 visible review rows, had no horizontal overflow at 390 px, kept data separate, and Start for real returned to the real workspace.
- Keyboard/focus: the skip link, navigation, license control, import control, controls, and modal field are keyboard reachable; keyboard focus has a visible solid outline. The full suite covers file-picker keyboard operation and dialog focus return.
- Accessibility: independent live Axe scans of the landing page and populated demo had **zero serious or critical findings**. Factory `verify-url.sh` passed: HTTP 200, title, `lang="en"`, one h1, main landmark, no missing image alt attributes, no unnamed buttons, and zero console/page errors. Reduced-motion media query is honored.
- PWA: after the live service worker controlled a fresh 390 px context, offline reload of `/demo` showed the review board and three rows with the offline notice; no console/page errors. The local update regression passed.
- Privacy: during a live local import/review flow, the outgoing request log had no third-party request. The cold landing request log contained only same-origin document, JS, CSS, icon, and hero image requests. No sign-in is present or required.
- Security/caching: live responses include CSP with only self plus the Sociobot API for `connect-src`, `frame-ancestors 'none'`, `nosniff`, Referrer Policy, Permissions Policy, and HSTS. Hashed JS/CSS cache immutable; `sw.js` uses `no-cache`; manifest content type is `application/manifest+json`. `/`, `/demo`, `/privacy`, `/terms`, `/404`, manifest, SW, build identity, robots, and sitemap all returned 200; internal links crawled successfully.

## Performance/bundle evidence — PASS

The production build contains 34,691 bytes of JavaScript (12,192 bytes gzip), 17,234 bytes of CSS (4,548 bytes gzip), and a 21,259-byte mobile AVIF hero. All are within the 200 KB JS, 50 KB CSS, and 300 KB mobile-image budgets. The factory live verifier loaded the landing page in 652 ms in this environment.

## Release-blocking defect

### P1 — documented 30-request verification allowance is not reproducible

`README.md` and `.factory/billing.md` document 30 verification requests per client burst, with request 31 returning `429` and `Retry-After`. The live contract test did not observe that boundary:

1. First `npm run test:billing-live`: assertion failure, **“Verification request 30 should be within the 30-request allowance”**; actual status `429`.
2. After a 12-second wait, second `npm run test:billing-live`: assertion failure at **request 6**; actual status `429`.

A single subsequent invalid-token probe returned the expected `200`, CORS origin, `Cache-Control: no-store`, and invalid verdict. A separate 12-request probe also returned 200s. That pattern is consistent with a shared or inconsistently keyed limiter, but it does not establish the documented per-client 30-request contract. Because the test short-circuited before its expected request-31 assertion, fresh verification did not capture a passing 31st-request `Retry-After` result.

**Required resolution:** make the deployed Sociobot verification endpoint enforce a stable, client-specific allowance (or correct the documented allowance), then rerun `npm run test:billing-live` from a clear window. Acceptance requires requests 1–30 to return 200 and request 31 to return 429 with a positive `Retry-After` header.

## Scope

No product code was modified during this verification. There is no library/CLI consumer package to test and no product sign-in flow. The PWA uses local browser storage; checkout and license verification are the only external product endpoints.
