import { forwardRef, type ButtonHTMLAttributes } from 'react';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Disables the control and announces the busy state without changing labels. */
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      type = 'button',
      disabled = false,
      loading = false,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading ? 'true' : undefined}
      className={`angisoft-button angisoft-button--${variant} angisoft-button--${size}${className ? ` ${className}` : ''}`}
    >
      {loading ? <span className="angisoft-button__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';

export default Button;
