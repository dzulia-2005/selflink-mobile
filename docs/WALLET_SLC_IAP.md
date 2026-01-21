# Wallet + SLC + IAP (Apple/Google) (Contributor Guide)

This doc explains the in-app purchase (IAP) verification flow used by the mobile
Wallet screen. It mirrors the backend contract in `selflink-backend/apps/payments/iap.py`.

## Endpoints used

- `POST /api/v1/payments/iap/verify/`
- `GET /api/v1/coin/balance/`
- `GET /api/v1/coin/ledger/?cursor=&limit=`
- `GET /api/v1/payments/subscriptions/wallet/` (payments wallet balance)

Verified (Backend):
- `selflink-backend/apps/payments/urls.py` (iap verify route)
- `selflink-backend/apps/payments/iap.py` (verification + mint)
- `selflink-backend/apps/payments/serializers.py` (IapVerifySerializer)
- `selflink-backend/core/settings/base.py` (`IAP_SKU_MAP`)
- `selflink-backend/docs/PAYMENTS_IAP.md`

Verified (Mobile):
- `src/api/iap.ts`
- `src/utils/iapPurchase.ts`
- `src/utils/iapPolling.ts`
- `src/screens/WalletLedgerScreen.tsx`
- `src/constants/iapProducts.ts`

## Request/response (verified)

iOS request:
```json
{
  "platform": "ios",
  "product_id": "com.selflink.slc.499",
  "transaction_id": "tx_123",
  "receipt": "<base64>"
}
```

Android request:
```json
{
  "platform": "android",
  "product_id": "com.selflink.slc.499",
  "transaction_id": "order_123",
  "purchase_token": "<token>"
}
```

Success response:
```json
{
  "received": true,
  "provider": "apple_iap",
  "provider_event_id": "tx_123",
  "coin_event_id": 123456,
  "balance_cents": 499,
  "currency": "USD"
}
```

## SKU allowlist (backend)

SKUs are allowlisted in `IAP_SKU_MAP` on the backend. Default entries:

- `com.selflink.slc.499`
- `com.selflink.slc.999`

The backend derives `amount_cents` and `currency` from this map. The client must
not compute SLC from price.

## Mobile flow (Wallet -> IAP -> mint)

1) User opens Wallet and taps "Buy SLC (IAP)".
2) App loads products from the store and shows the SKU list.
3) User selects a SKU and confirms purchase.
4) App receives the purchase update and posts `/payments/iap/verify/`.
5) Backend verifies receipt/token and mints SLC (server-side only).
6) App polls the ledger for the mint event and refreshes balance + activity.

Completion is detected by mint ledger entries that match:

- `coin_event_id` (if returned), or
- `event_metadata.external_id` + provider, or
- `event_metadata.product_id` after purchase start time.

## Required env vars (mobile)

- `EXPO_PUBLIC_API_BASE_URL`

Optional override:
- `EXPO_PUBLIC_IAP_SKUS` (comma-separated SKU list)

## QA script (5 minutes)

1) Configure App Store Connect / Play Console products for the allowlisted SKUs.
2) Sign in, open Wallet, tap "Buy SLC (IAP)".
3) Complete a sandbox purchase.
4) Return to the app:
   - You should see a pending notice.
   - Balance updates when the mint appears in the ledger.
5) If Android reports "already owned", tap "Restore purchases".

## Troubleshooting

- 403: IAP disabled (`PAYMENTS_PROVIDER_ENABLED_IAP=false`).
- 400: unknown SKU or invalid receipt/token.
- 409: purchase not settled yet; retry verification later.
- 429: throttled; wait and retry.
- No products: store products not configured or SKU mismatch.
