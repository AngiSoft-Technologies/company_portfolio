import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-(--radius-lg) ' +
  'transition-all duration-(--duration-normal) ease-(--ease-standard) ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) ' +
  'disabled:opacity-50 disabled:pointer-events-none min-h-11';

const variants: Record<Variant, string> = {
  primary:
    'bg-(--color-primary) text-(--color-white) hover:bg-(--color-primary-light) active:scale-[0.98]',
  secondary:
    'border border-(--border) bg-(--surface) text-(--text-primary) hover:bg-(--surface-hover) hover:border-(--color-secondary)/50',
  ghost:
    'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-hover)',
  danger:
    'bg-(--color-error) text-(--color-white) hover:opacity-90 active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-9',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render as a React Router link instead of a button. */
  to?: string;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', to, className = '', children, ...rest }, ref) => {
    const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
    if (to) {
      return (
        <Link ref={ref as never} to={to} className={cls}>
          {children}
        </Link>
      );
    }
    return (
      <button ref={ref as never} className={cls} {...rest}>
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
