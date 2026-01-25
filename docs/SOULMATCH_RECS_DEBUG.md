# SoulMatch + Recommendations Debug Report (Mobile)

## Symptoms observed

- Intermittent blank state or crash in SoulMatch detail when backend returns an
  async response (HTTP 202) without a `score` field.
- Recommendations screen could crash or render unstable keys if a result lacks
  `user` data.
- 401/403 responses did not trigger logout, leaving the UI in a confused state.
- Throttling (429) surfaced as generic errors without a calm, consistent message.

## Repro steps

1) Log in and open **SoulMatch → Recommendations**.
2) Tap a match to open **SoulMatch Detail**.
3) If the backend responds async (HTTP 202), the screen can render without
   a `score`, causing NaN scores or blank UI.
4) Simulate 401/403 or 429 (expired token or rapid requests) and observe the
   lack of logout or cooldown messaging.

## Root causes (code references)

- **SoulMatch detail assumes `score` exists**:
  - `src/screens/soulmatch/SoulMatchDetailsScreen.tsx`
  - The `fetchSoulmatchWith` endpoint can return 202 with `task_id` and `user`
    but no `score`. UI then calls `formatScore` on `undefined`.
- **Recommendations assume `user` is always present**:
  - `src/screens/soulmatch/SoulMatchRecommendationsScreen.tsx`
  - `item.user.*` is accessed unguarded; keyExtractor used `Math.random()`.
- **Auth errors not routed to logout**:
  - SoulMatch screens used toast only; no shared normalization of status codes.
- **Missing diagnostics for empty recommendations**:
  - Backend did not expose `meta` explaining why results are empty.

## Backend contract (verified)

Endpoint: `GET /api/v1/soulmatch/recommendations/`

Returns a list of SoulmatchResult items:

```
{
  "user": { "id": number, "handle": string, "name": string, "photo": string | null },
  "score": number,
  "components": { "astro": number, "matrix": number, "psychology": number, "lifestyle": number },
  "tags": string[]
}
```

Optional meta (when `?include_meta=1` is supplied):

```
{
  "results": [ ... ],
  "meta": {
    "missing_requirements": string[],
    "reason": "chart_incomplete" | "no_candidates" | "no_results"
  }
}
```

## Fix summary (minimal)

- Added lightweight API error normalization:
  - `src/utils/apiErrors.ts`
- Added normalization for recommendation results:
  - `src/utils/soulmatchRecommendations.ts`
  - Filters invalid entries and dedupes by user id.
- SoulMatch detail now handles pending (202) responses gracefully:
  - Shows “SoulMatch is being calculated” + Refresh.
- 401/403 now triggers logout across SoulMatch screens.
- 429 shows a calm cooldown message.
- Added __DEV__ logs for request start/end to help diagnose build‑only issues.
- Added optional `meta` block on `/api/v1/soulmatch/recommendations/?include_meta=1`
  to surface missing requirements or no-candidate scenarios.
- Added a dev-only seed command to ensure local recommendations are non-empty.

## Risk notes

- Normalization filters out any recommendation entries missing user/score. This
  is safe for current backend contract (user is always present), but will show
  an empty state if backend data is malformed.

## QA checklist (3 minutes)

- Open SoulMatch Recommendations → list renders.
- Pull to refresh → list reloads without full‑screen spinner.
- Open a recommendation → SoulMatch detail loads.
- If backend returns async result, pending state shows + Refresh works.
- Expire token → 401/403 triggers logout.
- Trigger throttle (429) → calm message, no retry loop.

## Dev seeding (local only)

To ensure you always have candidates locally:

```
python manage.py seed_soulmatch_recommendations
```

This creates a small set of users with birth data so at least one
recommendation is available. The command is blocked unless DEBUG is true.
