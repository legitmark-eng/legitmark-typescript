import { describe, it, expect, vi } from 'vitest';

import {
  LegitmarkError,
  ConfigurationError,
  withRetry,
  validateEnvironment,
  createClientFromEnv,
  PartnerClient,
  Legitmark,
} from '../src/client';
import { TEST_API_KEY, withEnvBackup } from './utils';

describe('LegitmarkError', () => {
  it('stores code and message', () => {
    const error = new LegitmarkError('NETWORK_ERROR', 'Connection failed');

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe('Connection failed');
    expect(error.name).toBe('LegitmarkError');
  });

  it('accepts context options', () => {
    const error = new LegitmarkError('SERVER_ERROR', 'Request failed', {
      context: { statusCode: 500, endpoint: '/api/test' },
      isRetryable: true,
      suggestions: ['Try again later'],
    });

    expect(error.context.statusCode).toBe(500);
    expect(error.context.endpoint).toBe('/api/test');
    expect(error.isRetryable).toBe(true);
    expect(error.suggestions).toContain('Try again later');
  });

  it('defaults to non-retryable with empty context', () => {
    const error = new LegitmarkError('UNKNOWN_ERROR', 'Test');

    expect(error.isRetryable).toBe(false);
    expect(error.suggestions).toEqual([]);
    expect(error.context).toEqual({});
  });

  it('formats log string with all fields', () => {
    const error = new LegitmarkError('NOT_FOUND_ERROR', 'Failed', {
      context: { statusCode: 404, endpoint: '/api/sr', requestId: 'abc-123' },
      suggestions: ['Check the UUID'],
    });

    const log = error.toLogString();

    expect(log).toContain('[NOT_FOUND_ERROR]');
    expect(log).toContain('Failed');
    expect(log).toContain('Status: 404');
    expect(log).toContain('Endpoint: /api/sr');
    expect(log).toContain('RequestID: abc-123');
    expect(log).toContain('Check the UUID');
  });
});

describe('ConfigurationError', () => {
  it('extends LegitmarkError with CONFIGURATION_ERROR code', () => {
    const error = new ConfigurationError('Missing API key');

    expect(error).toBeInstanceOf(LegitmarkError);
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.message).toBe('Missing API key');
    expect(error.name).toBe('ConfigurationError');
    expect(error.isRetryable).toBe(false);
  });

  it('accepts suggestions', () => {
    const error = new ConfigurationError('API key missing', [
      'Set LEGITMARK_API_KEY',
    ]);

    expect(error.suggestions).toContain('Set LEGITMARK_API_KEY');
  });
});

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error', async () => {
    const retryableError = new LegitmarkError('NETWORK_ERROR', 'Failed', {
      isRetryable: true,
    });
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('success');

    const result = await withRetry(fn, { delay: 1 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors', async () => {
    const nonRetryable = new LegitmarkError('AUTHENTICATION_ERROR', 'Invalid key', {
      isRetryable: false,
    });
    const fn = vi.fn().mockRejectedValue(nonRetryable);

    await expect(withRetry(fn)).rejects.toThrow('Invalid key');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max attempts', async () => {
    const retryableError = new LegitmarkError('NETWORK_ERROR', 'Down', {
      isRetryable: true,
    });
    const fn = vi.fn().mockRejectedValue(retryableError);

    await expect(
      withRetry(fn, { attempts: 3, delay: 1 })
    ).rejects.toThrow('Down');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry callback', async () => {
    const retryableError = new LegitmarkError('NETWORK_ERROR', 'Fail', { isRetryable: true });
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('ok');
    const onRetry = vi.fn();

    await withRetry(fn, { delay: 1, onRetry });

    expect(onRetry).toHaveBeenCalledWith(retryableError, 1);
  });

  it('supports custom shouldRetry', async () => {
    const customError = new Error('Custom');
    const fn = vi.fn()
      .mockRejectedValueOnce(customError)
      .mockResolvedValue('ok');

    const result = await withRetry(fn, {
      delay: 1,
      shouldRetry: (err) => err instanceof Error && err.message === 'Custom',
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('validateEnvironment', () => {
  withEnvBackup();

  it('returns valid when API key is set with correct prefix', () => {
    process.env.LEGITMARK_API_KEY = TEST_API_KEY;

    const result = validateEnvironment();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns invalid when API key is missing', () => {
    delete process.env.LEGITMARK_API_KEY;

    const result = validateEnvironment();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('LEGITMARK_API_KEY is not set');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('adds suggestion when key has wrong prefix', () => {
    process.env.LEGITMARK_API_KEY = 'wrong_prefix_key';

    const result = validateEnvironment();

    expect(result.valid).toBe(true); // still valid, just a warning
    expect(result.suggestions.some((s) => s.includes("leo_"))).toBe(true);
  });
});

describe('createClientFromEnv', () => {
  withEnvBackup();

  it('creates client when API key is set', () => {
    process.env.LEGITMARK_API_KEY = TEST_API_KEY;

    const client = createClientFromEnv();

    expect(client).toBeInstanceOf(PartnerClient);
  });

  it('throws ConfigurationError when API key is missing', () => {
    delete process.env.LEGITMARK_API_KEY;

    expect(() => createClientFromEnv()).toThrow(ConfigurationError);
  });

  it('enables debug when LEGITMARK_DEBUG is true', () => {
    process.env.LEGITMARK_API_KEY = TEST_API_KEY;
    process.env.LEGITMARK_DEBUG = 'true';

    const client = createClientFromEnv();

    expect(client).toBeInstanceOf(PartnerClient);
  });
});

describe('PartnerClient', () => {
  it('throws when apiKey is missing', () => {
    expect(() => new PartnerClient({ apiKey: '' })).toThrow(ConfigurationError);
    expect(() => new PartnerClient({ apiKey: '' })).toThrow('apiKey is required');
  });

  it('creates client with valid API key', () => {
    const client = new PartnerClient({ apiKey: TEST_API_KEY });

    expect(client).toBeInstanceOf(PartnerClient);
    expect(client.taxonomy).toBeDefined();
    expect(client.sr).toBeDefined();
    expect(client.images).toBeDefined();
  });

  it('creates client with options', () => {
    const client = new PartnerClient({
      apiKey: TEST_API_KEY,
      timeout: 60000,
      debug: true,
    });

    expect(client).toBeInstanceOf(PartnerClient);
  });

  it('withOptions returns new client', () => {
    const client = new PartnerClient({ apiKey: TEST_API_KEY });

    const newClient = client.withOptions({ timeout: 120000 });

    expect(newClient).toBeInstanceOf(PartnerClient);
    expect(newClient).not.toBe(client);
  });
});

describe('Legitmark', () => {
  it('extends PartnerClient', () => {
    const client = new Legitmark(TEST_API_KEY);

    expect(client).toBeInstanceOf(PartnerClient);
    expect(client).toBeInstanceOf(Legitmark);
  });

  it('accepts simple string API key', () => {
    const client = new Legitmark(TEST_API_KEY);

    expect(client.taxonomy).toBeDefined();
    expect(client.sr).toBeDefined();
    expect(client.images).toBeDefined();
  });

  it('accepts options as second param', () => {
    const client = new Legitmark(TEST_API_KEY, {
      timeout: 60000,
      debug: true,
    });

    expect(client).toBeInstanceOf(Legitmark);
  });
});
