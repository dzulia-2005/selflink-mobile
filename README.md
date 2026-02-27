<!-- Banner -->
<p align="center">
  <img src="assets/git_logo.png" alt="Screenshot" width="400">
</p>

<!-- Badges -->
<p align="center">
  <a href="https://github.com/georgetoloraia/selflink-mobile/actions/workflows/ci.yml">
    <img src="https://github.com/georgetoloraia/selflink-mobile/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://discord.gg/PkqyuWq2Zd">
    <img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" />
  </a>
</p>

<!-- Heading -->
<h1 align="center">SelfLink Mobile</h1>

SelfLink Mobile is an early-stage, open-source mobile app built with React Native + Expo. It is developed in public and intentionally unfinished, with a focus on clean architecture, developer experience, and learning-by-doing.

## What Is SelfLink Mobile


SelfLink Mobile is a React Native client exploring social features, personal growth tools, and optional AI-assisted guidance in a transparent codebase. It is not a finished product and should be treated as an evolving project built for experimentation and collaboration. Click for more [`WHAT-IS-SELFLINK.md`](WHAT-IS-SELFLINK.md)

## Project Purpose

The project exists to explore:
- clean mobile architecture and maintainable code
- a contributor-friendly workflow that welcomes experimentation
- internationalization as a first-class concern
- AI as an optional, assistive layer rather than a requirement

## Tech Stack

- React Native + Expo (EAS)
- TypeScript
- REST API backend (Backend repo - [Click me!](https://github.com/georgetoloraia/selflink-backend))
- Optional AI features

## Project Structure

```text
src/
├── screens/                 # Feature screens (auth, feed, mentor, soulmatch, wallet, etc.)
├── components/              # Reusable UI building blocks
│   ├── comments/            # Comment UI + helpers
│   ├── gifts/               # Gifts/payments visual components
│   ├── messaging/           # Chat/thread visual components
│   ├── astro/               # Astrology-specific presentational components
│   └── soulmatch/           # SoulMatch-specific presentational components
├── navigation/              # Root/tabs/stacks and route typing
├── i18n/                    # i18next setup + locale JSON dictionaries (en/ru/ka)
├── api/                     # Canonical HTTP client + API modules (single client source)
├── services/api/            # Domain-level API wrappers still used in parts of app
├── hooks/                   # Shared logic and data-fetching hooks
├── store/                   # Zustand stores and app state
├── context/                 # React context providers (auth, toast)
├── theme/                   # Design tokens, theme primitives
├── utils/                   # Utilities (parsing, polling, mappers, helpers)
├── config/                  # Runtime env/config wiring
├── realtime/                # Realtime connection helpers/channels
├── constants/               # Shared constants and enum-like maps
├── types/                   # Shared domain and API types
├── styles/                  # Cross-screen style helpers/animations
└── __tests__/               # App-level integration/smoke tests
```

Quick orientation:
- Start app flow: `index.ts` -> `src/App.tsx` -> `src/navigation/RootNavigator.tsx`
- New feature UI: add screen in `src/screens/<feature>/` and shared pieces in `src/components/`
- API work: prefer `src/api/` and keep transport concerns centralized
- Text updates: use `src/i18n/locales/*.json` and avoid hardcoded UI strings

## API Overview

See [`docs/API.md`](docs/API.md) for a frontend-facing map of API calls and wrapper modules. This is not backend documentation; it is a guide to how the mobile client talks to the REST API.

## Getting Started

### Prerequisites

- Node.js LTS
- Expo tooling (use `npx expo` or install Expo CLI)
- Android Studio for Android emulator, and/or Xcode for iOS simulator
- Expo Go on a physical device (optional)

### Install

```bash
npm install
```

### Run Locally

```bash
npm run start
```

Then launch on a simulator or device using the Expo UI, or run:

```bash
npm run ios
npm run android
```

## Wallet + SLC (Coin) Setup

### Required env vars
- `EXPO_PUBLIC_API_BASE_URL` (used to derive `API_BASE_URL` / `API_HTTP_BASE_URL` in `src/config/env.ts`)
  - Example: `http://localhost:8000`

### Test Wallet + SLC screens
1. Start the backend locally and sign in.
2. Open the Wallet tab.
3. Confirm both "Wallet (Payments)" and "SLC Balance (Credits)" load.
4. Use "Send SLC" with a valid recipient user ID.
5. Verify the "SLC Activity" list updates and pagination works via "Load more".

### Troubleshooting

If Metro gets stuck or shows stale bundles, clear the cache:

```bash
npx expo start -c
```

## Internationalization (i18n)

Current app languages:
- English (`en`)
- Russian (`ru`)
- Georgian (`ka`)

Source of truth:
- i18n setup: `src/i18n/index.ts`
- locale dictionaries: `src/i18n/locales/en.json`, `ru.json`, `ka.json`

Key conventions:
- Use translation keys for user-facing UI text (do not hardcode strings in screens/components).
- Keep the same keyset in all locale files.
- Use shared keys under `common.*` for reusable labels (`save`, `cancel`, `retry`, etc.).

Checks before opening PR:
```bash
npx jest src/i18n/__tests__/localeKeyParity.test.ts --runInBand
npm run lint
```

Helpful scan for leftover literals:
```bash
rg -n ">([^<{][^<]*)<" src/screens src/components
```

If you add new UI copy:
1. Add keys in `en.json`.
2. Mirror the same keys in `ru.json` and `ka.json`.
3. Replace literals in UI with `t('...')`.

## AI Features

AI features, where present, are designed to augment user actions. No critical path depends solely on AI, and AI failures should degrade gracefully to non-AI flows.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) for workflow and expectations.

Before opening a PR, run:
```bash
npm run lint
npm run typecheck
npm run test
```

If your PR touches translations, also run:
```bash
npx jest src/i18n/__tests__/localeKeyParity.test.ts --runInBand
```

For questions or collaboration, join our [Discord](https://discord.gg/GQdQagsw)!

## Project Status

This project is still evolving, but core foundations are now in place:

- primary navigation stacks and key mobile flows are implemented
- i18n is integrated with active `en/ru/ka` localization coverage
- locale key parity is enforced by automated tests
- lint/typecheck/test are part of the expected contributor workflow
- API and wallet/payment integrations are implemented with ongoing hardening

Current focus areas:

- finishing localization on remaining legacy screens
- reducing test noise (non-failing warnings/log verbosity)
- incremental architecture cleanup and consistency improvements
- UX polish and reliability for production builds
