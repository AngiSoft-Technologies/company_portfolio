import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SiFlutter, SiKotlin, SiPython, SiReact, SiNodedotjs,
  SiTypescript, SiJavascript, SiPostgresql, SiMongodb,
  SiDocker, SiAmazon, SiGit, SiTailwindcss, SiPrisma, SiExpress
} from 'react-icons/si';
import { ScrollReveal } from '../modern';

const techStack = [
  { name: 'Flutter', icon: SiFlutter, color: '#02569B' },
  { name: 'Kotlin', icon: SiKotlin, color: '#7F52FF' },
  { name: 'Python', icon: SiPython, color: '#3776AB' },
  { name: 'React', icon: SiReact, color: '#61DAFB' },
  { name: 'Node.js', icon: SiNodedotjs, color: '#339933' },
  { name: 'TypeScript', icon: SiTypescript, color: '#3178C6' },
  { name: 'JavaScript', icon: SiJavascript, color: '#F7DF1E' },
  { name: 'PostgreSQL', icon: SiPostgresql, color: '#4169E1' },
  { name: 'MongoDB', icon: SiMongodb, color: '#47A248' },
  { name: 'Docker', icon: SiDocker, color: '#2496ED' },
  { name: 'AWS', icon: SiAmazon, color: '#FF9900' },
  { name: 'Git', icon: SiGit, color: '#F05032' },
  { name: 'Tailwind', icon: SiTailwindcss, color: '#06B6D4' },
  { name: 'Prisma', icon: SiPrisma, color: '#2D3748' },
  { name: 'Express', icon: SiExpress, color: '#000000' },
];

/**
 * LogoSlider — Infinite horizontal auto-scrolling slider.
 *
 * Props:
 *  - variant: 'logos' | 'tech'
 *  - logos: array of { src, alt } (only for variant='logos')
 *  - title: optional section title
 *  - subtitle: optional section subtitle
 *  - speed: animation duration in seconds (default 30)
 */
const LogoSlider = ({
  variant = 'logos',
  logos = [],
  title,
  subtitle,
  speed = 30,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  // Duplicate items for seamless loop
  const items = variant === 'tech' ? techStack : logos;
  const doubled = [...items, ...items];

  return (
    <section
      className="logo-slider"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #07142B 0%, #0B1E3D 100%)'
          : 'linear-gradient(180deg, #F8FAFF 0%, #EFF5FF 100%)',
        color: isDark ? '#fff' : '#07142B',
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        {(title || subtitle) && (
          <ScrollReveal animation="fadeUp">
            <div className="text-center mb-10">
              {title && (
                <h2
                  className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3"
                  style={{ color: isDark ? '#fff' : '#07142B' }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  className="text-base md:text-lg max-w-2xl mx-auto"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* Slider track */}
        <div className="logo-slider__viewport">
          <div
            className="logo-slider__track"
            style={{ animationDuration: `${speed}s` }}
          >
            {doubled.map((item, i) => {
              if (variant === 'tech') {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.name}-${i}`}
                    className="logo-slider__tech-badge"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                  >
                    <Icon
                      className="logo-slider__tech-icon"
                      style={{ color: isDark ? item.color : item.color }}
                    />
                    <span
                      className="logo-slider__tech-name"
                      style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              }
              // Image logo variant
              return (
                <div key={`${item.alt}-${i}`} className="logo-slider__logo-wrap">
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="logo-slider__logo"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .logo-slider {
          position: relative;
          padding: 3.5rem 0;
          overflow: hidden;
        }
        .logo-slider__viewport {
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }
        .logo-slider__track {
          display: flex;
          gap: 2rem;
          width: max-content;
          animation: logo-scroll linear infinite;
        }
        .logo-slider__track:hover {
          animation-play-state: paused;
        }

        /* Image logos */
        .logo-slider__logo-wrap {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1.5rem;
          height: 56px;
        }
        .logo-slider__logo {
          height: 44px;
          width: auto;
          object-fit: contain;
          filter: grayscale(0.4) brightness(0.9);
          opacity: 0.7;
          transition: filter 0.3s, opacity 0.3s;
        }
        .logo-slider__logo:hover {
          filter: grayscale(0) brightness(1);
          opacity: 1;
        }

        /* Tech badges */
        .logo-slider__tech-badge {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 9999px;
          backdrop-filter: blur(8px);
          transition: transform 0.2s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .logo-slider__tech-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .logo-slider__tech-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .logo-slider__tech-name {
          font-size: 0.85rem;
          font-weight: 600;
        }

        @keyframes logo-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @media (max-width: 640px) {
          .logo-slider { padding: 2.5rem 0; }
          .logo-slider__track { gap: 1rem; }
          .logo-slider__logo-wrap { height: 44px; padding: 0.25rem 1rem; }
          .logo-slider__logo { height: 36px; }
          .logo-slider__tech-badge { padding: 0.5rem 1rem; }
          .logo-slider__tech-icon { font-size: 1.1rem; }
          .logo-slider__tech-name { font-size: 0.78rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-slider__track { animation: none !important; }
        }
      `}</style>
    </section>
  );
};

export default LogoSlider;
