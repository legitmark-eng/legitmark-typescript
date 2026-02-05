# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

