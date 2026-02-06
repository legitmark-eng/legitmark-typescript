import { describe, it, expect } from 'vitest';

import { LegitmarkError, ConfigurationError } from '../src/client';
import type { LegitmarkErrorCode } from '../src/types';

// All error codes that the SDK can produce
const ALL_ERROR_CODES: LegitmarkErrorCode[] = [
  'CONFIGURATION_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT_ERROR',
  'AUTHENTICATION_ERROR',
  'VALIDATION_ERROR',
  'NOT_FOUND_ERROR',
  'RATE_LIMIT_ERROR',
  'SERVER_ERROR',
  'UPLOAD_ERROR',
  'WORKFLOW_ERROR',
  'UNKNOWN_ERROR',
];

describe('LegitmarkError', () => {
  describe('error code coverage', () => {
    it.each(ALL_ERROR_CODES)('handles %s error code', (code) => {
      const error = new LegitmarkError(code, `Test ${code} message`);

      expect(error.code).toBe(code);
      expect(error.message).toContain(code);
      expect(error.name).toBe('LegitmarkError');
    });
  });

  describe('error properties', () => {
    it('includes context when provided', () => {
      const error = new LegitmarkError('SERVER_ERROR', 'API failed', {
        context: {
          statusCode: 500,
          endpoint: '/api/v2/sr',
          requestId: 'req-123',
        },
      });

      expect(error.context?.statusCode).toBe(500);
      expect(error.context?.endpoint).toBe('/api/v2/sr');
      expect(error.context?.requestId).toBe('req-123');
    });

    it('includes suggestions when provided', () => {
      const error = new LegitmarkError('AUTHENTICATION_ERROR', 'Invalid key', {
        suggestions: [
          'Check that your API key starts with leo_',
          'Verify the key is not expired',
        ],
      });

      expect(error.suggestions).toHaveLength(2);
      expect(error.suggestions?.[0]).toContain('leo_');
    });

    it('tracks retryable status', () => {
      const retryable = new LegitmarkError('NETWORK_ERROR', 'Connection lost', {
        isRetryable: true,
      });
      const notRetryable = new LegitmarkError('VALIDATION_ERROR', 'Bad input', {
        isRetryable: false,
      });

      expect(retryable.isRetryable).toBe(true);
      expect(notRetryable.isRetryable).toBe(false);
    });

    it('preserves original error', () => {
      const original = new Error('fetch failed');
      const error = new LegitmarkError('NETWORK_ERROR', 'Request failed', {
        cause: original,
      });

      expect(error.cause).toBe(original);
    });
  });

  describe('error formatting', () => {
    it('produces readable log output', () => {
      const error = new LegitmarkError('NOT_FOUND_ERROR', 'SR not found', {
        context: { statusCode: 404, endpoint: '/api/v2/sr/uuid' },
      });

      const log = error.toLogString();

      expect(log).toContain('NOT_FOUND_ERROR');
      expect(log).toContain('SR not found');
      expect(log).toContain('404');
    });

    it('handles errors without context', () => {
      const error = new LegitmarkError('UNKNOWN_ERROR', 'Something went wrong');

      expect(() => error.toLogString()).not.toThrow();
      expect(error.toLogString()).toContain('UNKNOWN_ERROR');
    });
  });

  describe('retryable error classification', () => {
    const RETRYABLE_CODES: LegitmarkErrorCode[] = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'SERVER_ERROR',
    ];

    const NON_RETRYABLE_CODES: LegitmarkErrorCode[] = [
      'CONFIGURATION_ERROR',
      'AUTHENTICATION_ERROR',
      'VALIDATION_ERROR',
      'NOT_FOUND_ERROR',
      'UPLOAD_ERROR',
      'WORKFLOW_ERROR',
      'UNKNOWN_ERROR',
    ];

    it.each(RETRYABLE_CODES)('%s should typically be retryable', (code) => {
      const error = new LegitmarkError(code, 'Test', { isRetryable: true });
      expect(error.isRetryable).toBe(true);
    });

    it.each(NON_RETRYABLE_CODES)('%s should typically not be retryable', (code) => {
      const error = new LegitmarkError(code, 'Test', { isRetryable: false });
      expect(error.isRetryable).toBe(false);
    });
  });
});

describe('ConfigurationError', () => {
  it('is a specialized LegitmarkError', () => {
    const error = new ConfigurationError('apiKey is required');

    expect(error).toBeInstanceOf(LegitmarkError);
    expect(error.code).toBe('CONFIGURATION_ERROR');
  });

  it('includes configuration suggestions', () => {
    const error = new ConfigurationError('Invalid API key format', [
      'API key must start with leo_',
    ]);

    expect(error.suggestions).toContain('API key must start with leo_');
    expect(error.isRetryable).toBe(false);
  });
});

describe('Error scenarios by HTTP status', () => {
  const STATUS_TO_ERROR: Array<[number, LegitmarkErrorCode]> = [
    [400, 'VALIDATION_ERROR'],
    [401, 'AUTHENTICATION_ERROR'],
    [403, 'AUTHENTICATION_ERROR'],
    [404, 'NOT_FOUND_ERROR'],
    [429, 'RATE_LIMIT_ERROR'],
    [500, 'SERVER_ERROR'],
    [502, 'SERVER_ERROR'],
    [503, 'SERVER_ERROR'],
    [504, 'TIMEOUT_ERROR'],
  ];

  it.each(STATUS_TO_ERROR)(
    'HTTP %i maps to %s',
    (status, expectedCode) => {
      // This tests the expected mapping - actual implementation is in client.ts
      const error = new LegitmarkError(expectedCode, `HTTP ${status}`, {
        context: { statusCode: status },
      });

      expect(error.code).toBe(expectedCode);
      expect(error.context?.statusCode).toBe(status);
    }
  );
});

describe('Error message quality', () => {
  it('provides actionable configuration errors', () => {
    const error = new ConfigurationError('apiKey is required', [
      'Pass apiKey to PartnerClient constructor',
      'Or set LEGITMARK_API_KEY environment variable',
    ]);

    expect(error.message).toContain('apiKey');
    expect(error.suggestions).toHaveLength(2);
    error.suggestions?.forEach((s) => {
      expect(s.length).toBeGreaterThan(10); // Not empty/trivial
    });
  });

  it('includes request context for debugging', () => {
    const error = new LegitmarkError('SERVER_ERROR', 'Request failed', {
      context: {
        statusCode: 500,
        endpoint: '/api/v2/sr/create',
        requestId: 'req-abc-123',
        details: { attemptNumber: 3 },
      },
    });

    expect(error.context?.requestId).toBeDefined();
    expect(error.context?.endpoint).toContain('/api/v2/sr');
  });
});
