# Independent verification — FAIL

**Candidate:** `df3f8b23440221727c469520e052e5bdfe2e2aef` (`main`)  
**Live URL:** https://billable-review.sociobot.in/  
**Verified:** 2026-08-28, from a clean checkout with `npm ci`

## Verdict

**FAIL — do not release this candidate.** The restore error path can silently and irreversibly delete the user's local ledger. In addition, the primary CSV import control and JSON restore control cannot be operated with a keyboard. Both contradict the local-first/data-ownership and keyboard accessibility acceptance criteria.

## Release-blocking defects

### Critical — malformed backup erases local time rows

`src/main.ts` accepts any JSON with `version: 1` and an `entries` array. It sets `entries` and calls `replaceEntries()` before the UI can safely render/validate each item. A valid JSON file with an invalid row (`{"version":1,"entries":[{}]}`) causes the IndexedDB transaction to clear the existing `entries` store and then fail when inserting an item without its key. The catch handler only shows “That is not a valid Billable Review backup.”

Fresh browser evidence:

1. Imported one valid row; IndexedDB contained the complete entry.
2. Restored the malformed-but-valid JSON above.
3. The app displayed the rejection toast, but IndexedDB `getAll()` returned `[]` immediately afterwards.
4. After reload the app showed its empty state; the prior row was gone.

This is irreversible local data loss from invalid user input, despite the UI claiming the backup was rejected.

### High — core file actions are unreachable by keyboard

The CSV import and JSON restore controls are `hidden` file inputs inside non-focusable `<label>` elements. On a fresh page, the observed Tab order was:

`Skip to review` → `Billable Review` → `Privacy` → `Get lifetime` → `Buy lifetime — $19` → footer links → document body.

Neither “Choose a time CSV” nor its input receives focus, so a keyboard-only user cannot begin the product’s main workflow. “Import another CSV” and “Restore JSON backup” use the same pattern. This fails the stated keyboard-only acceptance requirement; Axe does not flag this interaction failure.

## Other defects / gaps

### Medium — review groups omit the required date level

The brief requires groups by client/project/date. The implementation builds groups from only `client` and `project`. With two open `Acme / Website` rows dated 2026-07-01 and 2026-08-26 plus one uncategorized row, the board rendered 2 groups, not the expected 3 date-specific groups. Dates are row metadata rather than a grouping level.

### Low — live static-cache and hardening policy is limited

The live JS, CSS, worker, and manifest all return `Cache-Control: public, must-revalidate, max-age=30`; the app asset filenames are not content-hashed. The service worker does precache the shell, so offline behavior works, but this does not meet the supplied long-lived immutable hashed-asset guidance. The live responses include HSTS, `Referrer-Policy`, and `X-Content-Type-Options`, but no `Content-Security-Policy` or `Permissions-Policy`; the manifest is served as `application/octet-stream`.

## Passed evidence

### Clean install, automated checks, and build

- `npm ci`: completed; audit reported 0 vulnerabilities.
- `npm test`: **8/8** Vitest tests passed.
- `npm run build`: passed TypeScript and Vite, then generated direct legal-route files. `dist/` exists.
- `npm run test:e2e`: **6/6** Playwright tests passed: desktop Chromium and 390 px mobile import/resolve/export/persistence, Axe, and offline reload.
- Fresh build payload: `app.js` 28,106 bytes (10.28 KB gzip); CSS 15,686 bytes (4.32 KB gzip); total initial JS is far below the 200 KB budget. Mobile AVIF hero is 21,259 bytes.
- A later Lighthouse attempt could not complete because the supplied Playwright Chromium (Chrome 145) crashed under Lighthouse 13.4.1/CDP in this container. This is an environment/tool incompatibility, not a passing Lighthouse result; bundle metrics and Playwright browser checks above were collected instead.

### Product workflow and recovery coverage

- Representative CSV: imported billable rows, excluded source non-billable work from the open board, showed stale/uncategorized signals, preserved original CSV fields in IndexedDB, and displayed the expected review board.
- Invoice recovery: selecting “Link invoice” without a reference announced “Add the invoice reference before saving.” and moved focus to the reference field. Supplying `INV-42` reconciled the row; exported CSV contained the reference and original/rounded-hour fields.
- Invalid CSV (`Client,Notes` only) was rejected with the required-column message. Malformed JSON (`{bad`) was rejected without changing data. A schema-valid backup restored one complete entry successfully. The malformed-schema data-loss case above is the failing recovery path.
- Free-tier boundary: a 151-row import stored 150 and clearly reported that only the first 150 were imported; a further row opened the license dialog while retaining the data.

### PWA, accessibility, privacy, and responsive checks

- Live PWA: after initial online load and service-worker control, `context.setOffline(true)` followed by reload showed the complete shell, its h1, and “You’re offline. Review and exports still work.” with no page/console errors.
- Worker-update simulation against an isolated copy of this exact build: changing the worker cache version, calling `registration.update()`, and observing the app produced “An update is ready. Reload to use it.”; the replacement worker progressed to activating.
- Live Axe Playwright scan: 0 violations, including 0 serious/critical. The 390 px viewport had no horizontal overflow (`scrollWidth === clientWidth === 390`) and the skip link had a visible 3 px solid focus outline. The keyboard defect above remains outside Axe's rule set.
- Free workflow browser request capture found no outbound origins and no console/page errors. Source/build inspection found no analytics, third-party script, font CDN, or CSV upload path; data uses IndexedDB/localStorage. The documented license API is only contacted when a token is present.
- Direct live `/privacy` and `/terms` each returned their expected title, h1, and one `<main>`.

### Deployment identity and response policies

Fresh local build SHA-256 values exactly matched the live deployment for all checked executable/product files:

| File | SHA-256 match |
| --- | --- |
| `index.html` | yes |
| `assets/app.js` | yes |
| `assets/index.css` | yes |
| `sw.js` | yes |
| `manifest.webmanifest` | yes |

Live headers confirmed HTTPS/HSTS, `strict-origin-when-cross-origin`, and `nosniff`; cache and missing policy observations are recorded above.

## Re-verify after fixes

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Then manually repeat the malformed backup test with existing imported data and verify the prior IndexedDB records remain intact, tab through every empty and populated-board control, and import rows spanning multiple dates for the same client/project to confirm date-level grouping.
