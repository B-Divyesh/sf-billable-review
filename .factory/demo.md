# Billable Review demo

- URL: `https://billable-review.sociobot.in/demo` (local: `http://127.0.0.1:4173/demo`). `/?demo=1` also enters the sandbox.
- Entry: select **Try it with sample data** on the first screen. The review board is already populated after one click.
- Sample: five realistic freelancer rows across Northstar Studio and Field & Form, including an invoice-linked row, an approved row, stale work, missing client data, and source non-billable time.
- Isolation: demo entries use IndexedDB database `demo:billable-review`; demo settings use localStorage key `demo:br:settings`. The normal `billable-review` database and `br:settings` key are never read in demo mode.
- Reset: **Reset demo** atomically replaces the sandbox with the bundled sample.
- Exit: **Start for real** clears the demo database and demo settings before returning to `/`. Real ledger data remains untouched.
