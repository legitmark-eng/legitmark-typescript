import axios, { AxiosInstance, AxiosError } from 'axios';

import type {
  PartnerConfig,
  RequestOptions,
  ErrorResponse,
  LegitmarkErrorCode,
} from './types';

import { LegitmarkError, ConfigurationError } from './errors';
import { Taxonomy, ServiceRequests, Images } from './resources';

export const API_KEY_PREFIX = 'leo_';
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

export const SDK_VERSION = '0.2.0';

const LOGGER_PREFIX = 'LegitmarkPartnerSDK';
const S3_UPLOAD_HEADERS = { CACHE_CONTROL: 'max-age=10', ACL: 'public-read' } as const;

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
 * const { categories } = await legitmark.taxonomy.getTree();
 * const { sr } = await legitmark.sr.create({
 *   service: 'service-uuid',
 *   item: { category: '...', type: '...', brand: '...' },
 * });
 * await legitmark.images.uploadForSide(sr.uuid, sideUuid, './photo.jpg');
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
   * @param options - Request options to override
   * @returns New client instance with applied options
   *
   * @example
   * ```typescript
   * await legitmark.withOptions({ timeout: 60000 }).images.uploadForSide(...);
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

  /** @internal */
  async _get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
      const response = await this.platformClient.get<T>(url);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  /** @internal */
  async _post<T>(endpoint: string, data?: unknown): Promise<T> {
    try {
      const response = await this.platformClient.post<T>(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  /** @internal */
  async _getAsset<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
      const response = await this.assetClient.get<T>(url);
      return response.data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  /** @internal */
  async _uploadToUrl(url: string, data: Buffer, contentType: string): Promise<void> {
    try {
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

  /** @internal */
  _log(level: 'info' | 'debug' | 'warn' | 'error', message: string, meta?: unknown): void {
    this.logger[level](message, meta);
  }

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
 * Simplified Legitmark SDK client.
 *
 * @example
 * ```typescript
 * import { Legitmark } from 'legitmark';
 *
 * const legitmark = new Legitmark('leo_your_api_key');
 * const legitmark = new Legitmark('leo_your_api_key', { debug: true });
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
      timeout?: number;
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

// Re-export for backward compatibility — tests import directly from this file
export { LegitmarkError, ConfigurationError } from './errors';
export { withRetry, type RetryOptions } from './retry';
export { createClientFromEnv, validateEnvironment } from './env';
