import React from 'react';
import { FaCalendarAlt, FaRegClock, FaEye, FaHeart } from 'react-icons/fa';
import { formatBlogDate, formatReadingTime } from '../../utils/blog/blogFormatters';

const formatCompact = (n) => {
  if (n == null) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
};

const BlogMeta = ({ post }) => {
  if (!post) return null;
  const date = formatBlogDate(post.publishedAt || post.createdAt);
  const reading = formatReadingTime(post.readingTime);
  const views = formatCompact(post.views);
  const likes = formatCompact(post.likes);

  return (
    <div className="blog-meta">
      {date ? (
        <span className="blog-meta__item">
          <FaCalendarAlt aria-hidden="true" /> {date}
        </span>
      ) : null}
      {reading ? (
        <span className="blog-meta__item">
          <FaRegClock aria-hidden="true" /> {reading}
        </span>
      ) : null}
      {views ? (
        <span className="blog-meta__item">
          <FaEye aria-hidden="true" /> {views}
        </span>
      ) : null}
      {likes ? (
        <span className="blog-meta__item">
          <FaHeart aria-hidden="true" /> {likes}
        </span>
      ) : null}
    </div>
  );
};

export default BlogMeta;
