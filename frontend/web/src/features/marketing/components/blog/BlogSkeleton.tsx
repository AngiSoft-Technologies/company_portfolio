// @ts-nocheck
import React from 'react';
import BlogCardSkeleton from './BlogCardSkeleton';

// Grid of placeholder cards shown while the post list is loading.
const BlogSkeleton = ({ count = 6 }) => (
  <div className="blog-grid" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <BlogCardSkeleton key={i} />
    ))}
  </div>
);

export default BlogSkeleton;
