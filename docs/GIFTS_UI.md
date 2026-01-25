# Gifts UI (Mobile)

This doc explains how gifts are rendered in the mobile app and which backend
fields are required. It is intentionally minimal and mirrors the existing
backend contract.

## Backend fields used (Verified)

Source of truth: `selflink-backend/apps/payments/models.py` + serializers for
`GiftType` (exposed via `GET /api/v1/payments/gifts/`).

Mobile expects these fields when present:

- `id` (number)
- `name` (string)
- `kind` (`static` or `animated`)
- `media_url` (string | null) — static image URL
- `animation_url` (string | null) — animated image URL
- `price_slc_cents` (number)
- `is_active` (boolean)

## Rendering logic

- Gift thumbnails and previews are rendered by `GiftMedia`
  - File: `src/components/gifts/GiftMedia.tsx`
- Animated media is used **only** when it is an image format (GIF/WebP).
- Video formats (mp4/webm/mov) are not auto-played in lists; if only a video
  URL exists, the UI falls back to the static `media_url` or a placeholder.

### Supported formats

- Static: png, jpg, jpeg, webp
- Animated (image): gif, webp
- Video: mp4/webm/mov (not auto-played; used only for future enhancements)

## Send animation (sender feedback)

When a gift is successfully sent:

- The sender sees a brief burst animation overlay.
- Files:
  - `src/components/gifts/GiftBurstOverlay.tsx`
  - `src/hooks/useGiftBurst.ts`
- Triggered from:
  - `src/screens/feed/FeedScreen.tsx` (post gifts)
  - `src/components/comments/CommentsBottomSheet.tsx` (comment gifts)

## Gift picker integration

- Gift list and preview use `GiftMedia` in:
  - `src/components/gifts/GiftPickerSheet.tsx`
- The picker only shows gifts where `is_active !== false`.
- Gift send endpoints require `Idempotency-Key` for safe retries.

## Adding new gifts (backend-first)

1) Add a new `GiftType` on the backend with:
   - `name`
   - `kind`
   - `media_url` (static)
   - `animation_url` (animated image, optional)
   - `price_slc_cents`
   - `is_active = true`
2) Mobile will render it automatically in the gift picker grid.

## API endpoints used

- Catalog: `GET /api/v1/payments/gifts/`
- Send to post: `POST /api/v1/posts/{post_id}/gifts/`
- Send to comment: `POST /api/v1/comments/{comment_id}/gifts/`

No mobile code changes are required if the backend supplies the fields above.
