// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { apiGet } from '@/lib/httpClient';
import { resolveIcon } from '@/lib/marketing/iconRegistry';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import '@/styles/marketing/TechTrendsSection.css';
import { LoadingIndicator, VisualState } from '@angisoft/ui';

type TechTrend = {
  id?: string;
  name: string;
  icon?: string;
  description?: string;
  bgImage?: string;
  caps?: string[];
};

const TechTrendsSection = () => {
  const [trends, setTrends] = useState<TechTrend[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [active, setActive] = useState(0);

  useEffect(() => {
    let activeRequest = true;
    apiGet<{ techTrends?: TechTrend[] }>('/site/home-content')
      .then((data) => {
        if (!activeRequest) return;
        setTrends(data?.techTrends || []);
        setStatus('ready');
      })
      .catch(() => {
        if (activeRequest) setStatus('error');
      });
    return () => {
      activeRequest = false;
    };
  }, []);

  const normalized = useMemo(
    () =>
      trends.map((trend, index) => ({
        id: trend.id || `trend-${index}`,
        name: trend.name,
        icon: resolveIcon(trend.icon),
        description: trend.description || '',
        bgImage: resolveAssetUrl(trend.bgImage || ''),
        capabilities: trend.caps || [],
      })),
    [trends],
  );

  const trend = normalized[Math.min(active, Math.max(normalized.length - 1, 0))];

  return (
    <section id="trends" className="angi-trends-section">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Technology</div>
          <h2 className="angi-section-title">
            Tech Trends We <span className="angi-section-title-gradient">Build With</span>
          </h2>
        </div>

        {status === 'loading' && <div className="angi-trends-tabs-scroll"><LoadingIndicator variant="bars" size="lg" /></div>}
        {status === 'error' && <div className="angi-trends-tabs-scroll"><VisualState variant="error" /></div>}
        {status === 'ready' && normalized.length === 0 && (
          <div className="angi-trends-tabs-scroll"><VisualState variant="unavailable" /></div>
        )}

        {trend ? (
          <>
            <div className="angi-trends-tabs-scroll">
              <div className="angi-trends-tabs" role="tablist" aria-label="Technology trends">
                {normalized.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={item.id === trend.id}
                      aria-controls={`trends-panel-${item.id}`}
                      className={`angi-trends-tab${item.id === trend.id ? ' is-active' : ''}`}
                      onClick={() => setActive(index)}
                    >
                      <Icon aria-hidden="true" className="angi-trends-tab-icon" />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="angi-trends-panel"
              role="tabpanel"
              id={`trends-panel-${trend.id}`}
              aria-labelledby={`trends-tab-${trend.id}`}
              style={{ '--trend-background-image': `url(${trend.bgImage})` } as React.CSSProperties}
            >
              <div className="angi-trends-background" aria-hidden="true" />
              <div className="angi-trends-overlay" aria-hidden="true" />
              <div className="angi-trends-content">
                <div className="angi-trends-introduction">
                  <div className="angi-trends-icon"><trend.icon aria-hidden="true" /></div>
                  <h3 className="angi-trends-title">{trend.name}</h3>
                  <p className="angi-trends-description">{trend.description}</p>
                </div>
                <div className="angi-trends-capabilities">
                  <div className="angi-trends-capabilities-label">What this includes</div>
                  <ul className="angi-trends-list">
                    {trend.capabilities.map((capability) => (
                      <li key={capability} className="angi-trends-item">
                        <span className="angi-trends-item-dot" aria-hidden="true" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="angi-trends-footer">
          <Link to="/services" className="angi-btn-primary">
            See How We Work <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TechTrendsSection;
