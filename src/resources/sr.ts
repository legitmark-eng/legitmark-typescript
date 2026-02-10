/**
 * Service Request Resource
 * 
 * Create and manage authentication service requests.
 * 
 * @example
 * ```typescript
 * const { sr } = await client.sr.create({ ... });
 * await client.sr.submit(sr.uuid);
 * ```
 */

import type {
  CreateSRRequest,
  CreateSRResponse,
  GetSROptions,
  GetSRResponse,
  GetSRWithSidesResponse,
  ProgressData,
  SubmitSRResponse,
} from '../types';
import type { ResourceClient } from './client';
import { LegitmarkError } from '../errors';

/** Default polling interval for waitForRequirements (2 seconds) */
const DEFAULT_POLL_INTERVAL_MS = 2000;

/** Default max wait time for waitForRequirements (5 minutes) */
const DEFAULT_MAX_WAIT_MS = 300_000;

/** Options for waiting on requirements */
export interface WaitOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Maximum wait time in milliseconds (default: 300000) */
  maxWait?: number;
  /** Callback on each poll */
  onPoll?: (progress: ProgressData) => void;
}

/**
 * Service Request resource for managing authentication requests.
 */
export class ServiceRequests {
  constructor(private readonly client: ResourceClient) {}

  /**
   * Create a new Service Request.
   * 
   * @param request - SR creation parameters
   * @returns Created SR with UUID
   * 
   * @example
   * ```typescript
   * const { sr } = await client.sr.create({
   *   service: 'service-uuid',
   *   item: {
   *     category: 'category-uuid',
   *     type: 'type-uuid',
   *     brand: 'brand-uuid',
   *   },
   * });
   * ```
   */
  async create(request: CreateSRRequest): Promise<CreateSRResponse> {
    return this.client._post<CreateSRResponse>('/api/v2/sr', request);
  }

  /**
   * Get a Service Request by UUID.
   * 
   * @param uuid - Service Request UUID
   * @param options - What data to include
   * @returns Service Request with requested includes
   * 
   * @example
   * ```typescript
   * const { sr } = await client.sr.get(uuid, {
   *   requirements: true,
   *   sides: true,
   * });
   * ```
   */
  async get(uuid: string, options: GetSROptions = {}): Promise<GetSRResponse> {
    const params: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(options)) {
      if (value === true) {
        params[key] = 'true';
      }
    }

    return this.client._get<GetSRResponse>(`/api/v2/sr/${uuid}`, params);
  }

  /**
   * Get SR with photo requirements.
   * Convenience method for `get(uuid, { requirements: true, sides: true, item: true })`.
   * 
   * @param uuid - Service Request UUID
   * @returns SR with requirements data
   */
  async getWithRequirements(uuid: string): Promise<GetSRResponse> {
    return this.get(uuid, { requirements: true, sides: true, item: true });
  }

  /**
   * Get SR with sides and media information.
   * 
   * @param uuid - Service Request UUID
   * @returns SR with sides and upload progress
   */
  async getWithSides(uuid: string): Promise<GetSRWithSidesResponse> {
    return this.client._get<GetSRWithSidesResponse>(
      `/api/v2/sr/${uuid}`,
      { item: 'true', sides: 'true' }
    );
  }

  /**
   * Get upload progress for an SR.
   * 
   * @param uuid - Service Request UUID
   * @returns Progress data with counts
   * 
   * @example
   * ```typescript
   * const progress = await client.sr.getProgress(uuid);
   * if (progress.met) {
   *   console.log('Ready to submit!');
   * }
   * ```
   */
  async getProgress(uuid: string): Promise<ProgressData> {
    const response = await this.getWithSides(uuid);
    const progress = response.sr.sides?.progress;
    
    // Default progress if not available - return met: false as safe default
    if (!progress) {
      return {
        current_required: 0,
        total_required: 0,
        current_optional: 0,
        total_optional: 0,
        met: false,
      };
    }
    
    return progress;
  }

  /**
   * Wait for all required photos to be uploaded.
   * 
   * @param uuid - Service Request UUID
   * @param options - Polling options
   * @returns Final progress when requirements are met
   * 
   * @example
   * ```typescript
   * const progress = await client.sr.waitForRequirements(uuid, {
   *   pollInterval: 2000,
   *   onPoll: (p) => console.log(`${p.uploaded}/${p.required}`),
   * });
   * ```
   */
  async waitForRequirements(uuid: string, options: WaitOptions = {}): Promise<ProgressData> {
    const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL_MS;
    const maxWait = options.maxWait ?? DEFAULT_MAX_WAIT_MS;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const progress = await this.getProgress(uuid);
      
      if (options.onPoll) {
        options.onPoll(progress);
      }
      
      if (progress.met) {
        return progress;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new LegitmarkError(
      'TIMEOUT_ERROR',
      `Timeout waiting for requirements after ${maxWait}ms`,
      {
        isRetryable: true,
        suggestions: [
          'Increase maxWait option',
          'Check that images are being uploaded successfully',
        ],
        context: { details: { maxWait, pollInterval } },
      }
    );
  }

  /**
   * Submit SR for authentication.
   * 
   * @param uuid - Service Request UUID
   * @returns Submit response with new state
   * 
   * @example
   * ```typescript
   * const result = await client.sr.submit(uuid);
   * console.log(`SR submitted, new state: ${result.sr.primary_state}`);
   * ```
   */
  async submit(uuid: string): Promise<SubmitSRResponse> {
    return this.client._post<SubmitSRResponse>(`/api/v2/sr/${uuid}/submit`);
  }
}
