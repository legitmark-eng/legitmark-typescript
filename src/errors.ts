import type { LegitmarkErrorCode, LegitmarkErrorContext } from './types';

/**
 * Custom error class for Legitmark SDK errors.
 * Provides structured error information with codes, context, and suggestions.
 *
 * @example
 * ```typescript
 * try {
 *   await client.submitServiceRequest(srUuid);
 * } catch (error) {
 *   if (error instanceof LegitmarkError) {
 *     console.error(`[${error.code}] ${error.message}`);
 *     if (error.isRetryable) {
 *       // Implement retry logic
 *     }
 *   }
 * }
 * ```
 */
export class LegitmarkError extends Error {
  readonly code: LegitmarkErrorCode;
  readonly context: LegitmarkErrorContext;
  readonly isRetryable: boolean;
  readonly suggestions: readonly string[];
  readonly cause?: unknown;

  constructor(
    code: LegitmarkErrorCode,
    message: string,
    options: {
      context?: LegitmarkErrorContext;
      isRetryable?: boolean;
      suggestions?: string[];
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'LegitmarkError';
    this.code = code;
    this.context = options.context ?? {};
    this.isRetryable = options.isRetryable ?? false;
    this.suggestions = options.suggestions ?? [];
    this.cause = options.cause;
  }

  toLogString(): string {
    const parts = [`[${this.code}] ${this.message}`];
    if (this.context.statusCode) {
      parts.push(`Status: ${this.context.statusCode}`);
    }
    if (this.context.endpoint) {
      parts.push(`Endpoint: ${this.context.endpoint}`);
    }
    if (this.context.requestId) {
      parts.push(`RequestID: ${this.context.requestId}`);
    }
    if (this.suggestions.length > 0) {
      parts.push(`Suggestions: ${this.suggestions.join(', ')}`);
    }
    return parts.join(' | ');
  }
}

/**
 * Configuration error - thrown when SDK is misconfigured.
 */
export class ConfigurationError extends LegitmarkError {
  constructor(message: string, suggestions: string[] = []) {
    super('CONFIGURATION_ERROR', message, {
      isRetryable: false,
      suggestions,
    });
    this.name = 'ConfigurationError';
  }
}
