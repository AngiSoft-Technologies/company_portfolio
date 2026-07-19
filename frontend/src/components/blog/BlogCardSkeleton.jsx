import React from 'react';

const BlogCardSkeleton = () => (
  <div className="blog-skeleton" aria-hidden="true">
    <div className="blog-skeleton__media" />
    <div className="blog-skeleton__line blog-skeleton__line--sm" />
    <div className="blog-skeleton__line blog-skeleton__line--lg" />
    <div className="blog-skeleton__line blog-skeleton__line--xl" />
    <div className="blog-skeleton__line blog-skeleton__line--md" />
  </div>
);

export default BlogCardSkeleton;
