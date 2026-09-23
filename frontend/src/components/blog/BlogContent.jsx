import React from 'react';
import { renderContent } from '../../utils/blog/blogContent';

// Renders the normalized `content` (html/markdown/plain) via blogContent helpers.
const BlogContent = ({ content }) => {
  return (
    <div
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
};

export default BlogContent;
