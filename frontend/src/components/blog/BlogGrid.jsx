import React from 'react';
import BlogCard from './BlogCard';

const BlogGrid = ({ posts, featuredId }) => (
  <div className="blog-grid">
    {posts.map((post) =>
      post.id === featuredId ? (
        <BlogCard key={`featured-${post.id}`} post={post} featured />
      ) : (
        <BlogCard key={post.id || post.slug} post={post} />
      )
    )}
  </div>
);

export default BlogGrid;
