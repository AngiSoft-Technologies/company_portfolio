import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

// CTA for a related service/product. Only rendered when the caller can derive
// one from the post's tags/category (we never invent associations). The host
// page decides whether to pass `link`.
const BlogArticleCTA = ({ title, text, link, linkLabel = 'Learn more' }) => {
  if (!link) return null;
  return (
    <section className="blog-cta" aria-label="Related offer">
      {title ? <h2 className="blog-cta__title">{title}</h2> : null}
      {text ? <p className="blog-cta__text">{text}</p> : null}
      <Link className="blog-btn blog-btn--primary" to={link}>
        {linkLabel} <FaArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
};

export default BlogArticleCTA;
