import type { HTMLAttributes, ReactNode } from 'react';

export interface SectionHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
}

/**
 * SectionHeader — consistent title block for marketing sections.
 * Typography scale follows the global type tokens; colors are theme vars.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
  ...rest
}: SectionHeaderProps) {
  const centered = align === 'center';
  return (
    <div className={`max-w-2xl ${centered ? 'mx-auto text-center' : ''} ${className}`} {...rest}>
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold text-(--color-secondary)">{eyebrow}</p>
      )}
      <h2 className="text-balance text-3xl font-bold tracking-tight text-(--text-primary) sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-pretty text-base leading-relaxed text-(--text-secondary)">
          {description}
        </p>
      )}
    </div>
  );
}

export default SectionHeader;
