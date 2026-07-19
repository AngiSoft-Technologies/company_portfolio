import React from 'react';
import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';

const BlogEmptyState = ({ onClear, message }) => (
  <div className="blog-state" role="status">
    <div className="blog-state__icon"><FaSearch aria-hidden="true" /></div>
    <h2 className="blog-state__title">No articles found</h2>
    <p className="blog-state__text">
      {message || 'No posts match your current filters. Try adjusting your search or category.'}
    </p>
    <div className="blog-state__actions">
      {onClear ? (
        <button type="button" className="blog-btn blog-btn--primary" onClick={onClear}>
          Clear Filters
        </button>
      ) : null}
      <Link to="/services" className="blog-btn">Browse Services</Link>
      <Link to="/products" className="blog-btn">Browse Products</Link>
    </div>
  </div>
);

export default BlogEmptyState;
