# DEV_NOTES

## Wallet screen location
- `src/screens/WalletLedgerScreen.tsx`.
- `src/screens/PaymentsScreen.tsx` links to the wallet screen via `navigation.navigate('WalletLedger')`.

## Navigation routes
- Tab routes defined in `src/navigation/MainTabsNavigator.tsx` (includes `Payments` and `WalletLedger`).
- Route types in `src/navigation/types.ts` (includes `WalletLedger: undefined`).

## API clients, auth, and error handling
- Fetch-based client: `src/services/api/client.ts`
  - Base URL: `env.apiHttpBaseUrl` from `src/config/env.ts` (derived from `API_HTTP_BASE_URL`).
  - URL composition: `src/utils/url.ts` (`buildUrl`).
  - Auth: token injected via `apiClient.setToken`; refresh handler via `apiClient.setRefreshHandler` (wired in `src/context/AuthContext.tsx` and `src/store/authStore.ts`).
  - Errors: throws `Error` with `Request failed (status): <body/statusText>`; JSON parsed with `parseJsonPreservingLargeInts` from `src/utils/json.ts`.
  - Patterned endpoint modules live in `src/services/api/*.ts` (e.g., `src/services/api/payments.ts`).
- Axios-based client: `src/api/client.ts`
  - Base URL: `API_HTTP_BASE_URL` from `src/config/env.ts`.
  - Auth: `setAuthTokenProvider` + `setRefreshHandler` (configured in `src/store/authStore.ts`).
  - Errors: Axios errors propagate; 401 refresh handled in interceptor; response parsing also uses `parseJsonPreservingLargeInts`.
  - Feature modules live in `src/api/*.ts` (messaging/social/etc.).

## Design primitives and UI building blocks
- Cards/panels: `src/components/MetalPanel.tsx`.
- Buttons: `src/components/MetalButton.tsx`.
- Toast/snackbar: `src/context/ToastContext.tsx`, `src/components/MetalToast.tsx`.
- Loading/empty/error states: `src/components/LoadingOverlay.tsx`, `src/components/EmptyState.tsx`, `src/components/ErrorState.tsx`, `src/components/StateViews.tsx`.
- Theme tokens: `src/theme.ts` (palette/typography/spacing/radius/gradients/shadows), plus legacy tokens in `src/theme/typography.ts`, `src/theme/spacing.ts`, `src/theme/colors.ts`.
- Icons: `@expo/vector-icons` Ionicons used in `src/navigation/MainTabsNavigator.tsx`.
- Inputs: no shared input component; screens use `TextInput` with local styles (see `src/screens/auth/LoginScreen.tsx`, `src/screens/profile/ProfileEditScreen.tsx`, `src/screens/onboarding/PersonalMapScreen.tsx` for patterns).

## Misc
- Wallet type exists but is unused: `src/types/payments.ts`.
- Network errors in Wallet/SLC are mapped to a friendly message ("Unable to reach the server. Please try again."); debug details remain available via console logs from the underlying fetch/axios errors.

## Backend Contract (from local backend repo)
### Coin endpoints
- Routing:
  - `/api/v1/coin/*` registered in `/home/greendragon/Desktop/selflink-backend/apps/coin/urls.py` and included via `/home/greendragon/Desktop/selflink-backend/apps/core/api_router.py`.
- Views:
  - Balance: `CoinBalanceView.get` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
  - Ledger: `CoinLedgerView.get` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
  - Transfer: `CoinTransferView.post` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
  - Spend: `CoinSpendView.post` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
- Serializers:
  - Ledger entries: `CoinLedgerEntrySerializer` in `/home/greendragon/Desktop/selflink-backend/apps/coin/serializers.py`.
  - Transfer request: `CoinTransferSerializer` in `/home/greendragon/Desktop/selflink-backend/apps/coin/serializers.py`.
  - Spend request: `CoinSpendSerializer` in `/home/greendragon/Desktop/selflink-backend/apps/coin/serializers.py`.
- Contract:
  - GET `/api/v1/coin/balance/` -> `{ account_key, balance_cents, currency }`.
  - GET `/api/v1/coin/ledger/` (query: `limit` default 50, `cursor` optional) -> `{ results: CoinLedgerEntry[], next_cursor }`.
    - `CoinLedgerEntry` fields: `id`, `event_id`, `event_type`, `occurred_at`, `account_key`, `amount_cents`, `currency`, `direction`, `note`, `event_metadata`, `metadata`, `created_at`.
  - POST `/api/v1/coin/transfer/` body -> `{ to_user_id, amount_cents, note? }`.
    - Response (201): `{ event_id, to_user_id, amount_cents, fee_cents, total_debit_cents, balance_cents, currency }`.
  - POST `/api/v1/coin/spend/` body -> `{ amount_cents, reference, note? }`.
    - Response (201): `{ event_id, amount_cents, reference, balance_cents, currency }`.
- Cursor handling:
  - `next_cursor` is opaque (base64url JSON). Legacy numeric cursors are accepted.
  - Invalid cursor returns 400 with `{ "detail": "Invalid cursor." }` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
  - Invalid limit returns 400 with `{ "detail": "Invalid limit." }` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
- Error payloads:
  - Transfer/spend validation errors return `{ detail, code }` with 400 in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
  - Serializer validation errors return field-keyed arrays (e.g., `{ "to_user_id": ["Receiver not found."] }`) in `/home/greendragon/Desktop/selflink-backend/apps/coin/serializers.py`.
  - Transfer codes: `insufficient_funds`, `invalid_receiver`, `invalid_amount`, `account_inactive`, `account_invalid`.
  - Spend codes: `insufficient_funds`, `invalid_amount`, `account_inactive`, `account_invalid`.
- Ledger event metadata source:
  - Transfer metadata: `sender_user_id`, `to_user_id`, `amount_cents`, `fee_cents`.
  - Spend metadata: `user_id`, `reference`, `amount_cents`.
  - Mint metadata: `provider`, `external_id`, `amount_cents`.
  - Source: `/home/greendragon/Desktop/selflink-backend/apps/coin/services/ledger.py`.

### Payments wallet endpoint
- URL + view: GET `/api/v1/payments/subscriptions/wallet/` via `SubscriptionViewSet.wallet` in `/home/greendragon/Desktop/selflink-backend/apps/payments/views.py`.
- Serializer fields: `WalletSerializer` in `/home/greendragon/Desktop/selflink-backend/apps/payments/serializers.py` returns `{ id, balance_cents, created_at, updated_at }`.

### Auth + throttling
- All coin endpoints require auth: `permission_classes = [IsAuthenticated]` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
- Wallet endpoint requires auth via `SubscriptionViewSet` in `/home/greendragon/Desktop/selflink-backend/apps/payments/views.py`.
- Transfer/spend are throttled via `throttle_scope = "coin_transfer"` / `"coin_spend"` in `/home/greendragon/Desktop/selflink-backend/apps/coin/views.py`.
- Throttle rates are configured in `/home/greendragon/Desktop/selflink-backend/core/settings/base.py` (`COIN_THROTTLE_TRANSFER`, `COIN_THROTTLE_SPEND`).

### Backend docs
- `/home/greendragon/Desktop/selflink-backend/docs/coin/WALLET.md` (SLC overview, transfer/spend endpoints, no public mint, cursor notes).
- `/home/greendragon/Desktop/selflink-backend/docs/coin/TECHNICAL_REVIEW.md` (coin architecture, invariants, throttling mention).
- `/home/greendragon/Desktop/selflink-backend/docs/WHY_THIS_STACK.md` (apps/coin overview).
