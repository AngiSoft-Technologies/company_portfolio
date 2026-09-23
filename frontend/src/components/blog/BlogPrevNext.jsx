import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { getBlogDetailPath } from '../../utils/blog/blogRoutes';

const NavLink = ({ post, direction }) => {
  if (!post) return <span className="blog-prevnext__spacer" />;
  const to = getBlogDetailPath(post);
  const isPrev = direction === 'prev';
  return (
    <Link to={to} className={`blog-prevnext__link blog-prevnext__link--${direction}`}>
      <span className="blog-prevnext__dir">
        {isPrev ? <FaArrowLeft aria-hidden="true" /> : <FaArrowRight aria-hidden="true" />}
        {isPrev ? 'Previous' : 'Next'}
      </span>
      <span className="blog-prevnext__title">{post.title}</span>
    </Link>
  );
};

const BlogPrevNext = ({ previous, next }) => (
  <nav className="blog-prevnext" aria-label="Previous and next articles">
    <NavLink post={previous} direction="prev" />
    <NavLink post={next} direction="next" />
  </nav>
);

export default BlogPrevNext;
