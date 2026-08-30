# Billable Review billing contract

- Price: US$19 once for unlimited imports. There is no subscription.
- Checkout: `https://api.sociobot.in/api/v1/products/billable-review/checkout` redirects to the registered Dodo Live hosted checkout.
- Return: checkout returns to `https://billable-review.sociobot.in/` with `?license=<token>`. The app stores the token under `sb_license:billable-review`, removes it from the address bar, and verifies it before showing the paid state.
- Verification: `GET https://api.sociobot.in/api/v1/products/billable-review/verify?license=<token>`. Successful verdicts are cached per token. The app checks on a new checkout return or manual restore, then automatically at most once per 24 hours.
- Request allowance: the Sociobot verification API accepts 30 requests per client burst. Request 31 receives HTTP 429 with a positive `Retry-After` value. A live 36-request check on 30 August 2026 observed 30 HTTP 200 responses followed by six HTTP 429 responses; the first `Retry-After` was 3 seconds.
- Data sent: checkout receives no time-entry data. Verification receives only the license token. The normal import, review, backup, and export workflow makes no third-party request.
- Test: `npm run test:billing-live` checks the real registered redirect, invalid-token response, 30-request allowance, HTTP 429, and `Retry-After` without buying anything or writing user data.

Sociobot/Dodo is the merchant of record. Refunds revoke the corresponding license. This repository does not embed Dodo or hold payment credentials.
