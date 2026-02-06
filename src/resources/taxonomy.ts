/**
 * Taxonomy Resource
 * 
 * Access product categories, types, brands, and models.
 * 
 * @example
 * ```typescript
 * const { categories } = await client.taxonomy.getTree();
 * const brands = await client.taxonomy.getBrandsForType(typeUuid);
 * ```
 */

import type { 
  CatalogTreeResponse, 
  GetTreeOptions,
  Category,
  Brand,
} from '../types';

/** Internal client interface for resource classes */
export interface ResourceClient {
  _get<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
  _post<T>(endpoint: string, data?: unknown): Promise<T>;
}

/** Response from listing categories */
export interface ListCategoriesResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data: readonly Category[];
  readonly metadata?: {
    readonly total_count: number;
    readonly page_number: number;
    readonly total_pages: number;
    readonly page_size: number;
  };
}

/** Options for listing categories */
export interface ListCategoriesOptions {
  /** Only return active categories (default: true) */
  readonly activeOnly?: boolean;
  /** Page number for pagination */
  readonly page?: number;
  /** Items per page (max: 100) */
  readonly pageSize?: number;
}

/** Response from listing brands */
export interface ListBrandsResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data: readonly Brand[];
  readonly metadata?: {
    readonly total_count: number;
    readonly page_number: number;
    readonly total_pages: number;
    readonly page_size: number;
  };
}

/** Options for listing brands */
export interface ListBrandsOptions {
  /** Search query to filter brands by name */
  readonly search?: string;
  /** Page number for pagination */
  readonly page?: number;
  /** Items per page (max: 100) */
  readonly pageSize?: number;
}

/** Response from getting brands for a type */
export interface GetBrandsForTypeResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data: readonly Brand[];
}

/**
 * Taxonomy resource for accessing the product catalog.
 */
export class Taxonomy {
  constructor(private readonly client: ResourceClient) {}

  /**
   * Get the full taxonomy tree (categories → types).
   * 
   * Use this to get the complete catalog structure for building
   * category/type selection UIs.
   * 
   * @param options - Filter options
   * @returns Taxonomy tree with nested categories and types
   * 
   * @example
   * ```typescript
   * // Get all active categories with their types
   * const { data: categories } = await client.taxonomy.getTree();
   * 
   * for (const category of categories) {
   *   console.log(`${category.name}: ${category.types?.length} types`);
   * }
   * ```
   */
  async getTree(options: GetTreeOptions = {}): Promise<CatalogTreeResponse> {
    const params: Record<string, string> = {};
    
    if (options.activeOnly !== false) {
      params.active_only = 'true';
    }

    return this.client._get<CatalogTreeResponse>('/api/v2/categories/tree', params);
  }

  /**
   * List all categories.
   * 
   * @param options - Filter and pagination options
   * @returns Paginated list of categories
   * 
   * @example
   * ```typescript
   * const { data: categories } = await client.taxonomy.getCategories();
   * 
   * const footwear = categories.find(c => c.name === 'Footwear');
   * console.log(`Footwear UUID: ${footwear?.uuid}`);
   * ```
   */
  async getCategories(options: ListCategoriesOptions = {}): Promise<ListCategoriesResponse> {
    const params: Record<string, string> = {};
    
    if (options.activeOnly !== false) {
      params.active_only = 'true';
    }
    if (options.page) {
      params.page_number = String(options.page);
    }
    if (options.pageSize) {
      params.page_size = String(options.pageSize);
    }

    return this.client._get<ListCategoriesResponse>('/api/v2/categories', params);
  }

  /**
   * List all brands.
   * 
   * @param options - Filter and pagination options
   * @returns Paginated list of brands
   * 
   * @example
   * ```typescript
   * // Get all brands
   * const { data: brands } = await client.taxonomy.getBrands();
   * 
   * // Search for a specific brand
   * const { data: nikeResults } = await client.taxonomy.getBrands({ search: 'Nike' });
   * const nike = nikeResults[0];
   * console.log(`Nike UUID: ${nike?.uuid}`);
   * ```
   */
  async getBrands(options: ListBrandsOptions = {}): Promise<ListBrandsResponse> {
    const params: Record<string, string> = {};
    
    if (options.search) {
      params.search = options.search;
    }
    if (options.page) {
      params.page_number = String(options.page);
    }
    if (options.pageSize) {
      params.page_size = String(options.pageSize);
    }

    return this.client._get<ListBrandsResponse>('/api/v2/brands', params);
  }

  /**
   * Get brands available for a specific type.
   * 
   * Use this after selecting a category and type to get the list
   * of brands that can be authenticated for that type.
   * 
   * @param typeUuid - The type UUID to get brands for
   * @returns List of brands for the type
   * 
   * @example
   * ```typescript
   * // After user selects a type (e.g., Sneakers)
   * const { data: brands } = await client.taxonomy.getBrandsForType(sneakersTypeUuid);
   * 
   * // Display brands for user selection
   * for (const brand of brands) {
   *   console.log(`${brand.name} (${brand.uuid})`);
   * }
   * ```
   */
  async getBrandsForType(typeUuid: string): Promise<GetBrandsForTypeResponse> {
    return this.client._get<GetBrandsForTypeResponse>(`/api/v2/types/${typeUuid}/brands`);
  }
}
