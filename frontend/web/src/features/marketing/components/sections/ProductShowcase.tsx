import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { LoadingIndicator, VisualState } from '@angisoft/ui';
import { apiGet } from '@/lib/httpClient';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import './ProductShowcase.css';

type ShowcaseStory = {
  title?: string;
  headline?: string;
  excerpt?: string;
  year?: string;
  status?: string;
  productSlug?: string;
};
type ShowcaseContent = {
  badge?: string;
  title?: string;
  subtitle?: string;
  stories?: ShowcaseStory[];
};
type Product = {
  id?: string;
  name?: string;
  slug?: string;
  category?: string | null;
  tagline?: string | null;
  description?: string | null;
  status?: string;
  logoUrl?: string | null;
  features?: string[] | null;
};
type ShowcaseItem = {
  id: string;
  name: string;
  category: string;
  status: string;
  tagline: string;
  description: string;
  logo: string;
  features: string[];
  route: string;
  year: string;
};

const ProductShowcase = () => {
  const [content, setContent] = useState<ShowcaseContent | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeIndex, setActiveIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([
      apiGet<ShowcaseContent>('/site/success-stories'),
      apiGet<Product[]>('/products'),
    ])
      .then(([showcaseContent, productList]) => {
        if (!active) return;
        setContent(showcaseContent);
        setProducts(Array.isArray(productList) ? productList : []);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const items = useMemo<ShowcaseItem[]>(() => {
    const storyBySlug = new Map<string, ShowcaseStory>();
    (content?.stories || []).forEach((story) => {
      if (story.productSlug) storyBySlug.set(story.productSlug, story);
    });

    return products
      .map((product, index) => {
        const story = product.slug ? storyBySlug.get(product.slug) : undefined;
        return {
          id: product.id || product.slug || `product-${index}`,
          name: product.name || story?.title || '',
          category: product.category || '',
          status: story?.status || product.status || '',
          tagline: product.tagline || story?.headline || '',
          description: story?.excerpt || product.description || '',
          logo: resolveAssetUrl(product.logoUrl || ''),
          features: (product.features || []).slice(0, 6),
          route: `/products/${product.slug || ''}`,
          year: story?.year || '',
        };
      })
      .filter((item) => item.name && item.route !== '/products/');
  }, [content, products]);

  useEffect(() => {
    setActiveIndex((value) => (value >= items.length ? 0 : value));
  }, [items.length]);

  const active = items[Math.min(activeIndex, Math.max(items.length - 1, 0))];
  const previewFeatures = active?.features.slice(0, 4) || [];

  return (
    <section id="products" className="product-showcase" data-state={status}>
      <div className="product-showcase__container">
        <header className="product-showcase__header">
          <div>
            {content?.badge ? <p className="product-showcase__eyebrow">{content.badge}</p> : null}
            <h2 className="product-showcase__title">{content?.title}</h2>
          </div>
          {content?.subtitle ? <p className="product-showcase__subtitle">{content.subtitle}</p> : null}
        </header>

        {status === 'loading' ? <LoadingIndicator variant="skeleton" size="lg" /> : null}
        {status === 'error' ? <VisualState variant="error" onRetry={() => setReloadToken((value) => value + 1)} /> : null}
        {status === 'ready' && items.length === 0 ? <VisualState variant="unavailable" /> : null}

        {active ? (
          <div className="product-showcase__layout">
            <article className="product-showcase__feature">
              <div className="product-showcase__system" aria-label={`${active.category} system preview`}>
                <div className="product-showcase__system-bar">
                  <span className="product-showcase__system-dots" aria-hidden="true">
                    <span /><span /><span />
                  </span>
                  <span className="product-showcase__system-title">{active.category || active.name}</span>
                  <span className="product-showcase__system-status">{active.status}</span>
                </div>
                <div className="product-showcase__system-body">
                  <div className="product-showcase__system-side">
                    {active.logo ? <img src={active.logo} alt="" loading="lazy" decoding="async" /> : null}
                    <span>{active.tagline}</span>
                  </div>
                  <div className="product-showcase__system-main">
                    <div className="product-showcase__system-metrics">
                      <div><small>Modules</small><strong>{active.features.length || 1}</strong></div>
                      <div><small>Status</small><strong>{active.status || 'Direction'}</strong></div>
                      <div><small>Scope</small><strong>{active.year || active.category}</strong></div>
                    </div>
                    <div className="product-showcase__system-rows">
                      {previewFeatures.map((feature, index) => (
                        <div key={feature}>
                          <span>{feature}</span>
                          <span style={{ width: `${88 - index * 12}%` }} aria-hidden="true" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="product-showcase__feature-content">
                <div className="product-showcase__meta">
                  {active.category ? <span>{active.category}</span> : null}
                  {active.status ? <span>{active.status}</span> : null}
                </div>
                <h3>{active.category || active.name}</h3>
                {active.tagline ? <p className="product-showcase__tagline">{active.tagline}</p> : null}
                {active.description ? <p className="product-showcase__description">{active.description}</p> : null}
                <Link to={active.route} className="product-showcase__action">
                  View direction
                  <FaArrowRight aria-hidden="true" />
                </Link>
              </div>
            </article>

            <div className="product-showcase__selector" role="tablist" aria-label="Product directions">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={index === activeIndex ? 'product-showcase__option is-active' : 'product-showcase__option'}
                >
                  {item.logo ? <img src={item.logo} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{item.name.slice(0, 2).toUpperCase()}</span>}
                  <span>
                    <strong>{item.category || item.name}</strong>
                    <small>{item.status}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ProductShowcase;
