# Billable Review

Billable Review is a local reconciliation board for freelancers whose timer and invoicing system are separate. Import a CSV, find stale or uncategorized work, record invoice references or write-off reasons, and export approved invoice lines.

The app is intentionally not a timer, accounting sync, payroll tool, or invoice sender. Original CSV fields and review history remain in the browser’s IndexedDB. There are no analytics, accounts, third-party scripts, or cloud uploads.

## Supported workflow

1. Export time as CSV from Toggl, Clockify, Harvest, or another timer. The importer recognizes common date, client, project, description, duration, and billable headers.
2. Review the exception-first ledger. Stale and missing-category filters are built in.
3. Approve rows, link them to an invoice reference, or write them off with a reason. Exact, 6-, 15-, and 30-minute rounding is visible and never changes the preserved original duration.
4. Export approved line items as CSV. Export/restore a JSON backup whenever you want to move or safeguard local data.

Try the isolated sample at [`/demo`](https://billable-review.sociobot.in/demo). Its data uses a separate browser-storage namespace and is discarded when you select **Start for real**.

The free edition accepts up to 150 locally stored rows. A US$19 one-time Sociobot license removes that ceiling. Checkout errors never remove the free limit. Data export, backup, accessibility, and safety behavior are never paywalled.

## Develop and verify

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
npm test
npm run check
npm run build
npm run test:e2e
npm run test:claims
npm run test:pwa-update
```

`npm run build` is the exact production build command. It type-checks and writes the deployable static site to `dist/`. The output includes direct legal routes, the manifest, icons, and the offline service worker.

Playwright is pinned to 1.58.2. Browser tests run on desktop Chromium and a 390 px mobile viewport. They cover the demo, CSV validation, reviews, backups, checkout boundaries, licenses, keyboard access, Axe, persistence, offline use, and updates.

Testable product statements are listed in [`.factory/claims.json`](.factory/claims.json). Demo storage and reset behavior are documented in [`.factory/demo.md`](.factory/demo.md).

Production JavaScript and CSS filenames are content-hashed. Azure Static Web Apps applies immutable caching and the correct manifest type. It also sends CSP, Permissions Policy, and other baseline security headers.

## Deploy

Publish the contents of `dist/` as a static site at `https://billable-review.sociobot.in`. Do not deploy the repository root. The service worker is scope-relative and requires HTTPS outside localhost.

The checkout and license verification contract uses `https://api.sociobot.in/api/v1/products/billable-review/...`; no payment provider is embedded in this application. The buy link opens the hosted checkout directly. A returned license is checked immediately, then automatically at most once per 24 hours. A manual restore makes one check per submission.

The shared Sociobot gateway normally returns HTTP 200 for a license check. During saturation it returns HTTP 429 with `Retry-After`. The app waits and retries once while the free review workflow remains usable. It does not assume a fixed request allowance. The endpoints, data sent, and live test are recorded in [`.factory/billing.md`](.factory/billing.md).

## Privacy and design

See [`/privacy`](https://billable-review.sociobot.in/privacy), [`/terms`](https://billable-review.sociobot.in/terms), [`.factory/design.md`](.factory/design.md), and [`.factory/handoff.md`](.factory/handoff.md). Generated-asset provenance and the exact image prompt are recorded in the design file and `assets/src/hero-ledger.json`.

## License

MIT. See [LICENSE](LICENSE).
