import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface Career {
  id: string;
  slug?: string | null;
  title: string;
  department?: string | null;
  location?: string | null;
  type?: string | null;
  description?: string | null;
  active?: boolean;
}

export interface CompanyStat {
  id: string;
  label: string;
  value: string;
  suffix?: string | null;
  icon?: string | null;
}

export const fetchCareers = (): Promise<Career[]> =>
  safeGet<ApiResponse<Career[]>>('/careers').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export const fetchCompanyStats = (): Promise<CompanyStat[]> =>
  safeGet<ApiResponse<CompanyStat[]>>('/company-stats').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export default fetchCareers;