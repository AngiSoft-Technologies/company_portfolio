import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaClock } from 'react-icons/fa';
import { getBlogDetailPath } from '../../utils/blog/blogRoutes';
import { formatBlogDate, formatReadingTime, formatAuthorName, createBlogExcerpt, formatTagLabel } from '../../utils/blog/blogFormatters';
import { resolveBlogImage, BlogImageFallback, AvatarInitials } from './blogAssets';
import { getContentType, daysRemaining, formatVisibilityUntil } from '../../utils/blog/blogTypes';

const BlogCard = ({ post, featured = false }) => {
  if (!post) return null;
  const path = getBlogDetailPath(post);
  const image = resolveBlogImage(post.coverImage);
  const excerpt = post.excerpt || createBlogExcerpt(post.content, 150);
  const authorName = formatAuthorName(post.author);
  const tags = (post.tags || []).slice(0, 2);
  const type = getContentType(post.contentType);
  const remaining = daysRemaining(post.visibleUntil);
  const timed = post.visibilityType === 'timed';

  return (
    <article className={`blog-card blog-card--${type.id}${featured ? ' blog-card--featured' : ''}`}>
      <Link to={path} className="blog-card__link" aria-label={`${type.label}: ${post.title}`}>
        <div className="blog-card__media">
          {post.category?.name ? (
            <span className="blog-card__category">{post.category.name}</span>
          ) : null}
          <span className={`blog-type-badge ${type.badge}`}>
            <i className={type.icon} aria-hidden="true" />
            <span>{type.label}</span>
          </span>
          {timed && remaining !== null ? (
            <span className="blog-visibility-badge" title={`Visible until ${formatVisibilityUntil(post.visibleUntil)}`}>
              <i className="fa-solid fa-clock" aria-hidden="true" />
              {remaining === 0 ? 'Closing today' : `${remaining}d left`}
            </span>
          ) : null}
          {image ? (
            <img
              src={image}
              alt={post.title}
              loading="lazy"
              decoding="async"
              width="1200"
              height="675"
            />
          ) : (
            <BlogImageFallback categoryName={post.category?.name} />
          )}
        </div>
        <div className="blog-card__body">
          {tags.length > 0 ? (
            <div className="blog-card__tags">
              {tags.map((tag) => (
                <span key={tag} className="blog-tag-pill">{formatTagLabel(tag)}</span>
              ))}
            </div>
          ) : null}
          <h2 className="blog-card__title">{post.title}</h2>
          {post.subtitle ? <p className="blog-card__subtitle">{post.subtitle}</p> : null}
          <p className="blog-card__excerpt">{excerpt}</p>
          <div className="blog-card__meta">
            <span className="blog-card__author">
              {post.author?.avatarUrl ? (
                <img className="blog-card__avatar" src={resolveBlogImage(post.author.avatarUrl) || post.author.avatarUrl} alt="" loading="lazy" />
              ) : (
                <AvatarInitials initials={post.author?.initials} className="blog-card__avatar" />
              )}
              {authorName}
            </span>
            {post.publishedAt ? (
              <time dateTime={new Date(post.publishedAt).toISOString()}>
                {formatBlogDate(post.publishedAt)}
              </time>
            ) : null}
            {post.readingTime ? (
              <span className="blog-card__reading">
                <FaClock aria-hidden="true" /> {formatReadingTime(post.readingTime)}
              </span>
            ) : null}
            <span className="blog-card__read">
              Read Article <FaArrowRight aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default BlogCard;
