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

## Environment Config

- `app.json` now exposes `expo.extra.backendUrl` and `expo.extra.healthEndpoint`. Adjust these per environment or convert to `app.config.ts` for full env switching.
- `src/config/env.ts` reads those values, and `src/hooks/useBackendHealth.ts` uses them to test the Django API’s `/api/health/` endpoint by default.
- Extend `src/services/api/client.ts` to add authenticated requests once login is wired.

## Screens & Navigation

- `HomeScreen` surfaces mentor, SoulMatch, and payments actions with navigation hooks plus a backend status panel (`StatusPill`).
- `MentorScreen`, `SoulMatchScreen`, and `PaymentsScreen` provide polished placeholder flows ready for integrating Django endpoints.
- `AppNavigator` registers the stack screens with metallic theming; add new routes here as features land.

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, then runs lint, typecheck, and tests on pushes and PRs targeting `main`.
