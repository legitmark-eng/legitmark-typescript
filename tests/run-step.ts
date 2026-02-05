#!/usr/bin/env ts-node
/**
 * Partner API - Individual Step Tester
 *
 * Run individual steps of the Partner API workflow.
 *
 * Usage:
 *   npx ts-node tests/run-step.ts <step> [options]
 *
 * Steps:
 *   1, taxonomy    - Get taxonomy tree
 *   2, create      - Create service request
 *   3, requirements - Get requirements for an SR
 *   4, upload      - Upload test images
 *   5, progress    - Check upload progress
 *   6, submit      - Submit for authentication
 *
 * Examples:
 *   npx ts-node tests/run-step.ts 1
 *   npx ts-node tests/run-step.ts taxonomy
 *   npx ts-node tests/run-step.ts 3 --sr=<uuid>
 *   npx ts-node tests/run-step.ts progress --sr=<uuid>
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PartnerClient, GetSRWithSidesResponse } from '../src';
import { bootstrap, generateTestImage, getTestConfig } from './utils';

/** Type for SR with sides data (required/optional arrays) */
type SRWithSidesData = GetSRWithSidesResponse['sr'];

// ============================================================================
// CLI Parsing
// ============================================================================

interface ParsedArgs {
  step: string;
  options: Record<string, string>;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    step: args[0] || '',
    options: {},
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result.options[key] = value || 'true';
    }
  }

  return result;
}

const STEP_ALIASES: Record<string, string> = {
  '1': 'taxonomy',
  '2': 'create',
  '3': 'requirements',
  '4': 'upload',
  '5': 'progress',
  '6': 'submit',
};

// ============================================================================
// Step Implementations
// ============================================================================

async function runTaxonomy(client: PartnerClient) {
  console.log('\n📋 Step 1: Get Taxonomy Tree\n');

  const tree = await client.taxonomy.getTree({ activeOnly: true });

  console.log(
    `Found ${tree.metadata.total_categories} categories with ${tree.metadata.total_types} types\n`
  );

  for (const category of tree.data.slice(0, 5)) {
    console.log(`📁 ${category.name} (${category.uuid})`);
    for (const type of (category.types || []).slice(0, 3)) {
      console.log(`   └─ ${type.name} (${type.uuid})`);
    }
    if (category.types && category.types.length > 3) {
      console.log(`   └─ ... and ${category.types.length - 3} more types`);
    }
  }

  if (tree.data.length > 5) {
    console.log(`\n... and ${tree.data.length - 5} more categories`);
  }

  return tree;
}

async function runCreate(client: PartnerClient, options: Record<string, string>) {
  console.log('\n🆕 Step 2: Create Service Request\n');

  const testConfig = getTestConfig();
  const service = options.service || testConfig.service;
  const category = options.category || testConfig.category;
  const type = options.type || testConfig.type;
  const brand = options.brand || testConfig.brand;

  if (!service) {
    console.error('❌ Missing --service=<uuid> or TEST_SERVICE_UUID');
    process.exit(1);
  }

  if (!category || !type || !brand) {
    console.error(
      '❌ Missing required taxonomy: --category=<uuid>, --type=<uuid>, --brand=<uuid>'
    );
    console.error('   Or set TEST_CATEGORY_UUID, TEST_TYPE_UUID, TEST_BRAND_UUID in .env');
    process.exit(1);
  }

  const result = await client.sr.create({
    service,
    external_id: `test-step-${Date.now()}`,
    source: 'sdk-step-test',
    item: { category, type, brand },
  });

  console.log('✅ Service Request Created\n');
  console.log(`   UUID:       ${result.sr.uuid}`);
  console.log(`   Micro ID:   ${result.sr.micro_id}`);
  console.log(`   State:      ${result.sr.state.primary} / ${result.sr.state.supplement}`);
  console.log(`   Created:    ${result.sr.created_at}`);

  console.log('\n💡 Next step: Get requirements with:');
  console.log(`   npx ts-node tests/run-step.ts requirements --sr=${result.sr.uuid}`);

  return result;
}

async function runRequirements(client: PartnerClient, options: Record<string, string>) {
  console.log('\n📸 Step 3: Get Requirements\n');

  const srUuid = options.sr;

  if (!srUuid) {
    console.error('❌ Missing --sr=<uuid>');
    process.exit(1);
  }

  const result = await client.sr.getWithRequirements(srUuid);
  const sr = result.sr as SRWithSidesData;

  console.log(`✅ Requirements for SR: ${sr.uuid}\n`);

  if (sr.sides) {
    const required = sr.sides.required || [];
    const optional = sr.sides.optional || [];

    console.log(`   Total Required: ${required.length}`);
    console.log(`   Total Optional: ${optional.length}\n`);

    if (required.length > 0) {
      console.log('📁 Required Photos:');
      for (const side of required) {
        console.log(`   🔴 ${side.name} (${side.uuid})`);
        if (side.description) {
          console.log(`      ${side.description.substring(0, 60)}...`);
        }
      }
    }

    if (optional.length > 0) {
      console.log('\n📁 Optional Photos:');
      for (const side of optional) {
        console.log(`   ⚪ ${side.name} (${side.uuid})`);
      }
    }
  } else if (sr.requirements) {
    console.log(`   Media Required: ${sr.requirements.total_required || 0}`);
    console.log(`   Media Optional: ${sr.requirements.total_optional || 0}`);
  } else {
    console.log('   No requirements found');
  }

  console.log('\n💡 Next step: Upload images with:');
  console.log(`   npx ts-node tests/run-step.ts upload --sr=${srUuid}`);

  return result;
}

async function runUpload(client: PartnerClient, options: Record<string, string>) {
  console.log('\n⬆️  Step 4: Upload Test Images\n');

  const srUuid = options.sr;

  if (!srUuid) {
    console.error('❌ Missing --sr=<uuid>');
    process.exit(1);
  }

  const result = await client.sr.getWithRequirements(srUuid);
  const sr = result.sr as SRWithSidesData;
  const requiredSides = sr.sides?.required || [];

  if (requiredSides.length === 0) {
    console.log('❌ No required sides found for this SR');
    process.exit(1);
  }

  console.log(`Found ${requiredSides.length} required sides to upload\n`);

  const testImage = generateTestImage();

  for (const side of requiredSides) {
    console.log(`   Uploading: ${side.name}...`);

    try {
      await client.images.uploadForSide(srUuid, side.uuid, testImage);
      console.log(`   ✅ Uploaded: ${side.name}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${side.name} - ${error}`);
    }
  }

  console.log('\n💡 Next step: Check progress with:');
  console.log(`   npx ts-node tests/run-step.ts progress --sr=${srUuid}`);
}

async function runProgress(client: PartnerClient, options: Record<string, string>) {
  console.log('\n📊 Step 5: Check Progress\n');

  const srUuid = options.sr;

  if (!srUuid) {
    console.error('❌ Missing --sr=<uuid>');
    process.exit(1);
  }

  const progress = await client.sr.getProgress(srUuid);

  console.log(`Progress for SR: ${srUuid}\n`);
  console.log(`   Required:    ${progress.current_required}/${progress.total_required}`);
  console.log(`   Optional:    ${progress.current_optional}/${progress.total_optional}`);
  console.log(`   Met:         ${progress.met ? '✅ Yes' : '❌ No'}`);

  if (progress.met) {
    console.log('\n💡 Requirements met! Next step: Submit with:');
    console.log(`   npx ts-node tests/run-step.ts submit --sr=${srUuid}`);
  } else {
    console.log('\n💡 Upload more images with:');
    console.log(`   npx ts-node tests/run-step.ts upload --sr=${srUuid}`);
  }

  return progress;
}

async function runSubmit(client: PartnerClient, options: Record<string, string>) {
  console.log('\n🚀 Step 6: Submit for Authentication\n');

  const srUuid = options.sr;

  if (!srUuid) {
    console.error('❌ Missing --sr=<uuid>');
    process.exit(1);
  }

  const progress = await client.sr.getProgress(srUuid);

  if (!progress.met) {
    console.log('❌ Cannot submit: requirements not met\n');
    console.log(`   Required:  ${progress.current_required}/${progress.total_required}`);
    console.log(`   Optional:  ${progress.current_optional}/${progress.total_optional}`);
    console.log('\n💡 Upload more images first:');
    console.log(`   npx ts-node tests/run-step.ts upload --sr=${srUuid}`);
    process.exit(1);
  }

  const result = await client.sr.submit(srUuid);

  console.log('✅ Service Request Submitted\n');
  console.log(`   UUID:     ${result.sr.uuid}`);
  console.log(`   Micro ID: ${result.sr.micro_id}`);
  console.log(`   State:    ${result.sr.state.primary} / ${result.sr.state.supplement}`);

  return result;
}

// ============================================================================
// Main
// ============================================================================

function printUsage() {
  console.log(`
Partner API Step Tester

Usage:
  npx ts-node tests/run-step.ts <step> [options]

Steps:
  1, taxonomy      Get taxonomy tree
  2, create        Create service request
  3, requirements  Get requirements for an SR
  4, upload        Upload test images
  5, progress      Check upload progress
  6, submit        Submit for authentication

Options:
  --sr=<uuid>       Service request UUID (for steps 3-6)
  --service=<uuid>  Service UUID (for step 2)
  --category=<uuid> Category UUID (for step 2)
  --type=<uuid>     Type UUID (for step 2)
  --brand=<uuid>    Brand UUID (for step 2)

Examples:
  npx ts-node tests/run-step.ts taxonomy
  npx ts-node tests/run-step.ts create --service=xxx --category=xxx --type=xxx
  npx ts-node tests/run-step.ts requirements --sr=xxx
  npx ts-node tests/run-step.ts upload --sr=xxx
  npx ts-node tests/run-step.ts progress --sr=xxx
`);
}

async function main() {
  const { step, options } = parseArgs();
  const normalizedStep = STEP_ALIASES[step] || step;

  if (!normalizedStep) {
    printUsage();
    process.exit(0);
  }

  const client = bootstrap();

  try {
    switch (normalizedStep) {
      case 'taxonomy':
        await runTaxonomy(client);
        break;
      case 'create':
        await runCreate(client, options);
        break;
      case 'requirements':
        await runRequirements(client, options);
        break;
      case 'upload':
        await runUpload(client, options);
        break;
      case 'progress':
        await runProgress(client, options);
        break;
      case 'submit':
        await runSubmit(client, options);
        break;
      default:
        console.error(`Unknown step: ${step}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    process.exit(1);
  }

  console.log('\n');
}

main();
