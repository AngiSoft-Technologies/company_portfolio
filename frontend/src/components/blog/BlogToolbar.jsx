import React from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const BlogToolbar = ({
  query,
  onQueryChange,
  categories = [],
  selectedCategory,
  onCategoryChange,
  totalResults,
  hasActiveFilters,
  onClear,
}) => {
  return (
    <div className="blog-toolbar">
      <div className="blog-search">
        <FaSearch className="blog-search__icon" aria-hidden="true" />
        <input
          type="search"
          className="blog-search__input"
          placeholder="Search articles, topics, authors…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search blog articles"
        />
        {query ? (
          <button
            type="button"
            className="blog-search__clear"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
          >
            <FaTimes />
          </button>
        ) : null}
      </div>

      <div className="blog-category-tabs" role="tablist" aria-label="Filter by category">
        {categories.map((cat) => {
          const isActive = selectedCategory
            ? cat.slug === selectedCategory
            : !cat.slug && !selectedCategory;
          return (
            <button
              key={cat.slug || 'all'}
              type="button"
              role="tab"
              aria-selected={Boolean(isActive)}
              className={`blog-tab${isActive ? ' blog-tab--active' : ''}`}
              onClick={() => onCategoryChange(cat.slug || '')}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      <div className="blog-toolbar__footer">
        <span className="blog-toolbar__count">
          {totalResults} {totalResults === 1 ? 'article' : 'articles'}
        </span>
        {hasActiveFilters ? (
          <button type="button" className="blog-toolbar__clear" onClick={onClear}>
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default BlogToolbar;
