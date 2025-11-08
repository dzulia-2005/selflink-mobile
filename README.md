# Selflink Mobile

React Native + Expo client for the Selflink platform. The visual language leans into Apple’s silver hardware aesthetic—metallic gradients, rounded controls, and subtle haptics.

## Quick Start

```bash
npm install
npm run start
```

Run the app with `npm run ios`, `npm run android`, or `npm run web`.

## Project Structure

```
src/
  components/      # Reusable UI (MetalPanel, MetalButton, etc.)
  config/          # Environment helpers (backend URL, health endpoint)
  hooks/           # Shared hooks (backend health, etc.)
  navigation/      # Stack navigators & route types
  services/        # API client scaffolding
  screens/         # Screen-level views
  theme/           # Palette, spacing, typography tokens
  __tests__/       # Test suites (jest-expo + RTL)
```

## Scripts

- `npm run lint` – ESLint with import ordering rules.
- `npm run typecheck` – TypeScript in noEmit mode.
- `npm test` – jest-expo test runner.
- `npm run start` – Boot Expo development server with the Auth + navigation stack.

## Environment Config

- `app.json` now exposes `expo.extra.backendUrl` and `expo.extra.healthEndpoint`. Adjust these per environment (the fallback points to `http://10.0.2.2:8000` so the Android emulator reaches your local Django server).
- `src/config/env.ts` reads those values, and `src/hooks/useBackendHealth.ts` uses them to test the Django API’s `/api/health/` endpoint by default.
- Extend `src/services/api/client.ts` to add authenticated requests once login is wired.

## Authentication Foundation

- `src/context/AuthContext.tsx` stores the JWT, syncs with `expo-secure-store`, and keeps `apiClient` updated.
- `src/hooks/useAuth.ts` provides easy access to `signIn`, `signOut`, and auth state.
- `src/screens/LoginScreen.tsx` offers a metallic-themed sign-in form that hits `/api/v1/auth/login/`, falling back to a mock token for local dev.
- `src/screens/RegisterScreen.tsx` collects the backend-required payload (email, handle, name, password, optional full name/intention) and reuses the toast/auth flows before routing new users into the app.
- `AppNavigator` now gates access: unauthenticated users see Login; signed-in users reach Home/Mentor/SoulMatch/Payments and can sign out directly from the Home welcome panel.
- Home’s welcome panel shows the active user and exposes a Sign Out CTA, making it easy to switch accounts during testing.
- `src/services/api/user.ts` and the auth provider call `/api/v1/users/me/` to hydrate the profile on launch and after login.
- `src/services/api/comments.ts` wraps `/api/v1/comments/` so shared clients (mobile/desktop) can page through comment threads and perform CRUD via the same helper.
- `src/services/api/devices.ts` handles `/api/v1/devices/` CRUD so mobile/web can register or remove push tokens consistently.
- `src/services/api/feed.ts` wraps `/api/v1/feed/home/` and `/api/v1/home/highlights/` so all clients can fetch both the paginated timeline and highlight rail with the same helper.
- `src/services/api/matrix.ts` fetches `/api/v1/matrix/profile/` and posts to `/api/v1/matrix/sync/` so the SoulMatch/Mentor areas can share the same profile contract as the backend evolves.
- `src/services/api/media.ts` offers list + CRUD helpers for `/api/v1/media/` and `/api/v1/media/{id}/`, keeping uploads/metadata updates consistent across clients.
- `src/components/MetalToast.tsx` and `src/context/ToastContext.tsx` supply metallic toasts used for graceful login/profile error messaging across the app.

## Screens & Navigation

- `HomeScreen` surfaces mentor, SoulMatch, and payments actions with navigation hooks plus a backend status panel (`StatusPill`).
- `MentorScreen`, `SoulMatchScreen`, and `PaymentsScreen` provide polished placeholder flows ready for integrating Django endpoints.
- `ProfileScreen` lets users tweak display name or avatar URL (with inline metallic toasts) and sign out.
- `AppNavigator` registers the stack screens with metallic theming; add new routes here as features land.

## CI

- GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, then runs lint, typecheck, and tests on pushes and PRs targeting `main`.
- Jest specs cover both UI and auth flows (`src/__tests__/HomeScreen.test.tsx`, `src/__tests__/AuthContext.test.tsx`).
