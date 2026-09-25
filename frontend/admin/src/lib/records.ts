export type Rec = Record<string, unknown>;

export function toArr(value: unknown): Rec[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is Rec => Boolean(v) && typeof v === 'object' && !Array.isArray(v));
  }
  if (value && typeof value === 'object') {
    const rec = value as Rec;
    if (Array.isArray(rec.data)) {
      return rec.data.filter((v): v is Rec => Boolean(v) && typeof v === 'object' && !Array.isArray(v));
    }
    if (Array.isArray(rec.items)) {
      return rec.items.filter((v): v is Rec => Boolean(v) && typeof v === 'object' && !Array.isArray(v));
    }
    if (Array.isArray(rec.results)) {
      return rec.results.filter((v): v is Rec => Boolean(v) && typeof v === 'object' && !Array.isArray(v));
    }
  }
  return [];
}

export function toNum(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(String(value).replace(/[,KSh\s]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function deepGet(rec: Rec, keys: string[]): unknown {
  for (const k of keys) {
    const v = rec[k];
    if (v !== undefined && v !== null) return v;
  }
  for (const nest of ['counts', 'totals', 'stats', 'summary']) {
    const sub = rec[nest];
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      const found = deepGet(sub as Rec, keys);
      if (found !== undefined && found !== null) return found;
    }
  }
  return undefined;
}

export const rowId = (r: Rec, fallback = ''): string => {
  const id = r.id ?? r._id ?? fallback;
  return id === null || id === undefined ? '' : String(id);
};