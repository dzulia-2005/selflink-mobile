# Wallet + SLC + BTCPay Checkout (Contributor Guide)

This doc explains the BTCPay purchase flow used by the mobile Wallet screen.
It mirrors the backend contract in `selflink-backend/apps/payments/btcpay.py`
and `docs/PAYMENTS_BTCPAY.md`.

## Endpoints used

- `POST /api/v1/payments/btcpay/checkout/`
- `GET /api/v1/coin/balance/`
- `GET /api/v1/coin/ledger/?cursor=&limit=`
- `GET /api/v1/payments/subscriptions/wallet/` (payments wallet balance)

## Required env vars (mobile)

- `EXPO_PUBLIC_API_BASE_URL`

## Flow (wallet -> BTCPay -> mint)

1) User opens Wallet and taps "Buy SLC (BTCPay)".
2) App calls `POST /api/v1/payments/btcpay/checkout/` with `{ amount_cents, currency }`.
3) Backend returns:
   `{ checkout_id, reference, amount_cents, currency, status, payment_url }`.
4) App opens `payment_url` in the browser.
5) BTCPay webhook confirms payment server-side and mints SLC.
6) On return, app polls `coin/ledger` (first page) until it sees a `mint`
   entry whose `event_metadata.reference` matches the checkout reference,
   then refreshes balance + ledger.

## UI behavior

- Balance + ledger are read-only and derived from `coin/balance` and `coin/ledger`.
- Buy flow uses a modal consistent with existing Wallet actions.
- After purchase, the Wallet shows an "Awaiting BTCPay confirmation" notice.
- Manual refresh ("I've paid") only re-fetches balance + ledger (no special backend call).

## Currency allowlist

BTCPay currencies are limited to backend configuration defaults:

- `USD`
- `EUR`

If your backend allows different currencies, update the allowlist in
`src/screens/WalletLedgerScreen.tsx`.

## QA script (5 minutes)

1) Set `EXPO_PUBLIC_API_BASE_URL` and run the backend.
2) Sign in and open Wallet.
3) Tap "Buy SLC (BTCPay)" and enter a small amount + currency.
4) Complete the BTCPay checkout in the browser.
5) Return to the app:
   - You should see the pending notice.
   - Balance should update after webhook processing.
   - Ledger shows the mint entry.

## Troubleshooting

- "Paid but no SLC":
  - Webhook delay or failure; wait and pull to refresh.
  - Check backend logs for BTCPay webhook failures.
- 401/403:
  - Token expired; sign in again.
- 429:
  - Throttled; wait and retry.
- Invalid cursor:
  - Coin ledger returns 400; pull to refresh to reset pagination.
