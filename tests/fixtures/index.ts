import type {
  Category,
  Brand,
  ServiceRequest,
  ProgressData,
  ErrorResponse,
  CreateSRResponse,
  GetSRResponse,
  CatalogTreeResponse,
  UploadIntentResponse,
  SubmitSRResponse,
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

export const FIXTURE_SERVICE_UUID = 'f79d24dc-49c6-4904-9428-3850dc5528db';
export const FIXTURE_USER_UUID = '26e909ca-80fc-4606-9bc1-530a9ddde5c3';

export const FIXTURE_SR: ServiceRequest = {
  uuid: '1ed24ae2-45d8-47ff-bd07-4efc69cb6bc7',
  micro_id: '138912',
  active: true,
  tab: 'DRAFT',
  state: {
    primary: 'DRAFT',
    supplement: null,
  },
  item: {
    category: {
      uuid: '25ed7133-f230-4d64-850d-0cfc698e2931',
      name: 'Footwear',
      media: 'https://media.legitmark.com/static/categories/main/main-footwear.png',
    },
    type: {
      uuid: '95e428c2-7c4f-11ef-a623-02595575faeb',
      name: 'Sneakers',
      media: 'https://media.legitmark.com/static/categories/footwear/footwear-sneakers.png',
    },
    brand: {
      uuid: '95b54167-a23f-4ca0-81c0-8cf90a3619e2',
      name: 'Nike',
      media: 'https://media.legitmark.com/static/brands/nike.svg',
    },
  },
  created_at: '2026-02-06T04:48:00.000Z',
  updated_at: '2026-02-06T04:48:00.000Z',
};

// Real side data from Footwear category
export const FIXTURE_SIDES_REQUIRED = [
  {
    uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Interior Size Tag or Stamp',
    description: 'A photo of the interior size tag, stamp or identifier such as a date code or model number.',
    ordinal: 1,
    required: true,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/01-inner-size-tag.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: 'a3192e82-0d5c-48a4-8d9f-57004c5c07d3',
    name: 'Inner Sides',
    description: 'Stage both shoes to show the interior left and right sides, ensuring shape, construction and material are clear.',
    ordinal: 2,
    required: true,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/05-inner-sides.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: 'bf98166d-7119-47f0-a4c5-88d67a28e3e6',
    name: 'Outer Sides',
    description: 'Stage both shoes to show the exterior left and right sides, ensuring shape, construction and material are clear.',
    ordinal: 3,
    required: true,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/04-outer-sides.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: '33ce80ed-d22a-4ef6-b99c-09c06a3d2ee4',
    name: 'Front',
    description: 'A photo showing the front of the sneakers, ensuring the shape of the toe box and any logo details are legible.',
    ordinal: 4,
    required: true,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/09-front.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: '3d13e6fc-83f7-4952-81bb-e4d0cb16d2bd',
    name: 'Back',
    description: 'A photo of the pair showing the back heel, ensuring the shape and any branding is clear.',
    ordinal: 5,
    required: true,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/10-back.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: 'c646287e-7f5e-4483-afef-760baedb1e8e',
    name: 'Bottom',
    description: 'A photo of the pair from a bottom angle, ensuring the full shape and texture of the outer soles are shown.',
    ordinal: 7,
    required: true,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/07-bottom.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: 'e6ff8887-7742-4a99-8b72-9a5f55159a5a',
    name: 'Footbed Stitching',
    description: 'Take a photo of the interior footbed with the insoles removed, showing any stitching, pattern, text or branding.',
    ordinal: 10,
    required: true,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/17-footbed-stitching.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
];

export const FIXTURE_SIDES_OPTIONAL = [
  {
    uuid: '9ccdb7e1-36b9-42fb-8b15-95393df506bb',
    name: 'Insole Top',
    description: 'A photo of the interior logo, if applicable: remove the insole and provide a photo of the full insole top showing the shape and branding.',
    ordinal: 8,
    required: false,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/15-insole-top.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: '3e3625d0-dc94-4b4e-a743-c1a4744ac7d3',
    name: 'Insole Bottom',
    description: 'If applicable: remove the insole and provide a photo of the full insole bottom showing the shape and branding.',
    ordinal: 9,
    required: false,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/16-insole-bottom.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: '6b1f529e-cbd3-4d6d-9025-188fe67f03fc',
    name: 'Box Front',
    description: 'A photo of the front of the box',
    ordinal: 11,
    required: false,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/20-box-front.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: 'e35a64e1-2629-4c4a-8e9c-9e9840db725e',
    name: 'Box Back',
    description: 'A photo of the back of the box',
    ordinal: 12,
    required: false,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/21-box-back.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
  {
    uuid: '2e45ffea-60cb-49fc-9b54-907b998dc2ef',
    name: 'Box Label',
    description: 'A photo of the Box Label with all four corners visible',
    ordinal: 13,
    required: false,
    active: true,
    thumbnail_image: 'https://media.legitmark.com/static/sides/footwear/19-box-label.svg',
    side_group_name: 'Footwear Base',
    assignment_level: 'category',
    inherited_from: '25ed7133-f230-4d64-850d-0cfc698e2931',
  },
];

export const FIXTURE_SR_WITH_SIDES: ServiceRequest = {
  ...FIXTURE_SR,
  sides: {
    required: FIXTURE_SIDES_REQUIRED,
    optional: FIXTURE_SIDES_OPTIONAL,
    progress: {
      current_required: 0,
      total_required: 8,
      current_optional: 0,
      total_optional: 5,
      met: false,
    },
  },
};

export const FIXTURE_CREATE_SR_RESPONSE: CreateSRResponse = {
  success: true,
  message: 'The sr was successfully created.',
  sr: FIXTURE_SR,
};

export const FIXTURE_GET_SR_RESPONSE: GetSRResponse = {
  success: true,
  message: 'The sr was successfully fetched.',
  rc_hit: false,
  sr: FIXTURE_SR,
};

/** SDK fallback when no progress data is returned from API */
export const FIXTURE_PROGRESS_DEFAULT: ProgressData = {
  current_required: 0,
  total_required: 0,
  current_optional: 0,
  total_optional: 0,
  met: false,
};

/** No images uploaded yet, but requirements are known */
export const FIXTURE_PROGRESS_EMPTY: ProgressData = {
  current_required: 0,
  total_required: 8,
  current_optional: 0,
  total_optional: 5,
  met: false,
};

export const FIXTURE_PROGRESS_PARTIAL: ProgressData = {
  current_required: 4,
  total_required: 8,
  current_optional: 1,
  total_optional: 5,
  met: false,
};

export const FIXTURE_PROGRESS_MET: ProgressData = {
  current_required: 8,
  total_required: 8,
  current_optional: 2,
  total_optional: 5,
  met: true,
};

export const FIXTURE_UPLOAD_INTENT: UploadIntentResponse = {
  message: 'Upload intent created.',
  url: `https://legitmark-media.s3.amazonaws.com/uploads/${FIXTURE_SR.uuid}/${FIXTURE_SIDES_REQUIRED[0].uuid}.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600`,
};

export const FIXTURE_SUBMIT_RESPONSE: SubmitSRResponse = {
  success: true,
  message: 'Service request submitted for authentication.',
  sr: {
    uuid: FIXTURE_SR.uuid,
    micro_id: FIXTURE_SR.micro_id,
    state: {
      primary: 'QC',
      supplement: null,
    },
  },
};

export const FIXTURE_ERROR_VALIDATION: ErrorResponse = {
  success: false,
  error: {
    code: 400,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Validation failed',
    errors: [
      { code: 'validation/missing-field', message: 'item.category is required' },
      { code: 'validation/missing-field', message: 'item.type is required' },
    ],
  },
};

export const FIXTURE_ERROR_AUTH: ErrorResponse = {
  success: false,
  error: {
    code: 401,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Invalid or expired API key',
  },
};

export const FIXTURE_ERROR_NOT_FOUND: ErrorResponse = {
  success: false,
  error: {
    code: 404,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Service request not found',
  },
};

export const FIXTURE_ERROR_RATE_LIMIT: ErrorResponse = {
  success: false,
  error: {
    code: 429,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Rate limit exceeded. Retry after 60 seconds.',
  },
};

export const FIXTURE_ERROR_SERVER: ErrorResponse = {
  success: false,
  error: {
    code: 500,
    timestamp: '2026-02-06T04:48:00.000Z',
    message: 'Internal server error',
  },
};
