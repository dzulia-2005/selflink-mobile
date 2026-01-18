# Mobile Wallet + SLC Overview (Contributor Guide)

This is a 5-minute orientation for the mobile Wallet + SLC UI. It explains
how the UI maps to backend endpoints, where to change what, and the key
edge cases to keep correct behavior.

Scope: Wallet screen (Payments wallet + SLC balance/ledger + send/spend/buy).
Non-goals: No new backend features, no gift purchasing, no schema fetching.

---

## 1) Screen map and responsibilities

- Wallet screen (single source of truth for SLC):
  - `src/screens/WalletLedgerScreen.tsx`
  - Shows Payments wallet (fiat) and SLC balance/ledger.
  - Handles Send SLC, Spend SLC, and Buy SLC (Stripe/iPay/BTCPay).

- Payments & Membership screen (catalog + subscriptions):
  - `src/screens/PaymentsScreen.tsx`
  - Lists plans and gift catalog; opens subscription checkout.

---

## 2) Where to change what (index)

- Wallet UI, ledger list, polling, modals:
  - `src/screens/WalletLedgerScreen.tsx`
- SLC API client + error normalization:
  - `src/api/coin.ts`
- Payments wallet + plans/gifts/subscriptions API:
  - `src/services/api/payments.ts`
- Provider checkout clients (Buy SLC):
  - Stripe: `src/api/stripeCheckout.ts`
  - iPay: `src/api/ipay.ts`
  - BTCPay: `src/api/btcpayCheckout.ts`
- Auth/token injection:
  - Axios (coin/checkout): `src/api/client.ts`
  - Fetch (payments): `src/services/api/client.ts`
  - Token wiring: `src/store/authStore.ts`
- Env/base URLs:
  - `src/config/env.ts`

---

## 3) Backend contract map (verified)

All endpoints are under `/api/v1/`.

### SLC (coin) endpoints

| Endpoint | Purpose | Verified (Backend) | Verified (Mobile) |
| --- | --- | --- | --- |
| `GET /api/v1/coin/balance/` | SLC balance | `selflink-backend/apps/coin/views.py` (`CoinBalanceView`) | `src/api/coin.ts` (`getSlcBalance`) |
| `GET /api/v1/coin/ledger/?cursor&limit` | SLC ledger page | `selflink-backend/apps/coin/views.py` (`CoinLedgerView`) | `src/api/coin.ts` (`listSlcLedger`) + `src/screens/WalletLedgerScreen.tsx` |
| `POST /api/v1/coin/transfer/` | Send SLC | `selflink-backend/apps/coin/views.py` (`CoinTransferView`) | `src/api/coin.ts` (`transferSlc`) |
| `POST /api/v1/coin/spend/` | Spend SLC | `selflink-backend/apps/coin/views.py` (`CoinSpendView`) | `src/api/coin.ts` (`spendSlc`) |

Expected shapes (mobile expects these keys):

```json
// GET /coin/balance/
{ "account_key": "user:123", "balance_cents": 1500, "currency": "SLC" }
```

```json
// GET /coin/ledger/
{ "results": [ { "id": 1, "event_type": "mint", "amount_cents": 500, "direction": "CREDIT", "event_metadata": {} } ],
  "next_cursor": "opaque-string-or-null" }
```

```json
// POST /coin/transfer/
{ "event_id": 1, "to_user_id": 42, "amount_cents": 300, "fee_cents": 10,
  "total_debit_cents": 310, "balance_cents": 1200, "currency": "SLC" }
```

```json
// POST /coin/spend/
{ "event_id": 1, "amount_cents": 500, "reference": "product:test",
  "balance_cents": 700, "currency": "SLC" }
```

### Payments wallet (fiat)

| Endpoint | Purpose | Verified (Backend) | Verified (Mobile) |
| --- | --- | --- | --- |
| `GET /api/v1/payments/subscriptions/wallet/` | Payments wallet | `selflink-backend/apps/payments/views.py` (`SubscriptionViewSet.wallet`) | `src/services/api/payments.ts` (`getWallet`) + `src/screens/WalletLedgerScreen.tsx` |

Expected shape:

```json
{ "id": 3, "balance_cents": 4200, "created_at": "...", "updated_at": "..." }
```

### Buy SLC (provider checkout)

| Endpoint | Purpose | Verified (Backend) | Verified (Mobile) |
| --- | --- | --- | --- |
| `POST /api/v1/payments/stripe/checkout/` | Create Stripe checkout | `selflink-backend/apps/payments/stripe_checkout.py` | `src/api/stripeCheckout.ts` |
| `POST /api/v1/payments/ipay/checkout/` | Create iPay checkout | `selflink-backend/apps/payments/ipay.py` | `src/api/ipay.ts` |
| `POST /api/v1/payments/btcpay/checkout/` | Create BTCPay invoice | `selflink-backend/apps/payments/btcpay.py` | `src/api/btcpayCheckout.ts` |

---

### Payments catalog + subscriptions (Payments & Membership screen)

| Endpoint | Purpose | Verified (Backend) | Verified (Mobile) |
| --- | --- | --- | --- |
| `GET /api/v1/payments/plans/` | Plans list (AllowAny) | `selflink-backend/apps/payments/views.py` (`PlanViewSet.list`) | `src/services/api/payments.ts` (`listPlans`) + `src/hooks/usePaymentsCatalog.ts` |
| `GET /api/v1/payments/gifts/` | Gift types list (AllowAny) | `selflink-backend/apps/payments/views.py` (`GiftTypeViewSet.list`) | `src/services/api/payments.ts` (`listGiftTypes`) + `src/hooks/usePaymentsCatalog.ts` |
| `GET /api/v1/payments/subscriptions/` | User subscriptions | `selflink-backend/apps/payments/views.py` (`SubscriptionViewSet.list`) | `src/services/api/payments.ts` (`listSubscriptions`) |
| `POST /api/v1/payments/subscriptions/` | Create subscription | `selflink-backend/apps/payments/views.py` (`SubscriptionViewSet.create`) | `src/services/api/payments.ts` (`createSubscription`) + `src/screens/PaymentsScreen.tsx` |

Notes:
- If payments are disabled, plans/gifts return `[]` (not a paginated object).
- Subscriptions are auth-protected.

Expected shapes:

```json
// GET /payments/plans/ (enabled)
{ "results": [ { "id": 1, "name": "Pro", "price_cents": 1200, "interval": "month", "features": {}, "is_active": true } ],
  "next": null, "previous": null }
```

```json
// GET /payments/plans/ (payments disabled)
[]
```

```json
// POST /payments/subscriptions/
{
  "subscription": { "id": 1, "plan": { "id": 1, "name": "Pro", "price_cents": 1200, "interval": "month", "features": {}, "is_active": true },
    "status": "active", "current_period_start": "...", "current_period_end": "...", "created_at": "...", "updated_at": "..." },
  "checkout_url": "https://...",
  "session_id": "sess_123"
}
```

---

## 4) Wallet screen behavior (important details)

### Wallet (Payments)
- Uses `getWallet()` and handles 404 as "unavailable" (calm empty state).
- Auth errors route through the shared logout flow.

### SLC balance + ledger
- Balance comes from `GET /coin/balance/`.
- Ledger uses `GET /coin/ledger/` with cursor pagination.
- The UI must treat `next_cursor` as opaque.

### SLC transfer/spend
- `transferSlc()` and `spendSlc()` are called from Wallet modals.
- Client validates positive amounts and available balance.
- Errors use `normalizeCoinApiError` in `src/api/coin.ts`.

### Buy SLC confirmation
- Stripe + BTCPay use ledger-based confirmation.
- iPay uses a balance increase check (legacy approach), not ledger matching.
- Polling schedule is fixed: 0s, 3s, 7s, 15s.
- Polling starts when app regains focus or becomes active, and stops on success.

---

## 5) Ledger pagination and cursor rules

- Backend cursor is opaque and base64-encoded (see `CoinLedgerView`).
- Mobile must not parse or mutate the cursor string.
- Invalid cursor returns 400 `{"detail": "Invalid cursor."}`.
- Wallet screen resets pagination on refresh and shows a friendly message.

Verified (Backend):
- `selflink-backend/apps/coin/views.py` (`CoinLedgerView._encode_cursor/_decode_cursor`)

Verified (Mobile):
- `src/api/coin.ts` (`listSlcLedger`)
- `src/screens/WalletLedgerScreen.tsx` (refresh + load more logic)

---

## 6) Auth and base URL wiring (mobile)

Verified (Mobile):
- Axios client for coin/providers: `src/api/client.ts`
- Fetch client for payments: `src/services/api/client.ts`
- Token wiring: `src/store/authStore.ts`
- Base URL: `src/config/env.ts` (`EXPO_PUBLIC_API_BASE_URL`)

Note: both clients attach a Bearer token and attempt refresh on 401.
