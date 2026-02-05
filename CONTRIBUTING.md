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
sdk/partner/
├── src/
│   ├── index.ts        # Public exports
│   ├── client.ts       # PartnerClient, Legitmark alias, error handling
│   ├── types.ts        # TypeScript interfaces
│   ├── workflow.ts     # WorkflowRunner for orchestrated flows
│   └── resources/      # API resource classes (sr, taxonomy, images)
├── tests/              # Test scripts
└── dist/               # Build output (generated)
```

## Scripts

- `npm run build` - Build CJS/ESM bundles with tsup
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm test` - Run workflow test
- `npm run test:step` - Run step-by-step test

## Code Style

- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Use JSDoc comments for public methods
- Follow existing patterns in the codebase

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Run type checking: `npx tsc --noEmit`
4. Run tests to verify nothing is broken
5. Update CHANGELOG.md with your changes
6. Submit a pull request

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
