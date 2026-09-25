import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface Product {
  id: string;
  slug: string;
  name: string;
  title?: string | null;
  description?: string | null;
  features?: (string | Record<string, unknown>)[] | null;
  icon?: string | null;
  image?: string | null;
  pricing?: string | null;
  active?: boolean;
}

export const fetchProducts = (): Promise<Product[]> =>
  safeGet<ApiResponse<Product[]>>('/products').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export const fetchProductBySlug = async (slug: string): Promise<Product | null> => {
  const r = await safeGet<ApiResponse<Product>>(`/products/${slug}`);
  return r.ok && r.data?.data ? r.data.data : null;
};

export default fetchProducts;