# Mobile Payments Providers (Stripe / iPay / BTCPay)

This document explains how the mobile app starts provider checkouts and confirms
SLC crediting. It is docs-only: no backend changes implied.

All endpoints are under `/api/v1/`.

---

## Shared behaviors (mobile)

Verified (Mobile):
- External URL open: `src/screens/WalletLedgerScreen.tsx`, `src/screens/PaymentsScreen.tsx`
- AppState + focus triggers: `src/screens/WalletLedgerScreen.tsx`
- Coin polling helpers:
  - Stripe: `src/utils/stripePolling.ts`
  - BTCPay: `src/utils/btcpayPolling.ts`
- SLC balance/ledger: `src/api/coin.ts`

Common flow:

```
User -> Wallet screen -> POST checkout -> open payment URL -> return to app
-> poll coin/ledger -> confirm mint -> refresh balance/ledger
```

Polling delays: 0s, 3s, 7s, 15s. Polling stops on success or throttle.

---

## Stripe (Buy SLC)

Verified (Backend):
- Endpoint: `POST /api/v1/payments/stripe/checkout/`
- Code: `selflink-backend/apps/payments/stripe_checkout.py`

Verified (Mobile):
- API client: `src/api/stripeCheckout.ts` (`createStripeCheckout`)
- UI + polling: `src/screens/WalletLedgerScreen.tsx`

Request:
```json
{ "amount_cents": 1500, "currency": "USD" }
```

Response:
```json
{
  "checkout_id": 123,
  "reference": "pay_ref_123",
  "amount_cents": 1500,
  "currency": "USD",
  "status": "pending",
  "payment_url": "https://checkout.stripe.com/..."
}
```

Sequence (Stripe):

```
Wallet -> POST /payments/stripe/checkout/
Wallet -> Linking.openURL(payment_url)
Stripe webhook -> backend mints SLC
Wallet -> poll coin/ledger (first page)
Wallet -> confirm mint by reference -> refresh
```

Confirmation rule (mobile):
- Look for `event_type == "mint"` and `event_metadata.reference` matching the
  checkout reference. (See `stripePolling.ts`.)

---

## iPay (Buy SLC)

Verified (Backend):
- Endpoint: `POST /api/v1/payments/ipay/checkout/`
- Code: `selflink-backend/apps/payments/ipay.py`
- Docs: `selflink-backend/docs/PAYMENTS_IPAY.md`

Verified (Mobile):
- API client: `src/api/ipay.ts` (`createIpayCheckout`)
- UI + polling: `src/screens/WalletLedgerScreen.tsx`

Request:
```json
{ "amount_cents": 1500, "currency": "USD" }
```

Response:
```json
{
  "checkout_id": 123,
  "reference": "ipay_ref_123",
  "amount_cents": 1500,
  "currency": "USD",
  "status": "pending"
}
```

Redirect URL (mobile-constructed):
- `EXPO_PUBLIC_IPAY_BASE_URL` from `src/config/env.ts`
- Query param `reference` added in `WalletLedgerScreen.tsx`

Sequence (iPay):

```
Wallet -> POST /payments/ipay/checkout/
Wallet -> build URL with ?reference=...
Wallet -> Linking.openURL(constructed_url)
iPay webhook -> backend mints SLC
Wallet -> poll coin/balance (baseline increase) -> refresh
```

Note: iPay uses a balance increase check, not ledger matching.

---

## BTCPay (Buy SLC)

Verified (Backend):
- Endpoint: `POST /api/v1/payments/btcpay/checkout/`
- Code: `selflink-backend/apps/payments/btcpay.py`
- Docs: `selflink-backend/docs/PAYMENTS_BTCPAY.md`

Verified (Mobile):
- API client: `src/api/btcpayCheckout.ts` (`createBtcpayCheckout`)
- UI + polling: `src/screens/WalletLedgerScreen.tsx`
- Confirmation helper: `src/utils/btcpayPolling.ts`

Request:
```json
{ "amount_cents": 1500, "currency": "USD" }
```

Response:
```json
{
  "checkout_id": 123,
  "reference": "btcpay_ref_123",
  "amount_cents": 1500,
  "currency": "USD",
  "status": "pending",
  "payment_url": "https://btcpay.example.com/i/..."
}
```

Sequence (BTCPay):

```
Wallet -> POST /payments/btcpay/checkout/
Wallet -> Linking.openURL(payment_url)
BTCPay webhook -> backend mints SLC
Wallet -> poll coin/ledger (first page)
Wallet -> confirm mint by reference -> refresh
```

---

## Failure handling (all providers)

Verified (Mobile):
- Error mapping: `src/api/coin.ts` (coin) and `src/services/api/payments.ts` (payments)
- Logout flow: `src/store/authStore.ts` (used by Wallet screen)

Common errors:
- 401/403: auth expired -> logout + message.
- 429: throttled -> show "Too many requests" and stop polling.
- 400: show field-level errors if provided.
- Network errors: show friendly "Unable to reach server" message.

