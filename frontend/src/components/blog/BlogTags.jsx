import React from 'react';
import { FaTag } from 'react-icons/fa';
import { formatTagLabel } from '../../utils/blog/blogFormatters';

const BlogTags = ({ tags = [] }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="blog-tags">
      <FaTag className="blog-tags__icon" aria-hidden="true" />
      <ul className="blog-tags__list">
        {tags.map((tag, i) => (
          <li key={`${tag}-${i}`} className="blog-tags__item">
            {formatTagLabel(tag)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BlogTags;
