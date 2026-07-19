// Blog routing helpers. Re-uses the canonical detail-path builder and adds
// list + category-scoped helpers used by the toolbar and pagination.

import { getBlogDetailPath } from '../detailPaths';

export { getBlogDetailPath };

export const getBlogListPath = ({ category, page } = {}) => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (page && Number(page) > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : '/blog';
};

export const getBlogCategoryPath = (categorySlug) => {
  if (!categorySlug) return '/blog';
  return `/blog?category=${encodeURIComponent(categorySlug)}`;
};

// Build an absolute shareable URL for the current post.
export const getBlogAbsoluteUrl = (post, origin = '') => {
  const path = getBlogDetailPath(post);
  if (!origin) return path;
  return `${origin.replace(/\/+$/, '')}${path}`;
};
