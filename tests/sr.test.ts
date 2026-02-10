import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ServiceRequests } from '../src/resources/sr';
import type { ResourceClient } from '../src/resources/client';
import { createMockClient } from './utils';
import {
  FIXTURE_SR,
  FIXTURE_CATEGORY,
  FIXTURE_BRAND,
  FIXTURE_SERVICE_UUID,
  FIXTURE_PROGRESS_DEFAULT,
  FIXTURE_PROGRESS_EMPTY,
  FIXTURE_PROGRESS_PARTIAL,
  FIXTURE_PROGRESS_MET,
} from './fixtures';

const mockClient = createMockClient() as unknown as ResourceClient;

describe('ServiceRequests', () => {
  let sr: ServiceRequests;

  beforeEach(() => {
    vi.clearAllMocks();
    sr = new ServiceRequests(mockClient);
  });

  describe('create', () => {
    it('sends create request with all fields', async () => {
      const request = {
        service: FIXTURE_SERVICE_UUID,
        external_id: 'ext-123',
        source: 'test',
        item: {
          category: FIXTURE_CATEGORY.uuid,
          type: FIXTURE_CATEGORY.types![0].uuid,
          brand: FIXTURE_BRAND.uuid,
        },
      };
      const mockResponse = { success: true, sr: { uuid: FIXTURE_SR.uuid } };
      vi.mocked(mockClient._post).mockResolvedValue(mockResponse);

      const result = await sr.create(request);

      expect(mockClient._post).toHaveBeenCalledWith('/api/v2/sr', request);
      expect(result).toEqual(mockResponse);
    });

    it('handles creation error', async () => {
      vi.mocked(mockClient._post).mockRejectedValue(new Error('Invalid item'));

      await expect(sr.create({
        service: FIXTURE_SERVICE_UUID,
        item: {
          category: FIXTURE_CATEGORY.uuid,
          type: FIXTURE_CATEGORY.types![0].uuid,
          brand: FIXTURE_BRAND.uuid,
        },
      })).rejects.toThrow('Invalid item');
    });
  });

  describe('get', () => {
    it('fetches SR without options', async () => {
      const mockResponse = { success: true, sr: { uuid: FIXTURE_SR.uuid } };
      vi.mocked(mockClient._get).mockResolvedValue(mockResponse);

      const result = await sr.get(FIXTURE_SR.uuid);

      expect(mockClient._get).toHaveBeenCalledWith(`/api/v2/sr/${FIXTURE_SR.uuid}`, {});
      expect(result).toEqual(mockResponse);
    });

    it('passes include options as query params', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({ success: true });

      await sr.get(FIXTURE_SR.uuid, { requirements: true, sides: true, item: true });

      expect(mockClient._get).toHaveBeenCalledWith(`/api/v2/sr/${FIXTURE_SR.uuid}`, {
        requirements: 'true',
        sides: 'true',
        item: 'true',
      });
    });

    it('ignores false options', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({ success: true });

      await sr.get(FIXTURE_SR.uuid, { requirements: true, sides: false });

      expect(mockClient._get).toHaveBeenCalledWith(`/api/v2/sr/${FIXTURE_SR.uuid}`, {
        requirements: 'true',
      });
    });
  });

  describe('getWithRequirements', () => {
    it('calls get with requirements options', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({ success: true });

      await sr.getWithRequirements(FIXTURE_SR.uuid);

      expect(mockClient._get).toHaveBeenCalledWith(`/api/v2/sr/${FIXTURE_SR.uuid}`, {
        requirements: 'true',
        sides: 'true',
        item: 'true',
      });
    });
  });

  describe('getWithSides', () => {
    it('calls get with item and sides params', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({ success: true });

      await sr.getWithSides(FIXTURE_SR.uuid);

      expect(mockClient._get).toHaveBeenCalledWith(`/api/v2/sr/${FIXTURE_SR.uuid}`, {
        item: 'true',
        sides: 'true',
      });
    });
  });

  describe('getProgress', () => {
    it('extracts progress from SR response', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({
        success: true,
        sr: { sides: { progress: FIXTURE_PROGRESS_PARTIAL } },
      });

      const result = await sr.getProgress(FIXTURE_SR.uuid);

      expect(result).toEqual(FIXTURE_PROGRESS_PARTIAL);
    });

    it('returns default progress when not available', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({
        success: true,
        sr: { sides: {} },
      });

      const result = await sr.getProgress(FIXTURE_SR.uuid);

      expect(result).toEqual(FIXTURE_PROGRESS_DEFAULT);
    });
  });

  describe('waitForRequirements', () => {
    it('returns immediately when requirements met', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({
        sr: { sides: { progress: FIXTURE_PROGRESS_MET } },
      });

      const result = await sr.waitForRequirements(FIXTURE_SR.uuid);

      expect(result.met).toBe(true);
      expect(mockClient._get).toHaveBeenCalledTimes(1);
    });

    it('polls until requirements met', async () => {
      vi.mocked(mockClient._get)
        .mockResolvedValueOnce({ sr: { sides: { progress: FIXTURE_PROGRESS_EMPTY } } })
        .mockResolvedValueOnce({ sr: { sides: { progress: FIXTURE_PROGRESS_PARTIAL } } })
        .mockResolvedValueOnce({ sr: { sides: { progress: FIXTURE_PROGRESS_MET } } });

      const onPoll = vi.fn();
      const result = await sr.waitForRequirements(FIXTURE_SR.uuid, {
        pollInterval: 10,
        onPoll,
      });

      expect(result.met).toBe(true);
      expect(onPoll).toHaveBeenCalledTimes(3);
      expect(mockClient._get).toHaveBeenCalledTimes(3);
    });

    it('throws on timeout', async () => {
      vi.mocked(mockClient._get).mockResolvedValue({
        sr: { sides: { progress: FIXTURE_PROGRESS_EMPTY } },
      });

      await expect(sr.waitForRequirements(FIXTURE_SR.uuid, {
        pollInterval: 10,
        maxWait: 50,
      })).rejects.toThrow('Timeout waiting for requirements');
    });
  });

  describe('submit', () => {
    it('posts to submit endpoint', async () => {
      const mockResponse = { success: true, sr: { state: 'submitted' } };
      vi.mocked(mockClient._post).mockResolvedValue(mockResponse);

      const result = await sr.submit(FIXTURE_SR.uuid);

      expect(mockClient._post).toHaveBeenCalledWith(`/api/v2/sr/${FIXTURE_SR.uuid}/submit`);
      expect(result).toEqual(mockResponse);
    });

    it('handles submit error', async () => {
      vi.mocked(mockClient._post).mockRejectedValue(new Error('Requirements not met'));

      await expect(sr.submit(FIXTURE_SR.uuid)).rejects.toThrow('Requirements not met');
    });
  });
});
