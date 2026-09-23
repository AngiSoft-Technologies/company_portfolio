import React from 'react';
import { Link } from 'react-router-dom';
import { FaRegClock, FaCalendarAlt, FaArrowRight } from 'react-icons/fa';
import { getBlogDetailPath } from '../../utils/blog/blogRoutes';
import { formatBlogDate, formatReadingTime } from '../../utils/blog/blogFormatters';
import { resolveBlogImage, BlogImageFallback, AvatarInitials } from './blogAssets';

const BlogFeatured = ({ post }) => {
  if (!post) return null;
  const path = getBlogDetailPath(post);
  const image = resolveBlogImage(post.coverImage);
  const date = formatBlogDate(post.publishedAt || post.createdAt);
  const reading = formatReadingTime(post.readingTime);
  const authorName = post.author?.name || 'AngiSoft Team';

  return (
    <article className="blog-featured">
      <Link to={path} className="blog-featured__link" aria-label={`Read ${post.title}`}>
        <div className="blog-featured__media">
          {image ? (
            <img src={image} alt={post.title} loading="eager" decoding="async" />
          ) : (
            <BlogImageFallback categoryName={post.category?.name} />
          )}
        </div>
        <div className="blog-featured__body">
          <span className="blog-featured__tag">Featured</span>
          {post.category?.name ? (
            <span className="blog-featured__category">{post.category.name}</span>
          ) : null}
          <h2 className="blog-featured__title">{post.title}</h2>
          <p className="blog-featured__excerpt">{post.excerpt}</p>
          <div className="blog-featured__meta">
            <span className="blog-featured__author">
              {post.author?.avatarUrl ? (
                <img className="blog-featured__avatar" src={resolveBlogImage(post.author.avatarUrl)} alt="" loading="lazy" />
              ) : (
                <AvatarInitials initials={post.author?.initials} className="blog-featured__avatar" />
              )}
              {authorName}
            </span>
            {date ? (
              <span className="blog-featured__meta-item">
                <FaCalendarAlt aria-hidden="true" /> {date}
              </span>
            ) : null}
            {reading ? (
              <span className="blog-featured__meta-item">
                <FaRegClock aria-hidden="true" /> {reading}
              </span>
            ) : null}
          </div>
          <span className="blog-featured__cta">
            Read Article <FaArrowRight aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
};

export default BlogFeatured;
