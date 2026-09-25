import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface Testimonial {
  id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  quote?: string | null;
  rating?: number;
  avatar?: string | null;
  featured?: boolean;
  approved?: boolean;
}

export const fetchTestimonials = (featuredOnly = false): Promise<Testimonial[]> => {
  const endpoint = featuredOnly ? '/testimonials/featured' : '/testimonials';
  return safeGet<ApiResponse<Testimonial[]>>(endpoint).then((r) => (r.ok && r.data?.data ? r.data.data : []));
};

export default fetchTestimonials;