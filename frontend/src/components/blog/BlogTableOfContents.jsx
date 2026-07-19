import React, { useEffect, useState } from 'react';
import { FaListUl } from 'react-icons/fa';
import { buildTableOfContents } from '../../utils/blog/blogContent';

// Table of contents. Shows only when there are >= 2 headings. On phones it is
// collapsible behind a toggle. Tracks the active heading via IntersectionObserver.
const BlogTableOfContents = ({ content }) => {
  const items = buildTableOfContents(content);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (items.length < 2 || typeof IntersectionObserver === 'undefined') return undefined;
    const headings = items.map((it) => document.getElementById(it.id)).filter(Boolean);
    if (headings.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="blog-toc" aria-label="Table of contents">
      <button
        type="button"
        className="blog-toc__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="blog-toc__toggle-label">
          <FaListUl aria-hidden="true" /> On this page
        </span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div className={`blog-toc__panel${open ? ' is-open' : ''}`}>
        <h2 className="blog-toc__title">On this page</h2>
        <ul className="blog-toc__list">
          {items.map((it) => (
            <li key={it.id} className={it.level === 3 ? 'blog-toc__item--h3' : ''}>
              <a
                href={`#${it.id}`}
                className={`blog-toc__link${activeId === it.id ? ' is-active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {it.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default BlogTableOfContents;
