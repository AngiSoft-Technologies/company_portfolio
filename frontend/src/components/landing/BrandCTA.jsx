import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarCheck, FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useUploads } from '../../hooks/useUploads';
import { resolveAssetUrl } from '../../utils/constants';
import '../../css/BrandCTA.css';

// Static fallback kept outside the component so it is created once.
// Spelling matches the physical files (Muggs, NoteBooks, Capes, Envelop).
const FALLBACK_MERCH = [
  { id: 'angisoft-tshirt', filename: 'AngiSoft-T-Shirts-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-T-Shirts-Design.png'), alt: 'AngiSoft T-Shirts' },
  { id: 'angisoft-hoodie', filename: 'AngiSoft-Hoodie-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-Hoodie-Design.png'), alt: 'AngiSoft Hoodie' },
  { id: 'angisoft-muggs', filename: 'AngiSoft-Muggs-and-cups-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-Muggs-and-cups-Design.png'), alt: 'AngiSoft Mugs & Cups' },
  { id: 'angisoft-notebooks', filename: 'AngiSoft-NoteBooks-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-NoteBooks-Design.png'), alt: 'AngiSoft Notebooks' },
  { id: 'angisoft-car', filename: 'AngiSoft-Car-Branding.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-Car-Branding.png'), alt: 'AngiSoft Car Branding' },
  { id: 'angisoft-capes', filename: 'AngiSoft-Capes-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-Capes-Design.png'), alt: 'AngiSoft Caps' },
  { id: 'angisoft-pens', filename: 'AngiSoft-Pens-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-Pens-Design.png'), alt: 'AngiSoft Pens' },
  { id: 'angisoft-stickers', filename: 'AngiSoft-Stickers-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-Stickers-Design.png'), alt: 'AngiSoft Stickers' },
  { id: 'angisoft-envelop', filename: 'AngiSoft-Envelop-Design.png', src: resolveAssetUrl('/uploads/public/images/Branding/AngiSoft-Envelop-Design.png'), alt: 'AngiSoft Envelope' },
  { id: 'angisoft-business-card', filename: 'AngiSoft-Business-Card-Front-View.png', src: resolveAssetUrl('/uploads/public/images/Business-Cards/AngiSoft-Business-Card-Front-View.png'), alt: 'Business Card' },
];

// Safe URL extraction across possible backend shapes.
const canonicalUrl = (f) => f?.url || f?.publicUrl || f?.fileUrl || f?.path || null;

// Keep only branding/business-card uploads using structured metadata when present.
const isBrandFolder = (f) => {
  if (!f) return false;
  const folder = `${f.ownerType || ''} ${f.folder || ''} ${f.category || ''}`.toLowerCase();
  if (/branding/.test(folder) || /business\s*cards?/.test(folder)) return true;
  const raw = canonicalUrl(f) || f.filename || '';
  return /branding|business\s*cards?/i.test(raw);
};

const AUTOPLAY_MS = 3500;

const BrandCTA = () => {
  const { files } = useUploads('general');
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Build the final slide list: backend-approved uploads first, then missing
  // fallback items — deduped by canonical URL so they never compete.
  const backendSlides = (files || [])
    .filter(isBrandFolder)
    .map((f) => ({
      id: f.id || f.filename,
      src: resolveAssetUrl(canonicalUrl(f)) || f.filename,
      alt: f.altText || f.title || f.filename || 'AngiSoft Brand',
    }));

  const backendUrls = new Set(backendSlides.map((s) => s.src));
  const fallbackSlides = FALLBACK_MERCH.filter((m) => !backendUrls.has(m.src)).map((m) => ({
    id: m.id,
    src: m.src,
    alt: m.alt,
  }));

  const merch = [...backendSlides, ...fallbackSlides];
  const hasSlides = merch.length > 0;

  // Clamp current when the list shrinks.
  useEffect(() => {
    setCurrent((value) => (merch.length === 0 ? 0 : Math.min(value, merch.length - 1)));
  }, [merch.length]);

  // Track reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Track tab visibility to pause autoplay when hidden.
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const autoplayPaused =
    hovered || focused || hidden || prefersReducedMotion || merch.length <= 1;

  // Autoplay timer with all required dependencies.
  useEffect(() => {
    if (!hasSlides || autoplayPaused) return undefined;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % merch.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [autoplayPaused, hasSlides, merch.length]);

  const goTo = useCallback(
    (index) => {
      if (!hasSlides) return;
      setCurrent(((index % merch.length) + merch.length) % merch.length);
    },
    [hasSlides, merch.length]
  );
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  // Keyboard support when focus is inside the carousel.
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCurrent(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setCurrent(merch.length - 1);
    }
  };

  const activeSlide = hasSlides ? merch[current] : null;

  return (
    <section className="angi-brand-cta">
      <div className="angi-brand-cta-glow angi-brand-cta-glow--primary" aria-hidden="true" />
      <div className="angi-brand-cta-glow angi-brand-cta-glow--secondary" aria-hidden="true" />
      <div className="angi-brand-cta-grid" aria-hidden="true" />

      <div className="angi-brand-cta-container">
        <div className="angi-brand-cta-layout">
          {/* LEFT: copy */}
          <div className="angi-brand-cta-copy">
            <div className="angi-brand-cta-badge">
              Innovate &middot; Build &middot; Empower
            </div>

            <h2 className="angi-brand-cta-title">
              From planning to deployment,{' '}
              <span className="angi-brand-cta-title-highlight">
                practical, secure and maintainable
              </span>{' '}
              digital solutions.
            </h2>

            <p className="angi-brand-cta-description">
              We combine software engineering, data skills and practical digital
              support to help clients move from ideas and manual workflows to
              working solutions.
            </p>

            <div className="angi-brand-cta-actions">
              <Link
                to="/book"
                className="angi-brand-cta-action angi-brand-cta-action--primary"
              >
                <FaCalendarCheck aria-hidden="true" />
                <span>Book a Discovery Call</span>
              </Link>

              <Link
                to="/services"
                className="angi-brand-cta-action angi-brand-cta-action--secondary"
              >
                <span>Explore Services</span>
                <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* RIGHT: merchandise carousel */}
          {hasSlides ? (
            <div
              className="angi-brand-cta-carousel"
              role="region"
              aria-roledescription="carousel"
              aria-label="AngiSoft brand merchandise"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocusCapture={() => setFocused(true)}
              onBlurCapture={() => setFocused(false)}
              onKeyDown={onKeyDown}
            >
              <div className={`angi-brand-cta-frame ${autoplayPaused ? 'is-paused' : ''}`}>
                <div className="angi-brand-cta-viewport">
                  {merch.map((slide, i) => {
                    const isActive = i === current;
                    return (
                      <div
                        key={slide.id || slide.src}
                        className={`angi-brand-cta-slide ${isActive ? 'is-active' : ''}`}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${i + 1} of ${merch.length}`}
                        aria-hidden={!isActive}
                      >
                        <img
                          src={resolveAssetUrl(slide.src)}
                          alt={slide.alt}
                          loading={i === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="angi-brand-cta-slide-image"
                        />
                      </div>
                    );
                  })}

                  <div className="angi-brand-cta-overlay" aria-hidden="true" />
                </div>

                <button
                  type="button"
                  className="angi-brand-cta-arrow angi-brand-cta-arrow--previous"
                  onClick={prev}
                  aria-label="Show previous brand image"
                >
                  <FaChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="angi-brand-cta-arrow angi-brand-cta-arrow--next"
                  onClick={next}
                  aria-label="Show next brand image"
                >
                  <FaChevronRight aria-hidden="true" />
                </button>

                {activeSlide && (
                  <div className="angi-brand-cta-caption">
                    <span className="angi-brand-cta-caption-title">{activeSlide.alt}</span>
                    <span className="angi-brand-cta-caption-label">AngiSoft Brand</span>
                  </div>
                )}
              </div>

              <div className="angi-brand-cta-dots">
                {merch.map((slide, i) => {
                  const isActive = i === current;
                  return (
                    <button
                      type="button"
                      key={slide.id || slide.src}
                      className={`angi-brand-cta-dot ${isActive ? 'is-active' : ''}`}
                      onClick={() => goTo(i)}
                      aria-label={`Show slide ${i + 1}: ${slide.alt}`}
                      aria-current={isActive ? 'true' : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="angi-brand-cta-status">
              AngiSoft brand merchandise coming soon.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BrandCTA;
