import React from 'react';
import { FaClock, FaCalendarAlt, FaEye } from 'react-icons/fa';
import { formatBlogDate, formatReadingTime, formatAuthorName } from '../../utils/blog/blogFormatters';
import { resolveBlogImage, AvatarInitials } from './blogAssets';

const BlogArticleMeta = ({ post }) => {
  const authorName = formatAuthorName(post.author);
  const iso = post.publishedAt ? new Date(post.publishedAt).toISOString() : null;

  return (
    <div className="blog-article-meta">
      <span className="blog-article-meta__author">
        {post.author?.avatarUrl ? (
          <img
            className="blog-article-meta__avatar"
            src={resolveBlogImage(post.author.avatarUrl) || post.author.avatarUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <AvatarInitials initials={post.author?.initials} className="blog-article-meta__avatar" />
        )}
        <span>{authorName}</span>
      </span>
      {iso ? (
        <time dateTime={iso}><FaCalendarAlt aria-hidden="true" /> {formatBlogDate(post.publishedAt)}</time>
      ) : null}
      {post.readingTime ? (
        <span><FaClock aria-hidden="true" /> {formatReadingTime(post.readingTime)}</span>
      ) : null}
      {typeof post.views === 'number' && post.views > 0 ? (
        <span><FaEye aria-hidden="true" /> {post.views.toLocaleString('en-KE')} views</span>
      ) : null}
    </div>
  );
};

export default BlogArticleMeta;
