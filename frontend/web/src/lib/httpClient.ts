import { apiRequest } from '@angisoft/api-client';

type Json = Record<string, unknown>;

export interface SafeResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}


export const apiGet = <T = unknown>(endpoint: string, token?: string | null) =>
  apiRequest<T>('GET', endpoint, null, token ?? undefined);

export const apiPost = <T = unknown>(endpoint: string, data: unknown, token?: string | null) =>
  apiRequest<T>('POST', endpoint, data, token ?? undefined);

export const apiPut = <T = unknown>(endpoint: string, data: unknown, token?: string | null) =>
  apiRequest<T>('PUT', endpoint, data, token ?? undefined);

export const apiPatch = <T = unknown>(endpoint: string, data: unknown, token?: string | null) =>
  apiRequest<T>('PATCH', endpoint, data, token ?? undefined);

export const apiDelete = <T = unknown>(endpoint: string, token?: string | null) =>
  apiRequest<T>('DELETE', endpoint, null, token ?? undefined);

export async function safeGet<T = unknown>(endpoint: string, token?: string | null): Promise<SafeResult<T>> {
  try {
    const data = await apiGet<T>(endpoint, token);
    return { ok: true, status: 200, data, error: null };
  } catch (error) {
    const err = error as { message?: string; status?: number };
    return { ok: false, status: err.status ?? 0, data: null, error: err.message ?? 'Failed to load data' };
  }
}

export const clientApiGet = <T = unknown>(endpoint: string) => apiGet<T>(endpoint);
export const clientApiPost = <T = unknown>(endpoint: string, data: unknown) => apiPost<T>(endpoint, data);
export const clientApiPatch = <T = unknown>(endpoint: string, data: unknown) => apiPatch<T>(endpoint, data);

export async function apiUpload<T = Json>(endpoint: string, file: File, token?: string | null, metadata: Record<string, unknown> = {}) {
  return apiRequest<T>('POST', endpoint, { file, metadata }, token ?? undefined);
}

export const logActivity = (payload: Record<string, unknown>) => apiPost('/logs/activity', payload);
