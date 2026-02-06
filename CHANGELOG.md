# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-02-06

### Added

- Tests badge (99 passing) in README
- "Getting an API Key" section with contact email
- CI now runs unit tests
- Trusted Publishing (OIDC) for npm releases

### Fixed

- Default API URL changed from staging to production
- HTTP 504 maps to TIMEOUT_ERROR
- Client-side timeout correctly maps to TIMEOUT_ERROR
- README error codes table matches actual SDK codes

### Changed

- Publish workflow uses OIDC instead of npm token
- Cleaned up comments and section dividers
- Updated CONTRIBUTING.md with current project structure

### Added

- Unit test suite: client, errors, taxonomy, SR, images (99 tests)
- E2E workflow test against real API
- Vitest configs for unit, e2e, and combined test runs
- Realistic test fixtures with real API data
- `prepublishOnly` script to ensure build + test before publish
- CI now runs unit tests (not just type check)
- Publish workflow runs lint + tests before publishing
- `taxonomy.getCategories()` - List categories with pagination
- `taxonomy.getBrands()` - Search brands with pagination
- `taxonomy.getBrandsForType()` - Get brands for a specific type

### Fixed

- Default API URL changed from staging to production
- HTTP 504 now maps to `TIMEOUT_ERROR` instead of `SERVER_ERROR`
- Client-side timeout (`ECONNABORTED`) correctly maps to `TIMEOUT_ERROR`
- README error codes table matched to actual SDK codes
- README examples use safe null checks instead of force unwraps

### Changed

- Removed legacy test scripts (`run-step.ts`, `run-workflow.ts`)
- Cleaned up obvious comments and section dividers
- Aligned `types.ts` with real API response shapes (media fields, nullable supplement)

## [0.1.0] - 2026-02-05

### Added

- Initial release of the Legitmark TypeScript SDK
- Resource-based API with `legitmark.taxonomy`, `legitmark.sr`, and `legitmark.images` namespaces
- `WorkflowRunner` for orchestrating the complete authentication flow
- Automatic retry with exponential backoff for transient errors
- Comprehensive TypeScript types for all API responses
- Dual ESM/CJS build output
- Debug logging with `debug: true` option

### API Resources

- `taxonomy.getTree()` - Fetch the complete category/type/brand hierarchy
- `sr.create()` - Create a new service request
- `sr.get()` / `sr.getWithRequirements()` / `sr.getWithSides()` - Fetch SR details
- `sr.getProgress()` - Check photo upload progress
- `sr.submit()` - Submit SR for authentication
- `images.uploadForSide()` - Upload photos from file path, buffer, or stream

