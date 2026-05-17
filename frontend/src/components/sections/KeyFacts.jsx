import React from 'react';
import AnimatedCounter from '../modern/AnimatedCounter';

const facts = [
  { value: 5, suffix: '+', label: 'Years of Expertise' },
  { value: 100, suffix: '+', label: 'Projects Delivered' },
  { value: 15, suffix: '+', label: 'IT Professionals' },
  { value: 10, suffix: '+', label: 'Industries Served' },
];

const KeyFacts = () => {
  return (
    <section className="angi-section angi-section-gradient" id="key-facts">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Key Facts</div>
          <h2 className="angi-section-title">
            Key Facts About <span className="angi-section-title-gradient">AngiSoft</span>
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          maxWidth: '1000px',
          margin: '0 auto',
        }}>
          {facts.map((fact, i) => (
            <div
              key={i}
              className="angi-card"
              style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}
            >
              <div style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                lineHeight: 1,
                marginBottom: '0.75rem',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                <AnimatedCounter end={fact.value} suffix={fact.suffix} />
              </div>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'rgba(245,247,250,0.55)',
              }}>
                {fact.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KeyFacts;
