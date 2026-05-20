import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { FaChevronLeft, FaChevronRight, FaPlay, FaArrowRight } from 'react-icons/fa';
import { apiGet } from '../../js/httpClient';
import { resolveAssetUrl } from '../../utils/constants';

const defaultSlides = [
  {
    id: 0,
    type: 'video',
    video: '/videos/Matrix_rain_code.mp4',
    poster: '/images/Software-Development-Company.jpg',
    badge: 'AngiSoft Technologies',
    headline: 'Building Tomorrow\'s',
    headlineHighlight: 'Digital Solutions',
    tagline: 'We transform ideas into powerful software products that drive business growth and innovation across Africa.',
    primaryCta: { label: 'Start Your Project', to: '/book' },
    secondaryCta: { label: 'Our Products', to: '/products' },
  },
  {
    id: 1,
    type: 'image',
    image: '/images/Software-Development-Company.jpg',
    badge: 'Our Products',
    headline: 'Purpose-Built',
    headlineHighlight: 'Software',
    tagline: 'PetroFlow, DukaFlow, KejaLink, AngiTunes — solutions designed for real business challenges.',
    primaryCta: { label: 'Explore Products', to: '/products' },
    secondaryCta: { label: 'See Services', to: '/services' },
  },
  {
    id: 2,
    type: 'image',
    image: '/images/programming-background-with-person-working-with-codes-computer.jpg',
    badge: 'Innovate. Build. Empower.',
    headline: 'Technology That',
    headlineHighlight: 'Moves Businesses',
    tagline: 'From fuel stations to property management — our platforms power industries across East Africa.',
    primaryCta: { label: 'Book a Consultation', to: '/book' },
    secondaryCta: { label: 'View Projects', to: '/projects' },
  },
  {
    id: 3,
    type: 'image',
    image: '/images/developer-8829735_1280.jpg',
    badge: 'Our Team',
    headline: 'Expert Developers,',
    headlineHighlight: 'Real Results',
    tagline: 'A passionate team delivering custom software, data analytics, and cybersecurity solutions.',
    primaryCta: { label: 'Meet the Team', to: '/staff' },
    secondaryCta: { label: 'Testimonials', to: '/testimonials' },
  },
];

const HeroSlider = () => {
  const { colors, mode } = useTheme();
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [branding, setBranding] = useState(null);
  const [hero, setHero] = useState(null);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const isDark = mode === 'dark';

  // Reduced motion check
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch branding and hero CMS content
  useEffect(() => {
    Promise.all([
      apiGet('/site/branding').catch(() => null),
      apiGet('/site/hero').catch(() => null),
    ]).then(([brandingData, heroData]) => {
      setBranding(brandingData);
      setHero(heroData);
    });
  }, []);

  const cmsSlides = hero?.slides?.length
    ? hero.slides.map((item, index) => {
      const video = resolveAssetUrl(item.videoUrl || item.video);
      const image = resolveAssetUrl(item.imageUrl || item.image || item.poster || hero.backgroundImage);
      const poster = resolveAssetUrl(item.poster || item.imageUrl || item.image || hero.backgroundImage);
      const primaryCta = item.primaryCta || hero.ctaPrimary;
      const secondaryCta = item.secondaryCta || hero.ctaSecondary;

      return {
        id: item.id ?? index,
        type: video ? 'video' : 'image',
        video,
        poster,
        image,
        badge: item.badge || hero.eyebrow || 'AngiSoft Technologies',
        headline: item.title || item.headline || hero.headline,
        headlineHighlight: item.highlight || item.headlineHighlight || hero.headlineHighlight,
        tagline: item.description || item.tagline || hero.tagline,
        primaryCta: { label: item.ctaLabel || primaryCta?.label || primaryCta?.text || 'Start Your Project', to: item.ctaUrl || primaryCta?.to || primaryCta?.link || '/booking' },
        secondaryCta: { label: item.secondaryCtaLabel || secondaryCta?.label || secondaryCta?.text || 'Explore Products', to: item.secondaryCtaUrl || secondaryCta?.to || secondaryCta?.link || '/products' },
      };
    })
    : null;
  const slides = cmsSlides || defaultSlides;

  const brandName = branding?.siteName || 'AngiSoft Technologies';

  // Autoplay
  useEffect(() => {
    if (!isPlaying || reduceMotion) return;
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, reduceMotion]);

  const goTo = useCallback((idx) => {
    setCurrent(idx);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 12000);
  }, []);

  const prev = useCallback(() => goTo(current === 0 ? slides.length - 1 : current - 1), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);

  // Autoplay video when video slide is active
  useEffect(() => {
    const slide = slides[current];
    if (slide.type === 'video' && videoRef.current && !reduceMotion) {
      videoRef.current.play().catch(() => {});
    }
  }, [current, reduceMotion]);

  const slide = slides[current];

  return (
    <section className="hero-slider" aria-label="Hero">
      {/* Background */}
      <div className="hero-slider__bg">
        {slide.type === 'video' && !reduceMotion ? (
          <video
            ref={videoRef}
            className="hero-slider__video"
            autoPlay
            loop
            muted
            playsInline
            poster={resolveAssetUrl(slide.poster)}
            preload="metadata"
          >
            <source src={resolveAssetUrl(slide.video)} type="video/mp4" />
          </video>
        ) : (
          <div
            className="hero-slider__image"
            style={{ backgroundImage: `url(${resolveAssetUrl(slide.image || slide.poster)})` }}
          />
        )}
        {/* Bottom fade into page bg */}
        <div className="hero-slider__fade-bottom" />
        {/* Dark overlay for readability */}
        <div
          className="hero-slider__overlay"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(7,20,43,0.82) 0%, rgba(7,20,43,0.68) 55%, rgba(7,20,43,0.78) 100%)'
              : 'linear-gradient(135deg, rgba(7,20,43,0.72) 0%, rgba(7,20,43,0.55) 55%, rgba(7,20,43,0.68) 100%)',
          }}
        />
        {/* Subtle grid texture */}
        <div className="hero-slider__grid" />
      </div>

      {/* Content */}
      <div className="hero-slider__content">
        {/* Brand name */}
        <div className="hero-slider__brand">
          <img
            src="/images/Logos/AngiSoft Logo Symbol Only.png"
            alt="AngiSoft"
            className="hero-slider__brand-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span>{brandName}</span>
        </div>

        {/* Badge */}
        {slide.badge && (
          <div
            className="hero-slider__badge"
            style={{ borderColor: `${colors.primary}40`, color: colors.primary }}
          >
            {slide.badge}
          </div>
        )}

        {/* Headline */}
        <h1 className="hero-slider__headline">
          <span>{slide.headline}</span>{' '}
          <span style={{
            background: `linear-gradient(135deg, ${colors.primary}, #39FF6A)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {slide.headlineHighlight}
          </span>
        </h1>

        {/* Tagline */}
        <p className="hero-slider__tagline">{slide.tagline}</p>

        {/* CTAs */}
        <div className="hero-slider__ctas">
          <Link
            to={slide.primaryCta.to}
            className="hero-slider__cta hero-slider__cta--primary"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#39FF6A'})`,
            }}
          >
            {slide.primaryCta.label}
            <FaArrowRight />
          </Link>
          <Link
            to={slide.secondaryCta.to}
            className="hero-slider__cta hero-slider__cta--secondary"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
          >
            {slide.secondaryCta.label}
          </Link>
        </div>

        {/* Dots */}
        <div className="hero-slider__dots" role="tablist">
          {slides.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Slide ${i + 1}`}
              className={`hero-slider__dot ${i === current ? 'hero-slider__dot--active' : ''}`}
              style={i === current ? { backgroundColor: colors.primary } : {}}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>

      {/* Arrow buttons */}
      <button
        className="hero-slider__arrow hero-slider__arrow--prev"
        onClick={prev}
        aria-label="Previous slide"
      >
        <FaChevronLeft />
      </button>
      <button
        className="hero-slider__arrow hero-slider__arrow--next"
        onClick={next}
        aria-label="Next slide"
      >
        <FaChevronRight />
      </button>

      {/* Styles */}
      <style>{`
        .hero-slider {
          position: relative;
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: ${isDark ? '#07142B' : '#07142B'};
        }
        .hero-slider__bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .hero-slider__video,
        .hero-slider__image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hero-slider__image {
          background-size: cover;
          background-position: center;
        }
        .hero-slider__fade-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 35%;
          background: linear-gradient(to bottom, transparent 0%, ${isDark ? '#07142B' : '#07142B'} 100%);
          z-index: 2;
        }
        .hero-slider__overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .hero-slider__grid {
          position: absolute;
          inset: 0;
          z-index: 1;
          background-image:
            linear-gradient(rgba(0, 194, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 194, 255, 0.04) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .hero-slider__content {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 900px;
          padding: 6rem 1.5rem 4rem;
          text-align: center;
          color: #fff;
        }
        .hero-slider__brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.85;
        }
        .hero-slider__brand-logo {
          width: 28px;
          height: 28px;
          object-fit: contain;
          filter: brightness(1.2);
        }
        .hero-slider__badge {
          display: inline-block;
          padding: 0.4rem 1.2rem;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
          border: 1px solid;
          margin-bottom: 1.5rem;
          background: rgba(0,0,0,0.2);
          backdrop-filter: blur(8px);
        }
        .hero-slider__headline {
          font-size: clamp(2rem, 6vw, 3.8rem);
          font-weight: 800;
          line-height: 1.12;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }
        .hero-slider__tagline {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: rgba(255,255,255,0.72);
          max-width: 640px;
          margin: 0 auto 2.5rem;
          line-height: 1.6;
        }
        .hero-slider__ctas {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3rem;
        }
        .hero-slider__cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 1.8rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          color: #fff;
        }
        .hero-slider__cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
        .hero-slider__cta--secondary {
          background: rgba(255,255,255,0.08);
          border: 1px solid;
          backdrop-filter: blur(8px);
        }
        .hero-slider__dots {
          display: flex;
          gap: 0.6rem;
          justify-content: center;
        }
        .hero-slider__dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.25);
          cursor: pointer;
          transition: background 0.3s, transform 0.3s;
        }
        .hero-slider__dot--active {
          transform: scale(1.3);
        }
        .hero-slider__arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 4;
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .hero-slider__arrow:hover {
          background: rgba(0,0,0,0.5);
        }
        .hero-slider__arrow--prev { left: 1rem; }
        .hero-slider__arrow--next { right: 1rem; }
        @media (max-width: 640px) {
          .hero-slider__arrow { display: none; }
          .hero-slider__content { padding: 5rem 1rem 3rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-slider__video { display: none; }
        }
      `}</style>
    </section>
  );
};

export default HeroSlider;
