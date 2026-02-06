/**
 * Legitmark Partner SDK - API Client
 * 
 * A typed TypeScript client for the Legitmark Partner API.
 * Provides methods for the complete authentication workflow:
 * taxonomy lookup → create SR → upload images → submit.
 * 
 * @packageDocumentation
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

import {
  PartnerConfig,
  RequestOptions,
  ErrorResponse,
  LegitmarkErrorCode,
  LegitmarkErrorContext,
} from './types';

import { Taxonomy, ServiceRequests, Images } from './resources';

const API_KEY_PREFIX = 'leo_';
const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 60_000;
const DEFAULT_API_URL = 'https://api.legitmark.com';
const DEFAULT_ASSET_URL = 'https://media.legitmark.com';

export const IMAGE_CONTENT_TYPES = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
} as const;

export type ImageContentType = typeof IMAGE_CONTENT_TYPES[keyof typeof IMAGE_CONTENT_TYPES];

export const SDK_VERSION = '0.1.1';

const LOGGER_PREFIX = 'LegitmarkPartnerSDK';
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;
const S3_UPLOAD_HEADERS = { CACHE_CONTROL: 'max-age=10', ACL: 'public-read' } as const;

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
  /** Error classification code */
  readonly code: LegitmarkErrorCode;
  /** Additional context about the error */
  readonly context: LegitmarkErrorContext;
  /** Whether the operation can be retried */
  readonly isRetryable: boolean;
  /** Suggested actions to resolve the error */
  readonly suggestions: readonly string[];
  /** Original error that caused this error */
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

  /** Returns a formatted error string for logging */
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

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

function createLogger(enabled: boolean, prefix: string = LOGGER_PREFIX): Logger {
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    if (!enabled && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${prefix}] [${level.toUpperCase()}] ${message}`;
    
    if (data !== undefined) {
      console[level](formattedMessage, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
      console[level](formattedMessage);
    }
  };

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
  };
}

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
 * // Retry up to 3 times with exponential backoff
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

/**
 * Legitmark Partner API Client.
 * 
 * Provides resources for the complete authentication workflow:
 * - `legitmark.taxonomy` - Browse categories, types, brands
 * - `legitmark.sr` - Create and manage service requests
 * - `legitmark.images` - Upload photos
 * 
 * @example
 * ```typescript
 * import { Legitmark } from 'legitmark';
 * 
 * const legitmark = new Legitmark('leo_your_api_key');
 * 
 * // 1. Get taxonomy
 * const { categories } = await legitmark.taxonomy.getTree();
 * 
 * // 2. Create a service request
 * const { sr } = await legitmark.sr.create({
 *   service: 'service-uuid',
 *   item: { category: '...', type: '...', brand: '...' },
 * });
 * 
 * // 3. Upload required photos
 * await legitmark.images.uploadForSide(sr.uuid, sideUuid, './photo.jpg');
 * 
 * // 4. Submit for authentication
 * await legitmark.sr.submit(sr.uuid);
 * ```
 */
export class PartnerClient {
  private readonly config: Required<PartnerConfig>;
  private readonly platformClient: AxiosInstance;
  private readonly assetClient: AxiosInstance;
  private readonly logger: Logger;
  private readonly requestOptions?: RequestOptions;

  /**
   * Taxonomy - access product categories, types, brands, models.
   * 
   * @example
   * ```typescript
   * const { categories } = await legitmark.taxonomy.getTree();
   * ```
   */
  readonly taxonomy: Taxonomy;

  /**
   * Service Requests - create and manage authentication requests.
   * 
   * @example
   * ```typescript
   * const { sr } = await legitmark.sr.create({ ... });
   * await legitmark.sr.submit(sr.uuid);
   * ```
   */
  readonly sr: ServiceRequests;

  /**
   * Images - upload photos for service requests.
   * 
   * @example
   * ```typescript
   * await legitmark.images.uploadForSide(srUuid, sideUuid, buffer);
   * ```
   */
  readonly images: Images;

  /**
   * Create a new PartnerClient instance.
   * 
   * @param config - Client configuration
   * @param requestOptions - Per-request option overrides (internal use)
   * @throws {ConfigurationError} If required configuration is missing
   */
  constructor(config: PartnerConfig, requestOptions?: RequestOptions) {
    if (!config.apiKey) {
      throw new ConfigurationError('apiKey is required', [
        'Get your API key from the Legitmark Partner Dashboard',
      ]);
    }

    this.requestOptions = requestOptions;

    this.config = {
      apiKey: config.apiKey,
      timeout: requestOptions?.timeout ?? config.timeout ?? DEFAULT_TIMEOUT_MS,
      debug: config.debug ?? false,
    };

    this.logger = createLogger(this.config.debug);

    if (!requestOptions && !this.config.apiKey.startsWith(API_KEY_PREFIX)) {
      this.logger.warn(
        `API key does not start with '${API_KEY_PREFIX}' prefix. ` +
        'Ensure you are using a valid Partner API key.'
      );
    }

    const baseUrl = process.env.LEGITMARK_BASE_URL || DEFAULT_API_URL;
    const assetUrl = DEFAULT_ASSET_URL;

    this.platformClient = this.createHttpClient(baseUrl);
    this.assetClient = this.createHttpClient(assetUrl);

    if (!requestOptions) {
      this.logger.debug(`Initialized PartnerClient v${SDK_VERSION}`, {
        baseUrl,
        assetUrl,
        timeout: this.config.timeout,
      });
    }

    this.taxonomy = new Taxonomy(this);
    this.sr = new ServiceRequests(this);
    this.images = new Images(this);
  }

  /**
   * Create a new client instance with per-request option overrides.
   * 
   * This method returns a new client with the specified options applied
   * to all subsequent requests. Useful for customizing timeout for specific
   * operations without modifying the base client.
   * 
   * @param options - Request options to override
   * @returns New client instance with applied options
   * 
   * @example
   * ```typescript
   * // Use longer timeout for image uploads
   * await legitmark.withOptions({ timeout: 60000 }).images.uploadForSide(...);
   * 
   * // Chain with resource methods
   * await legitmark.withOptions({ timeout: 120000 }).sr.submit(uuid);
   * ```
   */
  withOptions(options: RequestOptions): PartnerClient {
    return new PartnerClient(
      {
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
        debug: this.config.debug,
      },
      options
    );
  }

  /** @internal GET request to platform API */
  async _get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
      const response = await this.platformClient.get<T>(url);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  /** @internal POST request to platform API */
  async _post<T>(endpoint: string, data?: unknown): Promise<T> {
    try {
      const response = await this.platformClient.post<T>(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  /** @internal GET request to asset API */
  async _getAsset<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
      const response = await this.assetClient.get<T>(url);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  /** @internal Upload to signed URL */
  async _uploadToUrl(url: string, data: Buffer, contentType: string): Promise<void> {
    try {
      // The presigned URL requires specific headers that match the signed headers
      await axios.put(url, data, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': S3_UPLOAD_HEADERS.CACHE_CONTROL,
          'x-amz-acl': S3_UPLOAD_HEADERS.ACL,
        },
        timeout: UPLOAD_TIMEOUT_MS,
      });
    } catch (error) {
      this.handleError(error, url);
    }
  }

  /** @internal Logging */
  _log(level: 'info' | 'debug' | 'warn' | 'error', message: string, meta?: unknown): void {
    this.logger[level](message, meta);
  }

  /**
   * Create a configured Axios instance.
   */
  private createHttpClient(baseURL: string): AxiosInstance {
    const client = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-SDK-Version': SDK_VERSION,
      },
    });

    client.interceptors.request.use((request) => {
      const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      request.headers['X-Request-Id'] = requestId;
      this.logger.debug(`${request.method?.toUpperCase()} ${request.url} [${requestId}]`);
      return request;
    });

    client.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['X-Request-Id'] || '';
        this.logger.debug(`${response.status} ${response.config.url} [${requestId}]`);
        return response;
      },
      (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-Id'] || '';
        this.logger.debug(`${error.response?.status ?? 'ERR'} ${error.config?.url} [${requestId}]`);
        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Transform an error into a structured LegitmarkError.
   */
  private handleError(error: unknown, endpoint?: string): never {
    if (error instanceof LegitmarkError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      const apiMessage = data?.error?.message ?? axiosError.message;
      
      const requestId = axiosError.response?.headers?.['x-request-id'] 
        ?? axiosError.response?.headers?.['x-amzn-requestid']
        ?? undefined;

      let code: LegitmarkErrorCode;
      let isRetryable = false;
      let suggestions: string[] = [];

      if (!status && axiosError.code === 'ECONNABORTED') {
        code = 'TIMEOUT_ERROR';
        isRetryable = true;
        suggestions = ['Increase the timeout value', 'Check network latency'];
      } else if (!status) {
        code = 'NETWORK_ERROR';
        isRetryable = true;
        suggestions = ['Check your internet connection', 'Verify the API URL is correct'];
      } else if (status === 401) {
        code = 'AUTHENTICATION_ERROR';
        suggestions = ['Check that your API key is valid', 'Ensure the API key has not expired'];
      } else if (status === 403) {
        code = 'AUTHENTICATION_ERROR';
        suggestions = ['Verify your API key has the required permissions'];
      } else if (status === 404) {
        code = 'NOT_FOUND_ERROR';
        suggestions = ['Check that the resource UUID is correct'];
      } else if (status === 400 || status === 422) {
        code = 'VALIDATION_ERROR';
        if (data?.error?.errors) {
          suggestions = data.error.errors.map(e => e.message);
        }
      } else if (status === 429) {
        code = 'RATE_LIMIT_ERROR';
        isRetryable = true;
        suggestions = ['Wait before retrying', 'Consider implementing exponential backoff'];
      } else if (status === 504) {
        code = 'TIMEOUT_ERROR';
        isRetryable = true;
        suggestions = ['The upstream server timed out', 'Retry after a short delay'];
      } else if (status >= 500) {
        code = 'SERVER_ERROR';
        isRetryable = true;
        suggestions = ['The service may be temporarily unavailable', 'Retry after a short delay'];
      } else {
        code = 'UNKNOWN_ERROR';
      }

      throw new LegitmarkError(code, apiMessage, {
        context: {
          statusCode: status,
          endpoint,
          requestId,
          details: data?.error,
        },
        isRetryable,
        suggestions,
        cause: error,
      });
    }

    throw new LegitmarkError('UNKNOWN_ERROR', String(error), {
      cause: error,
    });
  }
}

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
 * // Ensure environment is configured
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

/**
 * Simplified Legitmark SDK client.
 * 
 * A convenience wrapper that provides sensible production defaults.
 * For most use cases, just pass your API key.
 * 
 * @example
 * ```typescript
 * import { Legitmark } from 'legitmark';
 * 
 * // Simple - uses production defaults
 * const legitmark = new Legitmark('leo_your_api_key');
 * 
 * // With debug logging
 * const legitmark = new Legitmark('leo_your_api_key', { debug: true });
 * 
 * // Create a service request
 * const sr = await legitmark.createServiceRequest({
 *   service: 'service-uuid',
 *   item: { category: '...', type: '...', brand: '...' },
 * });
 * ```
 */
export class Legitmark extends PartnerClient {
  /**
   * Create a new Legitmark client.
   * 
   * @param apiKey - Your Partner API key (format: leo_xxx)
   * @param options - Optional configuration overrides
   */
  constructor(
    apiKey: string,
    options: {
      /** Request timeout in ms (default: 30000) */
      timeout?: number;
      /** Enable debug logging */
      debug?: boolean;
    } = {}
  ) {
    super({
      apiKey,
      timeout: options.timeout,
      debug: options.debug,
    });
  }
}
