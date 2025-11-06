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

- `app.json` now exposes `expo.extra.backendUrl` and `expo.extra.healthEndpoint`. Adjust these per environment or convert to `app.config.ts` for full env switching.
- `src/config/env.ts` reads those values, and `src/hooks/useBackendHealth.ts` uses them to test the Django API’s `/api/health/` endpoint by default.
- Extend `src/services/api/client.ts` to add authenticated requests once login is wired.

## Authentication Foundation

- `src/context/AuthContext.tsx` stores the JWT, syncs with `expo-secure-store`, and keeps `apiClient` updated.
- `src/hooks/useAuth.ts` provides easy access to `signIn`, `signOut`, and auth state.
- `src/screens/LoginScreen.tsx` offers a metallic-themed sign-in form that hits `/api/v1/auth/login/`, falling back to a mock token for local dev.
- `AppNavigator` now gates access: unauthenticated users see Login; signed-in users reach Home/Mentor/SoulMatch/Payments and can sign out directly from the Home welcome panel.
- Home’s welcome panel shows the active user and exposes a Sign Out CTA, making it easy to switch accounts during testing.
- `src/services/api/user.ts` and the auth provider call `/api/v1/users/me/` to hydrate the profile on launch and after login.
- `src/components/MetalToast.tsx` and `src/context/ToastContext.tsx` supply metallic toasts used for graceful login/profile error messaging across the app.

## Screens & Navigation

- `HomeScreen` surfaces mentor, SoulMatch, and payments actions with navigation hooks plus a backend status panel (`StatusPill`).
- `MentorScreen`, `SoulMatchScreen`, and `PaymentsScreen` provide polished placeholder flows ready for integrating Django endpoints.
- `ProfileScreen` lets users tweak display name or avatar URL (with inline metallic toasts) and sign out.
- `AppNavigator` registers the stack screens with metallic theming; add new routes here as features land.

## CI

- GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, then runs lint, typecheck, and tests on pushes and PRs targeting `main`.
- Jest specs cover both UI and auth flows (`src/__tests__/HomeScreen.test.tsx`, `src/__tests__/AuthContext.test.tsx`).
