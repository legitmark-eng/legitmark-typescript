/**
 * Configuration options for the Partner SDK client.
 * 
 * For most use cases, use the simpler {@link Legitmark} class instead,
 * which only requires an API key.
 * 
 * @see {@link https://docs.legitmark.com/partner/getting-started} Getting Started Guide
 * @see {@link Legitmark} Simplified client
 * 
 * @example
 * ```typescript
 * const config: PartnerConfig = {
 *   apiKey: 'leo_your_api_key_here',
 *   debug: process.env.NODE_ENV === 'development',
 * };
 * ```
 */
export interface PartnerConfig {
  /** 
   * Partner API key. Must start with 'leo_' prefix.
   * Obtain from the Legitmark Partner Dashboard.
   * @example 'leo_pk_live_abc123...'
   */
  readonly apiKey: string;

  /** 
   * Request timeout in milliseconds.
   * @default 30000
   */
  readonly timeout?: number;

  /** 
   * Enable verbose debug logging to console.
   * @default false
   */
  readonly debug?: boolean;
}

/**
 * Per-request options that override client defaults.
 * 
 * @example
 * ```typescript
 * // Use longer timeout for a specific request
 * const result = await client.withOptions({ timeout: 60000 }).sr.create(...);
 * ```
 */
export interface RequestOptions {
  /**
   * Override the request timeout for this request.
   */
  readonly timeout?: number;
}

/**
 * Standard API response wrapper.
 * All Legitmark API responses follow this structure.
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  readonly success: boolean;
  /** Human-readable message describing the result */
  readonly message: string;
  /** Response payload (present on success) */
  readonly data?: T;
  /** Whether the response was served from cache */
  readonly rc_hit?: boolean;
}

/**
 * Paginated API response with metadata.
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly metadata?: {
    readonly total_count: number;
    readonly page_number: number;
    readonly total_pages: number;
    readonly page_size: number;
  };
}

/**
 * Validation error detail returned by the API.
 */
export interface ValidationError {
  /** Error code (e.g., 'validation/missing-field') */
  readonly code: string;
  /** Human-readable error description */
  readonly message: string;
}

/**
 * Error response structure from the Legitmark API.
 */
export interface ErrorResponse {
  readonly success: false;
  readonly error: {
    /** HTTP status code */
    readonly code: number;
    /** ISO 8601 timestamp of the error */
    readonly timestamp: string;
    /** Human-readable error message */
    readonly message: string;
    /** Validation errors (if applicable) */
    readonly errors?: readonly ValidationError[];
  };
}

/**
 * A product category in the Legitmark taxonomy.
 * Categories are the top level of the hierarchy.
 * 
 * @example Category: "Footwear", "Apparel", "Accessories"
 */
export interface Category {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly active: boolean;
  /** Display order (lower = first) */
  readonly ordinal: number;
  /** URL to category icon/image */
  readonly media?: string;
  /** Nested types within this category */
  readonly types?: readonly Type[];
}

/**
 * A product type within a category.
 * 
 * @example Type: "Sneakers" (under Footwear), "T-Shirts" (under Apparel)
 */
export interface Type {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly active: boolean;
  /** Display order (lower = first) */
  readonly ordinal: number;
  /** URL to type icon/image */
  readonly media?: string;
}

/**
 * A brand in the Legitmark catalog.
 * 
 * @example Brand: "Nike", "Adidas", "Louis Vuitton"
 */
export interface Brand {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly active: boolean;
  /** URL to brand logo/icon */
  readonly media?: string;
}

/**
 * A specific model/style for a brand.
 * 
 * @example Model: "Air Jordan 1", "Yeezy 350"
 */
export interface Model {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly active: boolean;
}

/**
 * Response from the taxonomy tree endpoint.
 */
export interface CatalogTreeResponse {
  readonly success: boolean;
  readonly message: string;
  readonly category: string;
  readonly data: readonly Category[];
  readonly metadata: {
    readonly total_categories: number;
    readonly total_types: number;
  };
}

/**
 * Options for fetching the taxonomy tree.
 */
export interface GetTreeOptions {
  /** Only return active categories and types (default: true) */
  readonly activeOnly?: boolean;
}

/** Primary state representing the main workflow stage */
export type SRPrimaryState = 
  | 'DRAFT'      // Initial state, not yet submitted
  | 'QC'         // Quality control review
  | 'QUEUE'      // Queued for authentication
  | 'UNDERWAY'   // Authentication in progress
  | 'COMPLETE'   // Authentication finished
  | 'CANCELLED'; // Request cancelled

/** Secondary state providing additional context */
export type SRSupplementState = 
  | 'PENDING'    // Awaiting action
  | 'REJECTED'   // Rejected during review
  | 'ASSIGNED'   // Assigned to authenticator
  | 'APPROVED'   // Approved/authenticated
  | 'COMPLETE';  // Supplement complete

/**
 * Current state of a Service Request.
 * 
 * Service requests use a two-part state system:
 * - `primary`: Main workflow stage (DRAFT → QC → UNDERWAY → COMPLETE)
 * - `supplement`: Additional context (PENDING, APPROVED, REJECTED, etc.)
 * 
 * **Common state combinations:**
 * 
 * | Primary | Supplement | Meaning |
 * |---------|------------|---------|
 * | DRAFT | - | Created, awaiting images/payment |
 * | QC | PENDING | Queued for quality review |
 * | QC | REJECTED | Issues found, action required |
 * | QC | APPROVED | QC passed, proceeding |
 * | UNDERWAY | ASSIGNED | Authenticator working |
 * | COMPLETE | APPROVED | Authentic |
 * | COMPLETE | REJECTED | Counterfeit |
 * | CANCELLED | - | Request cancelled |
 * 
 * @see {@link https://docs.legitmark.com/partner/service-request-states} for complete documentation
 * 
 * @example
 * ```typescript
 * if (sr.state.primary === 'COMPLETE') {
 *   if (sr.state.supplement === 'APPROVED') {
 *     console.log('Item is authentic');
 *   } else if (sr.state.supplement === 'REJECTED') {
 *     console.log('Item is not authentic');
 *   }
 * }
 * ```
 */
export interface SRState {
  readonly primary: SRPrimaryState;
  /** Supplement state (null when primary is DRAFT) */
  readonly supplement: SRSupplementState | null;
}

/**
 * Summary information about the item being authenticated.
 */
export interface SRSummary {
  readonly style?: string;
  readonly style_id?: string;
  readonly item_size?: string;
  readonly item_condition?: string;
}

/**
 * Reference to a taxonomy entity with optional media.
 */
export interface TaxonomyRef {
  readonly uuid: string;
  readonly name: string;
  readonly media?: string;
}

/**
 * Item details including category, type, and brand.
 */
export interface SRItem {
  readonly category?: TaxonomyRef;
  readonly type?: TaxonomyRef;
  readonly brand?: TaxonomyRef;
  readonly model?: TaxonomyRef;
}

/**
 * A photo requirement "side" (e.g., "Front", "Back", "Tag").
 */
export interface Side {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  /** Whether this side is required for submission */
  readonly required: boolean;
  /** Display order (lower = first) */
  readonly ordinal: number;
  /** URL to template/example image */
  readonly template_url?: string;
  /** URL to thumbnail image */
  readonly thumbnail_image?: string;
  /** URL to example image */
  readonly example_image?: string;
  /** Side group UUID */
  readonly side_group_id?: string;
  /** Side group name */
  readonly side_group_name?: string;
}

/**
 * A group of related sides (e.g., "Main Photos", "Detail Shots").
 */
export interface SideGroup {
  readonly uuid: string;
  readonly name: string;
  /** Display order (lower = first) */
  readonly ordinal: number;
  readonly sides: readonly Side[];
}

/**
 * Photo requirements for a Service Request.
 */
export interface SRRequirements {
  readonly side_groups: readonly SideGroup[];
  /** Total number of required photos */
  readonly total_required: number;
  /** Total number of optional photos */
  readonly total_optional: number;
}

/**
 * Complete Service Request object.
 */
export interface ServiceRequest {
  /** Unique identifier */
  readonly uuid: string;
  /** Short display ID (e.g., "123456") */
  readonly micro_id: string;
  /** Whether the SR is active */
  readonly active: boolean;
  /** Whether migrated from legacy system */
  readonly migrated?: boolean;
  /** Legacy system ID (if migrated) */
  readonly legacy_id?: string;
  /** Partner's external reference ID */
  readonly external_id?: string;
  /** Current tab/queue */
  readonly tab: string;
  /** Source platform */
  readonly source?: string;
  /** Current state */
  readonly state: SRState;
  /** Item summary */
  readonly summary?: SRSummary;
  /** Item details */
  readonly item?: SRItem;
  /** Photo requirements (legacy structure) */
  readonly requirements?: SRRequirements;
  /** Sides with media info (populated when sides=true) */
  readonly sides?: {
    readonly required?: readonly Side[];
    readonly optional?: readonly Side[];
    readonly progress?: ProgressData;
  };
  /** Associated user UUID */
  readonly user?: string;
  /** Associated service UUID */
  readonly service?: string;
  /** Creation timestamp (ISO 8601) */
  readonly created_at: string;
  /** Last update timestamp (ISO 8601) */
  readonly updated_at: string;
  /** When SR was submitted from draft (ISO 8601) */
  readonly drafted_at?: string;
}

/**
 * Request payload for creating a new Service Request.
 * 
 * @see {@link https://docs.legitmark.com/partner/create-service-request} API Documentation
 * @see {@link PartnerClient.createServiceRequest} Method that accepts this request
 * 
 * @example
 * ```typescript
 * const request: CreateSRRequest = {
 *   service: 'your-service-uuid',
 *   item: {
 *     category: 'footwear-uuid',
 *     type: 'sneakers-uuid',
 *     brand: 'nike-uuid',
 *   },
 *   external_id: 'your-internal-ref-123',
 * };
 * ```
 */
export interface CreateSRRequest {
  /** 
   * Service UUID. Identifies your partner service.
   * Obtain from the Legitmark Partner Dashboard.
   */
  readonly service: string;

  /** 
   * Source platform identifier (e.g., 'shopify', 'api').
   */
  readonly source?: string;

  /** 
   * Your internal reference ID for this request.
   * Use this to correlate Legitmark SRs with your system.
   */
  readonly external_id?: string;

  /** 
   * Item taxonomy selection from the catalog.
   * All three fields are required.
   */
  readonly item: {
    /** Category UUID from getTaxonomyTree() */
    readonly category: string;
    /** Type UUID from the selected category */
    readonly type: string;
    /** Brand UUID */
    readonly brand: string;
  };
}

/**
 * Response from creating a Service Request.
 */
export interface CreateSRResponse {
  readonly success: boolean;
  readonly message: string;
  readonly sr: ServiceRequest;
}

/**
 * Options for fetching a Service Request.
 * Set properties to `true` to include that data.
 */
export interface GetSROptions {
  /** Include authentication outcome */
  readonly outcome?: boolean;
  /** Include item details */
  readonly item?: boolean;
  /** Include sides with uploaded media */
  readonly sides?: boolean;
  /** Include user info */
  readonly user?: boolean;
  /** Include workflow stages */
  readonly stages?: boolean;
  /** Include tab/queue info */
  readonly tab?: boolean;
  /** Include risk assessment */
  readonly risk?: boolean;
  /** Include summary */
  readonly summary?: boolean;
  /** Include authenticator info */
  readonly authenticators?: boolean;
  /** Include workflow info */
  readonly workflows?: boolean;
  /** Include photo requirements */
  readonly requirements?: boolean;
  /** Include service info */
  readonly service?: boolean;
  /** Include partner info */
  readonly partner?: boolean;
}

/**
 * Response from fetching a Service Request.
 */
export interface GetSRResponse {
  readonly success: boolean;
  readonly message: string;
  readonly rc_hit?: boolean;
  readonly sr: ServiceRequest;
}

/**
 * Response from the upload intent endpoint.
 * Contains a pre-signed URL for direct S3 upload.
 */
export interface UploadIntentResponse {
  readonly message: string;
  /** Pre-signed S3 URL for PUT upload */
  readonly url: string;
}

/**
 * Upload progress data for a Service Request.
 * 
 * Use `met` to determine if the SR is ready for submission.
 * 
 * @see {@link PartnerClient.getProgress} Method that returns this data
 * @see {@link PartnerClient.waitForRequirementsMet} Wait for requirements to be met
 * 
 * @example
 * ```typescript
 * const progress = await legitmark.getProgress(srUuid);
 * if (progress.met) {
 *   await legitmark.submitServiceRequest(srUuid);
 * }
 * ```
 */
export interface ProgressData {
  /** Number of required photos uploaded */
  readonly current_required: number;
  /** Total required photos needed */
  readonly total_required: number;
  /** Number of optional photos uploaded */
  readonly current_optional: number;
  /** Total optional photos available */
  readonly total_optional: number;
  /** Whether all requirements are met (ready to submit) */
  readonly met: boolean;
}

/**
 * A side with its uploaded media information.
 */
export interface SideWithMedia extends Side {
  /** Uploaded media versions (newest first) */
  readonly media_url?: readonly MediaVersion[];
  /** Whether this side is used as the SR thumbnail */
  readonly is_thumbnail?: boolean;
}

/**
 * Information about an uploaded media version.
 */
export interface MediaVersion {
  /** CDN URL to the image */
  readonly url: string;
  /** S3 version ID */
  readonly version_id: string;
  /** Upload timestamp (ISO 8601) */
  readonly last_modified: string;
  /** File size in bytes */
  readonly size: number;
  /** Whether this is the current/latest version */
  readonly is_latest: boolean;
}

/**
 * Extended SR response including sides with media and progress.
 */
export interface GetSRWithSidesResponse extends GetSRResponse {
  readonly sr: ServiceRequest & {
    readonly sides?: {
      readonly required?: readonly SideWithMedia[];
      readonly optional?: readonly SideWithMedia[];
      readonly progress?: ProgressData;
    };
  };
}

/**
 * Response from submitting a Service Request.
 */
export interface SubmitSRResponse {
  readonly success: boolean;
  readonly message: string;
  readonly sr: {
    readonly uuid: string;
    readonly micro_id: string;
    readonly state: SRState;
  };
}

/**
 * Current state of a WorkflowRunner execution.
 * 
 * Access via {@link WorkflowRunner.getState} to check workflow progress.
 * 
 * @see {@link WorkflowRunner} The workflow orchestrator class
 * @see {@link WORKFLOW_STEPS} Step number to name mapping
 */
export interface WorkflowState {
  /** Current step number (1-6) */
  readonly step: number;
  /** Human-readable step name */
  readonly stepName: string;
  /** Created SR UUID (set after Step 2) */
  readonly sr_uuid?: string;
  /** Fetched taxonomy (set after Step 1) */
  readonly taxonomy?: CatalogTreeResponse;
  /** Current SR data */
  readonly sr?: ServiceRequest;
  /** Photo requirements (set after Step 3) */
  readonly requirements?: SRRequirements;
  /** UUIDs of successfully uploaded sides */
  readonly uploadedSides: readonly string[];
  /** Current progress (set after Step 5) */
  readonly progress?: ProgressData;
  /** Whether workflow completed successfully */
  readonly completed: boolean;
  /** Any errors encountered */
  readonly errors: readonly string[];
}

/**
 * Error codes returned by the SDK.
 */
export type LegitmarkErrorCode =
  | 'CONFIGURATION_ERROR'    // Invalid SDK configuration
  | 'NETWORK_ERROR'          // Network/connection failure
  | 'TIMEOUT_ERROR'          // Request timeout
  | 'AUTHENTICATION_ERROR'   // Invalid or expired credentials
  | 'VALIDATION_ERROR'       // Request validation failed
  | 'NOT_FOUND_ERROR'        // Resource not found
  | 'RATE_LIMIT_ERROR'       // Too many requests
  | 'SERVER_ERROR'           // Server-side error
  | 'UPLOAD_ERROR'           // Image upload failed
  | 'WORKFLOW_ERROR'         // Workflow step failed
  | 'UNKNOWN_ERROR';         // Unexpected error

/**
 * Context information attached to SDK errors.
 */
export interface LegitmarkErrorContext {
  /** HTTP status code (if applicable) */
  readonly statusCode?: number;
  /** API endpoint that failed */
  readonly endpoint?: string;
  /** Request ID for support */
  readonly requestId?: string;
  /** Additional details */
  readonly details?: Record<string, unknown>;
}
