import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const treatmentStyles = {
  plain: {
    overlay: 'linear-gradient(180deg, rgba(7, 20, 43, 0.90) 0%, rgba(11, 30, 61, 0.94) 100%)',
    decoration: null,
  },
  subtle: {
    overlay: 'linear-gradient(135deg, rgba(7, 20, 43, 0.82) 0%, rgba(11, 30, 61, 0.88) 55%, rgba(16, 42, 85, 0.86) 100%)',
    decoration: 'spotlight',
  },
  technical: {
    overlay: 'linear-gradient(135deg, rgba(7, 20, 43, 0.86) 0%, rgba(11, 30, 61, 0.90) 58%, rgba(7, 20, 43, 0.92) 100%)',
    decoration: 'technical',
  },
  image: {
    overlay: 'linear-gradient(135deg, rgba(7, 20, 43, 0.76) 0%, rgba(7, 20, 43, 0.88) 65%, rgba(11, 30, 61, 0.94) 100%)',
    decoration: 'grain',
  },
  resume: {
    overlay: 'linear-gradient(180deg, rgba(7, 20, 43, 0.96) 0%, rgba(11, 30, 61, 0.96) 100%)',
    decoration: null,
  },
};

const getLegacyOverlay = (overlayBg, overlayOpacity) => `linear-gradient(180deg,
  ${overlayBg}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')} 0%,
  ${overlayBg}${Math.round(overlayOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 100%)`;

const ParallaxSection = ({
  children,
  backgroundImage,
  backgroundColor,
  speed = 0.5,
  overlay = true,
  overlayColor,
  overlayOpacity = 0.5,
  className = '',
  minHeight = '60vh',
  treatment,
  backgroundPosition = 'center'
}) => {
  const { colors } = useTheme();
  const sectionRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const sectionTop = rect.top + scrolled;
      const relativeScroll = scrolled - sectionTop + window.innerHeight;

      if (relativeScroll > 0 && relativeScroll < rect.height + window.innerHeight) {
        setOffset(relativeScroll * speed);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  const overlayBg = overlayColor || colors.primary;
  const namedTreatment = treatmentStyles[treatment];
  const overlayBackground = namedTreatment?.overlay || getLegacyOverlay(overlayBg, overlayOpacity);

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundColor: backgroundColor || colors.backgroundSecondary,
          backgroundPosition,
          transform: `translateY(${offset}px)`,
          top: '-20%',
          height: '140%'
        }}
      />

      {namedTreatment?.decoration === 'technical' && (
        <div className="absolute inset-0 angi-technical-grid-soft opacity-70" />
      )}
      {namedTreatment?.decoration === 'spotlight' && (
        <div className="angi-spotlight angi-ambient-motion" />
      )}
      {namedTreatment?.decoration === 'grain' && (
        <div className="angi-grain" />
      )}

      {overlay && (
        <div
          className="absolute inset-0"
          style={{ background: overlayBackground }}
        />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
};

export default ParallaxSection;
