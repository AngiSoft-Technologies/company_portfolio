import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../modern';

const BrandStatement = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #07142B 0%, #0B1E3D 50%, #07142B 100%)'
          : 'linear-gradient(135deg, #F8FAFF 0%, #EFF5FF 50%, #F8FAFF 100%)',
      }}
    >
      {/* Subtle glow orbs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: colors.primary }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: colors.secondary }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <ScrollReveal animation="fadeUp">
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8 text-sm font-semibold"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              color: '#fff',
            }}
          >
            Our Promise
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-8"
            style={{ color: isDark ? '#F5F7FA' : '#07142B' }}
          >
            From planning to deployment, AngiSoft delivers{' '}
            <span style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              secure, scalable, and maintainable
            </span>{' '}
            software solutions that help businesses work smarter.
          </h2>
          <p
            className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
          >
            We combine technical excellence with deep business understanding to build
            digital products that drive real, measurable growth for companies across East Africa.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default BrandStatement;
