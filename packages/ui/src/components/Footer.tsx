import { useId, type HTMLAttributes, type ReactNode } from 'react';
import './SharedComponents.css';

export interface FooterLinkItem {
  href: string;
  label: ReactNode;
  'aria-label'?: string;
}

export interface FooterColumn {
  title?: ReactNode;
  links: readonly FooterLinkItem[];
}

export interface FooterProps extends HTMLAttributes<HTMLElement> {
  brand?: ReactNode;
  columns?: readonly FooterColumn[];
  copyright?: ReactNode;
}

const Footer = ({
  className = '',
  brand,
  columns = [],
  copyright,
  children,
  ...props
}: FooterProps) => {
  const baseId = useId();

  return (
    <footer {...props} className={`angisoft-footer${className ? ` ${className}` : ''}`}>
      <div className="angisoft-footer__inner">
        {brand ? <div className="angisoft-footer__brand">{brand}</div> : null}
        {columns.length > 0 ? (
          <div className="angisoft-footer__columns">
            {columns.map((column, columnIndex) => {
              const headingId = `${baseId}-column-${columnIndex}`;
              return (
                <nav
                  key={columnIndex}
                  className="angisoft-footer__column"
                  aria-label={column.title ? undefined : `Footer links ${columnIndex + 1}`}
                  aria-labelledby={column.title ? headingId : undefined}
                >
                  {column.title ? (
                    <h2 id={headingId} className="angisoft-footer__title">
                      {column.title}
                    </h2>
                  ) : null}
                  <ul className="angisoft-footer__links">
                    {column.links.map((link, linkIndex) => (
                      <li key={`${link.href}-${linkIndex}`}>
                        <a
                          className="angisoft-footer__link"
                          href={link.href}
                          aria-label={link['aria-label']}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              );
            })}
          </div>
        ) : null}
        {children}
        {copyright ? <div className="angisoft-footer__bottom">{copyright}</div> : null}
      </div>
    </footer>
  );
};

export default Footer;
