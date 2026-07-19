import React from 'react';

const BlogArticleHero = ({ post }) => (
  <header className="blog-article-hero">
    {post.category?.name ? (
      <span className="blog-article-hero__category">{post.category.name}</span>
    ) : null}
    <h1 className="blog-article-hero__title">{post.title}</h1>
  </header>
);

export default BlogArticleHero;
