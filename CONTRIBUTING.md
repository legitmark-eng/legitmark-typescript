# Contributing to Legitmark Partner SDK

Thank you for your interest in contributing! This document provides guidelines for contributing to the SDK.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Add your test API key to `.env`

## Project Structure

```
legitmark-typescript/
├── src/
│   ├── index.ts          # Public exports
│   ├── client.ts         # PartnerClient, Legitmark, error handling, retry
│   ├── types.ts          # TypeScript interfaces
│   ├── workflow.ts        # WorkflowRunner for orchestrated flows
│   └── resources/        # API resource classes
│       ├── index.ts      # Resource re-exports
│       ├── taxonomy.ts   # Categories, types, brands
│       ├── sr.ts         # Service requests
│       └── images.ts     # Image uploads
├── tests/
│   ├── fixtures/         # Realistic test data from the API
│   ├── utils.ts          # Shared test utilities and helpers
│   ├── client.test.ts    # Client and retry tests
│   ├── errors.test.ts    # Error class tests
│   ├── taxonomy.test.ts  # Taxonomy resource tests
│   ├── sr.test.ts        # Service request tests
│   ├── images.test.ts    # Image upload tests
│   └── workflow.e2e.test.ts  # E2E workflow (requires API key)
└── dist/                 # Build output (generated)
```

## Scripts

- `npm run build` - Build CJS/ESM bundles with tsup
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run E2E tests (requires `.env` with API key)
- `npm run test:all` - Run all tests (unit + E2E)

## Code Style

- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Use JSDoc comments for public methods
- Follow existing patterns in the codebase
- No obvious comments (don't comment what the code already says)

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Run the checks:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run test:unit
   ```
4. Update CHANGELOG.md with your changes
5. Submit a pull request

## Commit Messages

Use conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code changes that don't add features or fix bugs
- `test:` Test additions or changes
- `chore:` Build, config, or tooling changes

## Questions?

Open an issue on GitHub or reach out to the team.
