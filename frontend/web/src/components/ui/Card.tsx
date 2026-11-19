import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lift + accent border on hover (default true for interactive cards). */
  interactive?: boolean;
  children?: ReactNode;
}

/**
 * Card — the single surface primitive for marketing content.
 * Colors come exclusively from the global theme vars, so every named theme
 * and both modes restyle it automatically.
 */
export function Card({ interactive = false, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={
        'rounded-(--radius-xl) border border-(--border) bg-(--card-bg) ' +
        'transition-all duration-(--duration-normal) ease-(--ease-standard) ' +
        (interactive
          ? 'hover:-translate-y-1 hover:border-(--color-secondary)/50 hover:shadow-(--elevation-lg) cursor-pointer'
          : '') +
        ` ${className}`
      }
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
