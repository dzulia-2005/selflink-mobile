<!-- ![Screenshot](assets/git_logo.png) -->
<img src="assets/git_logo.png" alt="Screenshot" width="700">

[![GitHub Actions Build Status](https://github.com/georgetoloraia/selflink-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/georgetoloraia/selflink-mobile/actions/workflows/ci.yml)
[![Join our Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/PkqyuWq2Zd)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)




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

## Tech Stack

- React Native + Expo (EAS)
- TypeScript
- REST API backend (Backend repo - [Click me!](https://github.com/georgetoloraia/selflink-backend))
- Optional AI features

## Project Structure

```text
src/
├── components/     # UI components (Buttons, Inputs, Cards)
├── screens/        # Screen-level views and flows
├── navigation/     # Navigators, route configs
├── services/       
│   └── api/        # Frontend API wrapper layer
├── hooks/          # Custom shared hooks and state helpers
├── theme/          # Design tokens and styling primitives
└── docs/           # Architecture notes and API documentation
```

## API Overview

See [`docs/API.md`](docs/API.md) for a frontend-facing map of API calls and wrapper modules. This is not backend documentation; it is a guide to how the mobile client talks to the REST API.

- Wallet + SLC integration notes live in [`docs/WALLET_SLC.md`](docs/WALLET_SLC.md).

- Wallet + iPay purchase flow notes live in [`docs/WALLET_SLC_IPAY.md`](docs/WALLET_SLC_IPAY.md).

- Wallet + Stripe purchase flow notes live in [`docs/WALLET_SLC_STRIPE.md`](docs/WALLET_SLC_STRIPE.md).

- Wallet + BTCPay purchase flow notes live in [`docs/WALLET_SLC_BTCPAY.md`](docs/WALLET_SLC_BTCPAY.md).

- Wallet + IAP purchase flow notes live in [`docs/WALLET_SLC_IAP.md`](docs/WALLET_SLC_IAP.md).

- Payments gifts notes live in [`docs/PAYMENTS_GIFTS_NOTES.md`](docs/PAYMENTS_GIFTS_NOTES.md).

- Mobile wallet + SLC overview lives in [`docs/MOBILE_WALLET_SLC_OVERVIEW.md`](docs/MOBILE_WALLET_SLC_OVERVIEW.md).

- Mobile payments providers guide lives in [`docs/MOBILE_PAYMENTS_PROVIDERS.md`](docs/MOBILE_PAYMENTS_PROVIDERS.md).

- Mobile gifts UI guide lives in [`docs/MOBILE_GIFTS_UI.md`](docs/MOBILE_GIFTS_UI.md).

- Mobile local runbook lives in [`docs/MOBILE_RUNBOOK_LOCAL.md`](docs/MOBILE_RUNBOOK_LOCAL.md).

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

We aim to make this project accessible to everyone, regardless of their language. Support is actively evolving, and we welcome contributions in the following areas:
* Adding new language localizations.
* Refactoring UI components for better translation readiness.
* Cleaning up and proofreading existing display text.

*Note: You do not need to be multilingual to help with the technical side of i18n!*

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

For questions or collaboration, join our [Discord](https://discord.gg/GQdQagsw)!

## Project Status

This project is in an early exploratory phase. Current focus areas include:

- navigation, screens, and core UI flows
- API wrapper consistency and error handling
- internationalization readiness
- testing and developer experience improvements
- architecture cleanup and documentation

No detailed roadmap is committed at this stage.
