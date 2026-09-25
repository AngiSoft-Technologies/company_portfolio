export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

export const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatKsh = (amount: number | string): string => {
  const n = Number(amount);
  if (Number.isNaN(n)) return 'KSh 0';
  return `KSh ${n.toLocaleString('en-KE')}`;
}