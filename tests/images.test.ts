import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Images, type ImageResourceClient } from '../src/resources/images';
import { createMockClient, generateTestImage } from './utils';
import { FIXTURE_SR, FIXTURE_SIDES_REQUIRED } from './fixtures';

const EMPTY_BUFFER = Buffer.from([]);
const TEST_SIDE = FIXTURE_SIDES_REQUIRED[0];

const mockClient = createMockClient() as unknown as ImageResourceClient;

describe('Images', () => {
  let images: Images;

  beforeEach(() => {
    vi.clearAllMocks();
    images = new Images(mockClient);
  });

  describe('getIntent', () => {
    it('fetches upload intent with default extension', async () => {
      const intentResponse = { url: 'https://storage.example.com/upload?token=abc' };
      vi.mocked(mockClient._getAsset).mockResolvedValue(intentResponse);

      const result = await images.getIntent(FIXTURE_SR.uuid, TEST_SIDE.uuid);

      expect(mockClient._getAsset).toHaveBeenCalledWith('/intent', {
        sr: FIXTURE_SR.uuid,
        side: `${TEST_SIDE.uuid}.jpg`,
      });
      expect(result).toEqual(intentResponse);
    });

    it('uses custom extension', async () => {
      vi.mocked(mockClient._getAsset).mockResolvedValue({ url: 'https://...' });

      await images.getIntent(FIXTURE_SR.uuid, TEST_SIDE.uuid, 'png');

      expect(mockClient._getAsset).toHaveBeenCalledWith('/intent', {
        sr: FIXTURE_SR.uuid,
        side: `${TEST_SIDE.uuid}.png`,
      });
    });

    it('handles intent error', async () => {
      vi.mocked(mockClient._getAsset).mockRejectedValue(new Error('Invalid SR'));

      await expect(images.getIntent('invalid-sr-uuid', TEST_SIDE.uuid)).rejects.toThrow('Invalid SR');
    });
  });

  describe('upload', () => {
    it('uploads with default content type', async () => {
      const imageBuffer = generateTestImage();
      vi.mocked(mockClient._uploadToUrl).mockResolvedValue(undefined);

      await images.upload('https://upload.url', imageBuffer);

      expect(mockClient._uploadToUrl).toHaveBeenCalledWith(
        'https://upload.url',
        imageBuffer,
        'image/jpeg'
      );
      expect(mockClient._log).toHaveBeenCalledWith(
        'debug',
        expect.stringContaining('bytes')
      );
    });

    it('uses custom content type', async () => {
      const imageBuffer = generateTestImage();
      vi.mocked(mockClient._uploadToUrl).mockResolvedValue(undefined);

      await images.upload('https://upload.url', imageBuffer, {
        contentType: 'image/png',
      });

      expect(mockClient._uploadToUrl).toHaveBeenCalledWith(
        'https://upload.url',
        imageBuffer,
        'image/png'
      );
    });

    it('handles upload error', async () => {
      vi.mocked(mockClient._uploadToUrl).mockRejectedValue(new Error('Upload failed'));

      await expect(
        images.upload('https://upload.url', EMPTY_BUFFER)
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadForSide', () => {
    it('combines getIntent and upload', async () => {
      const imageBuffer = generateTestImage();
      vi.mocked(mockClient._getAsset).mockResolvedValue({
        url: 'https://presigned.url',
      });
      vi.mocked(mockClient._uploadToUrl).mockResolvedValue(undefined);

      await images.uploadForSide(FIXTURE_SR.uuid, TEST_SIDE.uuid, imageBuffer);

      expect(mockClient._getAsset).toHaveBeenCalledWith('/intent', {
        sr: FIXTURE_SR.uuid,
        side: `${TEST_SIDE.uuid}.jpg`,
      });
      expect(mockClient._uploadToUrl).toHaveBeenCalledWith(
        'https://presigned.url',
        imageBuffer,
        'image/jpeg'
      );
      expect(mockClient._log).toHaveBeenCalledWith(
        'info',
        `Uploaded image for side ${TEST_SIDE.uuid}`
      );
    });

    it('passes content type option through', async () => {
      vi.mocked(mockClient._getAsset).mockResolvedValue({ url: 'https://url' });
      vi.mocked(mockClient._uploadToUrl).mockResolvedValue(undefined);

      await images.uploadForSide(FIXTURE_SR.uuid, TEST_SIDE.uuid, EMPTY_BUFFER, {
        contentType: 'image/webp',
      });

      expect(mockClient._uploadToUrl).toHaveBeenCalledWith(
        'https://url',
        expect.any(Buffer),
        'image/webp'
      );
    });

    it('propagates getIntent error', async () => {
      vi.mocked(mockClient._getAsset).mockRejectedValue(new Error('SR not found'));

      await expect(
        images.uploadForSide('invalid-sr-uuid', TEST_SIDE.uuid, EMPTY_BUFFER)
      ).rejects.toThrow('SR not found');
    });

    it('propagates upload error', async () => {
      vi.mocked(mockClient._getAsset).mockResolvedValue({ url: 'https://url' });
      vi.mocked(mockClient._uploadToUrl).mockRejectedValue(new Error('Storage error'));

      await expect(
        images.uploadForSide(FIXTURE_SR.uuid, TEST_SIDE.uuid, EMPTY_BUFFER)
      ).rejects.toThrow('Storage error');
    });
  });
});
