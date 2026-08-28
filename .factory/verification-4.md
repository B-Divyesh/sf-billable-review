# Independent verification 4 — FAIL

**Candidate:** `d1097144671889d25fe6d84dc5725f6dd987a12b` (`main`)

**Live URL:** <https://billable-review.sociobot.in/>

**Work order:** `billable-review-verify-4`

**Verified:** 2026-08-28 05:26–05:35 UTC from a clean candidate checkout.

## Verdict

**FAIL — do not release.** The deployed application exactly matches this candidate and the local-first CSV review workflow passes the fresh automated and manual checks. However, the advertised US$19 unlimited-import unlock cannot be purchased: the required production Sociobot checkout endpoint returns HTTP 404. Imports over the 150-row free limit are consequently a dead end. This is a factory billing-registration dependency rather than a product-code defect, but it blocks the real end-to-end paid workflow required by the product contract.

## Defects

### High — production checkout is not enabled

Fresh evidence at 05:33 UTC:

```text
GET https://api.sociobot.in/api/v1/products/billable-review/checkout
HTTP/2 404
content-type: application/json

{"error":"enabled factory product","status":404}
```

The live 151-row boundary test imported the first 150 rows and retained them. A subsequent one-row import opened the unlock dialog, whose Buy lifetime link is exactly the endpoint above. The real purchase redirect, return-token, restore, and refund/revocation journey cannot therefore be exercised. The real invalid-token verification endpoint is otherwise reachable and returned HTTP 200, `Cache-Control: no-store`, and `{"expires_at":null,"reason":"invalid","valid":false}`.

**Required external action:** register/enable production product `billable-review` in the Sociobot billing engine, then re-verify hosted checkout redirect, completed purchase return, license restore, and refund/revocation behavior. No payment/provider substitute should be added to this repository.

No further application defects were found in this verification.

## Clean local gates

Environment: Node `v22.23.2`, npm `10.9.8`, Playwright `1.58.2`.

```sh
npm ci
npm run check
npm test
npm run build
npm run test:e2e
npm run test:pwa-update
```

- `npm ci`: passed; 72 packages installed; audit reported 0 vulnerabilities.
- `npm run check`: passed. There is no separate lint script/configuration.
- `npm test`: **19/19** Vitest tests passed in 2 files.
- `npm run build`: passed, including TypeScript; emitted `dist/`.
- `npm run test:e2e`: **28/28** Playwright runs passed, each test at desktop Chromium and 390 × 844 mobile.
- `npm run test:pwa-update`: passed update notice, replacement-worker activation, and stale-cache removal against an isolated production copy.
- Consumer pack/install is not applicable to this static PWA.

## Product and recovery evidence

- A representative Clockify CSV imported, grouped rows by client/project/date, surfaced stale and uncategorized time, permitted category edits and 15-minute rounding, persisted through reload, and exported approved CSV line items.
- Invalid CSV (`nothing useful`) was rejected with “Couldn’t find a date and duration/hours column. Rename those CSV headers and try again.” The same session then imported a valid file.
- A 151-row input imported exactly 150 rows and explained the free limit. A 152nd row preserved those 150 rows and opened the unlock dialog without silently discarding data.
- Existing automated coverage passed for impossible dates, malformed and semantically invalid backups with existing-data retention, formula-safe derived invoice CSV while preserving raw backup data, invoice/write-off requirements, JSON settings restore, persistence, and grouping.

## Browser, accessibility, privacy, and PWA evidence

- Factory `verify-url.sh` passed against production: HTTPS 200, 703 ms network-idle load, no console/page errors, `lang="en"`, one h1, one main, zero images missing `alt`, and zero unnamed buttons.
- Fresh live desktop (1440 × 1000) and mobile (390 × 844) runs reported no console errors or page errors. Empty and populated views each had one `h1` and one `main`; mobile `scrollWidth === clientWidth === 390`.
- Axe Playwright scans on empty and populated live views found **0 serious or critical violations** at both viewports.
- Keyboard focus exposed a 3 px outline; the native CSV control was operable. With reduced motion, computed behavior was `auto|1e-05s` (instant); no looping/flash behavior was observed.
- Live free-workflow requests contacted only `https://billable-review.sociobot.in`; no analytics, tracking, remote fonts, scripts, or user-data upload were observed. Entries use IndexedDB and settings/license state use localStorage. `/privacy` and `/terms` each rendered their own title, one h1, and one main.
- After service-worker control, setting the live browser context offline and reloading restored the shell and the explicit offline notice: “You’re offline. Review and exports still work.” The update test above separately covered update activation and stale-cache cleanup.

## Deployment identity, response policy, and budgets

Fresh SHA-256 comparisons prove the live deployment is this candidate build:

| File | SHA-256 | Live match |
| --- | --- | --- |
| `index.html` | `1b364472b71f7de25130e5fa45f0d2cd960a397f33d0851dea1ae00345a29eeb` | yes |
| `assets/index-Bnly40VZ.js` | `a016f491d0c76441d6ecec54cb08f78ce2aa28baafd837f755916de5dfa58a6c` | yes |
| `assets/index-CUga3uRm.css` | `88cd712d53aeb8d99be3fe18f448e285801348dd2cd5dbf6ff8ea80341f0f2fa` | yes |
| `sw.js` | `57547889a3cd0cf9b6de879bdb4fa348369acabd287d5496e48c4c8e0a130926` | yes |

- HTTPS responses provide HSTS, CSP restricting `connect-src` to self plus the required Sociobot API, `strict-origin-when-cross-origin`, `nosniff`, and a deny-by-default camera/microphone/geolocation/payment Permissions Policy.
- HTML revalidates at 30 seconds; `sw.js` is `no-cache`; the manifest has the correct `application/manifest+json` type. The deployed hashed JS/CSS are immutable for one year.
- Build output is 31,718-byte JS (11.28 KB gzip), 16,285-byte CSS (4.40 KB gzip), no web-font payload, and a 21,259-byte mobile AVIF hero. All supplied static bundle budgets pass.
- Lighthouse 13.4.1 could not yield a fresh score in this container: its first run had no Chrome path and the supplied Playwright Chromium then closed its CDP connection during navigation. This is not recorded as a passing Lighthouse result; the independent Playwright accessibility, responsive, browser-error, and transfer-budget evidence above was collected successfully.

No product code was modified during this verification.
