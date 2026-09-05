# Billable Review billing contract

- Price: US$19 once for unlimited imports. There is no subscription.
- Checkout: `https://api.sociobot.in/api/v1/products/billable-review/checkout` redirects to the registered Dodo Live hosted checkout.
- Return: checkout returns to `https://billable-review.sociobot.in/` with `?license=<token>`. The app stores the token under `sb_license:billable-review`, removes it from the address bar, and verifies it before showing the paid state.
- Verification: `GET https://api.sociobot.in/api/v1/products/billable-review/verify?license=<token>`. Successful verdicts are cached per token. The app checks on a new checkout return or manual restore, then automatically at most once per 24 hours.
- Response policy: a normal verification receives HTTP 200. The shared gateway can return HTTP 429 during saturation and includes a positive `Retry-After` value. Clients must not assume a fixed per-client allowance.
- Saturation behavior: the app follows a browser-readable `Retry-After` and retries once without blocking import, review, backup, or export. If CORS hides the header, the app makes no guessed retry. The same applies after a second 429. It keeps the cached verdict and asks the user to retry later.
- Data sent: checkout receives no time-entry data. Verification receives only the license token. The normal import, review, backup, and export workflow makes no third-party request.
- Tests: `npm run test:billing-live` checks the registered redirect and forces a 429 from a real browser at the product origin, requiring `Retry-After` to be CORS-readable. Browser regressions cover exposed and hidden header outcomes without buying anything or writing user data.

Sociobot/Dodo is the merchant of record. Refunds revoke the corresponding license. This repository does not embed Dodo or hold payment credentials.
