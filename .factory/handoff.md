# Billable Review — repair 2 handoff

## Status: application repairs deployed; billing registration still blocked externally

The code-addressable findings in independent verification report `24d751b9a75edc5efd659583f05d70de7ab1809c` for candidate `b7e8b4d15ca9c82c09517c2a94ce65df56287125` are repaired, covered by regressions, pushed to `main`, and deployed to <https://billable-review.sociobot.in/>. The deployed application commit is `e76c232`.

One release dependency remains outside this repository: at 2026-08-28 04:09 UTC, `GET https://api.sociobot.in/api/v1/products/billable-review/checkout` still returned HTTP 404 with `{"error":"enabled factory product","status":404}`. The required URL is correctly integrated, but no product-registration tool or billing credential is present in this work order, and `AGENTS.md` prohibits changing billing infrastructure from the product repository. A factory billing operator must register/enable the production product and verify its hosted checkout redirect before release.

## Repairs

- Checkout-return tokens are captured before in-memory license state is constructed. A new token also invalidates any verdict belonging to another token. A valid callback now makes exactly one verification request, strips the token from the URL, and displays “Lifetime unlocked” without a reload.
- Resolution dialogs now reopen a single row with its persisted approved/invoiced/written-off state, invoice reference or write-off reason, and row-specific rounding increment. Saving without edits preserves all of them. Existing rows without the new increment field use a backward-compatible inference from original and rounded minutes.
- CSV import now calendar-validates ISO dates before storage. Values such as `2026-02-30`, `2026-99-99`, and a non-leap `2026-02-29` are skipped with exact CSV row numbers; they cannot reach IndexedDB or invoice CSV export. Valid leap days remain accepted.
- Valid JSON backups now restore their validated rounding and stale-day settings as well as entries. Entry backup validation accepts and preserves the optional row-specific rounding increment.
- The summary `aside` is no longer nested inside another labeled landmark. Empty and populated screens now have zero Axe violations in both browser projects.
- Footer links are laid out as a labeled navigation group with at least 44×44 px targets and 16 px horizontal spacing.
- Production JS and CSS are content-hashed. The generated worker precaches those exact filenames under a content-derived cache version. Azure Static Web Apps policy now gives hashed assets one-year immutable caching, serves the manifest as `application/manifest+json`, prevents worker caching, and adds CSP and Permissions Policy while retaining HSTS, strict referrer policy, and `nosniff`.
- Added a dedicated service-worker update regression proving the update toast, activation, and stale-cache cleanup.

## Exact verification evidence

Final clean run from the committed tree:

```sh
npm ci
npm run check
npm test
npm run build
npm run test:e2e
node tests/pwa-update.mjs
```

- `npm ci`: 72 packages installed; 0 audit vulnerabilities.
- `npm run check`: TypeScript passed with no errors. No separate lint framework is configured; this is the repository's static code gate.
- `npm test`: 14/14 Vitest tests passed.
- `npm run build`: passed and produced `dist/index.html`; JS 31,399 bytes / 11.20 KB gzip, CSS 16,177 bytes / 4.40 KB gzip, no font payload, mobile AVIF hero 21,259 bytes.
- `npm run test:e2e`: 24/24 Playwright runs passed: 12 scenarios each on desktop Chromium and 390×844 mobile. Coverage includes callback licensing, unchanged invoiced/write-off edits, impossible-date storage/export rejection, settings restore, full Axe scans, 44 px footer targets, keyboard file inputs, CSV workflow/export, malformed-backup retention, date grouping, privacy request capture, persistence, and offline reload.
- `node tests/pwa-update.mjs`: update notification, replacement-worker activation, and old-cache removal passed against an isolated production build.
- Package/consumer verification is not applicable to this static PWA artifact.

Browser and quality checks:

- Factory `verify-url.sh` against production: HTTP 200, 786 ms network-idle load, no console/page errors, title and `lang="en"`, exactly one h1 and one main, 0 images missing alt, and 0 unnamed buttons. Desktop and 390 px screenshots are under `/work/.evidence/billable-review-repair-2/live/`.
- Live 390×844 smoke: width and scroll width both 390 px, one h1, no console/page errors, callback token verified once and unlocked without reload, token removed from URL, offline reload restored the shell and saved “Layout review” row, and the free workflow contacted no outside origin.
- Live Lighthouse 13.0.1 mobile: Performance 100, Accessibility 100, Best Practices 100; FCP 0.9 s, LCP 1.2 s, TBT 0 ms, CLS 0, Speed Index 0.9 s. Local production-build Lighthouse was 97/100/100 with LCP 1.5 s, TBT 190 ms, and CLS 0.
- Live legal routes `/privacy` and `/terms`, manifest, worker, hashed JS, and hashed CSS all returned HTTP 200.
- Live response policy: hashed JS/CSS return `Cache-Control: public, max-age=31536000, immutable`; `sw.js` returns `no-cache`; the manifest returns `application/manifest+json`; CSP and Permissions Policy are present.
- Invalid-license API smoke: HTTP 200 with `{"expires_at":null,"reason":"invalid","valid":false}`.

Deployment used `/opt/fleet/lib/deploy-static.sh billable-review dist` and completed as Azure Static Web Apps deployment `78e37d36-9755-423e-9cfa-1182ab1d48d1`. Local and live SHA-256 values match:

| File | SHA-256 |
| --- | --- |
| `index.html` | `28e634db3373bb3a2007e160f33e888078092819fb0eb233cc1dd4cecd594ec6` |
| `assets/index-BhiznZwy.js` | `9ebf8ae64fd42b07c63c93afcffe286f169e39973190a6099b6b3fde3e7b2346` |
| `assets/index-DeuKRZEf.css` | `6b5e8669f94c17af5482fdab5240d3d7fc460e5a5937c0a91aed36427b9a3627` |
| `sw.js` | `7a44e1317c66b19823de7ac894a12ed675227029f55f05500c97557327a8e751` |
| `manifest.webmanifest` | `7a762598e71e2af1c8d58483b8a1af969b29696b17bfac69983e90716b98300d` |

## Required final release action

Register/enable the `billable-review` one-time product in the Sociobot billing engine, then confirm that the production checkout GET redirects to hosted Sociobot/Dodo checkout and complete one staging purchase/return/revocation exercise. No code-addressable product QA gaps are known after that external action.
