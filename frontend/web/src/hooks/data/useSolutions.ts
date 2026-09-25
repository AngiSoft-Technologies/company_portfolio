import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface Solution {
  id: string;
  slug?: string | null;
  name: string;
  title?: string | null;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  order?: number;
  active?: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer?: string | null;
  active?: boolean;
}

export const fetchSolutions = (): Promise<Solution[]> =>
  safeGet<ApiResponse<Solution[]>>('/solutions').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export const fetchFaqs = (): Promise<FaqItem[]> =>
  safeGet<ApiResponse<FaqItem[]>>('/faq').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export default fetchSolutions;