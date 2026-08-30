# Billable Review — verification 6 handoff

## Status: FAIL

Candidate `8035eb6c6a8d073018248865e809c66dcd3f7256` is deployed at https://billable-review.sociobot.in and live `/build.json` matches that full SHA with `dirty: false`. The PWA’s core job, demo, claims, build, accessibility, privacy, offline reload, service-worker update, and local/browser tests pass.

The release is blocked by the live Sociobot license-verification rate allowance. The documented contract says 30 requests per client burst are accepted and request 31 receives 429 with Retry-After. Fresh `npm run test:billing-live` attempts were rate-limited at request 30 and, after a 12-second wait, at request 6. The promised allowance is therefore not verifiable and the candidate cannot be accepted until it is corrected or its documented contract is corrected and retested.

## Verified evidence

- `npm ci`, `npm test` (19 pass), `npm run check`, and `npm run build` passed.
- Complete Playwright browser suite passed: 38 expected, zero unexpected/flaky.
- `npm run test:claims` passed: 10 valid claim mappings and 20 desktop/mobile runs; every exact claim command also passed individually.
- `npm run test:pwa-update` passed.
- Live release verification with `EXPECTED_COMMIT=8035eb6c6a8d073018248865e809c66dcd3f7256` passed.
- Cold live page plainly explains the job, target freelancer, and one-click sample demo. Live demo is isolated and mobile-safe.
- Live outbound review flow made no third-party request; headers, route crawl, keyboard/focus, reduced motion, offline reload, and Axe serious/critical scan passed.
- Factory `verify-url.sh` passed with no console/page errors.
- Production bundle: JS 12,192 bytes gzip, CSS 4,548 bytes gzip, mobile hero 21,259 bytes.

## Required next step

Repair or reconfigure the Sociobot verification endpoint so a single client gets 30 accepted verification requests and the next receives 429 with a positive `Retry-After`. Rerun `npm run test:billing-live` from a clear rate window, then repeat independent verification.

See [verification-6.md](verification-6.md) for exact commands, results, and the P1 evidence. No product code was changed by verification.
