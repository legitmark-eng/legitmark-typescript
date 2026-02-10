import type {
  Category,
  Brand,
  CatalogTreeResponse,
} from '../../src/types';

export const FIXTURE_CATEGORY: Category = {
  uuid: '25ed7133-f230-4d64-850d-0cfc698e2931',
  name: 'Footwear',
  active: true,
  ordinal: 1,
  media: 'https://media.legitmark.com/static/categories/main/main-footwear.png',
  types: [
    {
      uuid: '95e428c2-7c4f-11ef-a623-02595575faeb',
      name: 'Sneakers',
      active: true,
      ordinal: 1,
      media: 'https://media.legitmark.com/static/categories/footwear/footwear-sneakers.png',
    },
    {
      uuid: '95e42aec-7c4f-11ef-a623-02595575faeb',
      name: 'Boots',
      active: true,
      ordinal: 2,
      media: 'https://media.legitmark.com/static/categories/footwear/footwear-boots.png',
    },
  ],
};

export const FIXTURE_BRAND: Brand = {
  uuid: '95b54167-a23f-4ca0-81c0-8cf90a3619e2',
  name: 'Nike',
  active: true,
  media: 'https://media.legitmark.com/static/brands/nike.svg',
};

export const FIXTURE_BRAND_AIR_JORDAN: Brand = {
  uuid: '03e7eb07-5e1e-465d-92a6-228dcaa6b148',
  name: 'Air Jordan',
  active: true,
  media: 'https://media.legitmark.com/static/brands/air_jordan.svg',
};

export const FIXTURE_CATALOG_TREE: CatalogTreeResponse = {
  success: true,
  message: 'Catalog tree fetched successfully',
  category: 'SUCCESS',
  data: [FIXTURE_CATEGORY],
  metadata: {
    total_categories: 1,
    total_types: 2,
  },
};
