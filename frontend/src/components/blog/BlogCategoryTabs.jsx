import React from 'react';

const BlogCategoryTabs = ({ categories, selected, onSelect }) => (
  <div className="blog-category-tabs" role="tablist" aria-label="Filter by category">
    {categories.map((cat) => {
      const key = cat.slug || cat.name;
      const active = (selected || 'All') === key || (selected === '' && key === 'All');
      return (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active}
          className={`blog-tab${active ? ' blog-tab--active' : ''}`}
          onClick={() => onSelect(key === 'All' ? '' : cat.slug)}
        >
          {cat.name}
        </button>
      );
    })}
  </div>
);

export default BlogCategoryTabs;
