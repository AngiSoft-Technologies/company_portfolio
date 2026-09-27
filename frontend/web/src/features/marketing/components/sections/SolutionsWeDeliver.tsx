// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/httpClient';
import { resolveIcon } from '@/lib/marketing/iconRegistry';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import '@/styles/marketing/SolutionsWeDeliver.css';
import { LoadingIndicator, VisualState } from '@angisoft/ui';

type SolutionItem = { id?: string; icon?: string; name: string };
type SolutionCategory = { id?: string; name: string; bgImage?: string; items?: SolutionItem[] };

const SolutionsWeDeliver = () => {
  const [categories, setCategories] = useState<SolutionCategory[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    apiGet<{ solutions?: SolutionCategory[] }>('/site/home-content')
      .then((data) => {
        if (!active) return;
        setCategories(data?.solutions || []);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const normalized = useMemo(
    () =>
      categories.map((category, categoryIndex) => ({
        id: category.id || `solution-category-${categoryIndex}`,
        name: category.name,
        bgImage: resolveAssetUrl(category.bgImage || ''),
        items: (category.items || []).map((item, itemIndex) => ({
          id: item.id || `solution-item-${categoryIndex}-${itemIndex}`,
          name: item.name,
          icon: resolveIcon(item.icon),
        })),
      })),
    [categories],
  );

  return (
    <section className="angi-solutions" id="solutions">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Solutions</div>
          <h2 className="angi-section-title">
            Solutions We <span className="angi-section-title-gradient">Deliver</span>
          </h2>
        </div>

        {status === 'loading' && <div className="angi-solutions-categories"><LoadingIndicator variant="pulse" size="lg" /></div>}
        {status === 'error' && <div className="angi-solutions-categories"><VisualState variant="error" /></div>}
        {status === 'ready' && normalized.length === 0 && (
          <div className="angi-solutions-categories"><VisualState variant="unavailable" /></div>
        )}

        <div className="angi-solutions-categories">
          {normalized.map((category) => (
            <article
              key={category.id}
              className="angi-solutions-panel"
              style={{ '--solutions-panel-image': `url(${category.bgImage})` } as React.CSSProperties}
            >
              <div className="angi-solutions-panel-background" aria-hidden="true" />
              <div className="angi-solutions-panel-overlay" aria-hidden="true" />
              <div className="angi-solutions-panel-content">
                <div className="angi-solutions-category-heading">
                  <span className="angi-solutions-category-marker" aria-hidden="true" />
                  <h3 className="angi-solutions-category-title">{category.name}</h3>
                </div>
                <ul className="angi-solutions-grid">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id} className="angi-solutions-item">
                        <span className="angi-solutions-item-icon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="angi-solutions-item-name">{item.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsWeDeliver;
