# Realtime Gifts Smoke Test (Mobile)

This is a fast contributor checklist to verify realtime gift bursts on mobile.
It assumes backend already emits `gift.received` events (best‑effort) and the
mobile app subscribes only to visible post/comment channels with dedupe.

## Required env

Mobile (Expo):
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_REALTIME_URL` (optional; if omitted, derived from API base)

Backend / realtime service:
- `REALTIME_PUBLISH_URL`
- `REALTIME_PUBLISH_TOKEN` (if enforced)

Ensure backend and realtime service use matching tokens and URLs.

## Smoke test steps (10 minutes)

1) Run backend + realtime service.
2) Run the mobile app on **two accounts** (two devices or device + web session).
3) On device B, open the Feed and keep a post **visible on screen**.
4) On device A, send a paid gift to that post (or a comment on it).
5) Expected on device B:
   - A gift burst animation appears **immediately**.
   - The gift preview row/count updates locally.
6) Pull to refresh or re-open the feed:
   - `recent_gifts` should match backend (source of truth).

## Troubleshooting

- **No burst appears**
  - Confirm WS connected and channels include `post:{id}` or `comment:{id}`.
  - Ensure the post/comment is actually visible (viewport subscription).
  - Check AppState (background/unfocused screens disconnect).
  - Verify the backend publish token and URL match the realtime service.

- **Bursts repeat or double-count**
  - Dedupe should ignore repeated `event.id` values.
  - Fully close and reopen the app to clear stale sessions.
  - Confirm there aren’t duplicate subscriptions after navigation.

- **No recent_gifts after refresh**
  - Check backend `recent_gifts` output for the post/comment.
  - Ensure gift send endpoint succeeded and the paid reaction is committed.

## Notes

- Realtime is best‑effort and cosmetic. Missing bursts should never block
  gift sending or cause crashes.
- If realtime is down, refresh should still show gifts via `recent_gifts`.
