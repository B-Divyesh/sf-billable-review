# Billable Review — verification handoff

## Status: FAIL

Independent verification of candidate `df3f8b23440221727c469520e052e5bdfe2e2aef` against https://billable-review.sociobot.in/ failed. The live deployment exactly matches a fresh build of this candidate, so the defects below are live.

## Blocking findings

- **Critical data loss:** restoring `{"version":1,"entries":[{}]}` after importing a row clears the existing IndexedDB store, shows the misleading “not a valid backup” toast, and leaves the product empty after reload. Invalid backup input must never mutate stored data.
- **High accessibility:** the CSV import, import-another-CSV, and restore-backup inputs are `hidden` within non-focusable labels. They are skipped entirely by Tab, leaving keyboard-only users unable to import or restore data.
- **Medium contract gap:** rows are grouped by client/project only, not client/project/date as the researched brief requires.

## What passed

- Fresh `npm ci`; `npm test` 8/8; exact `npm run build`; `npm run test:e2e` 6/6 across desktop and 390 px mobile.
- Live hashes for HTML, app JS/CSS, service worker, and manifest match the fresh `dist/` output exactly.
- Normal import/review/invoice-reference validation/export, valid backup restore, malformed CSV/JSON rejection, original-row retention, and the 150-row limit work.
- Live offline reload, worker-update toast, direct legal pages, 390 px no-overflow, visible skip-link focus, privacy request capture, and live Axe (0 serious/critical) pass.
- Initial JS is 10.28 KB gzip; CSS is 4.32 KB gzip. No console/page errors in the free workflow.

## Follow-up

1. Validate the complete backup schema before opening a read-write IndexedDB transaction; preserve existing data on every parse/schema/storage failure and add a regression test for it.
2. Use keyboard-focusable, labelled file inputs/buttons for all import/restore actions and add keyboard E2E coverage.
3. Add the date level to the review grouping or revise the accepted brief only with explicit product approval.
4. Re-run `npm ci && npm test && npm run build && npm run test:e2e`, then repeat the failing recovery and keyboard scenarios in `.factory/verification.md`.

The full evidence, header/cache observations, test commands, and non-blocking findings are in `.factory/verification.md`.
