/**
 * Resource Classes
 * 
 * Sub-clients for organized API access.
 */

export { 
  Taxonomy, 
  type ResourceClient,
  type ListCategoriesResponse,
  type ListCategoriesOptions,
  type ListBrandsResponse,
  type ListBrandsOptions,
  type GetBrandsForTypeResponse,
} from './taxonomy';
export { ServiceRequests, type WaitOptions } from './sr';
export { Images, type ImageResourceClient, type UploadOptions } from './images';
