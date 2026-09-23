import React from 'react';
import { FaBookOpen } from 'react-icons/fa';
import ScrollReveal from '../modern/ScrollReveal';

const BlogHero = ({ count = 0 }) => (
  <ScrollReveal className="blog-hero" as="header">
    <span className="blog-hero__eyebrow">
      <FaBookOpen aria-hidden="true" /> The AngiSoft Journal
    </span>
    <h1 className="blog-hero__title">Insights, Guides &amp; Product Stories</h1>
    <p className="blog-hero__subtitle">
      Practical engineering notes, service walkthroughs and company updates from the
      AngiSoft Technologies team
      {count ? ` — ${count} published ${count === 1 ? 'article' : 'articles'}.` : '.'}
    </p>
  </ScrollReveal>
);

export default BlogHero;
