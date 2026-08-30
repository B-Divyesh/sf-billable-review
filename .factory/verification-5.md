# Billable Review — independent verification 5

## Verdict: FAIL — do not release

Verified on 2026-08-30 against `https://billable-review.sociobot.in/` from a clean `npm ci` checkout.

The supplied candidate object `26d425f9ce168b0352dfb4d94df49dd2f51124b2` does not exist locally or on `origin` after `git fetch --all --tags --prune`. The checkout supplied by the work order is instead `26d4251251e77f35edf00a56840a027bf60afe42` (the only `26d425*` object). The live JavaScript and CSS do exactly match that checkout's production build, but that does **not** establish that the named candidate was deployed.

The product itself is broadly functional, but the live Sociobot checkout endpoint is still unregistered. An explicit live purchase check issued `HEAD https://api.sociobot.in/api/v1/products/billable-review/checkout` and received **404**. The product correctly explains that checkout is unavailable and lifts the 150-row cap, so users can complete their review job, but no customer can currently buy the advertised US$19 license.

## First-read result — pass

Cold live desktop load stated all three required facts in plain words:

- **What:** “Review unbilled time before invoicing.”
- **For whom:** freelancers exporting timer CSVs who need each billable row tied to an invoice or write-off.
- **First action:** a visible “Try it with sample data” link, which opens `/demo` in one click.

The first screen also states local storage, offline operation, the 150-row free limit, and the US$19 one-time price. The demo opens a separate bannered workspace with realistic sample entries and Reset demo / Start for real controls.

## Required claim tests — pass

`.factory/claims.json` exists and `node scripts/verify-claims.mjs` reported “10 claims each map to exactly one browser regression.” From the clean install, every listed command passed in both desktop Chromium and the 390 px project:

| Claim | Command result |
| --- | --- |
| csv-workflow | pass |
| date-groups | pass |
| source-preservation | pass |
| backup-roundtrip | pass |
| local-only | pass |
| offline-reload | pass |
| demo-sandbox | pass |
| free-limit | pass |
| lifetime-license | pass |
| checkout-outage-recovery | pass |

## Local verification — pass

| Check | Fresh evidence |
| --- | --- |
| Install | `npm ci`: 72 packages, 0 vulnerabilities |
| Unit tests | `npm test`: 19/19 Vitest tests passed |
| Type check | `npm run check`: passed; no lint script/configuration exists |
| Production build | `npm run build`: passed and emitted `dist/` |
| Browser suite | `npm run test:e2e`: 36/36 passed |
| PWA update | `npm run test:pwa-update`: passed activation and stale-cache cleanup |
| Bundle budget | JS 36,810 bytes / 12.75 KB gzip; CSS 17,234 bytes / 4.55 KB gzip; all within static-PWA budgets |

Functional coverage included valid CSV import; grouping by client/project/date; stale and uncategorized flags; approve, invoice-reference, write-off, and visible rounding outcomes; export; persistence; backup/restore; invalid CSV headers, impossible dates, zero durations, malformed backups, and recovery without data replacement; spreadsheet-formula-safe derived export; healthy 150/151 limit; outage fallback; and valid-license fixture handling.

## Live browser, privacy, PWA, and accessibility evidence — pass

- Live `/demo` loaded five realistic rows in an isolated demo database. I linked “Client revisions” to `QA-INV-2026`, exported a CSV containing that reference, then Reset demo successfully.
- Normal live landing/demo flow made requests only to `billable-review.sociobot.in` (shell, assets, icons). No console or page errors occurred. The explicit purchase action additionally loaded same-origin `checkout-probe.js` then made the single documented `HEAD` request to `api.sociobot.in`; no time-entry data was sent.
- A fresh live service-worker context became controlled after reload. With `context.setOffline(true)`, `/demo` reloaded with title `Demo — Billable Review`, heading “Review unbilled time.”, and its demo banner, with no errors.
- At 390×844, the keyboard reached the sample link and showed a 3 px coral visible focus outline; Enter opened `/demo`. The mobile demo had zero horizontal overflow and all inspected buttons were at least 44 px tall. Reduced-motion rendering reported near-zero transition duration.
- Independent live Axe scans of landing and demo had zero serious/critical findings (in fact, zero violations). The complete local browser suite also covers dialog focus, keyboard file controls, and populated states.
- Production headers include HSTS, `nosniff`, strict-origin referrer policy, restrictive CSP with only `https://api.sociobot.in` in `connect-src`, Permissions Policy, immutable one-year caching for hashed JS/CSS, and `no-cache` for `sw.js`. The manifest is served as `application/manifest+json`.
- Live `index-BA7iIRYE.js` SHA-256 is `be3f7903914403c0d0e80528b0cd1073c83c042798c0b189d607c210c3e0393e`, and live `index-CYGIb4_D.css` is `a9ad27d33537e5afee1c6d7689495c094ce421a66c7d63fb42a5bb03d25642d3`; both equal the built checkout files.

## Defects

### Critical — supplied candidate cannot be verified

`26d425f9ce168b0352dfb4d94df49dd2f51124b2` is absent from the clean clone and fetched origin. The tested checkout/live build is `26d4251251e77f35edf00a56840a027bf60afe42`, a different commit. Release approval for the named candidate is therefore impossible. Supply the correct immutable SHA and deploy/build identity.

### High — live one-time purchase is unavailable

The real checkout endpoint returned HTTP 404 at 2026-08-30 01:42 UTC. The UI safely unlocks unlimited imports while it is down, but the advertised US$19 purchase cannot complete. Register/configure `billable-review` in the Sociobot billing service, then re-run real checkout, return-token, and verification tests. This is external deployment configuration; it cannot be repaired in this static repository.

### High — product-unlock request allowance is not documented or verifiable

The product calls the external Sociobot checkout and license-verification API but documents no per-client request allowance. A safe invalid-token verification returned `200`, `Cache-Control: no-store`, and `{ "valid": false, "reason": "invalid" }`; it did not include `Retry-After`. With no documented threshold, a verifier cannot legitimately drive a client past the limit and confirm the required `429 Retry-After` behavior. Document the allowance and provide a safe staging/test route or evidence that exercising it returns 429 with `Retry-After`.

## Scope notes

This is a static local-first PWA, not a library, CLI, sign-in product, or app-owned backend. There is no Microsoft Entra sign-in path to test and no app-owned server endpoint rate limit. The cited rate-limit finding concerns the external factory product-unlock API required by the acceptance contract.
