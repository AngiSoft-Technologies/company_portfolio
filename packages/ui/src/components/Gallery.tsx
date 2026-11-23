import type { HTMLAttributes, ReactNode } from 'react';
import './SharedComponents.css';

export interface GalleryItem {
  src: string;
  /** Required so every image has an accessible name. Use '' for decorative images. */
  alt: string;
  caption?: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}

export interface GalleryProps extends HTMLAttributes<HTMLUListElement> {
  items: readonly GalleryItem[];
  columns?: 2 | 3 | 4;
}

const Gallery = ({ className = '', items, columns = 3, ...props }: GalleryProps) => (
  <ul
    {...props}
    className={`angisoft-gallery angisoft-gallery--cols-${columns}${className ? ` ${className}` : ''}`}
  >
    {items.map((item, index) => {
      const image = (
        <img
          className="angisoft-gallery__image"
          src={item.src}
          alt={item.alt}
          loading="lazy"
          decoding="async"
        />
      );
      return (
        <li key={`${item.src}-${index}`}>
          <figure className="angisoft-gallery__figure">
            {item.href ? (
              <a
                className="angisoft-gallery__link"
                href={item.href}
                target={item.target}
                rel={item.rel ?? (item.target === '_blank' ? 'noopener noreferrer' : undefined)}
              >
                {image}
              </a>
            ) : (
              image
            )}
            {item.caption ? (
              <figcaption className="angisoft-gallery__caption">{item.caption}</figcaption>
            ) : null}
          </figure>
        </li>
      );
    })}
  </ul>
);

export default Gallery;
