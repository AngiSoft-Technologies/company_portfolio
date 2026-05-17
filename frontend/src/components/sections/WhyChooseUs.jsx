import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../modern';
import { FaCheckCircle } from 'react-icons/fa';

const points = [
  'Over 100 successful projects delivered across East Africa.',
  '15+ skilled IT professionals — developers, designers, DevOps, and security engineers.',
  'A quality-first approach with rigorous testing and code review practices.',
  'End-to-end service: from requirements and design to deployment and ongoing support.',
  '24/7 availability — we\'re here when you need us.',
  'ISO-aligned security practices and data protection standards.',
  'Agile methodology with 2-week sprint cycles and continuous delivery.',
  'Proven track record across 10+ industries including fuel, retail, real estate, and entertainment.',
];

const WhyChooseUs = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #07142B 0%, #0B1E3D 100%)'
          : 'linear-gradient(180deg, #EFF5FF 0%, #F8FAFF 100%)',
        color: isDark ? '#fff' : '#07142B',
      }}
    >
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Why Choose{' '}
              <span style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>AngiSoft</span>
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
            >
              We combine technical excellence with business understanding to deliver solutions that truly work.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {points.map((point, i) => (
            <ScrollReveal key={i} animation="fadeUp" delay={i * 50}>
              <div
                className="flex items-start gap-4 p-5 rounded-xl transition-all duration-200 hover:translate-x-1"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                <FaCheckCircle
                  className="text-lg mt-0.5 flex-shrink-0"
                  style={{ color: colors.success }}
                />
                <p
                  className="text-sm md:text-base leading-relaxed"
                  style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}
                >
                  {point}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
