import React, { useEffect, useState } from 'react';
import AnimatedCounter from '../modern/AnimatedCounter';
import { apiGet } from '../../js/httpClient';
import '../../css/KeyFacts.css';

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `fact-${Math.random().toString(36).slice(2, 8)}`;

// Truthful fallback facts used only when the API fails or returns no published facts.
const fallbackFacts = [
  {
    id: 'founded',
    value: 2024,
    valueType: 'year',
    useGrouping: false,
    suffix: '',
    label: 'Founded',
    description:
      'AngiSoft officially began in December 2024 from practical grassroots technical work.',
  },
  {
    id: 'service-lines',
    value: 6,
    valueType: 'count',
    suffix: '+',
    label: 'Core Service Areas',
    description: 'Software, data, technical support, digital documents, creative services and online assistance.',
  },
  {
    id: 'products',
    value: 4,
    valueType: 'count',
    suffix: '',
    label: 'Product Ecosystems',
    description: 'PetroFlow, DukaFlow, KejaLink and AngiTunes.',
  },
  {
    id: 'principles',
    value: 3,
    valueType: 'count',
    suffix: '',
    label: 'Brand Principles',
    description: 'Innovate, Build and Empower.',
  },
];

// Accept a bare array OR an object wrapping { data | stats | companyStats }.
const extractStats = (response) => {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    return response.data || response.stats || response.companyStats || [];
  }
  return [];
};

const isValidNumber = (value) => {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n);
};

const normalizeStat = (stat, index) => {
  const label = stat?.label?.trim();
  if (!label) return null;

  const raw = String(stat?.value ?? '').replace(/,/g, '').trim();
  if (!isValidNumber(raw)) return null;

  return {
    id: stat?.id || stat?.slug || slugify(label),
    value: Number(raw),
    prefix: stat?.prefix || '',
    suffix: stat?.suffix || '',
    label,
    description: stat?.description || '',
    // Semantic type carries the formatting rule (year/count/etc.).
    valueType: stat?.valueType || stat?.type || stat?.format || 'plain',
    // Explicit override only if the API deliberately set it.
    useGrouping:
      typeof stat?.useGrouping === 'boolean' ? stat.useGrouping : undefined,
    sortOrder:
      stat?.sortOrder ?? stat?.order ?? stat?.displayOrder ?? index,
  };
};

const normalizeFacts = (response) => {
  const records = extractStats(response);

  const valid = records
    .map(normalizeStat)
    .filter(Boolean)
    // Respect backend enabled / published flags.
    .filter((fact) => fact.enabled !== false && fact.published !== false)
    // Preserve backend ordering when present.
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return valid;
};

const KeyFacts = () => {
  const [facts, setFacts] = useState(fallbackFacts);

  useEffect(() => {
    let active = true;

    apiGet('/company-stats')
      .then((response) => {
        if (!active) return;

        const valid = normalizeFacts(response);
        if (valid.length > 0) {
          setFacts(valid);
        }
      })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to load company stats:', error);
        // Keep truthful fallback facts on API failure.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="key-facts" className="angi-key-facts">
      <div className="angi-key-facts-container">
        <header className="angi-key-facts-header">
          <div className="angi-key-facts-badge">Key Facts</div>
          <h2 className="angi-key-facts-title">
            Key Facts About{' '}
            <span className="angi-key-facts-title-highlight">AngiSoft</span>
          </h2>
        </header>

        {facts.length === 0 ? (
          <div className="angi-key-facts-empty">No key facts available yet.</div>
        ) : (
          <div className="angi-key-facts-grid">
            {facts.map((fact) => (
              <article
                key={fact.id}
                className={`angi-key-fact-card ${fact.description ? 'has-description' : ''}`}
              >
                <div className="angi-key-fact-value">
                  <AnimatedCounter
                    end={fact.value}
                    valueType={fact.valueType}
                    prefix={fact.prefix}
                    suffix={fact.suffix}
                    useGrouping={fact.useGrouping}
                    label={fact.label}
                  />
                </div>

                <h3 className="angi-key-fact-label">{fact.label}</h3>

                {fact.description && (
                  <p className="angi-key-fact-description">{fact.description}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default KeyFacts;
