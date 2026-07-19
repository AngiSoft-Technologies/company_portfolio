import React from 'react';
import BlogCardSkeleton from './BlogCardSkeleton';

const BlogDetailSkeleton = () => (
  <div className="blog-state" aria-hidden="true" style={{ textAlign: 'left' }}>
    <div className="blog-skeleton__line" style={{ width: '40%', height: '1rem' }} />
    <div className="blog-skeleton__line" style={{ width: '80%', height: '2rem' }} />
    <div className="blog-skeleton__media" style={{ aspectRatio: '16 / 9', marginTop: '1rem' }} />
    <div className="blog-skeleton__line blog-skeleton__line--xl" />
    <div className="blog-skeleton__line blog-skeleton__line--lg" />
    <div className="blog-skeleton__line blog-skeleton__line--xl" />
    <div className="blog-skeleton__line blog-skeleton__line--md" />
    <div style={{ marginTop: '2rem' }}>
      <BlogCardSkeleton />
    </div>
  </div>
);

export default BlogDetailSkeleton;
