/**
 * Taxonomy Resource
 * 
 * Access product categories, types, brands, and models.
 * 
 * @example
 * ```typescript
 * const { categories } = await client.taxonomy.getTree();
 * ```
 */

import type { CatalogTreeResponse, GetTreeOptions } from '../types';

/** Internal client interface for resource classes */
export interface ResourceClient {
  _get<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
  _post<T>(endpoint: string, data?: unknown): Promise<T>;
}

/**
 * Taxonomy resource for accessing the product catalog.
 */
export class Taxonomy {
  constructor(private readonly client: ResourceClient) {}

  /**
   * Get the full taxonomy tree (categories → types → brands → models).
   * 
   * @param options - Filter options
   * @returns Taxonomy tree with nested categories
   * 
   * @example
   * ```typescript
   * // Get all active categories
   * const { categories } = await client.taxonomy.getTree();
   * 
   * // Include inactive categories
   * const { categories } = await client.taxonomy.getTree({ activeOnly: false });
   * ```
   */
  async getTree(options: GetTreeOptions = {}): Promise<CatalogTreeResponse> {
    const params: Record<string, string> = {};
    
    if (options.activeOnly !== false) {
      params.active_only = 'true';
    }

    return this.client._get<CatalogTreeResponse>('/api/v2/categories/tree', params);
  }
}
