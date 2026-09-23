import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { getBlogDetailPath } from '../../utils/blog/blogRoutes';

// Prev/Next by chronological publication order (computed in useBlogDetail).
const BlogPostNavigation = ({ previousPost, nextPost }) => {
  if (!previousPost && !nextPost) return null;
  return (
    <nav className="blog-navigation" aria-label="Previous and next articles">
      {previousPost ? (
        <Link className="blog-nav-card blog-nav-card--prev" to={getBlogDetailPath(previousPost)}>
          <span className="blog-nav-card__dir"><FaArrowLeft aria-hidden="true" /> Previous</span>
          <span className="blog-nav-card__title">{previousPost.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {nextPost ? (
        <Link className="blog-nav-card blog-nav-card--next" to={getBlogDetailPath(nextPost)}>
          <span className="blog-nav-card__dir">Next <FaArrowRight aria-hidden="true" /></span>
          <span className="blog-nav-card__title">{nextPost.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
};

export default BlogPostNavigation;
