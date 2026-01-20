# Build Env + Map Setup (Mobile)

This document explains build-time configuration order, required env vars, and
the "Choose on Map" flow in release builds.

---

## 1) Env priority order

Values are resolved in this order (highest priority first):

1) Build-time env vars (EAS profiles): `EXPO_PUBLIC_*`
2) `app.config.js` -> `expo.extra`
3) `app.json` -> `expo.extra`
4) Fallback defaults in `src/config/env.ts`

Verified (Mobile):
- `src/config/env.ts`
- `app.config.js`
- `app.json`
- `eas.json`

---

## 2) Required env vars

Base API config (required for builds):
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_REALTIME_URL`
- `EXPO_PUBLIC_HEALTH_ENDPOINT`

Payment provider URLs (optional unless used):
- `EXPO_PUBLIC_IPAY_BASE_URL`
- `EXPO_PUBLIC_BTCPAY_BASE_URL`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Android maps (required for release MapView):
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

Verified (Mobile):
- `src/config/env.ts`
- `app.config.js`

---

## 3) Local dev example

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_REALTIME_URL=ws://localhost:8001/ws
EXPO_PUBLIC_HEALTH_ENDPOINT=/api/v1/health/
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here
```

Note: MapView can run in dev without a key, but release builds on Android
require the key.

---

## 4) "Choose on Map" code path

Entry:
- `src/screens/mentor/MentorHomeScreen.tsx`
  - `navigation.navigate('BirthData')`

Screen:
- `src/screens/astro/BirthDataScreen.tsx`
  - `handleOpenMap()` -> `setMapVisible(true)`

Map modal:
- `src/components/astro/BirthLocationMapModal.tsx`
  - `MapView` from `react-native-maps`

Route:
- `src/navigation/MainTabsNavigator.tsx` -> `BirthData`

---

## 5) Release crash root cause (most likely) and fix

Likely cause:
- Android release builds crash when `MapView` initializes without a Google Maps
  API key in the native config.

Fix:
- Provide `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in build env.
- `app.config.js` injects `android.config.googleMaps.apiKey`.
- The map modal now guards and shows a safe error if the key is missing.

Verified (Mobile):
- `src/components/astro/BirthLocationMapModal.tsx`
- `app.config.js`

---

## 6) QA (APK)

1) Build with `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` set.
2) Open Mentor -> Birth Data -> Choose on Map.
3) Map renders and app does not crash.
4) If the key is missing, the modal shows a "Map unavailable" message instead
   of crashing.

Optional logcat:
```
adb logcat | rg -i "BirthLocationMapModal|maps"
```
