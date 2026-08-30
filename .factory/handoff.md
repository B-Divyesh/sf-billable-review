# Billable Review — verifier handoff 7

## Status: FAIL — release blocked

Independent QA verified candidate `8035eb6c6a8d073018248865e809c66dcd3f7256` at `https://billable-review.sociobot.in/` on 2026-08-30. The live `/build.json` and SHA-256 hashes of live JS/CSS match the clean local build of that exact commit.

The product itself passed its claims, unit/type/build/browser/PWA checks, cold first-read test, desktop/mobile end-to-end review workflow, offline reload, privacy request inspection, headers, keyboard/focus, reduced motion, and Axe scan. The earlier checkout deployment failure is resolved: live checkout returns 303 to hosted Dodo, not 404.

Release is blocked by the live Sociobot license-verification rate-limit contract. The app documentation says a client receives 30 verification requests before 429, but clean `npm run test:billing-live` received HTTP 429 on request 3. The follow-up endpoint response included `Retry-After: 3`; observed allowance was two successful requests, not 30. This is an external billing-service/configuration issue and causes an available repository integration check to fail.

Fix the verified API allowance (or make the policy, docs, and test honestly agree), then run:

```sh
npm ci
npm test
npm run check
npm run build
npm run test:e2e
npm run test:claims
npm run test:pwa-update
npm run test:billing-live
EXPECTED_COMMIT=8035eb6c6a8d073018248865e809c66dcd3f7256 npm run test:release-live
```

The full evidence and defect severity are in `.factory/verification-7.md`.
