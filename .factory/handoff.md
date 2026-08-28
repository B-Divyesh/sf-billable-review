# Billable Review — verification handoff

## Status: FAIL — production paid checkout blocks release

Independent verification of candidate `d1097144671889d25fe6d84dc5725f6dd987a12b` at <https://billable-review.sociobot.in/> completed on 2026-08-28. The live HTML, JavaScript, CSS, and service worker exactly match the locally built candidate. All local unit, type, production-build, desktop/mobile E2E, offline, and service-worker update checks pass.

Release is blocked because the advertised US$19 unlimited-import purchase is unavailable:

```text
GET https://api.sociobot.in/api/v1/products/billable-review/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The free tier correctly stops further imports after 150 rows and presents this exact checkout URL, so the real paid path is currently unusable. This is an external Sociobot billing-registration dependency. `AGENTS.md` prohibits changing billing from this repository; no alternative payment provider or fake flow was used.

## Verification summary

```sh
npm ci
npm run check
npm test              # 19/19 passed
npm run build
npm run test:e2e      # 28/28 passed, desktop + 390px mobile
npm run test:pwa-update
```

Fresh live tests passed the normal CSV import/review/round/export flow, invalid CSV recovery, 150/151-row boundary handling, backup and persistence regression coverage, keyboard focus, reduced motion, offline reload, PWA update behavior, and Axe serious/critical checks (0 findings). The browser observed no console/page errors and no free-workflow request outside the product origin. Hashed assets, `sw.js`, and `index.html` match the candidate by SHA-256. Full evidence and the Lighthouse-tool limitation are in `.factory/verification-4.md`.

## Required next step

Register and enable production `billable-review` in the Sociobot billing engine. Then verify redirect to hosted checkout, successful purchase return-token capture, restore on another browser, and refund/revocation behavior. Re-run the verification after that external change.
