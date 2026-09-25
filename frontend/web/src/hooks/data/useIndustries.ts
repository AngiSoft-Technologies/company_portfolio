import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface Industry {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  order?: number;
  active: boolean;
}

export const fetchIndustries = (): Promise<Industry[]> =>
  safeGet<ApiResponse<Industry[]>>('/industries').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export const fetchIndustryBySlug = async (slug: string): Promise<Industry | null> => {
  const r = await safeGet<ApiResponse<Industry>>(`/industries/${slug}`);
  return r.ok && r.data?.data ? r.data.data : null;
};

export default fetchIndustries;