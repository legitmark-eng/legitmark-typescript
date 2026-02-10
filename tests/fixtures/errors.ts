import type { ErrorResponse } from '../../src/types';

export const FIXTURE_ERROR_VALIDATION: ErrorResponse = {
  success: false,
  error: {
    code: 400,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Validation failed',
    errors: [
      { code: 'validation/missing-field', message: 'item.category is required' },
      { code: 'validation/missing-field', message: 'item.type is required' },
    ],
  },
};

export const FIXTURE_ERROR_AUTH: ErrorResponse = {
  success: false,
  error: {
    code: 401,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Invalid or expired API key',
  },
};

export const FIXTURE_ERROR_NOT_FOUND: ErrorResponse = {
  success: false,
  error: {
    code: 404,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Service request not found',
  },
};

export const FIXTURE_ERROR_RATE_LIMIT: ErrorResponse = {
  success: false,
  error: {
    code: 429,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Rate limit exceeded. Retry after 60 seconds.',
  },
};

export const FIXTURE_ERROR_SERVER: ErrorResponse = {
  success: false,
  error: {
    code: 500,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Internal server error',
  },
};
