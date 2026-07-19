import React from 'react';
import { resolveAssetUrl } from '../../utils/constants';

// Resolve a blog cover image. Handles full URLs, /uploads, /api and relative paths.
export const resolveBlogImage = (coverImage) => {
  if (!coverImage) return null;
  if (/^(https?:)?\/\//.test(coverImage) || coverImage.startsWith('/uploads') || coverImage.startsWith('/api')) {
    return coverImage;
  }
  return resolveAssetUrl ? resolveAssetUrl(coverImage) : coverImage;
};

// Branded fallback (AngiSoft mark + category) shown when no cover image exists.
export const BlogImageFallback = ({ categoryName }) => (
  <div className="blog-card__fallback" aria-hidden="true">
    <span className="blog-card__fallback-mark">AngiSoft</span>
    {categoryName ? <span className="blog-card__fallback-cat">{categoryName}</span> : null}
  </div>
);

// Initials avatar for authors without a photo.
export const AvatarInitials = ({ initials, className }) => (
  <span className={className} aria-hidden="true">{initials || 'AT'}</span>
);

export { React };
