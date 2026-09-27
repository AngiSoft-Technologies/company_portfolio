import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaChevronLeft, FaChevronRight, FaStar } from 'react-icons/fa';
import { LoadingIndicator, VisualState } from '@angisoft/ui';
import { apiGet } from '@/lib/httpClient';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import './TestimonialSlider.css';

type Testimonial = {
  id?: string;
  name?: string;
  clientName?: string;
  role?: string;
  clientRole?: string;
  company?: string;
  organization?: string;
  text?: string;
  message?: string;
  quote?: string;
  review?: string;
  content?: string;
  rating?: number;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  confirmed?: boolean;
  rejected?: boolean;
  disabled?: boolean;
  draft?: boolean;
  archived?: boolean;
  featured?: boolean;
  sortOrder?: number;
  publishedAt?: string;
  createdAt?: string;
};
type SectionCopy = { badge?: string; title?: string; subtitle?: string };

const quoteText = (item: Testimonial) => (item.text || item.message || item.quote || item.review || item.content || '').toString().trim();

const TestimonialSlider = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [copy, setCopy] = useState<SectionCopy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<Testimonial[] | { testimonials?: Testimonial[]; data?: Testimonial[] }>('/testimonials'),
      apiGet<{ home?: { testimonials?: SectionCopy } }>('/site/ui'),
    ])
      .then(([testimonialResponse, uiResponse]) => {
        if (!active) return;
        const source = Array.isArray(testimonialResponse)
          ? testimonialResponse
          : testimonialResponse?.testimonials || testimonialResponse?.data || [];
        setTestimonials(source.filter(Boolean));
        setCopy(uiResponse?.home?.testimonials || null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const visible = useMemo(
    () =>
      testimonials
        .filter((item) => {
          if (item.disabled || item.draft || item.archived || item.rejected) return false;
          if (item.confirmed === false) return false;
          return quoteText(item).length > 0;
        })
        .sort((a, b) => {
          const featured = (item: Testimonial) => (item.featured ? 1 : 0) - (Number(item.sortOrder) || 0);
          const difference = featured(b) - featured(a);
          if (difference !== 0) return difference;
          const first = new Date(a.publishedAt || a.createdAt || 0).getTime();
          const second = new Date(b.publishedAt || b.createdAt || 0).getTime();
          return second - first;
        })
        .slice(0, 6),
    [testimonials],
  );

  useEffect(() => {
    setActiveIndex((value) => (value >= visible.length ? 0 : value));
  }, [visible.length]);

  const goTo = useCallback((index: number) => {
    if (visible.length === 0) return;
    setActiveIndex(((index % visible.length) + visible.length) % visible.length);
  }, [visible.length]);

  useEffect(() => {
    if (paused || reduceMotion || document.visibilityState === 'hidden' || visible.length <= 1) return undefined;
    const timer = window.setInterval(() => setActiveIndex((value) => (value + 1) % visible.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, visible.length]);

  const active = visible[Math.min(activeIndex, Math.max(visible.length - 1, 0))];
  const rating = active ? Math.max(0, Math.min(5, Number(active.rating) || 5)) : 0;

  if (loading) {
    return (
      <section className="testimonial-slider">
        <LoadingIndicator variant="pulse" size="lg" />
      </section>
    );
  }

  if (visible.length === 0) return null;

  return (
    <section
      className="testimonial-slider"
      aria-roledescription="carousel"
      aria-label="Client testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="testimonial-slider__container">
        <header className="testimonial-slider__header">
          <div>
            {copy?.badge ? <p className="testimonial-slider__eyebrow">{copy.badge}</p> : null}
            <h2>{copy?.title}</h2>
          </div>
          {visible.length > 1 ? (
            <div className="testimonial-slider__controls">
              <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Previous testimonial">
                <FaChevronLeft aria-hidden="true" />
              </button>
              <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Next testimonial">
                <FaChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </header>

        {active ? (
          <figure className="testimonial-slider__quote" key={active.id || activeIndex}>
            <div className="testimonial-slider__stars" aria-label={`${rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, index) => (
                <FaStar key={index} className={index < rating ? 'is-filled' : ''} aria-hidden="true" />
              ))}
            </div>
            <blockquote>{quoteText(active)}</blockquote>
            <figcaption>
              {active.imageUrl || active.avatarUrl ? (
                <img src={resolveAssetUrl(active.imageUrl || active.avatarUrl)} alt="" loading="lazy" decoding="async" />
              ) : (
                <span aria-hidden="true">{(active.name || active.clientName || 'C').charAt(0).toUpperCase()}</span>
              )}
              <div>
                <strong>{active.name || active.clientName}</strong>
                {(active.role || active.clientRole || active.company || active.organization) ? (
                  <small>
                    {[active.role || active.clientRole, active.company || active.organization].filter(Boolean).join(', ')}
                  </small>
                ) : null}
              </div>
            </figcaption>
          </figure>
        ) : (
          <VisualState variant="unavailable" />
        )}

        <div className="testimonial-slider__progress" role="tablist" aria-label="Testimonial slides">
          {visible.map((item, index) => (
            <button
              key={item.id || `${item.name || item.clientName}-${index}`}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Show testimonial from ${item.name || item.clientName}`}
              onClick={() => goTo(index)}
              className={index === activeIndex ? 'testimonial-slider__step is-active' : 'testimonial-slider__step'}
            >
              <span style={{ '--testimonial-progress': index <= activeIndex ? '100%' : '0%' } as CSSProperties} />
            </button>
          ))}
        </div>

        {copy?.subtitle ? <p className="testimonial-slider__subtitle">{copy.subtitle}</p> : null}
        <Link to="/testimonials" className="testimonial-slider__all">
          View all testimonials
          <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default TestimonialSlider;
