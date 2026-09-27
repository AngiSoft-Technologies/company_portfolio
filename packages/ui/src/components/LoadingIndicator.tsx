import type { CSSProperties } from 'react';
import './LoadingIndicator.css';

export type LoadingVariant =
  | 'spinner'
  | 'dots'
  | 'orbit'
  | 'pulse'
  | 'progress'
  | 'skeleton'
  | 'bars'
  | 'grid'
  | 'cube'
  | 'wave';

export interface LoadingIndicatorProps {
  variant?: LoadingVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'brand' | 'mono';
  progress?: number;
  className?: string;
  label?: string;
}

const repeated = (count: number) => Array.from({ length: count }, (_, index) => index);

export function LoadingIndicator({
  variant = 'spinner',
  size = 'md',
  tone = 'brand',
  progress,
  className,
  label,
}: LoadingIndicatorProps) {
  const boundedProgress =
    typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : undefined;
  const style = boundedProgress !== undefined
    ? ({ '--loader-progress': `${boundedProgress}%` } as CSSProperties)
    : undefined;
  const isProgress = variant === 'progress';

  return (
    <div
      className={`angisoft-loader angisoft-loader--${variant}${className ? ` ${className}` : ''}`}
      data-variant={variant}
      data-size={size}
      data-tone={tone}
      {...(boundedProgress !== undefined ? { 'data-progress': boundedProgress } : {})}
      role={isProgress ? 'progressbar' : 'status'}
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      style={style}
    >
      {variant === 'spinner' && <span className="angisoft-loader__spinner" />}
      {variant === 'dots' && (
        <span className="angisoft-loader__dots">
          {repeated(3).map((key) => (
            <span key={key} className="angisoft-loader__dot" />
          ))}
        </span>
      )}
      {variant === 'orbit' && (
        <span className="angisoft-loader__orbit">
          <span className="angisoft-loader__orbit-center" />
          <span className="angisoft-loader__orbit-ring" />
        </span>
      )}
      {variant === 'pulse' && (
        <span className="angisoft-loader__pulse">
          {repeated(3).map((key) => (
            <span key={key} />
          ))}
        </span>
      )}
      {variant === 'progress' && (
        <span className="angisoft-loader__progress">
          <span className="angisoft-loader__progress-fill" />
        </span>
      )}
      {variant === 'skeleton' && (
        <span className="angisoft-loader__skeleton">
          {repeated(3).map((key) => (
            <span key={key} />
          ))}
        </span>
      )}
      {variant === 'bars' && (
        <span className="angisoft-loader__bars">
          {repeated(4).map((key) => (
            <span key={key} />
          ))}
        </span>
      )}
      {variant === 'grid' && (
        <span className="angisoft-loader__grid">
          {repeated(9).map((key) => (
            <span key={key} />
          ))}
        </span>
      )}
      {variant === 'cube' && (
        <span className="angisoft-loader__cube">
          <span className="angisoft-loader__cube-inner">
            {repeated(6).map((key) => (
              <span key={key} />
            ))}
          </span>
        </span>
      )}
      {variant === 'wave' && (
        <span className="angisoft-loader__wave">
          {repeated(7).map((key) => (
            <span key={key} />
          ))}
        </span>
      )}
    </div>
  );
}

export default LoadingIndicator;
