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
  navigation/      # Stack navigators & route types
  screens/         # Screen-level views
  theme/           # Palette, spacing, typography tokens
  __tests__/       # Test suites (jest-expo + RTL)
```

## Scripts

- `npm run lint` – ESLint with import ordering rules.
- `npm run typecheck` – TypeScript in noEmit mode.
- `npm test` – jest-expo test runner.

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, then runs lint, typecheck, and tests on pushes and PRs targeting `main`.
