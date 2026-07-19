import React from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaRegClock, FaEye } from 'react-icons/fa';
import BlogMeta from './BlogMeta';
import { resolveBlogImage } from './blogAssets';

const BlogPostHero = ({ post }) => {
  if (!post) return null;
  const cover = resolveBlogImage(post.coverImage);

  return (
    <header className="blog-post-hero">
      <div className="blog-post-hero__inner">
        <Link to="/blog" className="blog-post-hero__back">← All articles</Link>
        {post.category?.name ? (
          <Link to="/blog" className="blog-post-hero__category">{post.category.name}</Link>
        ) : null}
        <h1 className="blog-post-hero__title">{post.title}</h1>
        {post.excerpt ? <p className="blog-post-hero__excerpt">{post.excerpt}</p> : null}
        <BlogMeta post={post} />
      </div>
      {cover ? (
        <div className="blog-post-hero__media">
          <img src={cover} alt={post.title} loading="eager" decoding="async" />
        </div>
      ) : null}
    </header>
  );
};

export default BlogPostHero;
