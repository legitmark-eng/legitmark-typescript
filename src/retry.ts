import { LegitmarkError } from './errors';

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;

/**
 * Options for retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  attempts?: number;
  /** Initial delay between retries in ms (default: 1000) */
  delay?: number;
  /** Use exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Only retry if this returns true (default: checks isRetryable) */
  shouldRetry?: (error: unknown) => boolean;
  /** Called before each retry attempt */
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Retry a function with exponential backoff.
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * import { withRetry, Legitmark } from 'legitmark';
 *
 * const legitmark = new Legitmark('leo_your_key');
 *
 * const result = await withRetry(
 *   () => legitmark.submitServiceRequest(srUuid),
 *   {
 *     attempts: 3,
 *     onRetry: (err, attempt) => console.log(`Retry ${attempt}...`),
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = DEFAULT_RETRY_ATTEMPTS,
    delay = DEFAULT_RETRY_DELAY_MS,
    exponentialBackoff = true,
    shouldRetry = (error) => error instanceof LegitmarkError && error.isRetryable,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error)) {
        throw error;
      }

      onRetry?.(error, attempt);

      const waitTime = exponentialBackoff
        ? delay * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt - 1)
        : delay;

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}
