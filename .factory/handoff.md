# Billable Review — repair 4 handoff

## Status: repaired and deployed

Repair work order `billable-review-repair-4` is deployed at <https://billable-review.sociobot.in/>. Product code is commit `7221a50`; deployment ID is `72faefc4-37c6-4ed9-94f2-3e2a193920c1`.

The release-blocking checkout failure from verifier commit `5c5b23597dbfcb07d287fe65ecc9db595eed51b9` was reproduced first. On 2026-08-30, the production endpoint still returned:

```text
HEAD https://api.sociobot.in/api/v1/products/billable-review/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The repository is not allowed to register billing products. The app now checks checkout from a same-origin worker before enforcing the paid boundary. A confirmed 404 or 410 lifts the import limit and explains why. A healthy checkout retains the original 150-row boundary. A network failure keeps existing rows safe and asks the user to reconnect or restore a license. The probe runs only after an explicit purchase check or an import that crosses the boundary. It sends no time-entry data.

Fresh live desktop and 390 px runs received the real checkout 404, displayed the recovery notice, and imported all 151 rows. Both runs had zero console/page errors and no horizontal overflow. The exact regression is `@claim:checkout-outage-recovery`; `@claim:free-limit` separately proves the original boundary against a healthy checkout response.

## Additional release work

- Added `/demo` and `/?demo=1` as a one-click sample workspace. Demo entries use IndexedDB `demo:billable-review`; demo settings use `demo:br:settings`. Leaving clears demo storage and returns to untouched real data.
- Added `.factory/claims.json`; all ten claims map to exactly one tagged browser test.
- Added landing-page copy audit, plain first-screen copy, three factual lines, route-specific titles/canonicals, social metadata, a 1200×630 preview, a 180 px touch icon, and a real styled HTTP 404 response.
- Preserved all earlier data-safety, outcome-editing, date-validation, formula-safety, grouping, touch-target, keyboard, caching, and response-policy repairs.

## Clean local verification

Run from a clean dependency install:

```sh
npm ci
npm run check
npm test
npm run build
npm run test:e2e
npm run test:claims
npm run test:pwa-update
```

Results on Node `v22.23.2`, npm `10.9.8`, Playwright `1.58.2`:

- `npm ci`: 72 packages, 0 audit vulnerabilities.
- `npm run check`: TypeScript passed. No separate lint configuration exists.
- `npm test`: 19/19 Vitest tests passed.
- `npm run build`: passed and emitted `dist/` with `index.html` at its root.
- `npm run test:e2e`: 36/36 Playwright runs passed, 18 each on desktop Chromium and 390×844 mobile.
- `npm run test:claims`: claim mapping validation passed; 20/20 browser runs passed.
- `npm run test:pwa-update`: update notice, replacement activation, and stale-cache deletion passed.
- Package/consumer installation is not applicable to this static PWA.

Browser coverage includes valid and invalid CSV recovery, impossible dates, client/project/date grouping, invoice and write-off editing, visible rounding, formula-safe CSV export, atomic backup replacement, settings restore, the 150/151 boundary, real-checkout outage recovery, valid license callbacks, demo isolation, keyboard file controls, 44 px targets, persistence, privacy request capture, Axe, offline reload/export, and updates.

## Accessibility, mobile, privacy, and PWA evidence

- Factory `verify-url.sh` against production: HTTPS 200, 775 ms network-idle load, no console/page errors, `lang="en"`, one h1, one main, zero images missing alt, and zero unnamed buttons.
- Playwright Axe: zero violations on empty, populated, dialog, and demo states at desktop and mobile sizes.
- Keyboard tests reach and operate CSV import and JSON restore. Dialog validation moves focus to the invalid field; native dialog close returns focus.
- Desktop 1440×1000 and mobile 390×844 visual checks passed. Every tested route had one h1/main, no browser errors, and `scrollWidth === clientWidth`.
- Normal import/review captured no third-party requests. The explicit checkout probe sends only `HEAD` to the Sociobot checkout URL; time rows remain in IndexedDB.
- Chromium parsed the production manifest with zero errors. It reports standalone display, versioned `/?v=3` start URL, and 192/512/maskable icons.
- A fresh live demo context remained usable after browser offline mode and reload, restored sample data, and showed “You’re offline. Review and exports still work.” The claim test also edits and exports while offline.

## Performance and response policy

Lighthouse 13.4.1 against production:

| Category or metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| First Contentful Paint | 0.9 s |
| Largest Contentful Paint | 1.1 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 0.9 s |

Production payloads remain below budget: JavaScript is 36,810 bytes (12.75 KB gzip), CSS is 17,234 bytes (4.55 KB gzip), no web fonts ship, and the mobile AVIF hero is 21,259 bytes.

Production returns the manifest as `application/manifest+json`; hashed JS/CSS use one-year immutable caching; `sw.js` uses `no-cache`; HTML revalidates after 30 seconds. Responses include HSTS, same-origin/default-deny CSP with only the Sociobot API in `connect-src`, `strict-origin-when-cross-origin`, `nosniff`, and a deny-by-default camera/microphone/geolocation/payment Permissions Policy. `/missing-page` returns the styled page with HTTP 404.

## Deployment identity

Fresh local-to-live SHA-256 comparisons after deployment:

| File | SHA-256 | Live match |
| --- | --- | --- |
| `index.html` | `fb6732ef33edd8355fd4894a51af5dd3e794bedec2f1557c5bd6a86c4b79c04c` | yes |
| `assets/index-BA7iIRYE.js` | `be3f7903914403c0d0e80528b0cd1073c83c042798c0b189d607c210c3e0393e` | yes |
| `assets/index-CYGIb4_D.css` | `a9ad27d33537e5afee1c6d7689495c094ce421a66c7d63fb42a5bb03d25642d3` | yes |
| `sw.js` | `5d8d988cf08d4e77b0887e1385de94b2a9a794c3e36b42d60f3a76acf050765a` | yes |
| `checkout-probe.js` | `1fc13e60e5cd552a423e3f902b6f46095888cae5111b19df653a2405585d83d5` | yes |
| `manifest.webmanifest` | `b12b4f4a36373b973a51645ad4d26eb373b98f307f76d3d73541070c71e3b5df` | yes |
| `demo/index.html` | `fb6732ef33edd8355fd4894a51af5dd3e794bedec2f1557c5bd6a86c4b79c04c` | yes |
| `privacy/index.html` | `fb6732ef33edd8355fd4894a51af5dd3e794bedec2f1557c5bd6a86c4b79c04c` | yes |
| `terms/index.html` | `fb6732ef33edd8355fd4894a51af5dd3e794bedec2f1557c5bd6a86c4b79c04c` | yes |
| `404.html` | `fb6732ef33edd8355fd4894a51af5dd3e794bedec2f1557c5bd6a86c4b79c04c` | yes |

## Remaining external condition

Production checkout registration is still absent, so revenue collection is paused. This no longer blocks the user’s review job: imports are uncapped while the endpoint returns 404, existing license restore still works, and all local/export features remain available. The real invalid-token verification endpoint returns HTTP 200 with origin-specific CORS, `Cache-Control: no-store`, and `{ "valid": false, "reason": "invalid" }`.

When the factory registers `billable-review`, the existing runtime probe will detect the healthy redirect or success response and restore the original 150-row purchase boundary automatically. A real purchase, refund, and revocation exercise requires that external registration; no substitute provider or repository-side billing change was made.
