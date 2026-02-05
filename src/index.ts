/**
 * # Legitmark Partner SDK
 * 
 * A typed TypeScript SDK for the Legitmark Partner API.
 * 
 * ## Installation
 * 
 * ```bash
 * npm install legitmark
 * ```
 * 
 * ## Quick Start
 * 
 * ```typescript
 * import { Legitmark } from 'legitmark';
 * 
 * // Simple - just pass your API key
 * const legitmark = new Legitmark('leo_your_api_key');
 * 
 * // With debug logging
 * const legitmark = new Legitmark('leo_your_api_key', { debug: true });
 * ```
 * 
 * ## Alternative: From Environment Variables
 * 
 * ```typescript
 * import { PartnerClient, createClientFromEnv } from 'legitmark';
 * 
 * // Reads LEGITMARK_API_KEY and LEGITMARK_DEBUG from environment
 * const client = createClientFromEnv();
 * 
 * // Or with explicit configuration
 * const client = new PartnerClient({
 *   apiKey: 'leo_your_api_key',
 *   debug: true,
 * });
 * ```
 * 
 * ## Basic Workflow
 * 
 * ```typescript
 * import { Legitmark } from 'legitmark';
 * 
 * const legitmark = new Legitmark('leo_your_api_key');
 * 
 * // 1. Get taxonomy
 * const { categories } = await legitmark.taxonomy.getTree();
 * 
 * // 2. Create a Service Request
 * const { sr } = await legitmark.sr.create({
 *   service: 'your-service-uuid',
 *   item: {
 *     category: 'category-uuid',
 *     type: 'type-uuid',
 *     brand: 'brand-uuid',
 *   },
 * });
 * 
 * // 3. Get photo requirements
 * const { sr: srWithReqs } = await legitmark.sr.getWithRequirements(sr.uuid);
 * 
 * // 4. Upload required photos
 * for (const group of srWithReqs.requirements?.side_groups ?? []) {
 *   for (const side of group.sides) {
 *     if (side.required) {
 *       await legitmark.images.uploadForSide(sr.uuid, side.uuid, `./photos/${side.name}.jpg`);
 *     }
 *   }
 * }
 * 
 * // 5. Submit for authentication
 * const progress = await legitmark.sr.getProgress(sr.uuid);
 * if (progress.met) {
 *   await legitmark.sr.submit(sr.uuid);
 * }
 * ```
 * 
 * ## Using WorkflowRunner (Higher-Level Abstraction)
 * 
 * ```typescript
 * import { PartnerClient, WorkflowRunner } from 'legitmark';
 * 
 * const client = new PartnerClient({ ... });
 * 
 * const workflow = new WorkflowRunner(client, {
 *   onStepComplete: (step, name) => console.log(`✓ ${name}`),
 *   getImageForSide: async (side) => fs.readFileSync(`./photos/${side.name}.jpg`),
 * });
 * 
 * await workflow.run({
 *   service: 'service-uuid',
 *   item: { category: '...', type: '...', brand: '...' },
 * });
 * ```
 * 
 * ## Error Handling
 * 
 * ```typescript
 * import { LegitmarkError } from 'legitmark';
 * 
 * try {
 *   await client.submitServiceRequest(srUuid);
 * } catch (error) {
 *   if (error instanceof LegitmarkError) {
 *     console.error(`[${error.code}] ${error.message}`);
 *     console.log('Suggestions:', error.suggestions);
 *     
 *     if (error.isRetryable) {
 *       // Safe to retry
 *     }
 *   }
 * }
 * ```
 * 
 * @packageDocumentation
 * @module legitmark
 */

// ============================================================================
// Client Exports
// ============================================================================

export {
  // Primary client classes
  Legitmark,
  PartnerClient,
  
  // Factory functions
  createClientFromEnv,
  validateEnvironment,
  
  // Error classes
  LegitmarkError,
  ConfigurationError,
  
  // Utilities
  withRetry,
  
  // Constants
  SDK_VERSION,
  IMAGE_CONTENT_TYPES,
} from './client';

export type { ImageContentType, RetryOptions } from './client';

// ============================================================================
// Workflow Exports
// ============================================================================

export {
  WorkflowRunner,
  WORKFLOW_STEPS,
  WORKFLOW_STEP_NAMES,
} from './workflow';

export type {
  WorkflowCallbacks,
  WorkflowOptions,
  WorkflowStepNumber,
  WorkflowStepName,
} from './workflow';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Configuration
  PartnerConfig,
  RequestOptions,
  
  // API Responses
  ApiResponse,
  PaginatedResponse,
  ValidationError,
  ErrorResponse,
  
  // Taxonomy
  Category,
  Type,
  Brand,
  Model,
  CatalogTreeResponse,
  GetTreeOptions,
  
  // Service Requests
  SRPrimaryState,
  SRSupplementState,
  SRState,
  SRSummary,
  SRItem,
  Side,
  SideGroup,
  SRRequirements,
  ServiceRequest,
  CreateSRRequest,
  CreateSRResponse,
  GetSROptions,
  GetSRResponse,
  
  // Media Upload
  UploadIntentResponse,
  
  // Progress
  ProgressData,
  SideWithMedia,
  MediaVersion,
  GetSRWithSidesResponse,
  
  // Submit
  SubmitSRResponse,
  
  // Workflow
  WorkflowState,
  
  // Errors
  LegitmarkErrorCode,
  LegitmarkErrorContext,
} from './types';
