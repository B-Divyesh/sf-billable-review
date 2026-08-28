# Billable Review

Billable Review is a private, offline-first reconciliation desk for freelancers whose time tracker and invoicing system are separate. Import a CSV, surface stale or uncategorized work, make rounding explicit, record invoice references or write-off reasons, and export approved invoice lines.

The app is intentionally not a timer, accounting sync, payroll tool, or invoice sender. Original CSV fields and review history remain in the browser’s IndexedDB. There are no analytics, accounts, third-party scripts, or cloud uploads.

## Supported workflow

1. Export time as CSV from Toggl, Clockify, Harvest, or another timer. The importer recognizes common date, client, project, description, duration, and billable headers.
2. Review the exception-first ledger. Stale and missing-category filters are built in.
3. Approve rows, link them to an invoice reference, or write them off with a reason. Exact, 6-, 15-, and 30-minute rounding is visible and never changes the preserved original duration.
4. Export approved line items as CSV. Export/restore a JSON backup whenever you want to move or safeguard local data.

The free edition accepts up to 150 locally stored rows. A US$19 one-time Sociobot license removes that ceiling. Data export, backup, accessibility, and safety behavior are never paywalled.

## Develop and verify

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
npm test
npm run check
npm run build
npm run test:e2e
```

`npm run build` is the exact production build command. It type-checks and writes the deployable static site to `dist/`, including `dist/index.html`, direct `/privacy` and `/terms` entry points, the web app manifest, icons, and offline service worker.

Playwright is pinned to 1.58.2. The browser tests cover desktop Chromium, a 390 px mobile viewport, CSV import and date rejection, outcome editing, backup/settings restore, license callbacks, keyboard access, all Axe findings, persisted IndexedDB state, and an offline reload.

Production JavaScript and CSS filenames are content-hashed. The included Azure Static Web Apps configuration applies immutable asset caching, the web-manifest MIME type, CSP, Permissions Policy, and other baseline response headers.

## Deploy

Publish the contents of `dist/` as a static site at `https://billable-review.sociobot.in`. Do not deploy the repository root. The service worker is scope-relative and requires HTTPS outside localhost.

The checkout and license verification contract uses `https://api.sociobot.in/api/v1/products/billable-review/...`; no payment provider is embedded in this application. The factory registers and configures the product outside this repository.

## Privacy and design

See [`/privacy`](https://billable-review.sociobot.in/privacy), [`/terms`](https://billable-review.sociobot.in/terms), [`.factory/design.md`](.factory/design.md), and [`.factory/handoff.md`](.factory/handoff.md). Generated-asset provenance and the exact image prompt are recorded in the design file and `assets/src/hero-ledger.json`.

## License

MIT. See [LICENSE](LICENSE).
