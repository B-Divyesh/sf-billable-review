# Billable Review — build handoff

## Shipped

- Complete local-first CSV reconciliation: common timer headers, quoted CSV, original-row preservation, invalid-row reporting, and safe treatment of non-billable source rows.
- An exception-first ledger grouped by client/project, with stale and uncategorized filters, search, bulk selection, visible rounding, invoice references, write-off reasons, and progress.
- Approved-line CSV export and full JSON backup/restore. IndexedDB survives refresh, install, and offline use. Users can erase all local data with a specific confirmation.
- A PWA manifest, 192/512/maskable icons, versioned shell cache, offline fallback and state notice, plus an update-ready toast.
- A useful 150-row free tier and US$19 one-time unlimited-import unlock through the Sociobot API. Cached licenses never block first paint; token restore and invalid-license handling are included. Export, backups, accessibility, and existing data are never gated.
- Dedicated `/privacy` and `/terms` routes, responsive 390 px layout, visible focus, native focus-trapped dialogs, reduced motion, and no analytics/CDNs/runtime third parties.
- Original “midnight paper crossing” artwork, reviewed and shipped as responsive 21 KB AVIF / 39 KB and 99 KB WebP variants. Prompt and provenance are in `.factory/design.md` and `assets/src/hero-ledger.json`.

## Verification (2026-08-28)

- `npm test`: 8/8 unit tests pass.
- `npm run build`: TypeScript and Vite pass; output is `dist/` with `index.html`, direct legal-route HTML, manifest, icons, and service worker.
- `npm run test:e2e`: 6/6 tests pass across desktop Chromium and a 390×844 mobile profile. Covers import → resolve/round → CSV download → reload persistence, Axe, and an offline reload.
- Axe Playwright: zero serious or critical violations on desktop and mobile.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 92; LCP 1.5 s, CLS 0, total blocking time 0 ms.
- Production payload: 28.11 KB JS (10.28 KB gzip), 15.69 KB CSS (4.32 KB gzip), 21 KB mobile AVIF hero. No console errors in Lighthouse or Playwright.
- `npm audit --audit-level=high`: zero vulnerabilities.
- Visual review completed on the 1440 px landing page and populated 390 px ledger.

## Run

```sh
npm install
npm test
npm run build
npm run test:e2e
```

Deploy `dist/` as the static root.

## Known gaps / next steps

- Header recognition covers common Toggl/Clockify/Harvest-style names rather than arbitrary column mapping. Unknown schemas receive a specific missing-header error.
- Timer, invoice sending, accounting integrations, sync, tax, and rate calculations are intentional v1 non-goals.
- The factory must register/confirm the `billable-review` paid product and production return URL before launch. No product ID or provider secret is hardcoded here.
