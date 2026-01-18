# Wallet + SLC + iPay (Contributor Guide)

This doc explains the iPay purchase flow used by the mobile Wallet screen.
It mirrors the backend contract defined in `selflink-backend/docs/PAYMENTS_IPAY.md`.

## Endpoints used

- `POST /api/v1/payments/ipay/checkout/`
- `GET /api/v1/coin/balance/`
- `GET /api/v1/coin/ledger/?cursor=&limit=`
- `GET /api/v1/payments/subscriptions/wallet/` (payments wallet balance)

## Required env vars (mobile)

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_IPAY_BASE_URL`

`EXPO_PUBLIC_IPAY_BASE_URL` is the iPay-hosted checkout base URL.
The app opens:

```
${EXPO_PUBLIC_IPAY_BASE_URL}?reference=<urlencoded(reference)>
```

## Flow (wallet -> iPay -> mint)

1) User opens Wallet and taps "Buy SLC".
2) App calls `POST /api/v1/payments/ipay/checkout/` with `{ amount_cents, currency }`.
3) Backend returns:
   `{ checkout_id, reference, amount_cents, currency, status }`.
4) App opens the iPay checkout URL using the `reference`.
5) iPay webhook confirms payment server-side and mints SLC.
6) On return, app polls `coin/balance` a few times and refreshes the ledger.

## UI behavior

- Balance + ledger are read-only and derived from `coin/balance` and `coin/ledger`.
- Buy flow uses a modal consistent with existing Wallet actions.
- After a purchase, the Wallet shows a "Pending confirmation" hint.
- Manual refresh ("I've paid") only re-fetches balance + ledger (no special backend call).

## Currency allowlist

The UI limits currencies to the backend defaults:

- `USD`
- `EUR`
- `GEL`

If your backend allows different currencies, update the allowlist in
`src/screens/WalletLedgerScreen.tsx`.

## QA script (5 minutes)

1) Set env vars and run the backend.
2) Sign in and open Wallet.
3) Tap "Buy SLC" and enter a small amount + currency.
4) Complete iPay checkout in the browser.
5) Return to the app:
   - You should see "Pending confirmation".
   - Balance should update after webhook processing.
   - Ledger shows the mint entry.

## Troubleshooting

- "Paid but no SLC":
  - Webhook delay or failed webhook; wait and retry refresh.
  - Check backend logs for iPay webhook failures.
- 401/403:
  - Token expired; sign in again.
- 429:
  - Throttled; wait and retry.
- Missing env var:
  - App shows "iPay checkout is not configured".
- Unsupported currency:
  - Backend returns 400 with `currency` field error.
