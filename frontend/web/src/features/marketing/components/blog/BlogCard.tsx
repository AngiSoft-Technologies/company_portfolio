// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaClock } from 'react-icons/fa';
import { getBlogDetailPath } from '@/lib/marketing/blog/blogRoutes';
import { formatBlogDate, formatReadingTime, formatAuthorName, createBlogExcerpt, formatTagLabel } from '@/lib/marketing/blog/blogFormatters';
import { resolveBlogImage, BlogImageFallback, AvatarInitials } from './blogAssets';
import { getContentType, daysRemaining, formatVisibilityUntil } from '@/lib/marketing/blog/blogTypes';
import { Badge } from '@/components/ui';

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
      <Link
        to={path}
        className="group flex h-full flex-col overflow-hidden rounded-(--radius-xl) border border-(--border) bg-(--card-bg) transition-all duration-(--duration-normal) ease-(--ease-standard) hover:-translate-y-1 hover:border-(--color-secondary)/50 hover:shadow-(--elevation-lg)"
        aria-label={`${type.label}: ${post.title}`}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-(--surface)">
          {post.category?.name ? (
            <Badge tone="brand" className="absolute left-3 top-3 z-10">
              {post.category.name}
            </Badge>
          ) : null}
          <span className={`blog-type-badge ${type.badge} absolute right-3 top-3 z-10`}>
            <i className={type.icon} aria-hidden="true" />
            <span>{type.label}</span>
          </span>
          {timed && remaining !== null ? (
            <span className="blog-visibility-badge absolute bottom-3 left-3 z-10" title={`Visible until ${formatVisibilityUntil(post.visibleUntil)}`}>
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
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <BlogImageFallback categoryName={post.category?.name} />
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          {tags.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag}>{formatTagLabel(tag)}</Badge>
              ))}
            </div>
          ) : null}
          <h2 className="text-lg font-bold leading-snug text-(--text-primary) transition-colors group-hover:text-(--color-secondary)">
            {post.title}
          </h2>
          {post.subtitle ? (
            <p className="mt-1.5 text-sm font-medium text-(--text-secondary)">{post.subtitle}</p>
          ) : null}
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
            {excerpt}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-(--text-muted)">
            <span className="blog-card__author inline-flex items-center gap-2 font-medium text-(--text-secondary)">
              {post.author?.avatarUrl ? (
                <img className="blog-card__avatar h-6 w-6 rounded-full object-cover" src={resolveBlogImage(post.author.avatarUrl) || post.author.avatarUrl} alt="" loading="lazy" />
              ) : (
                <AvatarInitials initials={post.author?.initials} className="blog-card__avatar h-6 w-6 rounded-full" />
              )}
              {authorName}
            </span>
            {post.publishedAt ? (
              <time dateTime={new Date(post.publishedAt).toISOString()}>
                {formatBlogDate(post.publishedAt)}
              </time>
            ) : null}
            {post.readingTime ? (
              <span className="blog-card__reading inline-flex items-center gap-1">
                <FaClock aria-hidden="true" /> {formatReadingTime(post.readingTime)}
              </span>
            ) : null}
            <span className="blog-card__read ml-auto inline-flex items-center gap-1.5 font-semibold text-(--color-secondary)">
              Read Article <FaArrowRight aria-hidden="true" className="transition-transform duration-(--duration-normal) group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default BlogCard;
