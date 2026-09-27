// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { apiGet } from '@/lib/httpClient';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import '@/styles/marketing/ServicesSection.css';
import { LoadingIndicator, VisualState } from '@angisoft/ui';

interface ServiceRecord {
  id: string;
  title: string;
  description?: string | null;
  scope?: string | null;
  category?: string | null;
  categoryRef?: { id?: string; name?: string; description?: string | null } | null;
  images?: string[] | null;
  published?: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  desc: string;
  image: string;
  services: string[];
}

const ServicesSection = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    let active = true;
    apiGet<ServiceRecord[]>('/services')
      .then((response) => {
        if (!active) return;
        const records = Array.isArray(response) ? response : [];
        const grouped = new Map<string, ServiceCategory>();

        records
          .filter((service) => service.published !== false)
          .forEach((service) => {
            const category = service.categoryRef?.name || service.category || 'Services';
            const id = service.categoryRef?.id || category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const existing = grouped.get(id);
            const image = resolveAssetUrl(service.images?.[0] || '');
            if (!existing) {
              grouped.set(id, {
                id,
                name: category,
                desc: service.categoryRef?.description || service.scope || service.description || '',
                image,
                services: [service.title],
              });
              return;
            }
            existing.services.push(service.title);
            if (!existing.image && image) existing.image = image;
          });

        setCategories(Array.from(grouped.values()));
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const active = useMemo(
    () => categories[Math.min(activeTab, Math.max(categories.length - 1, 0))],
    [activeTab, categories],
  );

  return (
    <section id="services" className="angi-services-section">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Our Services</div>
          <h2 className="angi-section-title">
            Explore Our <span className="angi-section-title-gradient">Offering</span>
          </h2>
        </div>

        {status === 'loading' && <div className="angi-services-tabs-scroll"><LoadingIndicator variant="wave" size="lg" /></div>}
        {status === 'error' && <div className="angi-services-tabs-scroll"><VisualState variant="error" /></div>}
        {status === 'ready' && categories.length === 0 && (
          <div className="angi-services-tabs-scroll"><VisualState variant="unavailable" /></div>
        )}

        {active ? (
          <>
            <div className="angi-services-tabs-scroll">
              <div className="angi-services-tabs" role="tablist" aria-label="Service categories">
                {categories.map((category, index) => (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    aria-selected={active.id === category.id}
                    aria-controls={`service-panel-${category.id}`}
                    className={`angi-services-tab${active.id === category.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(index)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="angi-services-layout"
              role="tabpanel"
              id={`service-panel-${active.id}`}
              aria-labelledby={`service-tab-${active.id}`}
            >
              <div className="angi-services-overview">
                <h3 className="angi-services-title">{active.name}</h3>
                <p className="angi-services-description">{active.desc}</p>
                {active.image ? (
                  <div className="angi-img-bleed angi-services-image">
                    <img loading="lazy" decoding="async" src={active.image} alt={active.name} />
                  </div>
                ) : null}
              </div>

              <div className="angi-services-list-wrap">
                <ul className="angi-feature-list angi-services-list">
                  {active.services.map((service) => (
                    <li key={service} className="angi-feature-item angi-services-item">
                      <span className="angi-feature-dot angi-services-item-dot" aria-hidden="true" />
                      <span className="angi-services-item-text">{service}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/services" className="angi-btn-primary angi-services-action">
                  View All Services <FaArrowRight aria-hidden="true" className="angi-services-action-icon" />
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default ServicesSection;
