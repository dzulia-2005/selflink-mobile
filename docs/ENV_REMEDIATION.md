# Env Remediation Checklist (Mobile)

Use this checklist when rotating secrets or fixing environment issues.

## 1) Remove leaked secrets from repo
- [ ] Remove any real API keys from `.env` (commit should never include secrets).
- [ ] Rotate leaked keys in the provider console (Google Maps, Stripe, etc.).

## 2) Add secrets to EAS
Use EAS secrets instead of committing keys:

```
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <new-key>
```

Repeat for any other EXPO_PUBLIC_* keys that must be present in builds.

## 3) Validate .env.sample
- [ ] Keep `.env.sample` empty for secrets.
- [ ] Only include placeholders, not real values.

## 4) Verify EAS build env usage
- [ ] `eas.json` uses `${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}` or other secrets.
- [ ] Build profiles are minimal (e.g., `apk`, `production`).

## 5) Local developer setup
- [ ] Add keys in local `.env` only (never commit).
- [ ] Confirm app reads `EXPO_PUBLIC_*` vars in `src/config/env.ts`.

## 6) Smoke test
- [ ] Run `npx expo config --type public` to confirm env injection.
- [ ] Build with `npx eas build -p android --profile apk` after setting secrets.
