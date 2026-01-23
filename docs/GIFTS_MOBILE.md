# Gifts & Paid Reactions (Mobile)

This doc explains how free likes + paid gifts are wired on mobile, and how to extend gift UI safely.

## Endpoints (Backend)

Likes:
- `POST /api/v1/feed/posts/{id}/like/`
- `DELETE /api/v1/feed/posts/{id}/like/`
- `POST /api/v1/feed/comments/{id}/like/`
- `DELETE /api/v1/feed/comments/{id}/like/`
- Response: `{ liked: boolean, like_count: number }`

Gifts catalog:
- `GET /api/v1/payments/gifts/`
- Response: list of GiftType entries (id, key/slug, name, kind, media_url, animation_url, price_slc_cents, is_active)

Send gift (spends SLC):
- `POST /api/v1/feed/posts/{id}/gifts/`
- `POST /api/v1/feed/comments/{id}/gifts/`
- Body: `{ gift_type_id: number, quantity: number, note?: string }`
- Optional header: `Idempotency-Key: <uuid>`

## Mobile entry points

API clients:
- `src/api/likes.ts` (post/comment like + unlike)
- `src/api/gifts.ts` (catalog + send gifts)

UI components:
- `src/components/gifts/GiftPickerSheet.tsx` (shared gift selector + send flow)
- `src/components/comments/CommentItem.tsx` (comment like + gift actions)
- `src/components/comments/CommentsBottomSheet.tsx` (comment list + actions)
- `src/components/FeedPostCard.tsx` (post like + gift actions)

## Behavior Notes

Likes:
- Optimistic UI in feed store; final counts are replaced with backend response.
- 401/403 routes through logout flow on the UI.

Gifts:
- Catalog is fetched from `/payments/gifts/` and cached in-memory (5 min).
- Only `is_active` gifts are shown.
- Gift sending uses Idempotency-Key UUIDv4 (client generated).
- After success, the sheet triggers a lightweight refresh of coin balance + ledger and shows a confirmation toast.
- Insufficient funds shows a “Buy SLC” CTA that navigates to `WalletLedger`.

## Adding/Updating Gift UI

If backend adds new GiftType fields:
- The UI already tolerates extra fields; only `id`, `name`, `price_slc_cents`, `media_url`/`animation_url`, and `is_active` are used.
- For animated gifts, we currently show a static image from `media_url`/`animation_url`.
- Do not auto-play animations in feed; keep previews lightweight.

## QA Checklist

1) Like/unlike a feed post → count updates.
2) Like/unlike a comment in the bottom sheet → count updates.
3) Open Gift Picker on a post → select gift + quantity → send.
4) Confirm SLC balance changes in Wallet after sending a gift.
5) Insufficient funds → shows “Buy SLC” CTA.
6) 429 throttling → shows cooldown message.
