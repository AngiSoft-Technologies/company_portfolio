import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import { apiGet } from '../../js/httpClient';
import { useSiteCopy } from '../../hooks/useSiteCopy';
import { APP_NAME } from '../../utils/constants';
import {
  FaRocket,
  FaArrowRight,
  FaCalendarCheck,
  FaUsers,
  FaProjectDiagram,
  FaAward,
  FaHeadset,
  FaChevronDown
} from 'react-icons/fa';
import { AnimatedCounter, ScrollReveal } from '../modern';
import '../../css/Hero.css';

// Icon mapping for dynamic icons from the database.
const iconMap = {
  FaUsers,
  FaProjectDiagram,
  FaAward,
  FaHeadset,
  FaRocket,
  FaCalendarCheck
};

// Stable slug so stat keys never shift on re-render.
const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `stat-${Math.random().toString(36).slice(2, 8)}`;

// Accept a raw object OR a wrapper { data | hero }.
const extractHero = (response) => {
  if (!response || typeof response !== 'object') return {};
  return response.data || response.hero || response;
};
const extractBranding = (response) => {
  if (!response || typeof response !== 'object') return null;
  return response.data || response.branding || response;
};

// Truthful fallback used when the API fails or returns no usable content.
// No fabricated metrics — only verifiable facts about AngiSoft.
const getDefaultHeroData = () => ({
  badge: 'Innovate • Build • Empower',
  welcomeLabel: 'Welcome to',
  headline: "Building Tomorrow's",
  headlineHighlight: "Digital Solutions",
  subheadline: 'Today',
  tagline:
    'We transform ideas into powerful software products that drive business growth and innovation across Africa and beyond.',
  ctaPrimary: { text: 'Start Your Project', link: '/book' },
  ctaSecondary: { text: 'View Our Work', link: '/products' },
  stats: [
    { id: 'founded', value: 2024, suffix: '', label: 'Officially Founded', icon: 'FaRocket', type: 'year' },
    { id: 'service-areas', value: 6, suffix: '+', label: 'Core Service Areas', icon: 'FaProjectDiagram', type: 'count' },
    { id: 'products', value: 4, suffix: '', label: 'Product Ecosystems', icon: 'FaAward', type: 'count' },
    { id: 'principles', value: 3, suffix: '', label: 'Brand Principles', icon: 'FaHeadset', type: 'count' }
  ],
  backgroundVideo: '/videos/Matrix_rain_code.mp4',
  backgroundImage: '/uploads/public/images/Software-Development-Company.jpg'
});

const Hero = () => {
  const { colors } = useTheme();
  const { copy: uiCopy } = useSiteCopy();
  const videoRef = useRef(null);
  const mouseMoveFrameRef = useRef(null);
  const pendingMousePositionRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [heroData, setHeroData] = useState(getDefaultHeroData());
  const [branding, setBranding] = useState(null);

  // Load hero + branding content (truthful fallback renders immediately).
  useEffect(() => {
    let active = true;

    const fetchHero = async () => {
      try {
        const [hero, brand] = await Promise.all([
          apiGet('/site/hero'),
          apiGet('/site/branding')
        ]);
        if (!active) return;
        setHeroData(extractHero(hero) || getDefaultHeroData());
        setBranding(extractBranding(brand) || null);
      } catch (error) {
        if (!active) return;
        console.error('Failed to load hero content:', error);
        setHeroData(getDefaultHeroData());
      }
    };

    fetchHero();
    return () => {
      active = false;
    };
  }, []);

  // Track reduced-motion preference.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  // Mouse parallax — only on devices that truly hover with a fine pointer.
  useEffect(() => {
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const handleMouseMove = (e) => {
      pendingMousePositionRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      };
      if (mouseMoveFrameRef.current) return;
      mouseMoveFrameRef.current = requestAnimationFrame(() => {
        setMousePosition(pendingMousePositionRef.current);
        mouseMoveFrameRef.current = null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseMoveFrameRef.current) cancelAnimationFrame(mouseMoveFrameRef.current);
    };
  }, [reduceMotion]);

  const content = heroData;
  const heroCopy = uiCopy?.home?.hero || {};
  const brandName = branding?.siteName || APP_NAME;
  const backgroundImage = content?.backgroundImage;
  const backgroundVideo = content?.backgroundVideo;
  const hasVideo = Boolean(backgroundVideo);

  const stats = (content?.stats || []).map((s) => ({
    ...s,
    id: s.id || s.slug || slugify(s.label),
    icon: iconMap[s.icon] || FaRocket
  }));

  // Cap parallax travel a touch and keep it subtle.
  const radialX = 50 + mousePosition.x;
  const radialY = 50 + mousePosition.y;

  // ── Video autoplay handling (no JS-driven layout) ──
  const handleVideoReady = useCallback(() => setVideoLoaded(true), []);
  const handleVideoError = useCallback(() => setVideoLoaded(false), []);

  useEffect(() => {
    if (!backgroundVideo || reduceMotion) {
      setVideoLoaded(false);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    const playVideo = async () => {
      try {
        await video.play();
        setVideoLoaded(true);
      } catch {
        setVideoLoaded(false);
      }
    };
    const playTimeout = setTimeout(playVideo, 500);
    return () => clearTimeout(playTimeout);
  }, [backgroundVideo, reduceMotion]);

  /* ── HeroBackground ── */
  const HeroBackground = (
    <div className="angi-hero-background" aria-hidden="true">
      {backgroundImage && (
        <img
          className="angi-hero-poster"
          src={backgroundImage}
          alt=""
        />
      )}
      {hasVideo && !reduceMotion && (
        <video
          ref={videoRef}
          className="angi-hero-video angi-video-bg"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback"
          preload="metadata"
          tabIndex={-1}
          onLoadedData={handleVideoReady}
          onPlaying={handleVideoReady}
          onError={handleVideoError}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      )}
    </div>
  );

  /* ── HeroBadge ── */
  const HeroBadge = content?.badge || heroCopy?.badge ? (
    <ScrollReveal animation="fadeDown" delay={0}>
      <div className="angi-hero-badge">
        <span className="angi-hero-badge-dot" aria-hidden="true" />
        {content?.badge || heroCopy?.badge}
      </div>
    </ScrollReveal>
  ) : null;

  /* ── HeroActions ── */
  const primaryCta = content?.ctaPrimary;
  const secondaryCta = content?.ctaSecondary;
  const HeroActions = (
    <ScrollReveal animation="fadeUp" delay={500}>
      <div className="angi-hero-actions">
        {primaryCta?.text && primaryCta?.link && (
          <Link to={primaryCta.link} className="angi-hero-action angi-hero-action--primary">
            <FaRocket className="angi-hero-action-icon" />
            {primaryCta.text}
            <FaArrowRight className="angi-hero-action-arrow" />
          </Link>
        )}
        {secondaryCta?.text && secondaryCta?.link && (
          <Link to={secondaryCta.link} className="angi-hero-action angi-hero-action--secondary">
            <FaCalendarCheck className="angi-hero-action-icon" />
            {secondaryCta.text}
          </Link>
        )}
      </div>
    </ScrollReveal>
  );

  /* ── HeroStats ── */
  const HeroStats = stats.length > 0 && (
    <ScrollReveal animation="fadeUp" delay={700}>
      <div className="angi-hero-stats">
        {stats.map((stat) => (
          <article key={stat.id} className="angi-hero-stat">
            <div className="angi-hero-stat-icon" aria-hidden="true">
              <stat.icon />
            </div>
            <p className="angi-hero-stat-value">
              <AnimatedCounter
                end={stat.value}
                valueType={stat.valueType || stat.type}
                suffix={stat.suffix}
                label={stat.label}
              />
            </p>
            <p className="angi-hero-stat-label">{stat.label}</p>
          </article>
        ))}
      </div>
    </ScrollReveal>
  );

  /* ── HeroScrollIndicator ── */
  const HeroScrollIndicator = (
    <a className="angi-hero-scroll" href="#key-facts" aria-label="Scroll to key facts">
      <span className="angi-hero-scroll-label">Scroll</span>
      <FaChevronDown aria-hidden="true" />
    </a>
  );

  return (
    <section
      id="hero"
      className={`angi-hero ${hasVideo ? 'has-video' : ''} ${videoLoaded ? 'is-video-loaded' : ''}`}
      style={{
        // Only dynamic theme tokens stay inline.
        '--hero-primary': colors.primary,
        '--hero-secondary': colors.secondary,
        '--hero-primary-dark': colors.primaryDark || colors.primary
      }}
    >
      {HeroBackground}

      {/* Radial mouse-glow overlay (decorative) */}
      <div
        className="angi-hero-orbs"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse at ${radialX}% ${radialY}%, color-mix(in srgb, ${colors.primary} 18%, transparent) 0%, transparent 46%)`
        }}
      >
        <span className="angi-hero-orb angi-hero-orb--primary" />
        <span className="angi-hero-orb angi-hero-orb--secondary" />
        <span className="angi-hero-orb angi-hero-orb--tertiary" />
      </div>

      {/* Grid pattern (decorative) */}
      <div className="angi-hero-grid" aria-hidden="true" />

      {/* Animated lines (decorative, focusable=false) */}
      <svg className="angi-hero-lines" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="heroLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
        </defs>
        {[...Array(5)].map((_, i) => (
          <line
            key={i}
            x1={`${i * 20}%`}
            y1="100%"
            x2="100%"
            y2={`${i * 20}%`}
            stroke="url(#heroLineGrad)"
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="angi-hero-container">
        {HeroBadge}

        {heroCopy.welcomeLabel && (content?.welcomeLabel !== false) && (
          <ScrollReveal animation="fadeUp" delay={100}>
            <p className="angi-hero-welcome">
              {heroCopy.welcomeLabel} {brandName}
            </p>
          </ScrollReveal>
        )}

        <ScrollReveal animation="scaleUp" delay={200}>
          <h1 className="angi-hero-title">
            {content?.headline}
            {content?.headlineHighlight && (
              <span className="angi-hero-title-highlight">{content.headlineHighlight}</span>
            )}
          </h1>
        </ScrollReveal>

        {content?.subheadline && (
          <ScrollReveal animation="fadeUp" delay={300}>
            <p className="angi-hero-subheadline">{content.subheadline}</p>
          </ScrollReveal>
        )}

        <ScrollReveal animation="fadeUp" delay={400}>
          <p className="angi-hero-tagline">{content?.tagline}</p>
        </ScrollReveal>

        {HeroActions}

        {HeroStats}

        {HeroScrollIndicator}
      </div>
    </section>
  );
};

export default Hero;
