import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

const BlogErrorState = ({ onRetry, message }) => (
  <div className="blog-state" role="alert">
    <div className="blog-state__icon"><FaExclamationTriangle aria-hidden="true" /></div>
    <h2 className="blog-state__title">Something went wrong</h2>
    <p className="blog-state__text">
      {message || 'We could not load the articles right now. Please try again.'}
    </p>
    {onRetry ? (
      <div className="blog-state__actions">
        <button type="button" className="blog-btn blog-btn--primary" onClick={onRetry}>
          Retry
        </button>
      </div>
    ) : null}
  </div>
);

export default BlogErrorState;
