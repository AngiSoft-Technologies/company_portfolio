import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const SectionHeader = ({ badge, title, titleHighlight, subtitle, centered = true }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <div className={`${centered ? 'text-center' : ''} mb-16`}>
      {badge && (
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-sm font-medium"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
            color: colors.primary,
            border: `1px solid ${colors.primary}25`,
          }}
        >
          {badge}
        </div>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
        {title}{' '}
        {titleHighlight && (
          <span style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {titleHighlight}
          </span>
        )}
      </h2>
      {subtitle && (
        <p
          className="text-lg max-w-2xl mx-auto"
          style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export const CTASection = ({ title, subtitle, primaryBtn, secondaryBtn }) => {
  const { colors } = useTheme();

  return (
    <div
      className="text-center p-12 rounded-3xl"
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        boxShadow: `0 25px 80px ${colors.primary}40`,
      }}
    >
      {title && <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">{title}</h3>}
      {subtitle && <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">{subtitle}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        {primaryBtn && (
          <a
            href={primaryBtn.href}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold bg-white transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ color: colors.primary }}
          >
            {primaryBtn.label}
          </a>
        )}
        {secondaryBtn && (
          <a
            href={secondaryBtn.href}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white border-2 border-white/30 transition-all hover:bg-white/10 hover:-translate-y-1"
          >
            {secondaryBtn.label}
          </a>
        )}
      </div>
    </div>
  );
};

export default SectionHeader;
