# Billable Review — repair handoff

## Status: repaired and ready for static deployment

Repair commit: `6fb73260946791e49e75511456dbd0ce301cff24` (against verifier report commit `13ef8fcc364a549eea6ecfe7658992996ff0d938`). The researched brief, offline PWA artifact class, and all previously passing free workflow behaviour were preserved.

## Release blockers repaired

1. **Invalid backup cannot erase local data.** `src/backup.ts` now validates the complete v1 backup schema (including every entry, dates, finite durations, statuses, source fields, settings, and unique IDs) before any IndexedDB write begins. Restore does not alter in-memory state until the replacement transaction has committed. `replaceEntries()` explicitly aborts on a request failure, preserving the prior transaction state.
2. **Keyboard file actions work.** The three file inputs are visible to assistive technology and remain native, tabbable controls, while their label retains the existing button/text-action presentation. They have an explicit focus-within ring and work with Enter/Space.
3. **Review groups include date.** Group and group-selection identities are client + project + ISO date; the date is displayed in every group header.

## Exact regression coverage

- Unit: complete backup is accepted; `{"version":1,"entries":[{}]}` is rejected before storage; duplicate IDs are rejected.
- Browser: import an existing row, restore that exact malformed JSON, observe the error, reload, and verify the original row remains.
- Browser: two `Acme / Website` rows on different dates plus an uncategorized row create three groups with date headers.
- Browser: Tab reaches the initial CSV picker; Enter opens it and imports; Tab subsequently reaches both Import another CSV and Restore JSON backup.

## Verification performed

All commands ran from a clean `npm ci` install (70 packages, 0 audit vulnerabilities):

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

- `npm test`: **11/11** Vitest tests passed.
- `npm run build`: passed TypeScript and Vite, created `dist/`; initial app JS is **10.82 KB gzip** and CSS **4.37 KB gzip**.
- `npm run test:e2e`: **14/14 per project, 28 total** Playwright scenarios passed on desktop Chromium and the 390 × 844 mobile project. These cover import/review/resolve/export/persistence; malformed-recovery; grouping; keyboard file operations; Axe serious/critical findings on empty and populated states (0); no third-party requests in the local workflow; and offline reload.
- Update flow: an isolated static server served a changed worker on `registration.update()`; the current controlled client displayed **“An update is ready. Reload to use it.”** after two worker fetches.
- Local static response smoke: `/`, `/privacy`, `/terms` each returned 200; the manifest returned `application/manifest+json` and contains standalone display, versioned start URL, and 192/512/maskable icons.
- Lighthouse 13.4.1 was attempted with the supplied Playwright Chromium. The browser tab crashes during Lighthouse screenshot capture (`TARGET_CRASHED`), so it did not produce a trustworthy score. This is the same container/CDP incompatibility documented by the independent verifier; the production bundle budget and browser accessibility checks above pass.

## Deployment and post-deploy checks

Deploy `dist/` as the static artifact for `billable-review` using `/opt/fleet/lib/deploy-static.sh billable-review dist`. The deployment helper supplies the static navigation fallback and `X-Content-Type-Options: nosniff` / `Referrer-Policy: strict-origin-when-cross-origin` headers. After deployment, verify `https://billable-review.sociobot.in/`, `/privacy`, `/terms`, manifest MIME type, headers, and fresh hashes for the generated app assets.

## Known gaps / next steps

No product release blockers remain. Lighthouse scoring is unavailable only because the supplied browser crashes under Lighthouse in this container; no functional browser, bundle-size, or Axe failure was observed.
