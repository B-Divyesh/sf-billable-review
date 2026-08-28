# Independent verification 3 — FAIL

**Candidate:** `44f637a2881181f13d6da9b7e5b7149b032a56c9` (`main`)

**Live URL:** <https://billable-review.sociobot.in/>

**Work order:** `billable-review-verify-3`

**Verified:** 2026-08-28 04:27 UTC from a clean candidate checkout with `npm ci`

## Verdict

**FAIL — do not release this candidate.** The repaired local review workflow is functional and the live application files exactly match the candidate build, but the advertised one-time purchase remains impossible: the production Sociobot checkout endpoint returns HTTP 404. Fresh testing also found that a semantically invalid backup can create an invoiced export without an invoice reference, spreadsheet-formula prefixes are passed unsanitized into the invoice CSV, and several secondary mobile targets are smaller than the required 44 px.

## Defects

### High — advertised lifetime purchase returns 404

Both live “Buy lifetime — $19” links target the required endpoint:

```text
GET https://api.sociobot.in/api/v1/products/billable-review/checkout
HTTP/2 404
content-type: application/json

{"error":"enabled factory product","status":404}
```

This was reproduced at 04:21 UTC, independently of the earlier handoff. The app advertises a US$19 one-time unlock and gates imports above 150 rows, but a customer cannot buy it. A real purchase/return/refund-revocation exercise was therefore impossible. This is an external product-registration/deployment dependency, but it is still an end-to-end release blocker under the acceptance contract.

### Medium — invoice CSV permits spreadsheet-formula injection

Client, project, and description values beginning with formula characters are emitted unchanged. A live import containing `=2+2`, `@SUM(1+1)`, and `+CMD`, followed by approval and export, produced:

```csv
Date,Client,Project,Description,Original hours,Rounded hours,Status,Invoice reference
2026-08-01,=2+2,@SUM(1+1),+CMD,1.00,1.00,Approved,
```

Quoting alone would not neutralize these values in formula-evaluating spreadsheet software. Because this CSV is expressly intended for an accounting handoff, cells whose first non-whitespace character is `=`, `+`, `-`, `@`, tab, or carriage return should be made inert in the derived invoice export. The original imported values can and should remain unchanged in the local record/backup.

### Medium — backup validation accepts an invoiced row with no reference

A user-selected JSON backup that was structurally valid but contained `status: "invoiced"` and `invoiceRef: ""` was accepted with “1 row restored from backup.” The restored row counted as reconciled and exported as:

```csv
2026-08-01,Acme,Site,Missing reference,1.00,1.00,Invoiced,
```

The interactive workflow correctly requires an invoice reference, but `parseBackup()` validates only field types. It should also enforce outcome invariants: invoiced rows require a non-empty invoice reference, written-off rows require a non-empty reason, and imported duration constraints should remain valid. This path requires a modified/corrupt backup, so it is below the severity of the normal-workflow billing failure.

### Low — some secondary touch targets are below 44 px

At the requested 390 × 844 viewport, the selected-row bulk buttons measured 40 px high. In the license dialog, the Privacy and Terms links measured 15 px high (47 × 15 and 38 × 15). Core row, filter, import, export, close, and footer controls met the 44 px target. Axe does not flag target-size failures in this configuration.

## Clean repository gates

Environment: Node `v22.23.2`, npm `10.9.8`, Playwright `1.58.2`.

```sh
npm ci
npm run check
npm test
npm run build
npm run test:e2e
npm run test:pwa-update
```

- `npm ci`: passed; 72 packages installed, 0 audit vulnerabilities.
- `npm run check`: TypeScript passed. No separate lint script/configuration exists.
- `npm test`: **14/14** Vitest tests passed in 2 files.
- `npm run build`: passed the embedded TypeScript check and exact production build; `dist/` was created.
- `npm run test:e2e`: **24/24** Playwright runs passed, 12 each on desktop Chromium and 390 px mobile.
- `npm run test:pwa-update`: rebuilt successfully, then passed update notification, replacement-worker activation, and stale-cache cleanup against an isolated copy.
- Packing/installing into a consumer is not applicable to this static PWA.

## Independent workflow evidence

- A CSV missing date and duration was rejected with “Couldn’t find a date and duration/hours column…”; the same session recovered by importing a corrected file.
- A representative CSV imported 3 valid rows, skipped an impossible `2026-02-30` date and a zero duration with exact row-number guidance, retained a source non-billable row as written off, and surfaced stale and uncategorized work.
- Client/project/date grouping, search/filter states, source non-billable exclusion, and the no-results recovery view behaved correctly.
- Linking an invoice without a reference announced the error and focused the reference input. `INV-42` plus 15-minute rounding turned 1.02 hours into a visible/exported 1.25 hours. Writing off without a reason was likewise rejected until a reason was supplied.
- Reopening the invoiced row restored its outcome, reference, and rounding. Escape closed the native dialog and returned focus to “Review Audit, phase 1.”
- Approved CSV correctly quoted a comma-containing description and excluded written-off/non-billable rows. The separate formula-safety defect is recorded above.
- JSON backup contained all valid source rows, decisions, settings, and the custom original field `Custom: keep-me`. The automated suite also verified settings restoration.
- Restoring `{"version":1,"entries":[{}]}` was rejected and all existing IndexedDB rows survived reload. The separate semantic-validation gap is recorded above.
- Persistence survived reload and a live offline reload. A fresh browser check confirmed erase cancellation retained rows, while confirmation returned to the empty state and left 0 IndexedDB entries.
- A 151-row free import stored exactly the first 150 and explained the limit. A subsequent import opened the license dialog without changing those 150 rows.
- A mocked valid checkout callback made exactly one verification request, saved the token, removed it from the URL, and displayed “Lifetime unlocked” without reload. The real invalid-token endpoint returned HTTP 200, `Cache-Control: no-store`, origin-specific CORS, and `{ "valid": false, "reason": "invalid" }`.

## Accessibility, mobile, and visual checks

- Factory `verify-url.sh`: live HTTPS 200, 826 ms network-idle load, no console/page errors, title present, `lang="en"`, one h1, one main, 0 images missing alt, and 0 unnamed buttons.
- Independent Axe scans found **0 violations of any impact** on the empty page, populated desktop board, resolution dialog, and populated 390 px board; therefore serious/critical findings were 0.
- Keyboard testing reached the native CSV input, whose visible focus was a 3 px solid coral outline. Required-field errors moved focus correctly; the dialog trapped focus natively, Escape closed it, and focus returned to the trigger.
- At 390 px, `scrollWidth === clientWidth === 390`; controls and rows stacked without clipping. The low-severity target exceptions are listed above.
- With `prefers-reduced-motion: reduce`, computed transition and animation duration was `0.01ms`; no looping/flashing motion exists.
- Visual inspection at 1440 × 1000 and 390 × 844 found clear hierarchy and product-specific styling consistent with `.factory/design.md`; the mobile version intentionally removes the header Privacy link while retaining legal links in the footer.
- `/privacy` and `/terms` each rendered HTTP 200 with a unique title, `lang="en"`, one h1, and one main landmark.

## PWA, privacy, and response policy

- Chromium parsed the live manifest with no errors. It declares standalone display, versioned `start_url`, matching colors, 192/512 icons, and a 512 maskable icon; image metadata matches those dimensions.
- After live service-worker control, browser offline mode plus reload restored the complete shell, saved `Layout review` row, and “You’re offline. Review and exports still work.” with no console errors.
- The isolated update test proved the in-app “An update is ready” notice, immediate replacement-worker activation, and old-cache deletion.
- The independent free-workflow request capture contacted only `https://billable-review.sociobot.in`. Source/build inspection found no analytics, tracking, third-party font/script, credential integration, or time-row upload. IndexedDB holds entries; localStorage holds settings and an optional license token.
- HTTP redirects to HTTPS. Live responses include HSTS, `strict-origin-when-cross-origin`, `nosniff`, a same-origin/default-deny CSP with only the Sociobot API allowed for connections, and a deny-by-default camera/microphone/geolocation/payment Permissions Policy.
- Hashed JS/CSS return `Cache-Control: public, max-age=31536000, immutable` and revalidate to 304; `sw.js` returns `no-cache`; the manifest returns `application/manifest+json` with a one-hour cache. HTML and unhashed icons use 30-second revalidation.

## Performance and budgets

Fresh Lighthouse 13.0.1 mobile run against production:

| Category/metric | Result |
| --- | ---: |
| Performance | 97 |
| Accessibility | 100 |
| Best practices | 100 |
| First Contentful Paint | 1.0 s |
| Largest Contentful Paint | 1.3 s |
| Total Blocking Time | 190 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.0 s |
| Total transfer | 44 KiB |

Lighthouse lab output has no field-INP value; max potential FID was 200 ms. Production payloads pass the supplied static budgets: JS 31,399 bytes / 11,155 bytes gzip, CSS 16,177 / 4,407 bytes gzip, no web fonts, and the mobile AVIF hero 21,259 bytes.

## Deployment identity

The live application is the candidate product tree, not a stale deployment. Fresh SHA-256 comparisons:

| File | SHA-256 | Live match |
| --- | --- | --- |
| `index.html` | `28e634db3373bb3a2007e160f33e888078092819fb0eb233cc1dd4cecd594ec6` | yes |
| `assets/index-BhiznZwy.js` | `9ebf8ae64fd42b07c63c93afcffe286f169e39973190a6099b6b3fde3e7b2346` | yes |
| `assets/index-DeuKRZEf.css` | `6b5e8669f94c17af5482fdab5240d3d7fc460e5a5937c0a91aed36427b9a3627` | yes |
| `sw.js` | `7a44e1317c66b19823de7ac894a12ed675227029f55f05500c97557327a8e751` | yes |
| `manifest.webmanifest` | `7a762598e71e2af1c8d58483b8a1af969b29696b17bfac69983e90716b98300d` | yes |
| `privacy/index.html` | `28e634db3373bb3a2007e160f33e888078092819fb0eb233cc1dd4cecd594ec6` | yes |
| `terms/index.html` | `28e634db3373bb3a2007e160f33e888078092819fb0eb233cc1dd4cecd594ec6` | yes |

## Re-verification required

1. Register/enable the production `billable-review` product and prove the checkout redirects to hosted Sociobot/Dodo checkout, then complete purchase return, restore, and revocation/refund behavior.
2. Neutralize spreadsheet formula prefixes in derived invoice CSV cells while preserving originals in local data and backups.
3. Enforce status-specific backup invariants before opening the replacement transaction; prove a rejected semantic backup retains the existing ledger.
4. Increase the selected-row bulk buttons and license-dialog legal links to at least 44 × 44 CSS px, then repeat mobile keyboard/touch and Axe checks.

No product code was modified during this verification.
