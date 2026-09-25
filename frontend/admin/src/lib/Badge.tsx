import type { ReactNode } from 'react';

const TONES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function statusTone(status?: unknown): string {
  const s = String(status ?? '').toLowerCase();
  if (/new|open|pending|active|qualified|confirmed/.test(s)) return 'blue';
  if (/contacted|progress|partial|in[- ]progress/.test(s)) return 'amber';
  if (/closed|completed|resolved|paid|granted|active|done|success/.test(s)) return 'green';
  if (/cancel|cancell|refund|fail|error|overdue|rejected|revoked|archived/.test(s)) return 'red';
  return 'slate';
}

export function Badge({ tone, children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone ?? statusTone(children)] ?? TONES.slate}`}
    >
      {children}
    </span>
  );
}