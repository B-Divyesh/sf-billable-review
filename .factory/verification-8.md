# Billable Review — independent verification 8

## Verdict: FAIL — do not release

Verified on 2026-08-30 against candidate `cb872fa0337349b1149021d4751e459f4baf3800` and `https://billable-review.sociobot.in/` from a clean checkout. The deployed `/build.json` reports that full commit with `dirty: false`. Live JavaScript and CSS hashes exactly match the clean local production build.

The free local-first review workflow is usable and well tested, but the advertised US$19 purchase cannot complete. The live checkout returns HTTP 500 instead of redirecting to hosted checkout. A second live mismatch means the app also cannot read the gateway's `Retry-After` header in a browser, despite claiming that it follows that header. These are release blockers.

## First-read gate: PASS

A cold desktop and 390 × 844 mobile load answer all three questions on the first screen:

- What it does: “Review unbilled time before invoicing.”
- Who it is for: freelancers who export timer CSVs and need each billable row tied to an invoice or write-off.
- What to do first: the visible one-click **Try it with sample data** action says the sample opens a separate review board.

The screen also states local storage, offline use, and the 150-row/US$19 terms in plain words. The sample opens `/demo` with five realistic rows, a persistent “Demo — sample data, nothing is saved” banner, **Reset demo**, and **Start for real**.

## Mandatory claim tests: PASS locally

`.factory/claims.json` exists. Before broader inspection, every exact command in it was run separately from the clean clone. Every claim passed in both configured Chromium projects:

| Claim | Exact command result |
| --- | --- |
| `csv-workflow` | pass, 2/2 |
| `date-groups` | pass, 2/2 |
| `source-preservation` | pass, 2/2 |
| `backup-roundtrip` | pass, 2/2 |
| `local-only` | pass, 2/2 |
| `offline-reload` | pass, 2/2 |
| `demo-sandbox` | pass, 2/2 |
| `free-limit` | pass, 2/2 |
| `lifetime-license` | pass, 2/2 |
| `checkout-boundary` | pass, 2/2 |
| `billing-saturation` | pass, 2/2 |

`npm run test:claims` additionally confirmed that all 11 claims map to exactly one tagged browser regression; all 22 project runs passed. The live evidence below nevertheless disproves part of the recorded billing behavior because that test supplies a CORS header production does not send.

## Clean candidate and live checks

| Check | Result |
| --- | --- |
| Install | `npm ci` passed; 72 packages, 0 audit vulnerabilities. |
| Unit tests | `npm test` passed 19/19. |
| Type/lint | `npm run check` passed. No separate lint script or configuration exists. |
| Production build | `npm run build` passed and produced `dist/`. |
| Full browser suite | `npm run test:e2e` passed 40/40 across desktop Chromium and 390 px mobile. |
| Claim suite | `npm run test:claims` passed mapping plus 22/22 browser runs. |
| PWA update | `npm run test:pwa-update` passed update notice, activation, controller change, and stale-cache cleanup. |
| Live release smoke | `EXPECTED_COMMIT=cb872fa... npm run test:release-live` passed identity, mobile license-return fixture, axe, and the accepted 200-or-429 verification response policy. |
| Live billing | `npm run test:billing-live` **failed**: checkout returned 500, expected 303. |
| Factory URL smoke | `verify-url.sh` returned 200 in 795 ms with title/lang/main/h1/alt checks and no console or page errors. |
| Lighthouse mobile | Performance 94, accessibility 100, best practices 100, SEO 100; FCP 1.0 s, LCP 1.3 s, TBT 300 ms, CLS 0. INP was not available in the lab run. |

Production payload is 36,348 bytes JavaScript (12,618 bytes gzip), 17,234 bytes CSS (4,566 bytes gzip), no webfont payload, and a 21,259-byte mobile AVIF hero. These are within the 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB hero budgets. The clean/live JS SHA-256 is `31d98e9bcc06e50a3f620785faa990faf004e67f6c3fdedd671b33b2fa5cdb33`; CSS is `a9ad27d33537e5afee1c6d7689495c094ce421a66c7d63fb42a5bb03d25642d3`.

## Independent product exercise

- Normal case: imported the representative Clockify CSV, edited categories, approved and linked rows, visibly rounded time, exported invoice CSV, reloaded, and recovered saved state.
- Validation/recovery: attempting to link an invoice without a reference announced “Add the invoice reference before saving” and focused the reference field. A CSV missing date and duration columns produced a specific corrective message; a valid retry then imported two rows.
- Boundary: importing 151 rows stored exactly 150 and retained a clear recovery/unlock message.
- Export: the independent live demo export included the expected header and the saved `INV-QA-88` row. Formula-prefix and byte-preserving backup behavior also passed the dedicated candidate tests.
- Demo isolation/persistence: five sample rows are stored only in the demo namespace; an edited invoice reference survived a demo reload and remained separate from the real ledger.
- Desktop/mobile: no horizontal overflow at 1440 px or 390 px; setting the root text size to 200% also produced no horizontal overflow.
- Privacy: the complete landing → demo → review → export → reload request log contained only `https://billable-review.sociobot.in` requests. No analytics, fonts, scripts, time rows, or other data went to a third party during normal review.

## Accessibility, offline, headers, and caching

- Independent live axe scans of landing and populated demo on desktop and mobile found zero violations, including zero serious/critical findings.
- Keyboard order begins with the visible skip link and reaches navigation, demo, file import, purchase, and legal actions. The designed focus outline is 3 px coral. Native dialog focus enters the close button, remains modal, and returns to the opener on Escape.
- Invalid form errors use an alert and move focus to the failing input. Reduced motion changes transition/animation duration to `0.01ms`. The intentionally single-mode palette had no axe contrast finding.
- In a dedicated live context, the service worker controlled the page, then `/demo` reloaded offline with the title, banner, saved sample rows, and no browser errors. The separate update regression passed.
- Live documents send CSP, HSTS, `nosniff`, strict-origin referrer policy, denied framing, and a restrictive Permissions Policy. Hashed assets are one-year immutable; `sw.js` is `no-cache`; `build.json` is `no-store`; the manifest has the correct media type. A real unknown path returns the designed page with HTTP 404.

## Defects

### High — purchase flow ends at an HTTP 500 (release blocker)

At 04:34–04:42 UTC, both `HEAD` and `GET https://api.sociobot.in/api/v1/products/billable-review/checkout` repeatedly returned HTTP 500 with no `Location`; GET returned `{"error":"Internal server error","status":500}`. Three later HEAD probes, two seconds apart, were also 500. Clicking the live **Buy lifetime — $19** link on a 390 px browser navigated to that JSON error.

Impact: nobody can buy the advertised lifetime license, so the monetized end-to-end flow and paid-unlock acceptance contract fail. This is fresh evidence; the earlier deployment-only repair is not currently effective.

Required remediation: repair/register the live Sociobot product so the exact endpoint returns 303 to `checkout.dodopayments.com`, then complete a test-mode purchase/return and rerun `npm run test:billing-live`.

### High — browser cannot follow the real `Retry-After` value (release blocker)

After a fresh limiter window, one client received 30 HTTP 200 verification responses; request 31 returned HTTP 429 with `Retry-After: 4`. Thus the observed allowance was 30 successful requests, with 429 on request 31, and the server did send the required header.

However, the 429 response omits `Access-Control-Expose-Headers: Retry-After`. From the live product origin, `response.status` was 429 but `response.headers.get('retry-after')` was `null`. The candidate therefore waits its hard-coded three-second fallback rather than the observed four seconds and may immediately hit a second 429. The `billing-saturation` test passes only because its mocked response adds the missing expose header.

Impact: the claim “License checks follow Retry-After” is not true against production, and license restore can give up prematurely during saturation.

Required remediation: expose `Retry-After` through CORS on gateway 429 responses and add a browser-origin live assertion that the header is readable.

### Medium — desktop header links have undersized hit targets

The desktop `Demo`, `Privacy`, and demo-mode `Real ledger` navigation links render about 24.8 px high with no minimum height. The baseline requires 44 × 44 CSS px targets. Mobile hides these links, and other inspected controls use 44 px wrappers, but desktop and touch-laptop users still receive undersized targets.

### Low — AVIF is served with a generic media type

`/assets/hero-ledger-960.avif` returns `Content-Type: application/octet-stream` rather than `image/avif`. Chromium still decoded it, but the deployment MIME map should identify AVIF correctly.

## Applicability notes

This is a static local-first PWA, not a library, CLI, sign-in product, AI product, or app-owned backend. Consumer package installation, Entra identity, backend persistence/concurrency/health, and live AI spending do not apply. The brief does not imply a useful AI step beyond the implemented import/review/export workflow.
