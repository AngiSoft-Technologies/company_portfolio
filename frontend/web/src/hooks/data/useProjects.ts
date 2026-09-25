import { safeGet } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface Project {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  client?: string | null;
  category?: string | null;
  image?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  featured?: boolean;
}

export const fetchProjects = (): Promise<Project[]> =>
  safeGet<ApiResponse<Project[]>>('/projects').then((r) => (r.ok && r.data?.data ? r.data.data : []));

export const fetchProjectById = async (id: string): Promise<Project | null> => {
  const r = await safeGet<ApiResponse<Project>>(`/projects/${id}`);
  return r.ok && r.data?.data ? r.data.data : null;
};

export default fetchProjects;