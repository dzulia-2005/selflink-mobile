# Feed Likes + Gifts (Mobile)

This document describes how the mobile app handles free likes and paid gifts (SLC spend) for feed posts and comments.

## Backend Endpoints

Likes:
- `POST /api/v1/feed/posts/{id}/like/`
- `DELETE /api/v1/feed/posts/{id}/like/`
- `POST /api/v1/feed/comments/{id}/like/`
- `DELETE /api/v1/feed/comments/{id}/like/`
- Response: `{ liked: boolean, like_count: number }`

Gift catalog:
- `GET /api/v1/payments/gifts/`

Send gift (spends SLC):
- `POST /api/v1/feed/posts/{id}/gifts/`
- `POST /api/v1/feed/comments/{id}/gifts/`
- Body: `{ gift_type_id: number, quantity: number, note?: string }`
- Header: `Idempotency-Key: <uuid>`

## Mobile Implementation

API clients:
- `src/api/likes.ts` (post + comment likes)
- `src/api/gifts.ts` (catalog + send)

UI:
- Feed actions: `src/components/FeedPostCard.tsx`
- Comments sheet: `src/components/comments/CommentsBottomSheet.tsx`
- Gift picker: `src/components/gifts/GiftPickerSheet.tsx`

Gift rendering helper:
- `src/utils/gifts.ts` normalizes gift summary / recent gift data if present in payloads.

## Idempotency

The idempotency key is generated **only** when the user presses “Send Gift”.
Each attempt gets a new UUID. Failed attempts discard the key and allow retries.

## Error Handling

- `insufficient_funds` → show “Not enough SLC” with “Buy SLC” CTA (opens `WalletLedger`).
- `429` → show calm cooldown message and disable rapid repeats.
- `401/403` → logout flow (standard auth handling).

## Optimistic UI

After a gift sends successfully:
- UI updates immediately (gift count).
- A “Syncing…” hint shows until balance/ledger refresh completes.
- If refresh fails, the optimistic UI stays and a “May take a moment to sync” toast appears.

## QA Checklist

1) Like/unlike a post → count updates.
2) Like/unlike a comment → count updates.
3) Send gift to post → count updates + balance change.
4) Send gift to comment → count updates + balance change.
5) Insufficient funds → Buy SLC CTA appears.
6) 429 throttling → cooldown message.
