import type { HTMLAttributes, ReactNode } from 'react';
import './SharedComponents.css';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  /** Reduced padding for embedding in table cells or compact panels. */
  compact?: boolean;
}

const EmptyState = ({
  className = '',
  title = 'No records',
  description,
  icon,
  action,
  compact = false,
  children,
  ...props
}: EmptyStateProps) => (
  <div
    {...props}
    role="status"
    className={`angisoft-empty${compact ? ' angisoft-empty--compact' : ''}${className ? ` ${className}` : ''}`}
  >
    {icon ? (
      <span className="angisoft-empty__icon" aria-hidden="true">
        {icon}
      </span>
    ) : null}
    <p className="angisoft-empty__title">{title}</p>
    {description ?? children ? (
      <p className="angisoft-empty__description">{description ?? children}</p>
    ) : null}
    {action ? <div className="angisoft-empty__action">{action}</div> : null}
  </div>
);

export default EmptyState;
