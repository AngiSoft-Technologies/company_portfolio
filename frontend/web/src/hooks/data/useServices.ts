import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface Service {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  order?: number;
  active: boolean;
}

export const fetchServices = (): Promise<Service[]> =>
  safeGet<ApiResponse<Service[]>>('/services').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export const fetchServiceBySlug = async (slug: string): Promise<Service | null> => {
  const r = await safeGet<ApiResponse<Service>>(`/services/${slug}`);
  return r.ok && r.data?.data ? r.data.data : null;
};

export default fetchServices;