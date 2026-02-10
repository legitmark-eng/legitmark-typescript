export { type ResourceClient } from './client';

export { 
  Taxonomy, 
  type ListCategoriesResponse,
  type ListCategoriesOptions,
  type ListBrandsResponse,
  type ListBrandsOptions,
  type GetBrandsForTypeResponse,
} from './taxonomy';
export { ServiceRequests, type WaitOptions } from './sr';
export { Images, type ImageResourceClient, type UploadOptions } from './images';
