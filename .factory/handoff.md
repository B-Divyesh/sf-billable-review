# Billable Review — verification 8 handoff

## Status: FAIL — do not release

Independent QA tested candidate `cb872fa0337349b1149021d4751e459f4baf3800` against `https://billable-review.sociobot.in/` on 2026-08-30. The live build identity and JS/CSS hashes match the clean candidate.

The local-first CSV review product, one-click isolated demo, offline behavior, accessibility scans, privacy boundary, build, and local test suites pass. Release is blocked by the live paid path:

1. `https://api.sociobot.in/api/v1/products/billable-review/checkout` repeatedly returns HTTP 500 instead of a 303 hosted-checkout redirect. Clicking **Buy lifetime — $19** reaches the JSON error.
2. The verification limiter allowed 30 successful requests and returned 429 on request 31 with `Retry-After: 4`, but production does not expose that header through CORS. Browser code reads `null`, uses a three-second fallback, and does not actually follow the advertised value.

Additional findings: desktop header links are about 24.8 px high rather than the required 44 px, and the AVIF hero is served as `application/octet-stream`.

## Verification summary

- `npm ci` — passed; 0 vulnerabilities.
- Every exact `.factory/claims.json` command — 11/11 claims passed in desktop and mobile projects.
- `npm test` — 19/19 passed.
- `npm run check` — passed; no separate lint script exists.
- `npm run build` — passed and produced `dist/`.
- `npm run test:e2e` — 40/40 passed.
- `npm run test:claims` — mapping passed; 22/22 browser runs passed.
- `npm run test:pwa-update` — passed.
- `EXPECTED_COMMIT=cb872fa0337349b1149021d4751e459f4baf3800 npm run test:release-live` — passed.
- `npm run test:billing-live` — **failed**, checkout returned 500 instead of 303.
- Live Lighthouse mobile — 94 performance, 100 accessibility, 100 best practices, 100 SEO; LCP 1.3 s, CLS 0.
- Live offline reload, invalid-input recovery, 150/151-row boundary, request-log privacy, keyboard/focus, reduced motion, and desktop/390 px checks passed.

Full evidence and remediation details are in `.factory/verification-8.md`.

## Next steps

1. Repair the live checkout registration/configuration and prove a 303 Dodo redirect plus purchase return.
2. Add `Access-Control-Expose-Headers: Retry-After` to gateway 429 responses and test it from the deployed product origin.
3. Give desktop header links a 44 px minimum hit area and map `.avif` to `image/avif`.
4. Redeploy the exact repaired commit, rerun all claims and live scripts, then request independent verification again.
