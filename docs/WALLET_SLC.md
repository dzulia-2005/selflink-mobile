# Wallet + SLC (Mobile)

This doc describes how the mobile Wallet and SLC screens map to the backend contract.
All endpoint shapes are derived from the local `selflink-backend` repo.

## Backend Contract (Verified)

Evidence locations (source of truth):
- Routes: `selflink-backend/apps/coin/urls.py`, `selflink-backend/apps/core/api_router.py`
- Views: `selflink-backend/apps/coin/views.py`
- Serializers: `selflink-backend/apps/coin/serializers.py`
- Payments wallet: `selflink-backend/apps/payments/views.py`, `selflink-backend/apps/payments/serializers.py`
- Throttling: `selflink-backend/core/settings/base.py`
- Docs: `selflink-backend/docs/coin/WALLET.md`, `selflink-backend/docs/coin/TECHNICAL_REVIEW.md`, `selflink-backend/docs/WHY_THIS_STACK.md`

All requests below require auth (JWT). Cursor values are opaque strings; do not parse.

### Endpoint table (request/response examples)

| Endpoint | Method | Request JSON | Response JSON |
| --- | --- | --- | --- |
| `/api/v1/coin/balance/` | GET | `(none)` | `{ "account_key": "user:1", "balance_cents": 1200, "currency": "SLC" }` |
| `/api/v1/coin/ledger/` | GET | `(query) cursor?, limit?` | `{ "results": [ { "id": 101, "event_id": 55, "event_type": "transfer", "occurred_at": "2025-01-15T12:00:00Z", "account_key": "user:1", "amount_cents": 500, "currency": "SLC", "direction": "DEBIT", "note": "Lunch", "event_metadata": { "sender_user_id": 1, "to_user_id": 2, "amount_cents": 500, "fee_cents": 25 }, "metadata": {}, "created_at": "2025-01-15T12:00:00Z" } ], "next_cursor": "opaque_cursor" }` |
| `/api/v1/coin/transfer/` | POST | `{ "to_user_id": 2, "amount_cents": 500, "note": "Lunch" }` | `{ "event_id": 55, "to_user_id": 2, "amount_cents": 500, "fee_cents": 25, "total_debit_cents": 525, "balance_cents": 675, "currency": "SLC" }` |
| `/api/v1/coin/spend/` | POST | `{ "amount_cents": 500, "reference": "order_123", "note": "Tip" }` | `{ "event_id": 77, "amount_cents": 500, "reference": "order_123", "balance_cents": 175, "currency": "SLC" }` |
| `/api/v1/payments/subscriptions/wallet/` | GET | `(none)` | `{ "id": 3, "balance_cents": 4200, "created_at": "2025-01-10T12:00:00Z", "updated_at": "2025-01-15T12:00:00Z" }` |

### Spend (Verified)
- Serializer: `CoinSpendSerializer` in `selflink-backend/apps/coin/serializers.py`
  - `amount_cents` (int, min 1)
  - `reference` (required string, max length 128)
  - `note` (optional string, allow blank, max length 255)
- Validation:
  - No format/prefix validation for `reference`; any non-empty string <= 128 is accepted.
  - `product:test` is exercised in `selflink-backend/apps/coin/tests/test_ledger.py`.
- Error codes (400) from `CoinSpendView._error_payload` in `selflink-backend/apps/coin/views.py`:
  - `insufficient_funds`, `invalid_amount`, `account_inactive`, `account_invalid`

### Pagination rules
- `cursor` is optional for the first page. Use `next_cursor` from the response verbatim.
- `next_cursor = null` means no more pages.
- `limit` defaults to 50 and is capped at 200 by the backend.
- Invalid cursor returns 400 with `{ "detail": "Invalid cursor." }`.
- Invalid limit returns 400 with `{ "detail": "Invalid limit." }`.

### Error payload shapes
- Transfer/spend validation errors (400): `{ "detail": "<message>", "code": "<code>" }`
  - Codes (transfer): `insufficient_funds`, `invalid_receiver`, `invalid_amount`, `account_inactive`, `account_invalid`
  - Codes (spend): `insufficient_funds`, `invalid_amount`, `account_inactive`, `account_invalid`
- Serializer errors (400): `{ "<field>": ["<message>"] }`
  - Example: `{ "to_user_id": ["Receiver not found."] }`
- Auth errors:
  - 401: `{ "detail": "Authentication credentials were not provided." }`
  - 403: `{ "detail": "You do not have permission to perform this action." }`
- Throttling:
  - 429: `{ "detail": "Request was throttled. Expected available in ... seconds." }`

## Mobile implementation notes

- API client: `src/api/coin.ts` (axios client, typed responses, cursor passthrough).
- Payments wallet client: `src/services/api/payments.ts` (`getWallet`).
- UI screen: `src/screens/WalletLedgerScreen.tsx`.
- Spend reference allowlist: `src/constants/coinSpendReferences.ts`.
  - Allowlist values are fixed client-side and sent verbatim as `reference`.
  - Backend accepts any string up to 128 chars; allowlist uses `product:*` to match backend test coverage and keep references consistent.
  - Client validates that the selected reference is in the allowlist before submitting.
  - Current values:
    - `product:test`
    - `product:tip`
    - `product:boost:profile`
  - No custom reference input is exposed in the UI.

### Spend references (label -> reference)
| Label | Reference |
| --- | --- |
| Product: Test | `product:test` |
| Product: Tip | `product:tip` |
| Product: Boost Profile | `product:boost:profile` |

## Local setup

Set the API base URL in `.env` or your shell:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

Only the Django REST API server is required for Wallet + SLC. Realtime/WebSocket services are not used by these screens.

Required backend service:
- `python manage.py runserver` (Django REST API)

## Manual QA runbook (two-user script)

1. Start the backend and sign in as user A.
2. Open the Wallet tab and confirm:
   - "Wallet (Payments)" balance loads.
   - "SLC Balance (Credits)" loads from `/coin/balance/`.
   - "SLC Activity" loads from `/coin/ledger/`.
3. Mint SLC for user A via the backend payment flow (Stripe webhook), or use an existing balance.
4. Send SLC from user A to user B:
   - Use "Send SLC" with `to_user_id` of user B and a valid amount.
   - Confirm user A balance decreases and a ledger entry appears.
5. Spend SLC (user A):
   - Use "Spend SLC" with a small amount and a reference from the allowlist.
   - Confirm balance decreases and a ledger entry appears.
   - Try spending more than the available balance to confirm the insufficient funds error.
6. Sign in as user B and confirm:
   - SLC balance increases.
   - Ledger shows the incoming transfer.
7. Pagination:
   - If multiple entries exist, tap "Load more" when `next_cursor` is present.
8. Throttling:
   - Submit multiple transfers/spends quickly to trigger a 429 and confirm cooldown messaging.
9. Auth expiry:
   - Invalidate the token (sign out or expire session) and confirm Wallet/SLC routes back to login.

## Troubleshooting

- 401/403: token missing/expired. Re-authenticate.
- 429: transfer throttled; wait briefly and retry.
- 400 `insufficient_funds`: balance too low (transfer amount + fee).
- 400 invalid cursor: reset to first page (no `cursor` param).
- Network errors: confirm backend is running and `EXPO_PUBLIC_API_BASE_URL` is correct.
- Spend failures:
  - `amount_cents`: "Amount must be positive."
  - `reference`: invalid/empty selection (client-side).
