import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'error';

const tones: Record<Tone, string> = {
  neutral: 'bg-(--surface-hover) text-(--text-secondary) border-(--border)',
  brand:
    'bg-(--color-secondary)/12 text-(--color-secondary) border-(--color-secondary)/30',
  success:
    'bg-(--color-accent-2)/12 text-(--color-accent-2) border-(--color-accent-2)/30',
  warning:
    'bg-(--color-warning)/12 text-(--color-warning) border-(--color-warning)/30',
  error:
    'bg-(--color-error)/12 text-(--color-error) border-(--color-error)/30',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children?: ReactNode;
}

export function Badge({ tone = 'neutral', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 ' +
        'text-xs font-semibold ' +
        tones[tone] +
        ` ${className}`
      }
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
