import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { Link } from 'react-router-dom';
import { FaStar, FaArrowRight, FaExternalLinkAlt } from 'react-icons/fa';
import { resolveAssetUrl } from '../../utils/constants';
import '../../css/TestimonialSlider.css';

// Avatar with React-driven fallback (no DOM mutation / nextSibling hacks).
const TestimonialAvatar = ({ src, name, primaryColor }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name || 'C').charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div
        className="angi-testimonial-avatar angi-testimonial-avatar--fallback"
        style={{ background: `linear-gradient(135deg, var(--testimonial-primary, ${primaryColor}), var(--testimonial-secondary, #00AFFF))` }}
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      className="angi-testimonial-avatar"
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

const TestimonialSlider = () => {
  const { colors, mode } = useTheme();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = mode === 'dark';

  useEffect(() => {
    let active = true;
    apiGet('/api/testimonials')
      .then((response) => {
        const records = Array.isArray(response)
          ? response
          : response?.data || response?.testimonials || response?.items || [];
        if (active) setTestimonials(Array.isArray(records) ? records.filter(Boolean) : []);
      })
      .catch((err) => console.error('Failed to load testimonials:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Render a 0–5 star row ONLY when a finite rating exists; otherwise nothing.
  const renderStars = (rating) => {
    const value = Number.isFinite(Number(rating)) ? Math.max(0, Math.min(5, Number(rating))) : null;
    if (value === null) return null;
    return (
      <div className="angi-testimonial-stars" aria-label={`${value} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (
          <FaStar
            key={i}
            className={i < value ? 'angi-testimonial-star is-filled' : 'angi-testimonial-star'}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  };

  if (loading || testimonials.length === 0) return null;

  // Filter out disabled / draft / archived / unapproved / empty-quote records.
  const visible = testimonials
    .filter((t) => {
      if (t.disabled || t.draft || t.archived || t.rejected) return false;
      if (t.confirmed === false) return false;
      const quote = (t.text || t.message || t.quote || t.review || t.content || '').toString().trim();
      return quote.length > 0;
    })
    // Prefer featured, then explicit sortOrder, then recency.
    .sort((a, b) => {
      const f = (x) => (x.featured ? 1 : 0) - (Number(x.sortOrder) || 0);
      const diff = f(b) - f(a);
      if (diff !== 0) return diff;
      const da = new Date(a.publishedAt || a.createdAt || 0).getTime() || 0;
      const db = new Date(b.publishedAt || b.createdAt || 0).getTime() || 0;
      return db - da;
    })
    .slice(0, 5);

  if (visible.length === 0) return null;

  return (
    <section
      className={`angi-testimonial-section ${isDark ? 'is-dark' : 'is-light'}`}
      style={{
        '--testimonial-primary': colors.primary,
        '--testimonial-secondary': colors.secondary || '#00AFFF',
      }}
    >
      <div className="angi-testimonial-inner">
        {/* ── Header ── */}
        <div className="angi-testimonial-header">
          <div className="angi-testimonial-badge">
            <FaStar className="angi-testimonial-badge-icon" aria-hidden="true" />
            What Our Clients Say
          </div>

          <h2 className="angi-testimonial-title">
            Trusted by{' '}
            <span className="angi-testimonial-title-gradient">Businesses</span>
          </h2>

          <p className="angi-testimonial-subtitle">
            Hear from the businesses and teams we've helped build, scale, and innovate.
          </p>
        </div>

        {/* ── Card stack ── */}
        <div className="angi-testimonial-list">
          {visible.map((t, i) => {
            const name = (t.name || t.clientName || 'Client').toString().trim();
            const role = (t.role || t.clientRole || '').toString().trim();
            const company = (t.company || t.organization || '').toString().trim();
            const message = (t.text || t.message || t.quote || t.review || t.content || '').toString().trim();
            const avatar = resolveAssetUrl(t.imageUrl || null);

            const ratingNode = renderStars(t.rating);

            return (
              <article
                key={t.id || i}
                className="angi-testimonial-card"
              >
                {/* Column 1: company rail */}
                <div className="angi-testimonial-rail">
                  {company || 'Client'}
                </div>

                {/* Column 2: content */}
                <div className="angi-testimonial-content">
                  {/* Row 1: avatar + name/title | stars */}
                  <div className="angi-testimonial-head">
                    <div className="angi-testimonial-person">
                      <TestimonialAvatar src={avatar} name={name} primaryColor={colors.primary} />
                      <div className="angi-testimonial-identity">
                        <div className="angi-testimonial-name">{name}</div>
                        {role && <div className="angi-testimonial-role">{role}</div>}
                      </div>
                    </div>
                    {ratingNode}
                  </div>

                  {/* Row 2: quote */}
                  <blockquote className="angi-testimonial-quote">
                    {message}
                  </blockquote>
                </div>
              </article>
            );
          })}
        </div>

        {/* ── View All ── */}
        <div className="angi-testimonial-cta">
          <Link to="/testimonials" className="angi-testimonial-view-all">
            View All Testimonials
            <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSlider;
