# Billable Review — repair 3 handoff

## Status: application findings repaired and deployed; release remains blocked by billing registration

The code-addressable findings in independent verification report `9bef8078c1cc7294a7be5b0b495b1095e4aba5eb` for candidate `44f637a2881181f13d6da9b7e5b7149b032a56c9` are repaired, regression-covered, pushed to `main`, and deployed to <https://billable-review.sociobot.in/>. The application repair commit is `b2400fa`.

One release dependency remains outside this repository. At 2026-08-28 05:16 UTC, the required production checkout still returned:

```text
GET https://api.sociobot.in/api/v1/products/billable-review/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The app uses the exact checkout URL required by the paid-unlock contract. This work order contains no billing credential or product-registration tool (the skill-referenced `fleet/new-paid-product.sh` is absent), while `AGENTS.md` explicitly prohibits changing billing from this repository. No alternative provider, fake checkout, or staging endpoint was substituted. A factory billing operator must register/enable the `billable-review` production product and complete purchase/return/refund-revocation verification before release.

## Repairs

- Invoice CSV generation now prefixes formula-capable cells with an apostrophe before RFC-style CSV escaping. It covers `=`, `+`, `-`, `@`, tab, carriage return, and formula characters after leading whitespace. The transformation applies only to derived invoice output; original entry values and JSON backups remain unchanged.
- JSON restore now enforces semantic ledger invariants before opening the atomic IndexedDB replacement transaction: imported and rounded durations must be positive integers, invoiced rows require a non-blank invoice reference, written-off rows require a non-blank reason, and source non-billable rows cannot be restored into an open/approved state. Invalid restore attempts preserve the current ledger.
- Selected-row bulk actions now measure at least 44 px high. License-dialog Privacy and Terms links now each measure at least 44 × 44 px. Existing footer and core target sizing is unchanged.
- Added unit and end-to-end regressions for every repaired path, including preservation of raw formula-prefixed values in backup data and retention of existing IndexedDB rows after a semantically invalid restore.

The researched brief, local-first model, 150-row free boundary, Sociobot billing contract, artifact class, deployment class, product visual thesis, and all previously passing behavior were preserved.

## Clean repository gates

Run from the committed tree:

```sh
npm ci
npm run check
npm test
npm run build
npm run test:e2e
npm run test:pwa-update
```

- Environment: Node `v22.23.2`, npm `10.9.8`, Playwright `1.58.2`.
- `npm ci`: 72 packages installed, 0 audit vulnerabilities.
- `npm run check`: TypeScript passed. The repository has no separate lint script/configuration.
- `npm test`: 19/19 Vitest tests passed in 2 files.
- `npm run build`: type-check and production build passed; `dist/index.html` exists.
- Production payload: JS 31,718 bytes / 11.28 KB gzip; CSS 16,285 bytes / 4.40 KB gzip; no font payload; mobile AVIF hero 21,259 bytes. All supplied budgets pass.
- `npm run test:e2e`: 28/28 Playwright runs passed, 14 each on desktop Chromium and the required 390 × 844 viewport.
- `npm run test:pwa-update`: passed build, update notification, replacement-worker activation, and stale-cache removal against an isolated production copy.
- Package/consumer installation is not applicable to this static PWA.

## Browser, accessibility, privacy, and PWA evidence

- Factory `verify-url.sh` against production: HTTPS 200, 804 ms network-idle load, no console/page errors, title and `lang="en"`, one h1, one main, 0 images missing alt, and 0 unnamed buttons.
- Fresh live desktop 1440 × 1000 and mobile 390 × 844 flows reproduced the repaired formula export and corrupt-backup paths. The invoice CSV was inert while the JSON backup retained raw `=2+2`, `@SUM(1+1)`, and `+CMD` values. A blank-reference invoiced backup was rejected and existing data remained after reload.
- Live target measurements: both selected-row actions are 44 px high; modal Privacy is 47.08 × 44 px and Terms is 44 × 44 px. Mobile document width and scroll width both equal 390 px.
- Live Axe checks on empty, populated, and open-dialog states at both viewports reported 0 violations. Keyboard focus reached the skip link first with a 3 px coral outline. Reduced-motion transition duration was 0.01 ms.
- Live checkout-return interception made exactly one verification call, saved the token, stripped it from the URL, and rendered “Lifetime unlocked” without reload.
- Live offline reload retained the formula-prefix row and displayed “You’re offline. Review and exports still work.” The isolated update test also passed.
- The live free workflow made no request outside `billable-review.sociobot.in`; there were no analytics, trackers, external fonts/scripts, console errors, or page errors. `/privacy` and `/terms` each rendered a unique title, one h1, and one main.
- Real invalid-license verification returned HTTP 200, `Cache-Control: no-store`, origin-specific CORS, and `{"expires_at":null,"reason":"invalid","valid":false}`.

Evidence screenshots and the Lighthouse JSON are in `/work/.evidence/billable-review-repair-3/live/` in the worker container.

## Performance and response policy

Fresh Lighthouse 13.0.1 mobile against production:

| Category/metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| First Contentful Paint | 1.0 s |
| Largest Contentful Paint | 1.3 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.0 s |
| Total transfer | 39 KiB |

Production redirects HTTP to HTTPS. Root HTML has short revalidation; hashed assets use `public, max-age=31536000, immutable`; `sw.js` uses `no-cache`; and the manifest is served as `application/manifest+json`. CSP, Permissions Policy, HSTS, strict referrer policy, `nosniff`, XSS protection, and DNS-prefetch control are present.

## Deployment and live identity

Deployment used `/opt/fleet/lib/deploy-static.sh billable-review dist` and completed as Azure Static Web Apps deployment `ae756917-eede-4c35-8c94-6c245e1fb639`. Local and live files match exactly:

| File | SHA-256 |
| --- | --- |
| `index.html` | `1b364472b71f7de25130e5fa45f0d2cd960a397f33d0851dea1ae00345a29eeb` |
| `assets/index-Bnly40VZ.js` | `a016f491d0c76441d6ecec54cb08f78ce2aa28baafd837f755916de5dfa58a6c` |
| `assets/index-CUga3uRm.css` | `88cd712d53aeb8d99be3fe18f448e285801348dd2cd5dbf6ff8ea80341f0f2fa` |
| `sw.js` | `57547889a3cd0cf9b6de879bdb4fa348369acabd287d5496e48c4c8e0a130926` |
| `manifest.webmanifest` | `7a762598e71e2af1c8d58483b8a1af969b29696b17bfac69983e90716b98300d` |
| `privacy/index.html` | `1b364472b71f7de25130e5fa45f0d2cd960a397f33d0851dea1ae00345a29eeb` |
| `terms/index.html` | `1b364472b71f7de25130e5fa45f0d2cd960a397f33d0851dea1ae00345a29eeb` |

## Required factory release action

Register and enable the production `billable-review` one-time product in the Sociobot billing engine. Then confirm that the mandated checkout GET redirects to hosted Sociobot/Dodo checkout and complete one real purchase/return/refund-revocation exercise. No remaining application-code QA gaps are known.
