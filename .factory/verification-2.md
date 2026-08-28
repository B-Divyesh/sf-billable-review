# Independent verification 2 — FAIL

**Candidate:** `b7e8b4d15ca9c82c09517c2a94ce65df56287125` (`main`)  
**Live URL:** https://billable-review.sociobot.in/  
**Work order:** `billable-review-verify-2`  
**Verified:** 2026-08-28 UTC from a clean candidate checkout with `npm ci`

## Verdict

**FAIL — do not release this candidate.** The free, local-first review workflow is broadly functional and the live files exactly match the candidate build, but four release-blocking defects remain. The advertised purchase endpoint is unavailable, a checkout-return license is not verified or unlocked until a manual reload, editing an already reconciled row can silently erase its outcome, and impossible dates can reach an invoice-line export.

## Release-blocking defects

### High — the advertised one-time purchase endpoint returns 404

Both “Buy lifetime — $19” links point to the required Sociobot endpoint, but a fresh GET to that exact live target returned:

```text
HTTP/2 404
content-type: application/json

{"error":"enabled factory product","status":404}
```

Target tested: `https://api.sociobot.in/api/v1/products/billable-review/checkout`. This prevents any user from buying the advertised unlock. The verifier did not change billing or deployment state.

### High — a returned license is not verified or unlocked on first load

Fresh browser evidence against the live origin, with the documented verification request intercepted to return `{ "valid": true }`:

1. Opened `https://billable-review.sociobot.in/?license=qa-valid-token`.
2. The app saved `qa-valid-token` under `sb_license:billable-review` and stripped it from the URL.
3. It made **0** verification calls and still displayed **“Get lifetime”**.
4. After a manual reload it made **1** verification call and displayed **“Lifetime unlocked”**.

The module reads `license = getLicense()` before `init()` calls `captureLicense()`, then tests the stale in-memory `license.token`. A paid buyer therefore lands on a page that still looks locked until they discover that reloading fixes it.

### High — reviewing a reconciled row can silently erase its invoice outcome

Fresh live reproduction:

1. Imported one row and linked it to invoice `INV-42`.
2. Opened the Reconciled filter and selected **Review** on that row.
3. The dialog reopened with **Approve** selected, a blank reference, and Exact rounding rather than the stored outcome.
4. Selected **Save outcome** without making a change.
5. IndexedDB now held `{ "status": "approved", "invoiceRef": "" }`; the invoice association was gone.

Written-off rows have the same reset path, and row-specific rounding can also be replaced by the current default. The main job is to retain an explicit invoice reference or write-off, so an edit/review action must present the saved decision rather than destructive defaults.

### High — impossible dates are accepted, misrepresented, and exportable

A live CSV containing `2026-02-30` and `2026-99-99` produced the success message **“2 rows imported.”** The first group displayed **Mar 2, 2026** while IndexedDB preserved `2026-02-30`; the second displayed **Invalid Date**. After approving the first row, the exported invoice CSV contained:

```csv
2026-02-30,Acme,Site,Impossible day,1.00,1.00,Approved,
```

The importer accepts any `YYYY-MM-DD` prefix without checking that it is a real calendar date. This fails invalid-input recovery and can place a visibly different, impossible date in accounting handoff data.

## Other defects

### Medium — JSON restore validates but does not restore exported settings

The JSON backup includes `settings`, and restore rejects malformed settings, but the accepted settings are never applied. With current settings `{ rounding: 0, staleDays: 365 }`, restoring a valid backup containing `{ rounding: 30, staleDays: 1 }` reported success while the settings dialog still showed Exact / 365 days. Entry data did restore; this is an incomplete backup round trip rather than data loss.

### Low — board landmark nesting and footer touch targets miss the supplied baseline

- Axe found one moderate `landmark-complementary-is-top-level` issue on the populated board: the summary `<aside>` is nested inside the labeled review-board region. Serious/critical findings were **0**.
- At 390 px, the inline Privacy, Terms, and art-note footer links measured about 16 px high rather than the required 44 px target, with narrow spacing. Core controls use appropriately enlarged labels/buttons.

### Low — production caching and hardening are minimal

- HTML, JS, CSS, service worker, and manifest all return `Cache-Control: public, must-revalidate, max-age=30`; app assets are not content-hashed and do not receive long-lived immutable caching.
- HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, and `X-DNS-Prefetch-Control` are present. `Content-Security-Policy` and `Permissions-Policy` are absent.
- The manifest is served as `application/octet-stream`, although Chromium's `Page.getAppManifest` parsed it with no errors, so install metadata remains usable.

## Passing evidence

### Clean install, declared gates, and exact build

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

- Environment: Node `v22.23.2`, npm `10.9.8`.
- `npm ci`: 70 packages installed; 0 audit vulnerabilities.
- `npm test`: **11/11** Vitest tests passed in 2 files.
- No standalone lint script exists. `npm run build` ran the available `tsc --noEmit` check, Vite production build, and static-route generation successfully; `dist/` was created.
- `npm run test:e2e`: **14/14 total** Playwright runs passed (7 scenarios on desktop Chromium and the same 7 at 390 × 844).
- Production payload: app JS 29,977 bytes / 10.82 KB gzip; CSS 15,991 bytes / 4.37 KB gzip; no font payload; 960 px AVIF hero 21,259 bytes. These pass the 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB mobile-hero budgets.

### Independent product workflow

- Rejected a header-only CSV and a CSV missing date/duration with actionable live-region messages, then successfully imported a corrected file.
- Imported valid decimal-hour rows, a source non-billable row, an uncategorized row, and invalid/zero rows. The app stored 3 valid rows, warned that 2 rows were skipped, surfaced stale and uncategorized exceptions, and grouped by client/project/date.
- Linking an invoice without a reference announced **“Add the invoice reference before saving.”** and moved focus to the reference field. Linking `INV-42` with 15-minute rounding displayed `1.25 h`, the original `1.02 h`, and the invoice reference.
- Writing off without a reason was rejected; providing **“Outside scope”** reconciled the row.
- Approved/invoiced CSV export contained the correct headers, escaped description, original hours, rounded hours, status, and `INV-42`; written-off work was excluded.
- JSON backup contained all 3 entries, original custom CSV field `keep-me`, decisions, and settings. Restoring `{"version":1,"entries":[{}]}` was rejected; all 3 prior IndexedDB rows remained after reload.
- Destructive erase cancellation retained all rows. Confirming erase returned to the empty import state.
- A 151-row import stored exactly the first 150, clearly reported the boundary, and preserved those 150 when a subsequent import opened the license dialog.
- IndexedDB state survived refresh and closing/reopening the tab.

### Accessibility, responsive behavior, and design

- Live `verify-url.sh`: HTTPS 200, 684 ms network-idle load, 0 console/page errors, title and `lang="en"`, one h1, one main landmark, 0 images missing alt, and 0 unnamed buttons.
- Independent Axe scans on empty and populated states found **0 serious/critical** violations. The single moderate populated-board finding is recorded above.
- Keyboard checks reached the skip link first and the native CSV input by Tab; Enter opened the picker. The skip link showed a 3 px coral focus outline. Modal validation moved focus to the failing field, Escape closed the dialog, and focus returned to its trigger.
- At 390 × 844, the board had no horizontal overflow (`scrollWidth === clientWidth === 390`), one h1, intact stacked controls, and no console/page errors. Desktop and mobile screenshots were reviewed for clipping and hierarchy.
- With `prefers-reduced-motion: reduce`, computed UI transition duration was `0.01ms`; no looping or flashing motion exists.
- The product-specific design thesis documents its palette, type, spacing, motion, and original generated-art provenance. Visual inspection matched that thesis.

### PWA, offline, privacy, and outbound requests

- The live manifest has standalone display, versioned start URL, matching colors, 192/512 icons, and a 512 maskable icon. Chromium parsed it with no manifest errors; image metadata confirmed the declared dimensions.
- After initial online control, an offline reload restored the complete saved board, 2 rows, and **“You’re offline. Review and exports still work.”**
- Isolated update test: changed the worker cache version, called `registration.update()`, observed **“An update is ready. Reload to use it.”**, an activated replacement controller, and only the new cache.
- The free workflow contacted only `https://billable-review.sociobot.in`; there were no analytics, trackers, cloud upload, third-party scripts/fonts, console errors, or page errors. Source/build inspection found only the documented Sociobot checkout and license-verification calls.
- The real invalid-license verification endpoint returned HTTP 200 with `no-store`, correct live-origin CORS, and `{ "valid": false, "reason": "invalid" }`.
- `/privacy` and `/terms` each returned 200 and rendered the expected unique title, one h1, and one main landmark.

### Performance

Fresh Lighthouse 13.0.1 mobile run against the live URL:

| Category/metric | Result |
| --- | ---: |
| Performance | 98 |
| Accessibility | 100 |
| Best practices | 100 |
| First Contentful Paint | 1.0 s |
| Largest Contentful Paint | 1.3 s |
| Total Blocking Time | 160 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.0 s |

This passes the supplied Lighthouse, LCP, and CLS thresholds. Lighthouse lab data does not produce a field INP value; max potential FID was 190 ms.

### Deployment identity

Fresh build files exactly matched the live deployment:

| File | SHA-256 |
| --- | --- |
| `index.html` | `ae1b21432e4d6d814998e56a316f0840809fbfd80d780278ccb270a901956177` |
| `assets/app.js` | `ff7a42e2e9c6f5c56360edba28e9feb7d693c240c66dc28c846eaaa96d2e5d1a` |
| `assets/index.css` | `75e8f6293461a97addadc965800d157fdaf5b91da082a241162ece3a262b3ad9` |
| `sw.js` | `1e567d94f3fedd567645168b0f76de1906898e1ef94bb8356f3f625d288b584a` |
| `manifest.webmanifest` | `6d6cbe7796d8e22339b9493cddd9665e0c0b659801dfb8fda6234b7e5d2476de` |

The deployment under test is therefore the candidate product build; the failures are not explained by stale static files.

## Required re-verification

1. Register/enable the live billing product and confirm the checkout GET redirects to the hosted Sociobot/Dodo checkout.
2. Capture the query-string license before constructing in-memory license state, then prove a valid callback verifies and unlocks without reload.
3. Prepopulate the resolution dialog from stored status, reference/reason, and rounding; prove opening and saving an unchanged invoiced or written-off row preserves it.
4. Validate actual calendar dates before storage and prove impossible dates are rejected with row-specific recovery guidance.
5. Apply accepted backup settings, correct the board landmark structure and small footer targets, then rerun all commands and live checks above.
