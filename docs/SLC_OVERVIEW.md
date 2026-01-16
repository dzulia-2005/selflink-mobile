# SLC Overview - How SelfLink Coin Works (Contributor Guide)

This document explains what SLC (SelfLink Coin) is, how the wallet works, and how requests flow through the backend.
It is designed so a new contributor can understand the system in ~5 minutes.

---

## 1. What is SLC?

SLC (SelfLink Coin) is an internal, off-chain credit system used inside SelfLink.

Key properties:

- 1 SLC = 1 USD (fixed internal equivalence)
- Stored and processed off-chain (PostgreSQL)
- Implemented as an append-only ledger (immutable events + entries)
- No withdrawals to fiat or crypto (by design, for now)

SLC is used for:

- Converting verified payments into internal credits
- Peer-to-peer transfers between users
- Spending on internal goods/services
- Auditable, deterministic accounting

---

## 2. Core Design Principles (Invariants)

These rules must always hold. Many tests and checks exist to enforce them.

### 2.1 Append-Only Ledger (Immutability)

- Ledger data is never updated or deleted
- Corrections are made by adding new events
- Applies to:
  - CoinEvent
  - CoinLedgerEntry
  - MonthlyCoinSnapshot

These models reject updates/deletes at the ORM level in `apps/coin/models.py`.

---

### 2.2 Double-Entry Accounting (Balanced Postings)

Every operation posts multiple ledger entries that must balance:

- Total debits == total credits (per currency)
- Transfers and spends cannot create or destroy SLC
- Only mint events increase total supply

The ledger validator in `apps/coin/services/ledger.py` enforces balance per currency.

---

### 2.3 Minting Is Payment-Verified Only

SLC supply can increase only if:

- A verified PaymentEvent exists
- The provider event (e.g. Stripe) passed signature verification
- The payment status is confirmed (e.g. paid)
- The mint operation is idempotent

There is no public API for minting.

---

### 2.4 System Account Allowlist

Internal system accounts are explicitly allowlisted.

Current system account keys:

- system:fees
- system:revenue
- system:mint

Rules:

- Unknown system accounts are rejected
- Suspended accounts cannot receive postings
- Ledger validation enforces this at the lowest level

---

## 3. Wallet Model

Each user has an SLC wallet, automatically created on registration.

Conceptually:

- A wallet is a CoinAccount
- The balance is derived from ledger entries
- There is no mutable "balance" field on the account

Wallet creation flow (Django signals):

User post_save
-> create_related_user_models
-> CoinAccount.objects.get_or_create(...)

This process is idempotent.

Note: Payments wallet (fiat/stripe balance) is a separate model and endpoint.

---

## 4. Public API Endpoints (REST)

All endpoints live under `/api/v1/` and are handled by the Django API (port 8000).

### 4.1 Get Balance

GET /api/v1/coin/balance/

Response:
```json
{
  "account_key": "user:123",
  "balance_cents": 1500,
  "currency": "SLC"
}
```

### 4.2 Ledger (Activity History)

GET /api/v1/coin/ledger/?limit=20&cursor=...

Response:
```json
{
  "results": [ /* CoinLedgerEntry[] */ ],
  "next_cursor": "opaque-string"
}
```

Notes:

- `next_cursor` is opaque. Clients must not parse it.
- Invalid cursor -> 400 `{ "detail": "Invalid cursor." }`
- `limit` defaults to 50 and is capped at 200
- Ordering is by `created_at`, then `id`
- Legacy numeric cursors are accepted by the backend

### 4.3 Peer-to-Peer Transfer

POST /api/v1/coin/transfer/

Body:
```json
{
  "to_user_id": 456,
  "amount_cents": 300,
  "note": "Thanks!"
}
```

Success response (201):
```json
{
  "event_id": 901,
  "to_user_id": 456,
  "amount_cents": 300,
  "fee_cents": 25,
  "total_debit_cents": 325,
  "balance_cents": 1200,
  "currency": "SLC"
}
```

Notes:

- Transfers include a fee (bps + minimum) applied server-side.
- Postings: sender debit + receiver credit + fee credit to `system:fees`.

Possible error codes (400 payload `{ "detail": "...", "code": "..." }`):

- `insufficient_funds`
- `invalid_receiver`
- `invalid_amount`
- `account_inactive`
- `account_invalid`

Serializer field errors can also appear, e.g.:
`{ "to_user_id": ["Receiver not found."] }`.

429 indicates rate limiting.

### 4.4 Spend (Internal Goods / Services)

POST /api/v1/coin/spend/

Body:
```json
{
  "amount_cents": 500,
  "reference": "product:test",
  "note": "Purchase"
}
```

Rules:

- `reference` is required and must be a non-empty string (max length 128)
- `note` is optional (max length 255)
- Spend posts user debit + credit to `system:revenue`

The backend does not enforce an allowlist for `reference`.
The mobile app currently uses a fixed allowlist for safety (see
`src/constants/coinSpendReferences.ts`) and does not accept free-text references.

Possible error codes (400 payload `{ "detail": "...", "code": "..." }`):

- `insufficient_funds`
- `invalid_amount`
- `account_inactive`
- `account_invalid`

429 indicates rate limiting.

---

## 5. Payment -> SLC Mint Flow (Stripe Example)

Minting is internal only and triggered by webhooks.

High-level flow:

Stripe Event
-> Webhook (signature verified)
-> PaymentEvent (verified_at set)
-> mint_for_payment(...)
-> CoinEvent + Ledger Entries

Important details:

- Mint amount comes from Stripe authoritative fields (`amount_total` / `amount_received`)
- Metadata is used only to locate the user
- Duplicate events are safely ignored (idempotency)

---

## 6. Routing & Ports (Production)

SelfLink uses path-based routing.

Services:

Service | Port | Purpose
--- | --- | ---
Django API | 8000 | REST endpoints (coin)
Django ASGI | 8001 | Streaming / SSE
Realtime (FastAPI) | 8002 | WebSockets
Media (nginx) | 8080 | Static/media

Cloudflared ingress order (first match wins):

1. `/ws*` -> `http://localhost:8002`
2. `/api/v1/mentor/stream*` -> `http://localhost:8001`
3. `/media/*` -> `http://localhost:8080`
4. `/api*` -> `http://localhost:8000`
5. catch-all -> `http://localhost:8000`

All SLC endpoints are routed to 8000.

---

## 7. Operational Tooling

Invariant check (CI-friendly):

```bash
python manage.py coin_invariant_check
```

Audit payments and minting:

```bash
python manage.py coin_payment_audit --show
```

---

## 8. What SLC Does NOT Do (Yet)

Explicitly out of scope:

- Withdrawals to fiat or crypto
- On-chain tokens
- Custodial or non-custodial wallets
- secp256k1 / blockchain signing
- Public mint or burn endpoints

These may be explored later, after the internal ledger proves stable.

---

## 9. Where to Look in the Code

Recommended reading order:

- Coin models and invariants: `apps/coin/models.py`
- Ledger service and validations: `apps/coin/services/ledger.py`
- Coin views and serializers: `apps/coin/views.py`, `apps/coin/serializers.py`
- Payments webhook and minting: `apps/payments/webhook.py`, `apps/coin/services/payments.py`
- PaymentEvent model: `apps/payments/models.py`
- User creation hooks (wallet + coin account): `apps/users/signals.py`
- Tests: `apps/coin/tests/test_ledger.py`, `apps/coin/tests/test_snapshot.py`
- Docs: `docs/coin/WALLET.md`, `docs/coin/TECHNICAL_REVIEW.md`, `docs/WHY_THIS_STACK.md`

---

## 10. Summary

SLC is a safe, auditable, internal credit system built on:

- Append-only accounting
- Strict invariants
- Verified payment provenance
- Simple, explicit APIs

If you are contributing: respect the invariants first - features come second.
