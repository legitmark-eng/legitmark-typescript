import { PartnerClient, API_KEY_PREFIX } from './client';
import { ConfigurationError } from './errors';

/**
 * Validate environment configuration for the SDK.
 *
 * Call this before `createClientFromEnv()` to get helpful error messages
 * if the environment is not properly configured.
 *
 * @returns Validation result with any errors and suggestions
 *
 * @example
 * ```typescript
 * const validation = validateEnvironment();
 *
 * if (!validation.valid) {
 *   console.error('Configuration errors:', validation.errors);
 *   console.log('Suggestions:', validation.suggestions);
 *   process.exit(1);
 * }
 *
 * const client = createClientFromEnv();
 * ```
 */
export function validateEnvironment(): {
  valid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!process.env.LEGITMARK_API_KEY) {
    errors.push('LEGITMARK_API_KEY is not set');
    suggestions.push('Copy .env.example to .env and add your API key');
    suggestions.push('Get your API key from the Legitmark Partner Dashboard');
  } else if (!process.env.LEGITMARK_API_KEY.startsWith(API_KEY_PREFIX)) {
    suggestions.push(`Note: API key doesn't start with '${API_KEY_PREFIX}' (expected for Partner keys)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    suggestions,
  };
}

/**
 * Create a PartnerClient from environment variables.
 *
 * Reads configuration from the following environment variables:
 * - `LEGITMARK_API_KEY` - Partner API key (required)
 * - `LEGITMARK_DEBUG` - Enable debug logging (optional: 'true'/'false')
 *
 * @returns Configured PartnerClient instance
 * @throws {ConfigurationError} If required environment variables are missing
 *
 * @example
 * ```typescript
 * const validation = validateEnvironment();
 * if (!validation.valid) {
 *   throw new Error(validation.errors.join(', '));
 * }
 *
 * const client = createClientFromEnv();
 * ```
 */
export function createClientFromEnv(): PartnerClient {
  const validation = validateEnvironment();

  if (!validation.valid) {
    throw new ConfigurationError(
      validation.errors.join('; '),
      validation.suggestions
    );
  }

  return new PartnerClient({
    apiKey: process.env.LEGITMARK_API_KEY!,
    debug: process.env.LEGITMARK_DEBUG === 'true',
  });
}
