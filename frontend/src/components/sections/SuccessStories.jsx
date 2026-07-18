import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import stories from '../../data/homeProductStories';
import { resolveAssetUrl } from '../../utils/constants';
import '../../css/SuccessStories.css';

// Status -> CSS modifier (only truthful states are mapped).
const statusModifier = (status) => {
  const key = String(status || '').toLowerCase().replace(/[^a-z]/g, '');
  if (key.includes('development')) return 'is-development';
  if (key.includes('beta')) return 'is-beta';
  if (key.includes('live') || key.includes('running') || key.includes('scaling')) return 'is-live';
  return 'is-development';
};

// Safe logo with initials fallback (no DOM mutation).
const ProductMark = ({ logo, name, accent }) => {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!logo || failed) {
    return (
      <span
        className="angi-success-story-mark"
        style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
        aria-hidden="true"
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={resolveAssetUrl(logo)}
      alt={`${name} logo`}
      className="angi-success-story-logo"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

const SuccessStories = () => (
  <section id="products" className="angi-success-stories">
    <div className="angi-success-stories-container">
      <header className="angi-success-stories-header">
        <div className="angi-success-stories-badge">Our Products</div>

        <h2 className="angi-success-stories-title">
          Products We Are{' '}
          <span className="angi-success-stories-title-highlight">Building</span>
        </h2>

        <p className="angi-success-stories-subtitle">
          Each AngiSoft product is designed around a practical challenge in business, property, fuel operations or the creative economy.
        </p>
      </header>

      <div className="angi-success-stories-grid">
        {stories.map((story) => (
          <Link
            key={story.id}
            to={story.route}
            className={`angi-success-story-card ${statusModifier(story.status)}`}
            style={{ '--story-accent': story.accent }}
          >
            <div className="angi-success-story-top">
              <div className="angi-success-story-brand">
                <ProductMark logo={(story.logo)} name={story.name} accent={story.accent} />
              </div>

              <span className="angi-success-story-status">{story.status}</span>
            </div>

            <h3 className="angi-success-story-headline">{story.headline}</h3>

            <p className="angi-success-story-tagline">{story.tagline}</p>

            <p className="angi-success-story-excerpt">{story.excerpt}</p>

            <div className="angi-success-story-footer">
              <span className="angi-success-story-year">{story.year}</span>

              <span className="angi-success-story-action">
                Explore Product
                <FaArrowRight className="angi-success-story-arrow" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default SuccessStories;
