# Legitmark TypeScript SDK

[![CI](https://github.com/legitmark-eng/legitmark-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/legitmark-eng/legitmark-typescript/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-131%20passing-brightgreen)](https://github.com/legitmark-eng/legitmark-typescript/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/legitmark.svg)](https://www.npmjs.com/package/legitmark)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

The official TypeScript SDK for the [Legitmark API](https://docs.legitmark.com). Submit items for authentication, upload photos, and handle webhook events with full type safety.

## Getting Started

1. **Get organization access** — Contact [accounts@legitmark.com](mailto:accounts@legitmark.com) to set up a new organization or be added to an existing one.
2. **Create an API key** — In [Developer Settings](https://app.legitmark.com/settings/developer), generate a new key.
3. **Add a webhook destination** (optional) — In [Developer Settings](https://app.legitmark.com/settings/developer), add your HTTPS endpoint for real-time notifications.

See the [Getting Started guide](https://docs.legitmark.com/partner/getting-started) for the full walkthrough.

## Installation

```bash
npm install legitmark
```

## Quick Start

```typescript
import { Legitmark } from 'legitmark';

const legitmark = new Legitmark('leo_your_api_key');

// 1. Create a service request
const { sr } = await legitmark.sr.create({
  service: 'service-uuid',
  item: { category: 'category-uuid', type: 'type-uuid', brand: 'brand-uuid' },
});

// 2. Upload required photos
await legitmark.images.uploadForSide(sr.uuid, sideUuid, './photo.jpg');

// 3. Submit for authentication
await legitmark.sr.submit(sr.uuid);
```

## Features

- **Full TypeScript Support** — Complete type definitions for all requests and responses
- **Resource-Based API** — Clean access via `legitmark.sr`, `legitmark.taxonomy`, `legitmark.images`
- **Webhook Event Handling** — Typed payloads, parser, and state helpers for consuming webhook events
- **Built-in Retries** — Automatic retry with exponential backoff via `withRetry()`
- **Configurable Timeouts** — Per-request timeout customization with `withOptions()`
- **Debug Logging** — Optional verbose logging for troubleshooting

## API Reference

See the [Workflow guide](https://docs.legitmark.com/partner/workflow) for the complete step-by-step integration process.

### Service Requests (`legitmark.sr`)

```typescript
await legitmark.sr.create(request);              // Create new SR
await legitmark.sr.get(uuid);                     // Get SR by UUID
await legitmark.sr.getWithRequirements(uuid);     // Get with photo requirements
await legitmark.sr.getWithSides(uuid);            // Get with sides and progress
await legitmark.sr.getProgress(uuid);             // Check upload progress
await legitmark.sr.submit(uuid);                  // Submit for authentication
```

### Taxonomy (`legitmark.taxonomy`)

```typescript
await legitmark.taxonomy.getTree();               // Full category → type tree
await legitmark.taxonomy.getCategories();          // List categories (paginated)
await legitmark.taxonomy.getBrands({ search });    // Search brands (paginated)
await legitmark.taxonomy.getBrandsForType(uuid);   // Brands for a specific type
```

### Images (`legitmark.images`)

```typescript
await legitmark.images.uploadForSide(srUuid, sideUuid, './photo.jpg');
await legitmark.images.uploadForSide(srUuid, sideUuid, imageBuffer);
```

## Handling Webhook Events

When authentication completes, images are rejected, or a request is cancelled, your webhook endpoint receives an event. The SDK provides typed payloads and helper functions.

```typescript
import { parseWebhookEvent, isAuthentic, isCounterfeit, needsResubmission, isCancelled } from 'legitmark';

app.post('/webhooks/legitmark', express.json(), (req, res) => {
  const event = parseWebhookEvent(req.body);

  if (isAuthentic(event)) {
    markItemAsAuthentic(event.reference_id);
  } else if (isCounterfeit(event)) {
    flagItem(event.reference_id);
  } else if (needsResubmission(event)) {
    requestNewPhotos(event.reference_id, event.sides);
  } else if (isCancelled(event)) {
    closeCase(event.sr_uuid);
  }

  res.status(200).send('OK');
});
```

| Helper | Returns `true` when |
|--------|---------------------|
| `isAuthentic(event)` | `COMPLETE + APPROVED` — item is genuine |
| `isCounterfeit(event)` | `COMPLETE + REJECTED` — item is not authentic |
| `isCancelled(event)` | `CANCELLED` — SR was cancelled |
| `needsResubmission(event)` | Images rejected, partner should re-upload |
| `isQcApproved(event)` | QC passed, proceeding to authentication |
| `isAuthenticationInProgress(event)` | Authenticator assigned, work underway |

See the [Webhook Reference](https://docs.legitmark.com/webhook-reference/introduction) for event payload schemas and the [Handling guide](https://docs.legitmark.com/webhook-reference/handling) for best practices.

## Configuration

```typescript
const legitmark = new Legitmark('leo_xxx', {
  debug: true,       // Enable verbose logging (default: false)
  timeout: 60000,    // Request timeout in ms (default: 30000)
});
```

### Environment Variables

```typescript
import { createClientFromEnv } from 'legitmark';

// Reads LEGITMARK_API_KEY and LEGITMARK_DEBUG from env
const legitmark = createClientFromEnv();
```

| Variable | Description |
|----------|-------------|
| `LEGITMARK_API_KEY` | Your partner API key |
| `LEGITMARK_DEBUG` | Set to `true` to enable debug logging |

## Error Handling

```typescript
import { LegitmarkError, withRetry } from 'legitmark';

try {
  await legitmark.sr.submit(srUuid);
} catch (error) {
  if (error instanceof LegitmarkError) {
    console.error(`[${error.code}] ${error.message}`);
    console.log('Request ID:', error.context.requestId);

    if (error.isRetryable) {
      // Safe to retry — or use withRetry() for automatic retries
    }
  }
}

// Automatic retries with exponential backoff
const result = await withRetry(() => legitmark.sr.create(request), {
  attempts: 3,
  onRetry: (err, attempt) => console.log(`Retry ${attempt}...`),
});
```

| Error Code | Status | Retryable | Description |
|-----------|--------|-----------|-------------|
| `VALIDATION_ERROR` | 400 | No | Invalid request parameters |
| `AUTHENTICATION_ERROR` | 401/403 | No | Invalid or expired API key |
| `NOT_FOUND_ERROR` | 404 | No | Resource not found |
| `RATE_LIMIT_ERROR` | 429 | Yes | Too many requests |
| `SERVER_ERROR` | 500+ | Yes | Server-side error |
| `TIMEOUT_ERROR` | 504 | Yes | Gateway or request timeout |
| `NETWORK_ERROR` | — | Yes | Connection failed |

## Requirements

- **Node.js** 18.0+
- **TypeScript** 5.0+ (if using TypeScript)

Compatible with modern bundlers (webpack, esbuild, vite, etc.).

## Documentation

- [Getting Started](https://docs.legitmark.com/partner/getting-started) — Account setup, API keys, webhook destinations
- [Workflow Guide](https://docs.legitmark.com/partner/workflow) — Step-by-step integration process
- [Taxonomy](https://docs.legitmark.com/partner/taxonomy) — Category, type, and brand classification
- [Webhook Reference](https://docs.legitmark.com/webhook-reference/introduction) — Event types and payload schemas
- [API Reference](https://docs.legitmark.com/api-reference/introduction) — Full endpoint documentation

## Development

```bash
npm run build        # Build (CJS + ESM + DTS)
npm run lint         # Lint
npm run test:unit    # Unit tests
npm run test:e2e     # E2E tests (requires .env with API key)
npm run test:all     # All tests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Security

To report security vulnerabilities, see [SECURITY.md](SECURITY.md).

## License

MIT — See [LICENSE](LICENSE) for details.
