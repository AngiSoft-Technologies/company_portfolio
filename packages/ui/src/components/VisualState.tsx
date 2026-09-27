import './VisualState.css';

export type VisualStateVariant = 'unavailable' | 'offline' | 'error';

export interface VisualStateProps {
  variant?: VisualStateVariant;
  onRetry?: () => void;
  className?: string;
}

export function VisualState({ variant = 'unavailable', onRetry, className }: VisualStateProps) {
  return (
    <div
      className={`angisoft-visual-state${className ? ` ${className}` : ''}`}
      data-variant={variant}
      role="status"
    >
      <div className="angisoft-visual-state__inner">
        <div className="angisoft-visual-state__mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2.5" />
            <path
              d="M17 30c3.2-5.4 10.8-5.4 14 0"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M18.5 21.5h.01M29.5 21.5h.01"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {onRetry ? (
          <button
            type="button"
            className="angisoft-visual-state__retry"
            onClick={onRetry}
            aria-label="Retry"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default VisualState;
