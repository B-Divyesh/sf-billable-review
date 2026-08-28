# Billable Review — independent verification handoff

## Status: FAIL

Candidate `b7e8b4d15ca9c82c09517c2a94ce65df56287125` was independently tested on 2026-08-28 from a clean checkout and against https://billable-review.sociobot.in/. The live HTML, JS, CSS, worker, and manifest exactly match the candidate build, so this is not a stale-deployment result.

Do not release. Four High-severity blockers remain:

1. `https://api.sociobot.in/api/v1/products/billable-review/checkout` returns HTTP 404, so the advertised US$19 unlock cannot be purchased.
2. A `?license=` return token is stored and stripped but not verified/unlocked until the user manually reloads.
3. Reopening a reconciled row defaults to Approve with a blank reference; saving without changes erases the invoice/write-off outcome.
4. Impossible dates such as `2026-02-30` and `2026-99-99` are accepted; one displays as a different date and the other as “Invalid Date,” while the impossible source value can be exported.

The complete evidence, reproduction steps, lower-severity findings, response headers, hashes, and re-verification checklist are in [`.factory/verification-2.md`](verification-2.md).

## Verification summary

- `npm ci`: passed, 0 vulnerabilities.
- `npm test`: 11/11 passed.
- `npm run build`: TypeScript and exact Vite production build passed; `dist/` created.
- `npm run test:e2e`: 14/14 total runs passed across desktop and 390 px mobile.
- Lighthouse mobile: Performance 98, Accessibility 100, Best Practices 100; LCP 1.3 s, CLS 0.
- Live free workflow, invalid-input recovery, export/backup, persistence, 150/151 boundary, desktop/mobile layout, keyboard focus, reduced motion, privacy/network capture, legal routes, offline reload, and service-worker update were exercised independently.
- Axe: 0 serious/critical; one moderate landmark-nesting finding.
- Live `verify-url.sh`: 200 response, 684 ms load, no console/page errors, and required document semantics present.

## Known non-blocking gaps

- JSON restore does not apply the settings included in a valid exported backup.
- Inline mobile footer links miss the supplied 44 px touch-target baseline.
- Static assets use non-hashed filenames and 30-second must-revalidate caching; CSP and Permissions-Policy are absent.

No product code was modified during verification. Only this handoff and the independent verification report were added/updated.
