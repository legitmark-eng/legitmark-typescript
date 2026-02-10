/**
 * Legitmark Partner SDK - Workflow Helper
 * 
 * Orchestrates the complete authentication workflow with callbacks.
 * Use this for a higher-level abstraction over the PartnerClient.
 * 
 * @packageDocumentation
 */

import { PartnerClient } from './client';
import { LegitmarkError } from './errors';
import {
  WorkflowState,
  CreateSRRequest,
  Side,
  SideGroup,
} from './types';

const INITIAL_STEP_NAME = 'Not Started';
const FALLBACK_SIDE_GROUP = { UUID: 'unknown', NAME: 'Unknown Group', ORDINAL: 0 } as const;

/**
 * Workflow step numbers for programmatic reference.
 */
export const WORKFLOW_STEPS = {
  GET_TAXONOMY: 1,
  CREATE_SR: 2,
  GET_REQUIREMENTS: 3,
  UPLOAD_IMAGES: 4,
  GET_PROGRESS: 5,
  SUBMIT: 6,
} as const;

/**
 * Workflow step names by number.
 */
export const WORKFLOW_STEP_NAMES = {
  1: 'Get Taxonomy',
  2: 'Create Service Request',
  3: 'Get Requirements',
  4: 'Upload Images',
  5: 'Check Progress',
  6: 'Submit',
} as const;

/** Total number of workflow steps (derived from WORKFLOW_STEP_NAMES) */
const TOTAL_STEPS = Object.keys(WORKFLOW_STEP_NAMES).length;

export type WorkflowStepNumber = keyof typeof WORKFLOW_STEP_NAMES;
export type WorkflowStepName = typeof WORKFLOW_STEP_NAMES[WorkflowStepNumber];

/**
 * Callback functions for workflow events.
 * 
 * All callbacks are optional and async-aware. Implement the ones you need.
 * Async callbacks will be awaited before proceeding.
 */
export interface WorkflowCallbacks {
  /**
   * Called when a workflow step begins.
   * Can be async for logging/analytics.
   * 
   * @param step - Step number (1-6)
   * @param stepName - Human-readable step name
   */
  onStepStart?: (step: WorkflowStepNumber, stepName: WorkflowStepName) => void | Promise<void>;

  /**
   * Called when a workflow step completes successfully.
   * Can be async for logging/analytics.
   * 
   * @param step - Step number (1-6)
   * @param stepName - Human-readable step name
   * @param data - Step result data
   */
  onStepComplete?: (step: WorkflowStepNumber, stepName: WorkflowStepName, data: unknown) => void | Promise<void>;

  /**
   * Called when a workflow step fails.
   * Can be async for error reporting.
   * 
   * @param step - Step number (1-6)
   * @param stepName - Human-readable step name
   * @param error - The error that occurred
   */
  onStepError?: (step: WorkflowStepNumber, stepName: WorkflowStepName, error: Error) => void | Promise<void>;

  /**
   * Called during image upload to get image data for each side.
   * Return null to skip a side.
   * 
   * @param side - The side requiring an image
   * @param sideGroup - The group this side belongs to
   * @returns Image data as Buffer, file path string, or null to skip
   */
  getImageForSide?: (side: Side, sideGroup: SideGroup) => Promise<Buffer | string | null>;

  /**
   * Called during image upload to report progress.
   * Can be async for progress tracking.
   * 
   * @param uploaded - Number of images uploaded so far
   * @param total - Total number of images to upload
   * @param currentSide - The side being uploaded
   */
  onUploadProgress?: (uploaded: number, total: number, currentSide: Side) => void | Promise<void>;
}

/**
 * Options for running the workflow.
 */
export interface WorkflowOptions {
  /**
   * Skip Step 1 (Get Taxonomy).
   * Use this if you already have the taxonomy data.
   * @default false
   */
  skipTaxonomy?: boolean;

  /**
   * Skip Step 6 (Submit).
   * Use this if you want to submit manually later.
   * @default false
   */
  skipSubmit?: boolean;
}

/**
 * Orchestrates the complete Legitmark authentication workflow.
 * 
 * The workflow consists of 6 steps:
 * 1. Get Taxonomy (optional) - Fetch category/type/brand catalog
 * 2. Create Service Request - Create a draft SR
 * 3. Get Requirements - Fetch photo requirements
 * 4. Upload Images - Upload photos for required sides
 * 5. Check Progress - Verify all requirements are met
 * 6. Submit - Submit SR for authentication
 * 
 * @example
 * ```typescript
 * import { PartnerClient, WorkflowRunner } from 'legitmark';
 * 
 * const client = new PartnerClient({ ... });
 * 
 * const workflow = new WorkflowRunner(client, {
 *   onStepStart: (step, name) => console.log(`Starting: ${name}`),
 *   onStepComplete: (step, name) => console.log(`Complete: ${name}`),
 *   onStepError: (step, name, error) => console.error(`Failed: ${name}`, error),
 *   getImageForSide: async (side) => {
 *     // Return image data for this side
 *     return fs.readFileSync(`./photos/${side.name}.jpg`);
 *   },
 * });
 * 
 * const result = await workflow.run({
 *   service: 'service-uuid',
 *   item: {
 *     category: 'category-uuid',
 *     type: 'type-uuid',
 *     brand: 'brand-uuid',
 *   },
 * });
 * 
 * if (result.completed) {
 *   console.log('Authentication submitted:', result.sr_uuid);
 * }
 * ```
 */
export class WorkflowRunner {
  private readonly client: PartnerClient;
  private readonly callbacks: WorkflowCallbacks;
  private state: WorkflowState;

  /**
   * Create a new WorkflowRunner.
   * 
   * @param client - Configured PartnerClient instance
   * @param callbacks - Optional callback functions for workflow events
   */
  constructor(client: PartnerClient, callbacks: WorkflowCallbacks = {}) {
    this.client = client;
    this.callbacks = callbacks;
    this.state = this.createInitialState();
  }

  /**
   * Create the initial workflow state.
   */
  private createInitialState(): WorkflowState {
    return {
      step: 0,
      stepName: INITIAL_STEP_NAME,
      uploadedSides: [],
      completed: false,
      errors: [],
    };
  }

  /**
   * Get a copy of the current workflow state.
   * 
   * @returns Current workflow state (immutable copy)
   */
  getState(): Readonly<WorkflowState> {
    return { ...this.state };
  }

  /**
   * Reset the workflow to initial state.
   * Call this to reuse the runner for a new workflow.
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Run the complete workflow.
   * 
   * Executes all steps in sequence. If any step fails, the workflow
   * stops and the error is recorded in the state.
   * 
   * @param request - Service Request creation parameters
   * @param options - Optional workflow configuration
   * @returns Final workflow state
   * @throws {LegitmarkError} If any step fails
   */
  async run(
    request: CreateSRRequest,
    options: WorkflowOptions = {}
  ): Promise<WorkflowState> {
    try {
      // Step 1: Get Taxonomy (optional)
      if (!options.skipTaxonomy) {
        await this.runStep1();
      }

      // Step 2: Create Service Request
      await this.runStep2(request);

      // Step 3: Get Requirements
      await this.runStep3();

      // Step 4: Upload Images
      await this.runStep4();

      // Step 5: Check Progress
      await this.runStep5();

      // Step 6: Submit (optional)
      if (!options.skipSubmit) {
        await this.runStep6();
      }

      this.state = { ...this.state, completed: true };
      return this.getState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.state = {
        ...this.state,
        errors: [...this.state.errors, errorMessage],
      };
      throw error;
    }
  }

  /**
   * Set the SR UUID directly for resuming workflows.
   * 
   * Use this when you have an existing SR and want to resume from step 3+.
   * 
   * @param srUuid - The Service Request UUID
   * 
   * @example
   * ```typescript
   * // Resume from an existing SR
   * workflow.setSrUuid('existing-sr-uuid');
   * await workflow.runFrom(3); // Start from Get Requirements
   * ```
   */
  setSrUuid(srUuid: string): void {
    this.state = { ...this.state, sr_uuid: srUuid };
  }

  /**
   * Run from a specific step.
   * Useful for resuming a failed workflow.
   * 
   * @param fromStep - Step number to start from (1-6)
   * @param request - Service Request creation parameters (required if starting from step 1 or 2)
   * @param options - Optional workflow configuration
   * @returns Final workflow state
   * 
   * @example
   * ```typescript
   * // Resume from step 3 with an existing SR
   * workflow.setSrUuid('existing-sr-uuid');
   * const result = await workflow.runFrom(3);
   * 
   * // Or start fresh from step 1
   * const result = await workflow.runFrom(1, {
   *   service: 'service-uuid',
   *   item: { category: '...', type: '...', brand: '...' },
   * });
   * ```
   */
  async runFrom(
    fromStep: WorkflowStepNumber,
    request?: CreateSRRequest,
    options: WorkflowOptions = {}
  ): Promise<WorkflowState> {
    if (fromStep <= 2 && !request) {
      throw new LegitmarkError(
        'WORKFLOW_ERROR',
        `Cannot start from step ${fromStep} (${WORKFLOW_STEP_NAMES[fromStep]}) without a CreateSRRequest`,
        { 
          suggestions: [
            `Provide the request: runFrom(${fromStep}, { service: '...', item: {...} })`,
            'Or start from step 3+ if you have an existing SR UUID',
          ] 
        }
      );
    }

    if (fromStep > 2 && !this.state.sr_uuid) {
      throw new LegitmarkError(
        'WORKFLOW_ERROR',
        `Cannot start from step ${fromStep} (${WORKFLOW_STEP_NAMES[fromStep]}): no SR UUID in state`,
        { 
          suggestions: [
            'Set the SR UUID first: workflow.setSrUuid("your-sr-uuid")',
            'Or run from step 1 or 2 to create a new SR',
            `Example: workflow.setSrUuid("abc-123"); await workflow.runFrom(${fromStep});`,
          ] 
        }
      );
    }

    try {
      for (let step = fromStep; step <= TOTAL_STEPS; step++) {
        const stepNum = step as WorkflowStepNumber;
        
        if (stepNum === 1 && options.skipTaxonomy) continue;
        if (stepNum === 6 && options.skipSubmit) continue;

        switch (stepNum) {
          case 1:
            await this.runStep1();
            break;
          case 2:
            await this.runStep2(request!);
            break;
          case 3:
            await this.runStep3();
            break;
          case 4:
            await this.runStep4();
            break;
          case 5:
            await this.runStep5();
            break;
          case 6:
            await this.runStep6();
            break;
        }
      }

      this.state = { ...this.state, completed: true };
      return this.getState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.state = {
        ...this.state,
        errors: [...this.state.errors, errorMessage],
      };
      throw error;
    }
  }

  /**
   * Step 1: Get Taxonomy Tree
   * 
   * Fetches the category/type catalog. Optional but useful for validation.
   */
  async runStep1(): Promise<void> {
    const step = 1 as const;
    const stepName = WORKFLOW_STEP_NAMES[step];
    
    this.updateState(step, stepName);
    await this.callbacks.onStepStart?.(step, stepName);

    try {
      const taxonomy = await this.client.taxonomy.getTree({ activeOnly: true });
      this.state = { ...this.state, taxonomy };
      await this.callbacks.onStepComplete?.(step, stepName, taxonomy);
    } catch (error) {
      await this.callbacks.onStepError?.(step, stepName, error as Error);
      throw error;
    }
  }

  /**
   * Step 2: Create Service Request
   * 
   * Creates a new draft SR with the specified item details.
   */
  async runStep2(request: CreateSRRequest): Promise<void> {
    const step = 2 as const;
    const stepName = WORKFLOW_STEP_NAMES[step];
    
    this.updateState(step, stepName);
    await this.callbacks.onStepStart?.(step, stepName);

    try {
      const result = await this.client.sr.create(request);
      this.state = {
        ...this.state,
        sr_uuid: result.sr.uuid,
        sr: result.sr,
      };
      await this.callbacks.onStepComplete?.(step, stepName, result);
    } catch (error) {
      await this.callbacks.onStepError?.(step, stepName, error as Error);
      throw error;
    }
  }

  /**
   * Step 3: Get Requirements
   * 
   * Fetches photo requirements for the SR.
   */
  async runStep3(): Promise<void> {
    this.assertSrUuid('Step 3');
    
    const step = 3 as const;
    const stepName = WORKFLOW_STEP_NAMES[step];
    
    this.updateState(step, stepName);
    await this.callbacks.onStepStart?.(step, stepName);

    try {
      const result = await this.client.sr.getWithRequirements(this.state.sr_uuid!);
      this.state = {
        ...this.state,
        sr: result.sr,
        requirements: result.sr.requirements,
      };
      await this.callbacks.onStepComplete?.(step, stepName, result);
    } catch (error) {
      await this.callbacks.onStepError?.(step, stepName, error as Error);
      throw error;
    }
  }

  /**
   * Step 4: Upload Images
   * 
   * Uploads images for all required sides using the getImageForSide callback.
   */
  async runStep4(): Promise<void> {
    this.assertSrUuid('Step 4');
    this.assertRequirements('Step 4');
    
    const step = 4 as const;
    const stepName = WORKFLOW_STEP_NAMES[step];
    
    this.updateState(step, stepName);
    await this.callbacks.onStepStart?.(step, stepName);

    try {
      const requiredSides = this.getAllRequiredSides();
      const uploadedSides: string[] = [];
      let uploadedCount = 0;

      for (const { side, sideGroup } of requiredSides) {
        await this.callbacks.onUploadProgress?.(uploadedCount, requiredSides.length, side);
        
        const imageData = await this.callbacks.getImageForSide?.(side, sideGroup);
        
        if (imageData) {
          await this.client.images.uploadForSide(this.state.sr_uuid!, side.uuid, imageData);
          uploadedSides.push(side.uuid);
          uploadedCount++;
        }
      }

      this.state = {
        ...this.state,
        uploadedSides,
      };

      await this.callbacks.onStepComplete?.(step, stepName, {
        uploaded: uploadedSides.length,
        total: requiredSides.length,
        sides: uploadedSides,
      });
    } catch (error) {
      await this.callbacks.onStepError?.(step, stepName, error as Error);
      throw error;
    }
  }

  /**
   * Step 5: Check Progress
   * 
   * Verifies upload progress and whether requirements are met.
   */
  async runStep5(): Promise<void> {
    this.assertSrUuid('Step 5');
    
    const step = 5 as const;
    const stepName = WORKFLOW_STEP_NAMES[step];
    
    this.updateState(step, stepName);
    await this.callbacks.onStepStart?.(step, stepName);

    try {
      const progress = await this.client.sr.getProgress(this.state.sr_uuid!);
      this.state = { ...this.state, progress };
      await this.callbacks.onStepComplete?.(step, stepName, progress);
    } catch (error) {
      await this.callbacks.onStepError?.(step, stepName, error as Error);
      throw error;
    }
  }

  /**
   * Step 6: Submit Service Request
   * 
   * Submits the SR for authentication. Requirements must be met.
   */
  async runStep6(): Promise<void> {
    this.assertSrUuid('Step 6');
    this.assertRequirementsMet('Step 6');
    
    const step = 6 as const;
    const stepName = WORKFLOW_STEP_NAMES[step];
    
    this.updateState(step, stepName);
    await this.callbacks.onStepStart?.(step, stepName);

    try {
      const result = await this.client.sr.submit(this.state.sr_uuid!);
      await this.callbacks.onStepComplete?.(step, stepName, result);
    } catch (error) {
      await this.callbacks.onStepError?.(step, stepName, error as Error);
      throw error;
    }
  }

  private updateState(step: WorkflowStepNumber, stepName: WorkflowStepName): void {
    this.state = { ...this.state, step, stepName };
  }

  /**
   * Assert that SR UUID exists in state.
   */
  private assertSrUuid(context: string): void {
    if (!this.state.sr_uuid) {
      throw new LegitmarkError(
        'WORKFLOW_ERROR',
        `${context}: No SR UUID in state. Run Step 2 first.`,
        { suggestions: ['Call runStep2() before this step'] }
      );
    }
  }

  /**
   * Assert that requirements exist in state.
   */
  private assertRequirements(context: string): void {
    if (!this.state.requirements) {
      throw new LegitmarkError(
        'WORKFLOW_ERROR',
        `${context}: No requirements in state. Run Step 3 first.`,
        { suggestions: ['Call runStep3() before this step'] }
      );
    }
  }

  /**
   * Assert that requirements are met.
   */
  private assertRequirementsMet(context: string): void {
    if (this.state.progress && !this.state.progress.met) {
      const { current_required, total_required } = this.state.progress;
      throw new LegitmarkError(
        'WORKFLOW_ERROR',
        `${context}: Requirements not met. ` +
        `Uploaded ${current_required}/${total_required} required images.`,
        {
          suggestions: [
            'Ensure all required images are uploaded',
            'Check that getImageForSide callback returns data for all sides',
          ],
        }
      );
    }
  }

  /**
   * Get all required sides from the SR.
   * Uses sr.sides.required which is populated by getWithRequirements/getWithSides.
   */
  private getAllRequiredSides(): Array<{ side: Side; sideGroup: SideGroup }> {
    const requiredSides = this.state.sr?.sides?.required;
    if (!requiredSides || requiredSides.length === 0) {
      return [];
    }

    // Each side has side_group_id and side_group_name embedded
    // Create synthetic SideGroup objects from the side data
    const result: Array<{ side: Side; sideGroup: SideGroup }> = [];

    for (const side of requiredSides) {
      const sideGroup: SideGroup = {
        uuid: side.side_group_id || FALLBACK_SIDE_GROUP.UUID,
        name: side.side_group_name || FALLBACK_SIDE_GROUP.NAME,
        ordinal: FALLBACK_SIDE_GROUP.ORDINAL,
        sides: [],
      };
      result.push({ side, sideGroup });
    }

    return result;
  }
}
