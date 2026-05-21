import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaGasPump, FaStore, FaMusic, FaHome } from 'react-icons/fa';

const stories = [
  {
    slug: 'petroflow',
    logo: '/images/Logos/petroflow-logo.png',
    mobileIcon: '/images/Logos/petroflow-mobile-icon.png',
    tagline: 'Fuel Station Management Platform',
    headline: 'How We Built Kenya\'s Smartest Fuel Station System',
    excerpt: 'We noticed fuel station owners struggling with manual records, stock leaks, and shift reconciliations. PetroFlow was born from a simple idea: what if every pump, every litre, and every shilling could be tracked in real time — from your phone?',
    status: 'Live & Running',
    year: '2023',
    color: '#FF6B35',
  },
  {
    slug: 'dukaflow',
    logo: '/images/Logos/duka-flow-logo.png',
    mobileIcon: '/images/Logos/duka flow mobile icon.png',
    tagline: 'Retail POS & Business Management',
    headline: 'Giving Every Duka a Digital Backbone',
    excerpt: 'Small shop owners told us they couldn\'t afford enterprise POS systems. DukaFlow started as a weekend project — a simple way to record sales, track stock, and accept M-Pesa payments. It became a product when shop owners started asking for more.',
    status: 'Live & Growing',
    year: '2023',
    color: '#27D94B',
  },
  {
    slug: 'angitunes',
    logo: '/images/Logos/angitunes-logo.png',
    mobileIcon: '/images/Logos/angitunes-mobile icon.png',
    tagline: 'Music Distribution & Creator Ecosystem',
    headline: 'Making Music Distribution Affordable for East African Artists',
    excerpt: 'An upcoming artist asked us: "Why does it cost so much to get my music on Spotify?" AngiTunes was built to answer that question — a platform where creators upload once and distribute everywhere, without losing half their earnings to middlemen.',
    status: 'Beta',
    year: '2024',
    color: '#A855F7',
  },
  {
    slug: 'kejalink',
    logo: '/images/Logos/keja-link logo.png',
    mobileIcon: '/images/Logos/kejalink-mobile icon.png',
    tagline: 'Property & Rental Management',
    headline: 'Connecting Landlords and Tenants Digitally',
    excerpt: 'A landlord told us: "I have 40 units and I still track rent on paper." KejaLink turned that pain point into a platform — digital rent collection, maintenance tickets, tenant communication, and financial reports, all in one dashboard.',
    status: 'Live & Scaling',
    year: '2024',
    color: '#00AFFF',
  },
];

const SuccessStories = () => {
  return (
    <section className="angi-section angi-section-dark" id="products">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Our Products</div>
          <h2 className="angi-section-title">
            Success <span className="angi-section-title-gradient">Stories</span>
          </h2>
          <p className="angi-section-subtitle">
            Every product we build starts with a real problem someone told us about. Here are the stories behind what we've shipped.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {stories.map((story) => (
            <Link
              key={story.slug}
              to={`/project/${story.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="angi-card"
                style={{
                  display: 'flex', flexDirection: 'column', height: '100%',
                  padding: '2rem', cursor: 'pointer',
                }}
              >
                {/* Top row: logo + status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <img
                    src={story.logo}
                    alt={story.tagline}
                    loading="lazy"
                    decoding="async"
                    style={{ height: '36px', objectFit: 'contain', filter: 'brightness(1.1)' }}
                  />
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 600, padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    background: `${story.color}18`, color: story.color,
                  }}>
                    {story.status}
                  </span>
                </div>

                {/* Headline */}
                <h3 style={{
                  fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 700,
                  color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3,
                }}>
                  {story.headline}
                </h3>

                {/* Tagline */}
                <p style={{
                  fontSize: '0.8125rem', fontWeight: 500, color: 'var(--primary)',
                  marginBottom: '0.75rem',
                }}>
                  {story.tagline}
                </p>

                {/* Excerpt */}
                <p style={{
                  fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(245,247,250,0.55)',
                  marginBottom: '1.5rem', flex: 1,
                }}>
                  {story.excerpt}
                </p>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: '1rem', borderTop: '1px solid rgba(0,175,255,0.08)',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(245,247,250,0.4)' }}>
                    {story.year}
                  </span>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)',
                  }}>
                    Read Story <FaArrowRight style={{ fontSize: '0.625rem' }} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;
