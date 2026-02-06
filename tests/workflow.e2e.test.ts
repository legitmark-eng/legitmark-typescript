/**
 * E2E Workflow Test
 *
 * Runs the complete authentication workflow against the real API.
 * Requires environment variables: LEGITMARK_API_KEY, TEST_SERVICE_UUID,
 * TEST_CATEGORY_UUID, TEST_TYPE_UUID, TEST_BRAND_UUID
 *
 * Usage: npm run test:e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PartnerClient } from '../src/client';
import type { ServiceRequest, SideWithMedia } from '../src/types';
import { generateTestImage, getTestConfig, TEST_SOURCE } from './utils';

interface WorkflowState {
  srUuid: string;
  sr: ServiceRequest;
  requiredSides: SideWithMedia[];
  uploadedSideUuids: string[];
}

interface ValidatedConfig {
  apiKey: string;
  service: string;
  category: string;
  type: string;
  brand: string;
}

function getValidatedConfig(): ValidatedConfig {
  const apiKey = process.env.LEGITMARK_API_KEY;
  const testConfig = getTestConfig();

  if (!apiKey) throw new Error('LEGITMARK_API_KEY is required');
  if (!testConfig.service) throw new Error('TEST_SERVICE_UUID is required');
  if (!testConfig.category) throw new Error('TEST_CATEGORY_UUID is required');
  if (!testConfig.type) throw new Error('TEST_TYPE_UUID is required');
  if (!testConfig.brand) throw new Error('TEST_BRAND_UUID is required');

  return {
    apiKey,
    service: testConfig.service,
    category: testConfig.category,
    type: testConfig.type,
    brand: testConfig.brand,
  };
}

describe('E2E: Complete Authentication Workflow', () => {
  let client: PartnerClient;
  let config: ValidatedConfig;
  let state: WorkflowState;

  beforeAll(() => {
    config = getValidatedConfig();
    client = new PartnerClient({ apiKey: config.apiKey });
  });

  it('Step 1: Get Taxonomy', async () => {
    const tree = await client.taxonomy.getTree({ activeOnly: true });

    expect(tree.data).toBeDefined();
    expect(Array.isArray(tree.data)).toBe(true);
    expect(tree.data.length).toBeGreaterThan(0);
  });

  it('Step 2: Create Service Request', async () => {
    const response = await client.sr.create({
      service: config.service,
      external_id: `${TEST_SOURCE}-${Date.now()}`,
      source: TEST_SOURCE,
      item: {
        category: config.category,
        type: config.type,
        brand: config.brand,
      },
    });

    expect(response.success).toBe(true);
    expect(response.sr).toBeDefined();

    state = {
      srUuid: response.sr!.uuid,
      sr: response.sr!,
      requiredSides: [],
      uploadedSideUuids: [],
    };
  });

  it('Step 3: Get Requirements', async () => {
    const response = await client.sr.get(state.srUuid, {
      requirements: true,
      sides: true,
      item: true,
    });

    expect(response.success).toBe(true);
    expect(response.sr?.sides).toBeDefined();

    state.sr = response.sr!;
    state.requiredSides = (response.sr!.sides?.required ?? []) as SideWithMedia[];
  });

  it('Step 4: Upload Images', async () => {
    expect(state.requiredSides.length).toBeGreaterThan(0);

    for (const side of state.requiredSides) {
      await client.images.uploadForSide(
        state.srUuid,
        side.uuid,
        generateTestImage(),
        { contentType: 'image/jpeg' }
      );
      state.uploadedSideUuids.push(side.uuid);
    }

    expect(state.uploadedSideUuids.length).toBeGreaterThan(0);
  });

  it('Step 5: Check Progress', async () => {
    const response = await client.sr.get(state.srUuid, {
      sides: true,
      item: true,
    });

    expect(response.success).toBe(true);

    const requiredSides = (response.sr?.sides?.required ?? []) as SideWithMedia[];
    const uploadedCount = requiredSides.filter((s) => s.media_url).length;

    expect(uploadedCount).toBe(requiredSides.length);
  });

  it('Step 6: Submit', async () => {
    const result = await client.sr.submit(state.srUuid);

    expect(result.success).toBe(true);
    expect(result.sr?.state).toBeDefined();
  });
});
