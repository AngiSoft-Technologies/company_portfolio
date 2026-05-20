import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { Link } from 'react-router-dom';
import { FaStar, FaArrowRight, FaExternalLinkAlt } from 'react-icons/fa';
import { resolveAssetUrl } from '../../utils/constants';

const TestimonialSlider = () => {
  const { colors, mode } = useTheme();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = mode === 'dark';

  useEffect(() => {
    apiGet('/api/testimonials')
      .then((data) => setTestimonials(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load testimonials:', err))
      .finally(() => setLoading(false));
  }, []);

  const renderStars = (rating = 5) =>
    Array.from({ length: 5 }, (_, i) => (
      <FaStar key={i} style={{ color: i < rating ? '#FBBF24' : 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }} />
    ));

  if (loading || testimonials.length === 0) return null;

  const top = testimonials.slice(0, 5);

  return (
    <section style={{
      position: 'relative',
      padding: '5rem 0 4rem',
      overflow: 'hidden',
      background: isDark
        ? 'linear-gradient(180deg, #07142B 0%, #0B1E3D 50%, #07142B 100%)'
        : 'linear-gradient(180deg, #F8FAFF 0%, #EFF5FF 50%, #F8FAFF 100%)',
      color: isDark ? '#fff' : '#07142B',
    }}>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1.25rem', borderRadius: '999px',
            fontSize: '0.8125rem', fontWeight: 600,
            background: `${colors.primary}15`,
            color: colors.primary,
            marginBottom: '1.25rem',
          }}>
            <FaStar style={{ fontSize: '0.7rem' }} />
            What Our Clients Say
          </div>

          <h2 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '0.75rem',
          }}>
            Trusted by{' '}
            <span style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Businesses</span>{' '}
            Across Africa
          </h2>

          <p style={{
            fontSize: '1rem',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Hear from the businesses and teams we've helped build, scale, and innovate.
          </p>
        </div>

        {/* ── Vertical Stack ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {top.map((t, i) => {
            const name = t.name || 'Client';
            const role = t.role || '';
            const company = t.company || '';
            const message = t.text || t.message || '';
            const avatar = resolveAssetUrl(t.imageUrl || null);
            const projectId = t.productId || null;
            const testimonialId = t.id || null;

            return (
              <div key={t.id || i} style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: '1rem',
                padding: '1.75rem 2rem',
                display: 'grid',
                gridTemplateColumns: '180px 1fr',
                gap: '1.5rem',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${colors.primary}30`;
                  e.currentTarget.style.boxShadow = `0 4px 24px ${colors.primary}08`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* ── Column 1: Company name ── */}
                <div style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: 1.4,
                  paddingTop: '0.25rem',
                }}>
                  {company || 'Client'}
                </div>

                {/* ── Column 2 ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Row 1: avatar + name + title (left) | stars (right) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          style={{
                            width: '44px', height: '44px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `2px solid ${colors.primary}30`,
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{
                        width: '44px', height: '44px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
                        display: avatar ? 'none' : 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                        flexShrink: 0,
                      }}>
                        {name.charAt(0)}
                      </div>
                      <div>
                        <div style={{
                          fontFamily: "'Sora', sans-serif",
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: isDark ? '#fff' : '#1e293b',
                          lineHeight: 1.3,
                        }}>
                          {name}
                        </div>
                        {role && (
                          <div style={{
                            fontSize: '0.8125rem',
                            color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                            marginTop: '0.125rem',
                          }}>
                            {role}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      {renderStars(t.rating || 5)}
                    </div>
                  </div>

                  {/* Row 2: Testimonial text */}
                  <p style={{
                    fontSize: '0.9375rem',
                    fontWeight: 400,
                    lineHeight: 1.7,
                    color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
                  }}>
                    {message}
                  </p>

                  {/* Row 3: Optional action buttons */}
                  {(projectId || testimonialId) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      {projectId && (
                        <Link
                          to={`/projects/${projectId}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: colors.primary,
                            textDecoration: 'none',
                            border: `1px solid ${colors.primary}30`,
                            background: 'transparent',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = `${colors.primary}10`;
                            e.currentTarget.style.borderColor = `${colors.primary}50`;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = `${colors.primary}30`;
                          }}
                        >
                          View Project <FaExternalLinkAlt style={{ fontSize: '0.6rem' }} />
                        </Link>
                      )}
                      {testimonialId && (
                        <Link
                          to={`/testimonials/${testimonialId}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#fff',
                            textDecoration: 'none',
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          View Testimonial <FaArrowRight style={{ fontSize: '0.6rem' }} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── View All Button ── */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link
            to="/testimonials"
            style={{
              display: 'inline-block',
              padding: '0.875rem 2rem',
              borderRadius: '0.75rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: '#fff',
              textDecoration: 'none',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
              boxShadow: `0 4px 16px ${colors.primary}25`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 20px ${colors.primary}35`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 16px ${colors.primary}25`;
            }}
          >
            View All Testimonials
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSlider;
