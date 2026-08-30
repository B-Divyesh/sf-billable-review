# Billable Review — independent verification 7

## Verdict: FAIL — do not release

Verified on 2026-08-30 against candidate commit `8035eb6c6a8d073018248865e809c66dcd3f7256` and `https://billable-review.sociobot.in/` from a clean `npm ci` checkout. The deployed artifact is the candidate: live `/build.json` reports that exact full SHA with `dirty: false`; the live JS SHA-256 `32c947efba154a4ae6dc1ce8149a5af54c467fcf0b630c88c7029295fce59657` and CSS SHA-256 `a9ad27d33537e5afee1c6d7689495c094ce421a66c7d63fb42a5bb03d25642d3` equal the clean local production build.

The release-blocking failure is the external Sociobot product-unlock rate-limit contract. Both `README.md` and `.factory/billing.md` promise 30 verification requests per client burst before 429. From the clean candidate checkout, `npm run test:billing-live` failed: request 3 returned HTTP 429 rather than the promised HTTP 200. A direct follow-up probe received HTTP 429 with `Retry-After: 3`. The endpoint therefore does rate limit and supplies the required header, but the observed allowance was two successful requests in this run, not 30. This makes the documented contract false and the repository's available live verification test fail.

## First-read test — PASS

Cold live desktop load answered the required questions in plain words on the first screen:

- **What it does:** “Review unbilled time before invoicing.”
- **For whom:** “For freelancers who export timer CSVs and need every billable row tied to an invoice or write-off.”
- **What to click first:** visible one-click **Try it with sample data**; adjacent copy says it opens a separate review board.

The first screen also gives the three short facts: data stays on the device, review/export work offline after first visit, and 150 free rows / US$19 once. `/demo` opens an isolated, bannered workspace with Reset demo and Start for real.

## Required claims — PASS

`.factory/claims.json` exists and maps ten claims to exactly one browser regression each. From the fresh install, every command listed in the file passed in both configured Chromium projects (desktop and 390 px mobile):

| Claim | Exact command result |
| --- | --- |
| csv-workflow | `npm run test:e2e -- --grep @claim:csv-workflow` — pass (2/2) |
| date-groups | `npm run test:e2e -- --grep @claim:date-groups` — pass (2/2) |
| source-preservation | `npm run test:e2e -- --grep @claim:source-preservation` — pass (2/2) |
| backup-roundtrip | `npm run test:e2e -- --grep @claim:backup-roundtrip` — pass (2/2) |
| local-only | `npm run test:e2e -- --grep @claim:local-only` — pass (2/2) |
| offline-reload | `npm run test:e2e -- --grep @claim:offline-reload` — pass (2/2) |
| demo-sandbox | `npm run test:e2e -- --grep @claim:demo-sandbox` — pass (2/2) |
| free-limit | `npm run test:e2e -- --grep @claim:free-limit` — pass (2/2) |
| lifetime-license | `npm run test:e2e -- --grep @claim:lifetime-license` — pass (2/2) |
| checkout-boundary | `npm run test:e2e -- --grep @claim:checkout-boundary` — pass (2/2) |

`npm run test:claims` also reported “10 claims each map to exactly one browser regression”; its 20 claim-project tests passed.

## Local and end-to-end verification

| Check | Evidence |
| --- | --- |
| Install | `npm ci` installed 72 packages; audit reported 0 vulnerabilities. |
| Unit tests | `npm test` passed 19/19 Vitest tests. |
| Type/lint | `npm run check` passed (`tsc --noEmit`). No lint script/configuration exists. |
| Exact production build | `npm run build` passed and emitted `dist/`. |
| Browser suite | `npm run test:e2e` completed with Playwright last-run status `passed` (38 tests across desktop and mobile). |
| PWA update | `npm run test:pwa-update` passed update notification, activation, and stale-cache cleanup. |
| Live release smoke | `EXPECTED_COMMIT=8035... npm run test:release-live` passed candidate identity, mobile return-token fixture, accessibility, response policy, and an invalid-license response. |
| Live billing | `npm run test:billing-live` **failed**: verification request 3 returned 429; see blocker below. |
| Bundle budget | JS 34,691 bytes (12.19 KB gzip); CSS 17,234 bytes (4.55 KB gzip); mobile AVIF 21,259 bytes (within budget). |

Functional coverage includes normal CSV import, grouping by client/project/date, stale and uncategorized entries, visible rounding, approve/invoice/write-off outcomes, CSV export, reload persistence, backup/restore, formula-safe derived CSV, free 150/151 boundary, malformed data recovery, demo isolation, and return-token license handling. This static PWA is not a library, CLI, sign-in product, or app-owned backend; consumer-install, Entra sign-in, backend persistence/concurrency, and health endpoint checks do not apply.

## Live browser, privacy, accessibility, and PWA evidence — PASS

- Live landing and demo had no console errors or page errors. Desktop and 390×844 mobile demo both had zero horizontal overflow, three realistic demo rows, a working review dialog, and the persistent isolated-demo banner.
- Cold landing traffic was only same-origin shell/assets/icon/hero. During the live demo workflow, requests were only same-origin shell/assets/icon. No time-entry data left the browser. The expected license boundary is the Sociobot API only; normal review did not call it.
- Independent Playwright Axe scans of landing and demo on desktop/mobile found zero violations (therefore zero serious/critical findings).
- Keyboard Tab order reached the skip link, wordmark, lifetime control, sample-data link, file input, legal links, and artwork link. Each inspected interactive control showed the designed 3 px coral focus outline. `prefers-reduced-motion: reduce` reported `0.00001s` transitions.
- A fresh live service-worker context became controlled; after `context.setOffline(true)`, `/demo` reloaded with title `Demo — Billable Review`, the review heading, demo banner, and no browser errors. Local update testing separately proved `skipWaiting` activation and stale-cache removal.
- Live headers provide HSTS, `X-Content-Type-Options: nosniff`, strict-origin referrer policy, restrictive CSP (`connect-src` only self and `https://api.sociobot.in`), denied framing, and a restrictive Permissions Policy. Hashed JS/CSS use one-year immutable caching, `sw.js` is `no-cache`, and `/build.json` is `no-store`. Manifest type is `application/manifest+json`.

## Defects

### High — documented product-unlock allowance is not actually enforced as documented (release blocker)

The production verification endpoint is documented as allowing 30 requests per client burst. The clean live test expected 30 HTTP 200 responses then request 31 as HTTP 429. At 2026-08-30T03:42Z, `npm run test:billing-live` instead failed at request 3: `429 !== 200`. A subsequent direct client probe confirmed a 429 response with `Retry-After: 3`.

Impact: a user who restores/verifies a license more than a couple of times in the active window can be unexpectedly rate limited, and the product’s published assurance plus its own available integration test are false. This is an external billing deployment/configuration defect, not a change that may be made in the static product repository.

Required remediation: configure the Sociobot verification limiter to the documented 30-request per-client burst (or change the documented contract and test only if the lower policy is intentional and product-safe), then demonstrate 30 200 responses followed by 429 with a positive `Retry-After` from a clean client. Re-run `npm run test:billing-live` and independent verification.

## Non-blocking confirmation of the prior deployment failure

The prior live checkout 404 is repaired. On this verification, `HEAD https://api.sociobot.in/api/v1/products/billable-review/checkout` returned HTTP 303 with a `Location` on `checkout.dodopayments.com`. The candidate's checkout-boundary claim regression also proves that a former 404 cannot lift the 150-row free limit.
