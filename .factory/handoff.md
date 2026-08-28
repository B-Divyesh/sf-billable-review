# Billable Review — repair handoff

## Status: deployed

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

Deployed `dist/` with `/opt/fleet/lib/deploy-static.sh billable-review dist` (Azure Static Web Apps deployment `c287ab8f-d47b-4ebe-947c-11a720bd326c`). `https://billable-review.sociobot.in/` returned HTTPS 200.

- `/opt/fleet/lib/verify-url.sh` reported a 918 ms desktop load, zero console/page errors, title/lang, one h1, main landmark, no images missing alt, and no unnamed buttons.
- A live 390 × 844 Chromium check found no horizontal overflow, one h1, no console/page errors, and reached **Choose a time CSV** with Tab. Direct `/privacy` and `/terms` each rendered their expected title, one h1, and a main landmark.
- SHA-256 values for live `index.html`, `assets/app.js`, `assets/index.css`, `sw.js`, and `manifest.webmanifest` exactly matched the just-deployed `dist/` files.
- Live headers include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`.

## Known gaps / next steps

No product release blockers remain. Lighthouse scoring is unavailable only because the supplied browser crashes under Lighthouse in this container; no functional browser, bundle-size, or Axe failure was observed. The static host still serves the manifest as `application/octet-stream`, assets with a short must-revalidate cache policy, and no CSP/Permissions-Policy; these are the verifier's pre-existing low hosting-hardening observations, not changed by this repair.
