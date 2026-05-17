import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal, AnimatedCounter } from '../modern';
import {
  FaRocket,
  FaArrowRight,
  FaEnvelope,
  FaUsers,
  FaProjectDiagram,
  FaAward,
  FaShieldAlt
} from 'react-icons/fa';

const trustBadges = [
  { icon: FaUsers, value: 50, suffix: '+', label: 'Happy Clients' },
  { icon: FaProjectDiagram, value: 100, suffix: '+', label: 'Projects Delivered' },
  { icon: FaAward, value: 5, suffix: '+', label: 'Years Experience' },
  { icon: FaShieldAlt, value: 99, suffix: '%', label: 'Client Satisfaction' }
];

const CTASection = () => {
  const { colors } = useTheme();

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Dark navy background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: colors.brandNavy }}
      />

      {/* Glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{
            top: '-30%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: colors.primary
          }}
        />
        {/* Secondary glow */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{
            bottom: '-20%',
            left: '10%',
            backgroundColor: colors.secondary
          }}
        />
        {/* Accent glow */}
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl opacity-10"
          style={{
            top: '20%',
            right: '5%',
            backgroundColor: colors.accent
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />

        {/* Animated gradient orbs */}
        <div
          className="absolute w-48 h-48 rounded-full blur-2xl animate-pulse"
          style={{
            top: '30%',
            left: '20%',
            backgroundColor: `${colors.primary}10`,
            animationDuration: '5s'
          }}
        />
        <div
          className="absolute w-32 h-32 rounded-full blur-2xl animate-pulse"
          style={{
            bottom: '25%',
            right: '25%',
            backgroundColor: `${colors.secondary}10`,
            animationDuration: '7s',
            animationDelay: '2s'
          }}
        />

        {/* Floating decorative elements */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-ping"
            style={{
              width: `${4 + i * 2}px`,
              height: `${4 + i * 2}px`,
              top: `${20 + i * 20}%`,
              left: `${15 + i * 20}%`,
              backgroundColor: 'rgba(255,255,255,0.2)',
              animationDuration: `${3 + i}s`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main CTA Content */}
        <ScrollReveal animation="fadeUp">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-sm font-medium"
            style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)'
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: colors.success }}
            />
            Let's Build Together
          </div>

          <h2
            className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight"
          >
            Ready to Transform
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.success} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Your Business?
            </span>
          </h2>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            From custom software to data analytics and digital transformation,
            we deliver solutions that drive real results. Let's discuss your next big idea.
          </p>
        </ScrollReveal>

        {/* CTA Buttons */}
        <ScrollReveal animation="fadeUp" delay={200}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/book"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark || '#0029CC'} 100%)`,
                boxShadow: `0 20px 40px ${colors.primary}40, 0 0 0 1px rgba(255,255,255,0.1) inset`,
                fontSize: '1.05rem'
              }}
            >
              <FaRocket className="group-hover:rotate-12 transition-transform" />
              Start Your Project
              <FaArrowRight className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </Link>

            <Link
              to="/contact"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: '1.05rem'
              }}
            >
              <FaEnvelope className="group-hover:scale-110 transition-transform" />
              Contact Us
            </Link>
          </div>
        </ScrollReveal>

        {/* Divider */}
        <div
          className="w-full max-w-md mx-auto mb-12"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
          }}
        />

        {/* Trust Badges / Stats */}
        <ScrollReveal animation="fadeUp" delay={400}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {trustBadges.map((badge, index) => (
              <div
                key={index}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}20 100%)`
                  }}
                >
                  <badge.icon
                    style={{
                      color: colors.secondary,
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div
                  className="text-2xl md:text-3xl font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  <AnimatedCounter end={badge.value} suffix={badge.suffix} />
                </div>
                <span
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default CTASection;
