import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Taxonomy, type ResourceClient } from '../src/resources/taxonomy';
import { createMockClient } from './utils';
import { FIXTURE_CATEGORY, FIXTURE_BRAND, FIXTURE_BRAND_AIR_JORDAN } from './fixtures';

const mockClient = createMockClient() as unknown as ResourceClient;

describe('Taxonomy', () => {
  let taxonomy: Taxonomy;

  beforeEach(() => {
    vi.clearAllMocks();
    taxonomy = new Taxonomy(mockClient);
  });

  describe('getTree', () => {
    it('returns categories with nested types', async () => {
      vi.mocked(mockClient._get).mockResolvedValueOnce({
        success: true,
        data: [FIXTURE_CATEGORY],
        metadata: { total_categories: 1, total_types: FIXTURE_CATEGORY.types!.length },
      });

      const result = await taxonomy.getTree();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe(FIXTURE_CATEGORY.name);
      expect(result.data[0].types).toHaveLength(FIXTURE_CATEGORY.types!.length);
      expect(mockClient._get).toHaveBeenCalledWith(
        '/api/v2/categories/tree',
        expect.objectContaining({ active_only: 'true' })
      );
    });

    it('respects activeOnly option', async () => {
      vi.mocked(mockClient._get).mockResolvedValueOnce({ success: true, data: [] });

      await taxonomy.getTree({ activeOnly: false });

      expect(mockClient._get).toHaveBeenCalledWith('/api/v2/categories/tree', {});
    });

    it('throws on API error', async () => {
      vi.mocked(mockClient._get).mockRejectedValueOnce(new Error('Network error'));

      await expect(taxonomy.getTree()).rejects.toThrow('Network error');
    });
  });

  describe('getCategories', () => {
    it('returns paginated categories', async () => {
      vi.mocked(mockClient._get).mockResolvedValueOnce({
        success: true,
        data: [
          { uuid: 'cat-1', name: 'Footwear', active: true, ordinal: 1 },
          { uuid: 'cat-2', name: 'Apparel', active: true, ordinal: 2 },
        ],
        metadata: { total_count: 2, page_number: 1, total_pages: 1, page_size: 20 },
      });

      const result = await taxonomy.getCategories();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Footwear');
      expect(result.data[1].name).toBe('Apparel');
    });

    it('passes pagination params', async () => {
      vi.mocked(mockClient._get).mockResolvedValueOnce({ success: true, data: [] });

      await taxonomy.getCategories({ page: 2, pageSize: 5 });

      expect(mockClient._get).toHaveBeenCalledWith(
        '/api/v2/categories',
        expect.objectContaining({ page_number: '2', page_size: '5' })
      );
    });

    it('throws on API error', async () => {
      vi.mocked(mockClient._get).mockRejectedValueOnce(new Error('Server error'));

      await expect(taxonomy.getCategories()).rejects.toThrow('Server error');
    });
  });

  describe('getBrands', () => {
    it('returns brands', async () => {
      vi.mocked(mockClient._get).mockResolvedValueOnce({
        success: true,
        data: [FIXTURE_BRAND, FIXTURE_BRAND_AIR_JORDAN],
        metadata: { total_count: 2 },
      });

      const result = await taxonomy.getBrands();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe(FIXTURE_BRAND.name);
    });

    it('passes search filter', async () => {
      vi.mocked(mockClient._get).mockResolvedValueOnce({ success: true, data: [] });

      await taxonomy.getBrands({ search: FIXTURE_BRAND.name });

      expect(mockClient._get).toHaveBeenCalledWith(
        '/api/v2/brands',
        expect.objectContaining({ search: FIXTURE_BRAND.name })
      );
    });
  });

  describe('getBrandsForType', () => {
    it('returns brands for type', async () => {
      vi.mocked(mockClient._get).mockResolvedValueOnce({
        success: true,
        data: [FIXTURE_BRAND, FIXTURE_BRAND_AIR_JORDAN],
      });

      const typeUuid = FIXTURE_CATEGORY.types![0].uuid;
      const result = await taxonomy.getBrandsForType(typeUuid);

      expect(result.data).toHaveLength(2);
      expect(mockClient._get).toHaveBeenCalledWith(`/api/v2/types/${typeUuid}/brands`);
    });
  });
});
