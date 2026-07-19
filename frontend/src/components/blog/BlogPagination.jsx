import React from 'react';

// Build a compact page list with ellipses.
const buildPages = (current, total) => {
  const pages = [];
  const add = (p) => pages.push(p);
  if (total <= 7) {
    for (let i = 1; i <= total; i += 1) add(i);
    return pages;
  }
  add(1);
  if (current > 3) add('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i += 1) add(i);
  if (current < total - 2) add('…');
  add(total);
  return pages;
};

const BlogPagination = ({ page, totalPages, onPage }) => {
  if (!totalPages || totalPages <= 1) return null;
  const pages = buildPages(page, totalPages);

  return (
    <nav className="blog-pagination" aria-label="Article pagination">
      <button
        type="button"
        className="blog-page-btn"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((p, idx) =>
        p === '…' ? (
          <span key={`e-${idx}`} className="blog-page-ellipsis" aria-hidden="true">…</span>
        ) : (
          <button
            type="button"
            key={p}
            className={`blog-page-btn${p === page ? ' blog-page-btn--active' : ''}`}
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="blog-page-btn"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
};

export default BlogPagination;
