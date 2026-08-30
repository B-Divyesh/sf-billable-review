# Billable Review billing contract

- Price: US$19 once for unlimited imports. There is no subscription.
- Checkout: `https://api.sociobot.in/api/v1/products/billable-review/checkout` redirects to the registered Dodo Live hosted checkout.
- Return: checkout returns to `https://billable-review.sociobot.in/` with `?license=<token>`. The app stores the token under `sb_license:billable-review`, removes it from the address bar, and verifies it before showing the paid state.
- Verification: `GET https://api.sociobot.in/api/v1/products/billable-review/verify?license=<token>`. Successful verdicts are cached per token. The app checks on a new checkout return or manual restore, then automatically at most once per 24 hours.
- Response policy: a normal verification receives HTTP 200. The shared gateway can return HTTP 429 during saturation and includes a positive `Retry-After` value. Clients must not assume a fixed per-client allowance.
- Saturation behavior: the app follows `Retry-After` and retries once without blocking import, review, backup, or export. A second 429 keeps the cached verdict and gives a calm retry-later message; the free workflow remains available.
- Data sent: checkout receives no time-entry data. Verification receives only the license token. The normal import, review, backup, and export workflow makes no third-party request.
- Tests: `npm run test:billing-live` checks the real registered redirect and accepts the gateway's observable 200-or-429 policy, requiring `Retry-After` on 429. `npm run test:e2e -- --grep @claim:billing-saturation` deterministically covers 429, the wait, the retry, and free-workflow availability without buying anything or writing user data.

Sociobot/Dodo is the merchant of record. Refunds revoke the corresponding license. This repository does not embed Dodo or hold payment credentials.
