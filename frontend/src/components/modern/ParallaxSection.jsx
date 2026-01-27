import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ParallaxSection = ({
  children,
  backgroundImage,
  backgroundColor,
  speed = 0.5,
  overlay = true,
  overlayColor,
  overlayOpacity = 0.5,
  className = '',
  minHeight = '60vh'
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

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      {/* Parallax Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundColor: backgroundColor || colors.backgroundSecondary,
          transform: `translateY(${offset}px)`,
          top: '-20%',
          height: '140%'
        }}
      />

      {/* Overlay */}
      {overlay && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, 
              ${overlayBg}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')} 0%, 
              ${overlayBg}${Math.round(overlayOpacity * 0.8 * 255).toString(16).padStart(2, '0')} 100%)`
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
};

export default ParallaxSection;
