# Mobile Local Runbook (Wallet + SLC + Payments)

Use this checklist to verify Wallet, SLC flows, and payments catalog locally.

---

## 1) Required env vars (mobile)

- `EXPO_PUBLIC_API_BASE_URL` (points to backend, e.g. `http://localhost:8000`)
- `EXPO_PUBLIC_IPAY_BASE_URL` (required only for iPay checkout)

Verified (Mobile):
- `src/config/env.ts`

---

## 2) Backend endpoints touched

Verified (Backend):
- `selflink-backend/apps/coin/views.py`
- `selflink-backend/apps/payments/urls.py`
- `selflink-backend/apps/payments/views.py`
- `selflink-backend/apps/payments/serializers.py`

Verified (Mobile):
- `src/api/coin.ts` (SLC balance/ledger/transfer/spend)
- `src/services/api/payments.ts` (wallet/plans/gifts/subscriptions)
- `src/api/stripeCheckout.ts`
- `src/api/ipay.ts`
- `src/api/btcpayCheckout.ts`

Endpoints:
- `GET /api/v1/coin/balance/`
- `GET /api/v1/coin/ledger/?cursor&limit`
- `POST /api/v1/coin/transfer/`
- `POST /api/v1/coin/spend/`
- `GET /api/v1/payments/subscriptions/wallet/`
- `GET /api/v1/payments/plans/`
- `GET /api/v1/payments/gifts/`
- `GET /api/v1/payments/subscriptions/`
- `POST /api/v1/payments/subscriptions/`
- `POST /api/v1/payments/stripe/checkout/`
- `POST /api/v1/payments/ipay/checkout/`
- `POST /api/v1/payments/btcpay/checkout/`

---

## 3) QA checklist (single user)

### Wallet (Payments + SLC)
1) Login and open Wallet.
2) Verify "Wallet (Payments)" loads without 404.
3) Verify SLC balance + ledger appear.
4) Pull to refresh; no red errors.

### Send SLC (requires two users)
1) User A sends SLC to User B (Wallet -> Send SLC).
2) Confirm User A balance decreases and ledger shows transfer.
3) Login as User B and confirm balance increase + ledger entry.

### Spend SLC
1) Use a valid spend reference and small amount.
2) Confirm balance decreases and ledger shows spend.

### Buy SLC (Stripe)
1) Tap "Buy SLC" on Wallet.
2) Complete checkout in browser.
3) Return to app; see pending banner.
4) Confirm ledger shows mint entry and balance updates.

### Buy SLC (iPay)
1) Set `EXPO_PUBLIC_IPAY_BASE_URL`.
2) Tap "Buy SLC (iPay)" and complete checkout.
3) Return to app; see pending banner and balance update.

### Buy SLC (BTCPay)
1) Tap "Buy SLC (BTCPay)" and complete invoice.
2) Return to app; see pending banner.
3) Confirm mint appears in ledger and balance updates.

### Payments & Membership screen
1) Open Payments & Membership.
2) Tap "Refresh Catalog".
3) Confirm plans + gifts list show, or disabled states if backend is off.

---

## 4) Troubleshooting

- 404 payments wallet:
  - Wallet shows "Payments wallet unavailable."
  - Confirm backend has `/payments/subscriptions/wallet/`.
- Payments disabled:
  - `GET /payments/plans/` and `/payments/gifts/` return `[]`.
  - Mobile shows "Payments are currently disabled."
- 401/403:
  - Token expired; logout flow triggers.
- 429:
  - "Too many requests" message; polling stops.
- Invalid cursor (400):
  - Pull to refresh to reset pagination.
