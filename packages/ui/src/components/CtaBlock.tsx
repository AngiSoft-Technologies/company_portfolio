import { useId, type HTMLAttributes, type ReactNode } from 'react';
import './SharedComponents.css';

export interface CtaBlockProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  visual?: ReactNode;
}

const CtaBlock = ({
  className = '',
  title,
  description,
  actions,
  visual,
  ...props
}: CtaBlockProps) => {
  const headingId = useId();

  return (
    <section {...props} aria-labelledby={headingId} className={`angisoft-cta${className ? ` ${className}` : ''}`}>
      <div className="angisoft-cta__inner">
        <div className="angisoft-cta__copy">
          <h2 id={headingId} className="angisoft-cta__title">
            {title}
          </h2>
          {description ? <p className="angisoft-cta__description">{description}</p> : null}
          {actions ? <div className="angisoft-cta__actions">{actions}</div> : null}
        </div>
        {visual ? <div className="angisoft-cta__visual">{visual}</div> : null}
      </div>
    </section>
  );
};

export default CtaBlock;
