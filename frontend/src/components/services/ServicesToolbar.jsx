// Toolbar: search input + category tabs. Controlled by useServiceSearch.
import React from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const ServicesToolbar = ({
    query,
    setQuery,
    category,
    setCategory,
    categories = [],
}) => (
    <div className="services-toolbar" role="search">
        <div className="services-toolbar__inner">
            <div className="services-search">
                <span className="services-search__icon" aria-hidden="true"><FaSearch /></span>
                <input
                    type="search"
                    className="services-search__input"
                    placeholder="Search services…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search services"
                />
                {query && (
                    <button
                        type="button"
                        className="services-search__clear"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>

            <div className="services-categories" role="tablist" aria-label="Service categories">
                {categories.map((cat) => (
                    <button
                        key={cat.slug}
                        type="button"
                        role="tab"
                        aria-selected={category === cat.slug}
                        className={`services-tab${category === cat.slug ? ' is-active' : ''}`}
                        onClick={() => setCategory(cat.slug)}
                    >
                        {cat.name}
                        <span className="services-tab__count">{cat.count}</span>
                    </button>
                ))}
            </div>
        </div>
    </div>
);

export default ServicesToolbar;
