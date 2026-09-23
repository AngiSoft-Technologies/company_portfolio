import React from 'react';

// Placeholder shown while a single blog post is loading.
const BlogSkeletonDetail = () => (
  <div className="blog-detail-skeleton" aria-busy="true" aria-label="Loading article">
    <div className="blog-detail-skeleton__line blog-detail-skeleton__line--sm" />
    <div className="blog-detail-skeleton__line blog-detail-skeleton__line--xl" />
    <div className="blog-detail-skeleton__media" />
    <div className="blog-detail-skeleton__line" />
    <div className="blog-detail-skeleton__line" />
    <div className="blog-detail-skeleton__line blog-detail-skeleton__line--md" />
    <div className="blog-detail-skeleton__line" />
    <div className="blog-detail-skeleton__line blog-detail-skeleton__line--lg" />
  </div>
);

export default BlogSkeletonDetail;
