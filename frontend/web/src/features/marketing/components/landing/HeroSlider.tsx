import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { LoadingIndicator, VisualState } from '@angisoft/ui';
import { apiGet } from '@/lib/httpClient';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import iconRegistry from '@/lib/marketing/iconRegistry';
import './HeroSlider.css';

type HeroCta = { label?: string; text?: string; to?: string; link?: string };
type HeroSlide = {
  id?: number | string;
  type?: string;
  video?: string | null;
  videoUrl?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  poster?: string | null;
  badge?: string;
  headline?: string;
  title?: string;
  headlineHighlight?: string;
  highlight?: string;
  tagline?: string;
  description?: string;
  primaryCta?: HeroCta | null;
  secondaryCta?: HeroCta | null;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
};
type HeroStat = { icon?: string; label?: string; value?: number | string; suffix?: string };
type HeroContent = {
  slides?: HeroSlide[];
  stats?: HeroStat[];
  backgroundImage?: string;
  ctaPrimary?: HeroCta | null;
  ctaSecondary?: HeroCta | null;
  eyebrow?: string;
  headline?: string;
  headlineHighlight?: string;
  tagline?: string;
};

const normalizeCta = (cta: HeroCta | null | undefined, label?: string, url?: string) => {
  if (!cta && !label) return null;
  return {
    label: label || cta?.label || cta?.text || '',
    to: url || cta?.to || cta?.link || '/',
  };
};

const HeroSlider = () => {
  const [hero, setHero] = useState<HeroContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<HeroContent>('/site/hero')
      .then((heroData) => {
        if (!active) return;
        setHero(heroData);
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

  const slides = useMemo(() => {
    const source = hero?.slides || [];
    return source.map((item, index) => {
      const video = resolveAssetUrl(item.videoUrl || item.video || '');
      const image = resolveAssetUrl(item.imageUrl || item.image || item.poster || hero?.backgroundImage || '');
      return {
        id: item.id ?? index,
        type: video ? 'video' : 'image',
        video,
        image,
        poster: resolveAssetUrl(item.poster || item.imageUrl || item.image || ''),
        badge: item.badge && item.badge !== 'AngiSoft Technologies' ? item.badge : (hero?.eyebrow && hero.eyebrow !== 'AngiSoft Technologies' ? hero.eyebrow : ''),
        headline: item.headline || item.title || hero?.headline || '',
        highlight: item.headlineHighlight || item.highlight || hero?.headlineHighlight || '',
        tagline: item.description || item.tagline || hero?.tagline || '',
        primaryCta: normalizeCta(item.primaryCta || hero?.ctaPrimary, item.ctaLabel, item.ctaUrl),
        secondaryCta: normalizeCta(item.secondaryCta || hero?.ctaSecondary, item.secondaryCtaLabel, item.secondaryCtaUrl),
      };
    });
  }, [hero]);

  useEffect(() => {
    setCurrent((value) => (value >= slides.length ? 0 : value));
  }, [slides.length]);

  const goTo = useCallback((index: number) => {
    if (slides.length === 0) return;
    setCurrent(((index % slides.length) + slides.length) % slides.length);
    setPaused(true);
    window.setTimeout(() => setPaused(false), 9000);
  }, [slides.length]);

  useEffect(() => {
    if (paused || reduceMotion || document.visibilityState === 'hidden' || slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setCurrent((value) => (value + 1) % slides.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') setPaused(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const slide = slides[current];
  const stats = useMemo(() => (hero?.stats || []).slice(0, 4), [hero]);

  useEffect(() => {
    if (!slide || slide.type !== 'video' || reduceMotion) return;
    videoRef.current?.play().catch(() => undefined);
  }, [reduceMotion, slide]);

  if (loading) {
    return (
      <section className="hero-slider hero-slider--pending">
        <LoadingIndicator variant="orbit" size="xl" />
      </section>
    );
  }

  if (!slide) {
    return (
      <section className="hero-slider hero-slider--pending">
        <VisualState variant="unavailable" />
      </section>
    );
  }

  return (
    <section
      className="hero-slider"
      aria-roledescription="carousel"
      aria-label="AngiSoft highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slider__media" aria-hidden="true">
        {slide.type === 'video' && !reduceMotion ? (
          <video
            ref={videoRef}
            className="hero-slider__video"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            controlsList="nodownload nofullscreen noremoteplayback"
            poster={slide.poster}
            preload="metadata"
          >
            <source src={slide.video || ''} type="video/mp4" />
          </video>
        ) : (
          <img
            key={slide.id}
            src={slide.image || slide.poster}
            alt=""
            className="hero-slider__image"
            loading="eager"
            decoding="async"
          />
        )}
        <div className="hero-slider__scrim" />
      </div>

      <div className="hero-slider__content">
        <div className="hero-slider__grid">
          <div className="hero-slider__primary">
            {slide.badge ? <div className="hero-slider__badge">{slide.badge}</div> : null}
            <h1 className="hero-slider__headline">
              {slide.headline}
              {slide.highlight ? <span className="hero-slider__headline-accent"> {slide.highlight}</span> : null}
            </h1>
            {slide.tagline ? <p className="hero-slider__tagline">{slide.tagline}</p> : null}

            {stats.length > 0 ? (
              <dl className="hero-slider__stats">
                {stats.map((stat, index) => {
                  const Icon = stat.icon ? iconRegistry[stat.icon] : null;
                  return (
                    <div key={`${stat.label}-${index}`} className="hero-slider__stat">
                      {Icon ? <Icon aria-hidden="true" /> : null}
                      <div>
                        <dt>{stat.label}</dt>
                        <dd>
                          {stat.value}
                          {stat.suffix}
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            ) : null}

            <div className="hero-slider__navigation" role="tablist" aria-label="Hero slides">
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === current}
                  aria-label={`Show highlight ${index + 1}`}
                  className={index === current ? 'hero-slider__tab is-active' : 'hero-slider__tab'}
                  onClick={() => goTo(index)}
                >
                  <span style={{ '--hero-progress': index <= current ? '100%' : '0%' } as CSSProperties} />
                </button>
              ))}
            </div>
          </div>

          <aside className="hero-slider__widget" aria-live="polite">
            <div className="hero-slider__widget-header">
              <span>Live context</span>
              <span>{current + 1} / {slides.length}</span>
            </div>
            <div className="hero-slider__widget-item">
              <small>Focus</small>
              <strong>{slide.badge || ''}</strong>
            </div>
            <div className="hero-slider__widget-item">
              <small>Outcome</small>
              <strong>
                {slide.headline}
                {slide.highlight ? ` ${slide.highlight}` : ''}
              </strong>
            </div>
            <div className="hero-slider__widget-item">
              <small>Next step</small>
              <strong>{slide.primaryCta?.label || slide.secondaryCta?.label || ''}</strong>
            </div>
            <div className="hero-slider__widget-item">
              <small>Supporting path</small>
              <strong>{slide.secondaryCta?.label || slide.primaryCta?.label || ''}</strong>
            </div>
            <div className="hero-slider__progress" aria-hidden="true">
              <span style={{ width: `${((current + 1) / slides.length) * 100}%` }} />
            </div>
            <div className="hero-slider__widget-actions">
              {slide.primaryCta ? (
                <Link to={slide.primaryCta.to} className="hero-slider__action hero-slider__action--primary">
                  {slide.primaryCta.label}
                  <FaArrowRight aria-hidden="true" />
                </Link>
              ) : null}
              {slide.secondaryCta ? (
                <Link to={slide.secondaryCta.to} className="hero-slider__action hero-slider__action--secondary">
                  {slide.secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="hero-slider__arrow hero-slider__arrow--previous"
            onClick={() => goTo(current - 1)}
            aria-label="Previous highlight"
          >
            <FaChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hero-slider__arrow hero-slider__arrow--next"
            onClick={() => goTo(current + 1)}
            aria-label="Next highlight"
          >
            <FaChevronRight aria-hidden="true" />
          </button>
        </>
      ) : null}
    </section>
  );
};

export default HeroSlider;
