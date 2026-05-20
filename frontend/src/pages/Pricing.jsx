import React, { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { FaCheck, FaArrowRight } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';

const fallbackPlans = [
  {
    name: 'Starter',
    description: 'Perfect for individuals and small projects getting started.',
    price: 'KES 15,000',
    period: '/project',
    features: [
      'Single-page website or landing page',
      'Basic UI/UX design',
      'Responsive layout (mobile-friendly)',
      '1 revision round',
      '5-day delivery',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    description: 'Ideal for growing businesses that need more features and support.',
    price: 'KES 75,000',
    period: '/project',
    features: [
      'Multi-page web application',
      'Custom UI/UX design',
      'API integration & backend',
      'Database setup (PostgreSQL)',
      '3 revision rounds',
      '14-day delivery',
      'Priority email & WhatsApp support',
      '30-day post-launch support',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'Full-scale solutions for complex business needs and integrations.',
    price: 'Custom',
    period: '',
    features: [
      'Full-stack web & mobile apps',
      'Enterprise architecture & design',
      'Third-party integrations',
      'Cloud deployment & DevOps',
      'Unlimited revisions',
      'Dedicated project manager',
      'Priority support (call, email, WhatsApp)',
      '90-day post-launch support',
      'Source code & documentation',
    ],
    cta: 'Contact Us',
    highlighted: false,
  },
];

const Pricing = () => {
  const { colors } = useTheme();
  const [pricing, setPricing] = useState(null);
  const plans = pricing?.plans?.length
    ? pricing.plans.map((plan) => ({
      ...plan,
      price: plan.price || `${pricing.currency || 'KES'} ${Number(plan.priceFrom || 0).toLocaleString()}`,
      period: plan.period || '/project',
      cta: plan.cta || plan.ctaLabel || 'Start Conversation',
    }))
    : fallbackPlans;

  useEffect(() => {
    apiGet('/site/pricing').then(setPricing).catch(() => {});
  }, []);

  return (
    <section style={{
      minHeight: '100vh',
      padding: '7rem 0 5rem',
      background: '#070E1A',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '500px',
        background: 'radial-gradient(ellipse, rgba(8,117,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1.25rem', borderRadius: '999px',
            fontSize: '0.8125rem', fontWeight: 600,
            background: `${colors.primary}15`,
            color: colors.primary,
            marginBottom: '1.25rem',
          }}>
            <IoSparkles style={{ fontSize: '0.75rem' }} />
            Pricing
          </div>

          <h2 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '0.75rem',
          }}>
            Choose the right{' '}
            <span style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>plan</span>{' '}
            for your project
          </h2>

          <p style={{
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.5)',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            {pricing?.subtitle || 'Flexible starting points for digital support, business systems, SaaS products, and long-term platform builds.'}
          </p>
        </div>

        {/* ── Pricing Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          alignItems: 'stretch',
        }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{
              background: plan.highlighted
                ? 'linear-gradient(135deg, rgba(8,117,255,0.08), rgba(0,175,255,0.06))'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${plan.highlighted ? 'rgba(8,117,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '1.25rem',
              padding: '2rem',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
              transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${colors.primary}40`;
                e.currentTarget.style.boxShadow = `0 8px 32px ${colors.primary}10`;
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = plan.highlighted ? 'rgba(8,117,255,0.25)' : 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Recommended badge */}
              {plan.highlighted && (
                <div style={{
                  position: 'absolute', top: '-0.625rem', left: '50%', transform: 'translateX(-50%)',
                  padding: '0.3rem 1rem', borderRadius: '999px',
                  fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
                  color: '#fff',
                }}>
                  Recommended
                </div>
              )}

              {/* Plan name */}
              <h3 style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '1.125rem', fontWeight: 700,
                color: '#fff', marginBottom: '0.375rem',
              }}>
                {plan.name}
              </h3>

              <p style={{
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5, marginBottom: '1.5rem',
              }}>
                {plan.description}
              </p>

              {/* Price */}
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '2.25rem', fontWeight: 800,
                  color: '#fff',
                }}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.4)',
                    marginLeft: '0.25rem',
                  }}>
                    {plan.period}
                  </span>
                )}
              </div>

              {/* Features */}
              <div style={{
                height: '1px',
                background: 'rgba(255,255,255,0.06)',
                marginBottom: '1.5rem',
              }} />

              <ul style={{
                listStyle: 'none', padding: 0, margin: 0,
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
                flex: 1, marginBottom: '2rem',
              }}>
                {plan.features.map((f, fi) => (
                  <li key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <FaCheck style={{
                      fontSize: '0.7rem', color: colors.primary,
                      marginTop: '0.3rem', flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '0.8125rem',
                      color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.4,
                    }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                to={plan.price === 'Custom' ? '/contact' : '/book'}
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '0.875rem 1.5rem', borderRadius: '0.75rem',
                  fontSize: '0.9375rem', fontWeight: 600,
                  textDecoration: 'none',
                  color: plan.highlighted ? '#fff' : 'rgba(255,255,255,0.85)',
                  background: plan.highlighted
                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`
                    : 'rgba(255,255,255,0.06)',
                  border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (plan.highlighted) {
                    e.currentTarget.style.boxShadow = `0 4px 16px ${colors.primary}30`;
                  } else {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }
                }}
                onMouseLeave={e => {
                  if (plan.highlighted) {
                    e.currentTarget.style.boxShadow = 'none';
                  } else {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }
                }}
              >
                {plan.cta} {plan.price !== 'Custom' && <FaArrowRight style={{ fontSize: '0.7rem', marginLeft: '0.5rem' }} />}
              </Link>
            </div>
          ))}
        </div>

        {/* ── Bottom Note ── */}
        <div style={{
          textAlign: 'center', marginTop: '3rem',
          fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)',
        }}>
          {pricing?.note || 'All prices are estimates. Final pricing depends on project scope and requirements.'}
          <br />
          Need something custom?{' '}
          <Link to="/contact" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>
            Let's talk
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
