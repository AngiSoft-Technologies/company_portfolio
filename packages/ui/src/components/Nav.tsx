import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import './SharedComponents.css';

export interface NavLinkItem {
  href: string;
  label: ReactNode;
  /** Overrides `activeHref` for this link. */
  active?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  'aria-label'?: string;
}

export interface NavProps extends HTMLAttributes<HTMLElement> {
  brand?: ReactNode;
  links?: readonly NavLinkItem[];
  actions?: ReactNode;
  /** Marks the matching `href` with `aria-current="page"`. */
  activeHref?: string;
  /** Accessible name for the navigation landmark. */
  label?: string;
}

const Nav = ({
  className = '',
  brand,
  links = [],
  actions,
  activeHref,
  label = 'Main navigation',
  'aria-label': ariaLabel,
  children,
  ...props
}: NavProps) => (
  <nav
    {...props}
    aria-label={ariaLabel ?? label}
    className={`angisoft-nav${className ? ` ${className}` : ''}`}
  >
    <div className="angisoft-nav__inner">
      {brand ? <div className="angisoft-nav__brand">{brand}</div> : null}
      {links.length > 0 ? (
        <div className="angisoft-nav__links">
          <ul className="angisoft-nav__list">
            {links.map((link, index) => {
              const isActive = link.active ?? (activeHref !== undefined && link.href === activeHref);
              return (
                <li key={`${link.href}-${index}`}>
                  <a
                    className="angisoft-nav__link"
                    href={link.href}
                    aria-label={link['aria-label']}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={link.onClick}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {actions ? <div className="angisoft-nav__actions">{actions}</div> : null}
      {children}
    </div>
  </nav>
);

export default Nav;
