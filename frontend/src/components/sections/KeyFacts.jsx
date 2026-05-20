import React, { useEffect, useState } from 'react';
import AnimatedCounter from '../modern/AnimatedCounter';
import { apiGet } from '../../js/httpClient';

const fallbackFacts = [
  { value: 2024, suffix: '', label: 'Founded From Grassroots Work' },
  { value: 6, suffix: '+', label: 'Core Service Lines' },
  { value: 4, suffix: '', label: 'Product Ecosystems' },
  { value: 1, suffix: '', label: 'Mission: Empower' },
];

const KeyFacts = () => {
  const [facts, setFacts] = useState(fallbackFacts);

  useEffect(() => {
    apiGet('/company-stats')
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setFacts(data.map((stat) => ({
            value: stat.value,
            suffix: stat.suffix || '',
            label: stat.label,
            description: stat.description,
          })));
        }
      })
      .catch(() => {});
  }, []);

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
              key={`${fact.label}-${i}`}
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
                <AnimatedCounter end={fact.value} suffix={fact.suffix} useGrouping={!/found/i.test(fact.label)} />
              </div>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'rgba(245,247,250,0.55)',
                marginBottom: fact.description ? '0.5rem' : 0,
              }}>
                {fact.label}
              </p>
              {fact.description && (
                <p style={{
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  color: 'rgba(245,247,250,0.45)',
                  margin: 0,
                }}>
                  {fact.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KeyFacts;
