import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../modern';
import { FaCalendarCheck, FaArrowRight } from 'react-icons/fa';

const DiscussionCTA = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #07142B 0%, #102A55 100%)'
          : 'linear-gradient(135deg, #F8FAFF 0%, #E8F0FE 100%)',
      }}
    >
      {/* Glow orbs */}
      <div
        className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: colors.primary }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: colors.secondary }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <ScrollReveal animation="fadeUp">
          <div
            className="w-16 h-16 mx-auto mb-8 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
              border: `1px solid ${colors.primary}25`,
            }}
          >
            <FaCalendarCheck className="text-2xl" style={{ color: colors.primary }} />
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
            style={{ color: isDark ? '#F5F7FA' : '#07142B' }}
          >
            Discuss Your Project{' '}
            <span style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>With Our Team</span>
          </h2>
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
          >
            If you have a project in mind or are evaluating your options, we'll help you
            clarify requirements, assess feasibility, and outline the next steps.
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-semibold text-lg text-white transition-all duration-300 hover:-translate-y-1"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              boxShadow: `0 15px 40px ${colors.primary}40`,
            }}
          >
            <FaCalendarCheck />
            Book Discovery Call
            <FaArrowRight />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DiscussionCTA;
