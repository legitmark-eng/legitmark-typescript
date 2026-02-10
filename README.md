# Legitmark TypeScript SDK

[![CI](https://github.com/legitmark-eng/legitmark-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/legitmark-eng/legitmark-typescript/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-131%20passing-brightgreen)](https://github.com/legitmark-eng/legitmark-typescript/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/legitmark.svg)](https://www.npmjs.com/package/legitmark)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

The official TypeScript SDK for the Legitmark API.

## Installation

```bash
npm install legitmark
```

## Quick Start

```typescript
import { Legitmark } from 'legitmark';

const legitmark = new Legitmark('leo_your_api_key'); // Get your key at engineering@legitmark.com

// Create a service request
const { sr } = await legitmark.sr.create({
  service: 'service-uuid',
  item: { category: 'category-uuid', type: 'type-uuid', brand: 'brand-uuid' },
});

// Upload images
await legitmark.images.uploadForSide(sr.uuid, sideUuid, './photo.jpg');

// Submit for authentication
await legitmark.sr.submit(sr.uuid);
```

## Features

- **Full TypeScript Support** - Complete type definitions for all requests and responses
- **Resource-Based API** - Clean access via `legitmark.sr.*`, `legitmark.taxonomy.*`, `legitmark.images.*`
- **Webhook Event Handling** - Typed payloads, parser, and state helpers for consuming webhook events
- **Built-in Retries** - Automatic retry with exponential backoff for transient failures
- **Configurable Timeouts** - Per-request timeout customization
- **Debug Logging** - Optional verbose logging for troubleshooting

## Usage Guide

### Step 1: Get Taxonomy (Categories, Types, Brands)

The taxonomy is hierarchical: **Categories → Types → Brands**. You need UUIDs for each to create a Service Request.

#### Option A: Get Full Tree

Get all categories with their nested types in one call:

```typescript
const { data: categories, metadata } = await legitmark.taxonomy.getTree({ activeOnly: true });

console.log(`Found ${metadata.total_categories} categories`);

for (const category of categories) {
  console.log(`${category.name}: ${category.types?.length} types`);
  for (const type of category.types ?? []) {
    console.log(`  - ${type.name} (${type.uuid})`);
  }
}
```

#### Option B: List Categories

Get a paginated list of categories:

```typescript
const { data: categories } = await legitmark.taxonomy.getCategories();

const footwear = categories.find(c => c.name === 'Footwear');
console.log(`Footwear UUID: ${footwear?.uuid}`);
```

#### Option C: Get Brands for a Type

After selecting a category and type, get available brands:

```typescript
// After user selects "Sneakers" type
const { data: brands } = await legitmark.taxonomy.getBrandsForType(sneakersTypeUuid);

for (const brand of brands) {
  console.log(`${brand.name} (${brand.uuid})`);
}
// Output: Nike (abc-123), Adidas (def-456), ...
```

#### Option D: Search All Brands

Search across all brands by name:

```typescript
const { data: brands } = await legitmark.taxonomy.getBrands({ search: 'Nike' });

const nike = brands[0];
console.log(`Nike UUID: ${nike?.uuid}`);
```

#### Complete Lookup Example

```typescript
// 1. Get taxonomy tree
const { data: categories } = await legitmark.taxonomy.getTree();

// 2. Find the category
const footwear = categories.find(c => c.name === 'Footwear');
if (!footwear) throw new Error('Category not found');
const categoryUuid = footwear.uuid;

// 3. Find the type within the category  
const sneakers = footwear.types?.find(t => t.name === 'Sneakers');
if (!sneakers) throw new Error('Type not found');
const typeUuid = sneakers.uuid;

// 4. Get brands available for this type
const { data: brands } = await legitmark.taxonomy.getBrandsForType(typeUuid);
const nike = brands.find(b => b.name === 'Nike');
if (!nike) throw new Error('Brand not found');
const brandUuid = nike.uuid;

// Now you have all UUIDs needed to create a Service Request
console.log({ categoryUuid, typeUuid, brandUuid });
```

### Step 2: Create Service Request (Draft)

```typescript
const { sr } = await legitmark.sr.create({
  service: 'service-uuid',
  external_id: 'my-internal-reference-123',
  source: 'my-platform',
  item: {
    category: 'category-uuid',
    type: 'type-uuid',
    brand: 'brand-uuid',
  },
});

console.log(`Created SR: ${sr.uuid}`);
```

### Step 3: Get Requirements

```typescript
const { sr } = await legitmark.sr.getWithRequirements(srUuid);

console.log(`Required photos: ${sr.requirements?.total_required}`);

for (const group of sr.requirements?.side_groups || []) {
  console.log(`\n${group.name}:`);
  for (const side of group.sides) {
    const status = side.required ? '🔴 required' : '⚪ optional';
    console.log(`  ${side.name} [${status}]`);
  }
}
```

### Step 4: Upload Images

```typescript
// Upload from file path
await legitmark.images.uploadForSide(srUuid, sideUuid, './photo.jpg');

// Or from buffer
await legitmark.images.uploadForSide(srUuid, sideUuid, imageBuffer);
```

### Step 5: Check Progress

```typescript
const progress = await legitmark.sr.getProgress(srUuid);

console.log(`Uploaded: ${progress.current_required}/${progress.total_required}`);
console.log(`Requirements met: ${progress.met ? 'Yes' : 'No'}`);

// Get full sides data with media URLs
const { sr } = await legitmark.sr.getWithSides(srUuid);
console.log('Required sides:', sr.sides?.required);
console.log('Optional sides:', sr.sides?.optional);
```

### Step 6: Submit

```typescript
// Check progress first
const progress = await legitmark.sr.getProgress(srUuid);

if (progress.met) {
  const { sr } = await legitmark.sr.submit(srUuid);
  console.log(`Submitted! State: ${sr.state.primary}/${sr.state.supplement}`);
} else {
  console.log(`Cannot submit: ${progress.current_required}/${progress.total_required} required images`);
}
```

### Per-Request Options

Override client defaults for specific requests:

```typescript
// Use longer timeout for image uploads
await legitmark.withOptions({ timeout: 60000 }).images.uploadForSide(srUuid, sideUuid, buffer);
```

## API Resources

The SDK uses a resource-based API pattern for clean, intuitive access to functionality.

### Service Requests (`legitmark.sr`)

```typescript
const { sr } = await legitmark.sr.create(request);           // Create new SR
const { sr } = await legitmark.sr.get(srUuid);               // Get SR by UUID
const { sr } = await legitmark.sr.getWithRequirements(uuid); // Get with image requirements
const { sr } = await legitmark.sr.getWithSides(uuid);        // Get with sides and progress
const progress = await legitmark.sr.getProgress(uuid);       // Check upload progress
const { sr } = await legitmark.sr.submit(srUuid);            // Submit for authentication
```

### Taxonomy (`legitmark.taxonomy`)

```typescript
// Get full taxonomy tree (categories with nested types)
const { data: categories } = await legitmark.taxonomy.getTree();
const { data: categories } = await legitmark.taxonomy.getTree({ activeOnly: true });

// List categories (paginated)
const { data: categories } = await legitmark.taxonomy.getCategories();
const { data: categories } = await legitmark.taxonomy.getCategories({ page: 1, pageSize: 50 });

// Get all brands (paginated, searchable)
const { data: brands } = await legitmark.taxonomy.getBrands();
const { data: brands } = await legitmark.taxonomy.getBrands({ search: 'Nike' });

// Get brands available for a specific type
const { data: brands } = await legitmark.taxonomy.getBrandsForType(typeUuid);
```

### Images (`legitmark.images`)

```typescript
// Upload from file path or buffer
await legitmark.images.uploadForSide(srUuid, sideUuid, './photo.jpg');
await legitmark.images.uploadForSide(srUuid, sideUuid, imageBuffer);
```

## Handling Webhook Events

When Legitmark completes authentication, rejects images, or cancels a request, your webhook endpoint receives an event. The SDK provides typed payloads, a parser, and helper functions so you don't need to memorize state combinations.

### Parse Incoming Events

```typescript
import { parseWebhookEvent } from 'legitmark';

app.post('/webhooks/legitmark', express.json(), (req, res) => {
  const event = parseWebhookEvent(req.body); // validates and returns typed event

  switch (event.event_type) {
    case 'state_change':
      console.log(event.state.primary, event.state.supplement);
      break;
    case 'media_rejected':
      console.log(event.sides); // which images need re-upload
      break;
    case 'invalidate_sr':
      console.log(event.invalidation_reason.code);
      break;
  }

  res.status(200).send('OK');
});
```

### State Helpers

```typescript
import { parseWebhookEvent, isAuthentic, isCounterfeit, needsResubmission, isCancelled } from 'legitmark';

const event = parseWebhookEvent(req.body);

if (isAuthentic(event)) {
  // COMPLETE + APPROVED — item is genuine
  markItemAsAuthentic(event.reference_id);
} else if (isCounterfeit(event)) {
  // COMPLETE + REJECTED — item is not authentic
  flagItem(event.reference_id);
} else if (needsResubmission(event)) {
  // media_rejected — partner should re-upload photos
  requestNewPhotos(event.reference_id, event.sides);
} else if (isCancelled(event)) {
  // SR was cancelled
  closeCase(event.sr_uuid);
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `state_change` | SR state transitioned (QC, authentication progress, final result) |
| `media_rejected` | Uploaded images rejected during quality control |
| `invalidate_sr` | SR cancelled or cannot be processed |

### Helper Functions

| Helper | Returns `true` when |
|--------|---------------------|
| `isAuthentic(event)` | `COMPLETE + APPROVED` — item is genuine |
| `isCounterfeit(event)` | `COMPLETE + REJECTED` — item is not authentic |
| `isCancelled(event)` | `CANCELLED` — SR was cancelled |
| `needsResubmission(event)` | Images were rejected, partner should re-upload |
| `isQcApproved(event)` | QC passed, proceeding to authentication |
| `isAuthenticationInProgress(event)` | Authenticator assigned, work underway |

See the [Webhook Reference](https://docs.legitmark.com/webhook-reference/introduction) for payload schemas and setup instructions.

## Retry Utility

The SDK includes a `withRetry` utility for handling transient failures:

```typescript
import { withRetry, LegitmarkError } from 'legitmark';

// Basic usage - retries 3 times with exponential backoff
const sr = await withRetry(() => legitmark.sr.create(request));

// With custom options
const sr = await withRetry(
  () => legitmark.sr.create(request),
  {
    attempts: 5,              // Max retry attempts (default: 3)
    delay: 2000,              // Initial delay in ms (default: 1000)
    exponentialBackoff: true, // Double delay each retry (default: true)
    shouldRetry: (error) => { // Custom retry condition
      return error instanceof LegitmarkError && error.isRetryable;
    },
    onRetry: (error, attempt) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    },
  }
);
```

The default `shouldRetry` function uses `LegitmarkError.isRetryable`, which returns `true` for:
- 429 Too Many Requests
- 500+ Server Errors
- Network/timeout errors

## Getting an API Key

Contact **engineering@legitmark.com** to request a Partner API key.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | - | Your partner API key (format: `leo_xxx`) |
| `debug` | boolean | `false` | Enable verbose logging |
| `timeout` | number | `30000` | Request timeout in milliseconds |

```typescript
const legitmark = new Legitmark('leo_xxx', {
  debug: true,
  timeout: 60000,
});
```

### Environment Variables

The SDK can also read configuration from environment variables:

```typescript
import { createClientFromEnv } from 'legitmark';

// Reads LEGITMARK_API_KEY and LEGITMARK_DEBUG
const legitmark = createClientFromEnv();
```

| Variable | Description |
|----------|-------------|
| `LEGITMARK_API_KEY` | Your partner API key |
| `LEGITMARK_DEBUG` | Set to `true` to enable debug logging |

## Troubleshooting

### "API key does not start with 'leo_' prefix"

Ensure you're using a Partner API key, not a user token. Partner keys always start with `leo_`.

### Connection refused / Network error

1. Check that the API URL is correct and reachable
2. Verify your network allows outbound HTTPS connections
3. If using a proxy, configure axios accordingly

### 401 Unauthorized

1. Verify your API key is correct and hasn't expired
2. Check that the API key has the required permissions
3. Contact your Legitmark partner manager if issues persist

### Error Types

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request parameters |
| 401 | `AUTHENTICATION_ERROR` | Invalid or expired API key |
| 403 | `AUTHENTICATION_ERROR` | Insufficient permissions |
| 404 | `NOT_FOUND_ERROR` | Resource not found |
| 429 | `RATE_LIMIT_ERROR` | Too many requests |
| 500-503 | `SERVER_ERROR` | Server-side error (retryable) |
| 504 | `TIMEOUT_ERROR` | Gateway timeout (retryable) |
| N/A | `NETWORK_ERROR` | Connection failed (retryable) |
| N/A | `TIMEOUT_ERROR` | Request timed out (retryable) |

### Request ID for Support

All errors include a `requestId` for debugging. Include this when contacting support:

```typescript
try {
  await legitmark.sr.submit(srUuid);
} catch (error) {
  if (error instanceof LegitmarkError) {
    console.log('Request ID:', error.context.requestId);
    // Include this in support tickets
  }
}
```

## Requirements

- **Node.js**: 18.0 or later
- **TypeScript**: 5.0 or later (if using TypeScript)

The SDK uses ES modules and is compatible with modern bundlers (webpack, esbuild, vite, etc.).

## Development

```bash
# Build
npm run build

# Lint
npm run lint

# Run unit tests
npm run test:unit

# Run E2E tests (requires .env with API key)
npm run test:e2e

# Run all tests
npm run test:all
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Security

To report security vulnerabilities, see [SECURITY.md](SECURITY.md).

## License

MIT - See [LICENSE](LICENSE) for details.
