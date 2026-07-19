import React from 'react';
import BlogGrid from './BlogGrid';

const BlogRelatedPosts = ({ posts = [] }) => {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="blog-related" aria-label="Related articles">
      <h2 className="blog-related__title">Related Articles</h2>
      <BlogGrid posts={posts} />
    </section>
  );
};

export default BlogRelatedPosts;
