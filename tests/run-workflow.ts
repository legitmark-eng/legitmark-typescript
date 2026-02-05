#!/usr/bin/env ts-node
/**
 * Partner API - Complete Workflow Example
 *
 * Demonstrates running the full 6-step authentication workflow.
 *
 * Usage:
 *   npx ts-node tests/run-workflow.ts
 *
 * Configuration:
 *   Copy .env.example to .env and set your credentials.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { WorkflowRunner, WORKFLOW_STEPS } from '../src/workflow';
import { bootstrap, log, logStep, generateTestImage, getTestConfig } from './utils';

async function main() {
  console.log('\n');
  log('bright', '═══════════════════════════════════════════════════════════');
  log('bright', '         Legitmark Partner API - Workflow Example');
  log('bright', '═══════════════════════════════════════════════════════════');
  console.log('\n');

  // Initialize client with friendly error handling
  const client = bootstrap();
  const testConfig = getTestConfig();

  log('dim', 'Configuration:');
  log('dim', `  API Key:    ${process.env.LEGITMARK_API_KEY?.substring(0, 8)}...`);
  log('dim', `  Debug:      ${process.env.LEGITMARK_DEBUG || 'false'}`);
  console.log('\n');

  // Fetch taxonomy if category/type not specified
  if (!testConfig.category || !testConfig.type) {
    log('yellow', 'No category/type specified - using first available...');

    const tree = await client.taxonomy.getTree({ activeOnly: true });

    if (tree.data.length === 0) {
      log('red', 'No categories found in taxonomy');
      process.exit(1);
    }

    const firstCategory = tree.data[0];
    testConfig.category = firstCategory.uuid;

    if (firstCategory.types?.length) {
      testConfig.type = firstCategory.types[0].uuid;
    }

    log('dim', `  Category: ${firstCategory.name}`);
    log('dim', `  Type: ${firstCategory.types?.[0]?.name || 'none'}`);
    console.log('\n');
  }

  if (!testConfig.service) {
    log('red', 'TEST_SERVICE_UUID is required in .env');
    process.exit(1);
  }

  // Create workflow runner with callbacks
  const runner = new WorkflowRunner(client, {
    onStepStart: (step, name) => {
      logStep(step, name, 'start');
    },

    onStepComplete: (step, name, data) => {
      logStep(step, name, 'success');
      logStepDetails(step, data);
    },

    onStepError: (step, name, error) => {
      logStep(step, name, 'error');
      log('red', `    Error: ${error.message}`);
    },

    getImageForSide: async (side, sideGroup) => {
      log('dim', `    Generating image for: ${side.name} (${sideGroup.name})`);
      return generateTestImage();
    },
  });

  // Run the workflow
  console.log('\n');
  log('bright', '─────────────────────────────────────────────────────────────');
  log('bright', '                    Running Workflow');
  log('bright', '─────────────────────────────────────────────────────────────');
  console.log('\n');

  try {
    const state = await runner.run({
      service: testConfig.service,
      external_id: `test-${Date.now()}`,
      source: 'partner-sdk-test',
      item: {
        category: testConfig.category,
        type: testConfig.type,
        brand: testConfig.brand,
      },
    });

    console.log('\n');
    log('bright', '─────────────────────────────────────────────────────────────');
    log('green', '                    Workflow Complete!');
    log('bright', '─────────────────────────────────────────────────────────────');
    console.log('\n');

    log('dim', 'Final State:');
    log('dim', `  SR UUID: ${state.sr_uuid}`);
    log('dim', `  Uploaded: ${state.uploadedSides.length} images`);
    log('dim', `  Progress Met: ${state.progress?.met ? 'Yes' : 'No'}`);
    log('dim', `  Errors: ${state.errors.length}`);
  } catch (error) {
    console.log('\n');
    log('bright', '─────────────────────────────────────────────────────────────');
    log('red', '                    Workflow Failed');
    log('bright', '─────────────────────────────────────────────────────────────');
    console.log('\n');
    log('red', `Error: ${error}`);
    process.exit(1);
  }

  console.log('\n');
}

// Helper to log step-specific details
function logStepDetails(step: number | string, data: unknown): void {
  const result = data as Record<string, unknown>;

  if (step === WORKFLOW_STEPS.CREATE_SR && result?.sr) {
    const sr = result.sr as { uuid?: string };
    log('dim', `    SR UUID: ${sr.uuid}`);
  }

  if (step === WORKFLOW_STEPS.GET_REQUIREMENTS && result?.sr) {
    const sr = result.sr as {
      requirements?: { total_required: number; total_optional: number };
    };
    if (sr.requirements) {
      log('dim', `    Required: ${sr.requirements.total_required} photos`);
      log('dim', `    Optional: ${sr.requirements.total_optional} photos`);
    }
  }

  if (step === WORKFLOW_STEPS.GET_PROGRESS) {
    const progress = result as {
      current_required?: number;
      total_required?: number;
      met?: boolean;
    };
    if (progress.current_required !== undefined) {
      log('dim', `    Progress: ${progress.current_required}/${progress.total_required}`);
      log('dim', `    Met: ${progress.met ? 'Yes' : 'No'}`);
    }
  }
}

main().catch(console.error);
