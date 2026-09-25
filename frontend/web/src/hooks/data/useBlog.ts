import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  coverImage?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  tags?: string[];
}

export interface BlogParams {
  limit?: number;
  category?: string;
}

export const fetchBlogs = (params: BlogParams = {}): Promise<BlogPost[]> => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.category) qs.set('category', params.category);
  const query = qs.toString();
  return safeGet<ApiResponse<BlogPost[]>>(`/blogs${query ? `?${query}` : ''}`).then((r) =>
    r.ok && r.data?.data ? r.data.data : [],
  );
};

export const fetchBlogBySlug = async (slug: string): Promise<BlogPost | null> => {
  const r = await safeGet<ApiResponse<BlogPost>>(`/blogs/${slug}`);
  return r.ok && r.data?.data ? r.data.data : null;
};

export default fetchBlogs;