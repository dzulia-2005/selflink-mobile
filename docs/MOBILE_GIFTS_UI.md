# Mobile Gifts UI (Read-Only Catalog)

This document describes how the mobile app displays the gift catalog today.
Gift purchasing is **PLANNED** only and is not implemented in mobile or backend.

---

## 1) Backend contract (verified)

Endpoint:
- `GET /api/v1/payments/gifts/`

Verified (Backend):
- `selflink-backend/apps/payments/urls.py` (router: `payments/gifts`)
- `selflink-backend/apps/payments/views.py` (`GiftTypeViewSet.list`)
- `selflink-backend/apps/payments/serializers.py` (`GiftTypeSerializer`)

Fields exposed:
- `id`
- `name`
- `price_cents`
- `art_url` (optional)
- `metadata` (optional)

When payments are disabled, the endpoint returns `[]`.

---

## 2) Mobile data flow (verified)

Verified (Mobile):
- API client: `src/services/api/payments.ts` (`listGiftTypes`)
- Catalog hook: `src/hooks/usePaymentsCatalog.ts`
- UI: `src/screens/PaymentsScreen.tsx`

Mobile expects a list of gift types and renders read-only cards.
If the backend returns `[]`, the screen shows a friendly disabled/empty state.

---

## 3) Display rules in the current UI

Current behavior:
- The catalog is **read-only**.
- Each gift card shows:
  - Name
  - Price (formatted from `price_cents`)
  - Metadata (if any, joined into a single line)
  - Static image if `art_url` is present

Image rendering:
- `art_url` is rendered with React Native `<Image />`.
- There is **no dedicated animated renderer** (no Lottie or video component).

If `art_url` is absent, cards render text-only without broken placeholders.

---

## 4) Animated gifts (PLANNED)

Animated gifts are **not implemented** today.

To support them later, mobile would need:
- Backend fields to indicate media type (e.g., `content_type`, `preview_url`)
- A UI renderer for the chosen format (Lottie, MP4/WebM, etc.)
- A fallback to static image or text when animation cannot render

Do **not** implement this without backend fields and explicit product requirements.

---

## 5) How to add new gift visuals today (no backend changes)

You can safely:
- Adjust the card layout in `src/screens/PaymentsScreen.tsx`
- Improve image styling or placeholders

You cannot safely:
- Add purchase buttons or SLC deductions
- Assume new gift fields or content types

---

## 6) Planned purchase flow (not implemented)

PLANNED only:
- "Buy gift with SLC"
- "Send gift to user"
- Gift delivery events/messages

This requires backend endpoints and a defined mapping between gift types
and SLC spend references. See `docs/PAYMENTS_GIFTS_NOTES.md` for details.
