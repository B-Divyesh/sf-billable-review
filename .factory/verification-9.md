# Verify Billable Review before release

## Verdict: FAIL — do not release

**Verified:** 2026-09-05  
**Live URL:** https://billable-review.sociobot.in  
**Implementation reviewed:** `99647d3930ec5ed57ee8b20d1098f6a2b44b77b0`  
**Documentation commit:** `fc6bf5b5197156e31490a87df40475ea18a68e0b`

The CSV review job works in the deployed PWA. The live paid checkout also now reaches the correct US$19 one-time Dodo offer. Release still fails because browser JavaScript cannot read the gateway's `Retry-After` value when license verification is rate limited. This is one High finding. All 11 declared public claims were run from the clean checkout; none is missing, false, incomplete, or untested.

## First screen and sample workspace: PASS

Fresh 1440×1000 desktop and 390×844 phone browsers showed, before scrolling:

- Job: “Review unbilled time before invoicing.”
- Audience: freelancers who export timer CSVs and must tie billable rows to an invoice or write-off.
- First action: “Try it with sample data.”

The action opened `/demo` in one click. It showed three open review rows across Northstar Studio and Field & Form, grouped by client, project, and date, with stale and missing-category states. The persistent label reads “Demo — sample data, nothing is saved.” The 390 px layout had no horizontal overflow.

The browser suite independently proves demo isolation, a saved review decision surviving reload, Reset demo restoring the bundled `INV-2048` sample, and Start for real discarding demo data while leaving the real namespace untouched. A fresh live exit returned to the empty real ledger with no demo banner.

## Clean local verification: PASS

`npm ci` completed with 0 vulnerabilities. These commands passed from the clean checkout:

| Check | Result |
| --- | --- |
| `npm test` | 19/19 unit tests passed |
| `npm run check` | TypeScript passed |
| `npm run build` | passed; created `dist/` |
| `npm run test:e2e` | 40/40 desktop and mobile browser tests passed |
| Every exact command in `.factory/claims.json` | 11/11 commands passed, each in desktop and mobile projects |
| `npm run test:claims` | claim mapping passed; 22/22 browser runs passed |
| `npm run test:pwa-update` | update notice, activation, and stale-cache cleanup passed |

The exact individual claim commands covered CSV import/review/export, client-project-date grouping, source preservation and safe CSV cells, JSON backup restore, local-only requests, offline reload, demo isolation, the 150-row limit, return-token license handling, checkout failure safety, and hidden/exposed rate-limit header behavior.

## Live checks: PASS except the rate-limit finding

- `/build.json` reports product `billable-review`, `dirty: false`, and `fc6bf5b5197156e31490a87df40475ea18a68e0b`. `99647d3..fc6bf5b` changes only `.factory/claims.json` wording and `.factory/handoff.md`; it contains no application, asset, or deployment-config change. The deployed runtime therefore matches implementation `99647d3` despite the later documentation build identity.
- `EXPECTED_COMMIT=fc6bf5b5197156e31490a87df40475ea18a68e0b npm run test:release-live` passed: live identity, AVIF MIME, mobile return-token fixture, desktop 44×44 navigation targets, Axe, no browser errors, and the normal 200-or-429 response policy. The same command with the implementation SHA fails only because the build identity now names the documentation commit.
- `verify-url.sh` passed: HTTP 200, 756 ms load measurement, correct title and `lang`, one h1, main landmark, image alt text, named buttons, and no console or page errors.
- A fresh live Axe scan of populated `/demo` found 0 violations, including 0 serious or critical issues. The release check found the same result on the license-return route.
- `/`, `/demo`, `/privacy`, `/terms`, and `/404` each rendered its own correct title, one h1, and one main. A missing URL returned the designed page with HTTP 404, which is expected. All discovered internal links, manifest, `robots.txt`, `sitemap.xml`, and `sw.js` returned HTTP 200.
- A fresh 390 px context installed the service worker, went offline, reloaded `/demo`, and retained the review board, three visible rows, the offline notice, and no browser errors.
- Normal landing and demo review traffic remained same-origin. The live privacy and terms pages describe local IndexedDB/localStorage, no analytics or third-party scripts, the license-token exception, and data export/erasure.
- The hero AVIF returns `Content-Type: image/avif`; production JavaScript is 36,363 bytes (12.67 KB gzip) and CSS is 17,327 bytes (4.55 KB gzip). This is within the static-product script and stylesheet budgets.
- The live checkout endpoint returned HTTP 303 to `checkout.dodopayments.com`. A browser followed it to a page titled “Sociobot | Checkout” that identified Billable Review, US$19.00, and a one-time unlock. No purchase was made, so real entitlement delivery, refund, and revocation were not exercised; the declared return-token claim uses its recorded fixture and passed.

## Finding

### High — browser cannot read `Retry-After` on live license saturation

`npm run test:billing-live` failed. From the live product origin, a fresh browser made 30 successful invalid-license verification requests. The next request returned HTTP 429, but `response.headers.get('retry-after')` was not a positive value in browser JavaScript. The failing assertion was:

> The browser saw 429 after 30 successful requests but could not read a positive Retry-After value.

The product handles this safely: the claim regression proves it does not guess a delay when CORS hides the header and the free review workflow remains usable. It still cannot follow the live gateway's actual delay, so the billing contract and release gate are not fully met.

**Required external repair:** expose `Retry-After` on verification 429 responses, for example with `Access-Control-Expose-Headers: Retry-After` for `https://billable-review.sociobot.in`. Then rerun `npm run test:billing-live` until it passes from a browser context.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Malformed backup could erase rows | Fixed; regression passes malformed-backup recovery and atomic restore tests. |
| File import and restore were not keyboard-operable | Fixed; keyboard regression passes. |
| Groups omitted the date | Fixed; `date-groups` claim passes. |
| Reopening reconciled work lost its decision | Fixed; full browser suite passes saved-outcome reopening. |
| Impossible dates could be exported | Fixed; full browser suite rejects them before storage/export. |
| Backup restore omitted settings | Fixed; settings round-trip regression passes. |
| Formula-prefixed CSV cells could be unsafe | Fixed; `source-preservation` claim passes. |
| Secondary touch targets were below 44 px | Fixed; target regression passes, and live desktop navigation measured at least 44×44 px. |
| Checkout was 404 or 500 | Resolved externally; live 303 and hosted US$19 offer observed. |
| AVIF had a generic MIME type | Fixed; live response is `image/avif`. |
| Earlier rate-limit allowance mismatch | Replaced by the current documented shared-gateway policy; the remaining browser-readable-header defect is this report's High finding. |

## Scope

This is a static local-first PWA. It has no product backend, tenant database, sign-in flow, CLI/library artifact, AI feature, or app-owned health endpoint to verify. Backend tenant isolation, restart persistence, and backend health checks therefore do not apply. No product code was changed during this verification.

**Finding count:** 1  
**Untested public claim count:** 0
