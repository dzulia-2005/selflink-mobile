# Contributing

Thanks for your interest in contributing to this project! Contributions of all sizes are welcome, from small fixes to bigger improvements.

## Who This Is For

- Beginners looking for a real-world codebase to learn from
- Experienced developers interested in improving architecture or developer experience
- Contributors who enjoy making focused, high-impact changes or improving documentation
- Anyone with questions, suggestions, or feedback about the codebase


## Ways to contribute

- Code improvements (bug fixes, small features, cleanup)
- Documentation (README, API map, in-app copy)
- Performance and refactoring (simpler code, fewer renders, leaner data flow)
- UI/UX polish (spacing, accessibility, empty states, visual consistency)
- Internationalization (Georgian/Russian and general i18n structure)

## Good first contributions

- Fix typos or unclear sections in docs
- Improve a single screen's spacing or alignment
- Extract a small, repeated UI pattern into a reusable component
- Add or refine loading, empty, or error states
- Identify hardcoded strings and move them into i18n keys
- Add or improve Georgian/Russian translations where possible

## Contributor Quick Start

1. Read `README.md` and `docs/API.md` to understand scope and API wrappers.
2. Install dependencies: `npm install`.
3. Run the app: `npm run start`, then launch iOS/Android from the Expo UI.
4. Follow the app flow: `index.ts` -> `src/App.tsx` -> `src/navigation/RootNavigator.tsx`.
5. Know the key folders:
   - `src/screens/` feature entry points
   - `src/components/` reusable UI
   - `src/store/` app state (Zustand)
   - `src/hooks/` side effects and shared logic
   - `src/api/` (Axios) and `src/services/api/` (fetch) for API calls
   - `src/types/` shared domain types
   - `src/config/env.ts` runtime config (API base + realtime)
6. Use module aliases like `@screens/` and `@components/` (see `babel.config.js` and `tsconfig.json`).
7. Optional checks: `npm test`, `npm run lint`, `npm run typecheck`.

## Contribution workflow

1. Fork the repo.
2. Create a feature branch.
3. Make small, focused changes.
4. Open a pull request with a clear description of what and why.

## Expectations and guidelines

- Keep PRs small and scoped.
- Prefer clarity over cleverness.
- Add comments where behavior is non-obvious.
- Update docs when behavior changes.

## Communication

Be respectful, constructive, and open to feedback. Questions and suggestions are welcome.
