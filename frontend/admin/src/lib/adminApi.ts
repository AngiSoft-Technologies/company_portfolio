export async function apiFetch(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const { method = 'GET', body } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const rec = (json ?? {}) as Record<string, unknown>;
    const message =
      typeof rec.error === 'string'
        ? rec.error
        : typeof rec.message === 'string'
          ? rec.message
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json ?? null;
}