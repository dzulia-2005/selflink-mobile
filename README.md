# SelfLink Mobile

SelfLink Mobile is an early-stage, open-source mobile app built with React Native + Expo. It is developed in public and intentionally unfinished, with a focus on clean architecture, developer experience, and learning-by-doing.

## What Is SelfLink Mobile

click for more [`WHAT-IS-SELFLINK.md`](WHAT-IS-SELFLINK.md)
SelfLink Mobile is a React Native client exploring social features, personal growth tools, and optional AI-assisted guidance in a transparent codebase. It is not a finished product and should be treated as an evolving project built for experimentation and collaboration.

## Project Purpose

The project exists to explore:
- clean mobile architecture and maintainable code
- a contributor-friendly workflow that welcomes experimentation
- internationalization as a first-class concern
- AI as an optional, assistive layer rather than a requirement

## Who Is This For

This repository is for:
- beginners who want a real-world codebase to learn from
- experienced developers who want to improve architecture or developer experience
- contributors who prefer small, focused changes or documentation improvements
- anyone with questions or feedback about the codebase

## Tech Stack

- React Native
- Expo
- TypeScript
- REST API backend (separate repo)
- Optional AI features

## Project Structure (High-Level)

- `src/components/` - reusable UI components
- `src/screens/` - screen-level views and flows
- `src/navigation/` - navigators and route definitions
- `src/services/api/` - frontend API wrapper layer
- `src/hooks/` - shared hooks and state helpers
- `src/theme/` - design tokens and styling primitives
- `docs/` - project documentation

## API Overview

See [`docs/API.md`](docs/API.md) for a frontend-facing map of API calls and wrapper modules. This is not backend documentation; it is a guide to how the mobile client talks to the REST API.

Wallet + SLC integration notes live in [`docs/WALLET_SLC.md`](docs/WALLET_SLC.md).
Wallet + iPay purchase flow notes live in [`docs/WALLET_SLC_IPAY.md`](docs/WALLET_SLC_IPAY.md).
Wallet + Stripe purchase flow notes live in [`docs/WALLET_SLC_STRIPE.md`](docs/WALLET_SLC_STRIPE.md).
Wallet + BTCPay purchase flow notes live in [`docs/WALLET_SLC_BTCPAY.md`](docs/WALLET_SLC_BTCPAY.md).
Payments gifts notes live in [`docs/PAYMENTS_GIFTS_NOTES.md`](docs/PAYMENTS_GIFTS_NOTES.md).
Mobile wallet + SLC overview lives in [`docs/MOBILE_WALLET_SLC_OVERVIEW.md`](docs/MOBILE_WALLET_SLC_OVERVIEW.md).
Mobile payments providers guide lives in [`docs/MOBILE_PAYMENTS_PROVIDERS.md`](docs/MOBILE_PAYMENTS_PROVIDERS.md).
Mobile gifts UI guide lives in [`docs/MOBILE_GIFTS_UI.md`](docs/MOBILE_GIFTS_UI.md).
Mobile local runbook lives in [`docs/MOBILE_RUNBOOK_LOCAL.md`](docs/MOBILE_RUNBOOK_LOCAL.md).

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

Internationalization is a core goal. Language support is evolving, and contributions to translation readiness or UI text cleanup are welcome. You do not need to speak all supported languages to contribute.

## AI Features

AI features, where present, are designed to augment user actions. No critical path depends solely on AI, and AI failures should degrade gracefully to non-AI flows.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) for workflow and expectations. Examples of good first contributions:

- improve README or inline documentation
- tighten up TypeScript types or linting
- add small tests around existing components
- refactor a screen or component for clarity
- refine API wrapper functions in `src/services/api/`
- help with i18n readiness or UI text consistency

For questions or collaboration, join the Discord: https://discord.gg/GQdQagsw

## Project Status

This project is in an early exploratory phase. Current focus areas include:

- navigation, screens, and core UI flows
- API wrapper consistency and error handling
- internationalization readiness
- testing and developer experience improvements
- architecture cleanup and documentation

No detailed roadmap is committed at this stage.

## License

See `LICENSE`.
