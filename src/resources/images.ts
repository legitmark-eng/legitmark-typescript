/**
 * Images Resource
 * 
 * Upload images for service request sides.
 * 
 * @example
 * ```typescript
 * await client.images.uploadForSide(srUuid, sideUuid, imageBuffer);
 * ```
 */

import type { UploadIntentResponse } from '../types';
import type { ResourceClient } from './taxonomy';
import { IMAGE_CONTENT_TYPES, type ImageContentType } from '../client';

/** Default file extension for image uploads */
const DEFAULT_EXTENSION = 'jpg';

/** Extended client interface with asset upload capability */
export interface ImageResourceClient extends ResourceClient {
  _getAsset<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
  _uploadToUrl(url: string, data: Buffer, contentType: string): Promise<void>;
  _log(level: 'info' | 'debug', message: string, meta?: unknown): void;
}

/** Options for image upload */
export interface UploadOptions {
  /** Image content type (default: image/jpeg) */
  contentType?: ImageContentType;
}

/**
 * Images resource for uploading photos.
 */
export class Images {
  constructor(private readonly client: ImageResourceClient) {}

  /**
   * Get a signed upload URL for a side.
   * 
   * @param srUuid - Service Request UUID
   * @param sideUuid - Side UUID
   * @param extension - File extension (default: jpg)
   * @returns Signed upload URL
   */
  async getIntent(
    srUuid: string,
    sideUuid: string,
    extension: string = DEFAULT_EXTENSION
  ): Promise<UploadIntentResponse> {
    return this.client._getAsset<UploadIntentResponse>(
      '/intent',
      { sr: srUuid, side: `${sideUuid}.${extension}` }
    );
  }

  /**
   * Upload an image to a signed URL.
   * 
   * @param url - Signed upload URL from getIntent
   * @param image - Image data as Buffer
   * @param options - Upload options
   */
  async upload(
    url: string,
    image: Buffer,
    options: UploadOptions = {}
  ): Promise<void> {
    const contentType = options.contentType ?? IMAGE_CONTENT_TYPES.JPEG;
    await this.client._uploadToUrl(url, image, contentType);
    this.client._log('debug', `Uploaded image (${image.length} bytes)`);
  }

  /**
   * Upload an image for a specific side (combines getIntent + upload).
   * 
   * @param srUuid - Service Request UUID
   * @param sideUuid - Side UUID
   * @param image - Image data as Buffer or file path
   * @param options - Upload options
   * 
   * @example
   * ```typescript
   * // From buffer
   * await client.images.uploadForSide(srUuid, sideUuid, imageBuffer);
   * 
   * // From file path
   * await client.images.uploadForSide(srUuid, sideUuid, './photo.jpg');
   * ```
   */
  async uploadForSide(
    srUuid: string,
    sideUuid: string,
    image: Buffer | string,
    options: UploadOptions = {}
  ): Promise<void> {
    let imageBuffer: Buffer;
    if (typeof image === 'string') {
      // Dynamic import avoids bundling fs for browser builds
      const fs = await import('fs');
      imageBuffer = fs.readFileSync(image);
    } else {
      imageBuffer = image;
    }

    const intent = await this.getIntent(srUuid, sideUuid);
    await this.upload(intent.url, imageBuffer, options);
    
    this.client._log('info', `Uploaded image for side ${sideUuid}`);
  }
}
