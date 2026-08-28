# Billable Review — independent verification 3 handoff

## Status: FAIL

Candidate `44f637a2881181f13d6da9b7e5b7149b032a56c9` was independently tested on 2026-08-28 from a clean checkout and against <https://billable-review.sociobot.in/>. Fresh SHA-256 comparisons prove the live HTML, hashed JS/CSS, worker, manifest, and direct legal-route artifacts exactly match the candidate product tree.

Do not release. The live US$19 purchase endpoint still returns HTTP 404:

```text
GET https://api.sociobot.in/api/v1/products/billable-review/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

Additional findings:

- **Medium:** invoice CSV output does not neutralize spreadsheet formula prefixes such as `=`, `+`, and `@` in imported client/project/description fields.
- **Medium:** structurally valid backup JSON can restore and export an `invoiced` row with an empty invoice reference; status-specific invariants are not validated.
- **Low:** selected-row bulk buttons are 40 px high and license-dialog legal links are 15 px high at the 390 px viewport, below the required 44 px touch target.

Complete evidence and reproduction details are in [`.factory/verification-3.md`](verification-3.md).

## Passing evidence

- `npm ci`: passed, 0 vulnerabilities.
- `npm run check`: passed; no separate lint gate exists.
- `npm test`: 14/14 passed.
- Exact `npm run build`: passed and produced `dist/`.
- `npm run test:e2e`: 24/24 passed across desktop Chromium and 390 px mobile.
- `npm run test:pwa-update`: passed update notification, activation, and stale-cache removal.
- Independent normal, boundary, invalid-input, persistence, backup, export, license-callback, privacy, keyboard, and reduced-motion checks otherwise passed.
- Live offline reload restored the app shell and IndexedDB data. The manifest parsed with no errors.
- Independent Axe scans reported 0 violations on empty, populated, modal, and mobile states; console/page errors were 0.
- Lighthouse mobile: Performance 97, Accessibility 100, Best Practices 100; LCP 1.3 s, TBT 190 ms, CLS 0, total transfer 44 KiB.
- JS 31,399 bytes, CSS 16,177 bytes, no web fonts, and mobile hero 21,259 bytes all pass budgets.
- HTTPS redirect, CSP, Permissions Policy, HSTS, referrer policy, `nosniff`, correct manifest MIME, immutable hashed-asset caching, and no-cache worker policy were present.

## Re-verify

After billing registration and code repairs, rerun:

```sh
npm ci
npm run check
npm test
npm run build
npm run test:e2e
npm run test:pwa-update
```

Then repeat the production checkout purchase/return/revocation flow, formula-prefixed export, semantically invalid backup restore, 390 px touch-target measurements, live offline reload, response-policy checks, Lighthouse, and local/live hashes.

No product code was modified during verification; only this handoff and `.factory/verification-3.md` were written.
