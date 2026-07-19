import React from 'react';
import { Link } from 'react-router-dom';
import { FaFileAlt } from 'react-icons/fa';

const BlogNotFound = () => (
  <div className="blog-state" role="alert">
    <div className="blog-state__icon"><FaFileAlt aria-hidden="true" /></div>
    <h2 className="blog-state__title">Article not found</h2>
    <p className="blog-state__text">
      This post may have been moved or unpublished. Explore the rest of our journal instead.
    </p>
    <div className="blog-state__actions">
      <Link to="/blog" className="blog-btn blog-btn--primary">Back to Blog</Link>
      <Link to="/" className="blog-btn">Go Home</Link>
    </div>
  </div>
);

export default BlogNotFound;
