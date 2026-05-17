import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../modern';
import { FaRobot, FaMusic, FaNetworkWired, FaChartBar, FaArrowRight } from 'react-icons/fa';

const demos = [
  {
    icon: FaRobot,
    title: 'AngiBot AI Assistant',
    desc: 'An intelligent chatbot that answers customer questions, schedules appointments, and routes inquiries — powered by AI.',
    tag: 'AI & Automation',
    status: 'Live Demo Available',
    href: '/products',
  },
  {
    icon: FaMusic,
    title: 'AngiMusic Platform',
    desc: 'A music distribution and royalty management platform for artists and labels across East Africa.',
    tag: 'Entertainment',
    status: 'In Production',
    href: '/products',
  },
  {
    icon: FaNetworkWired,
    title: 'ISP Client Management',
    desc: 'A full client portal for ISPs — billing, ticket management, bandwidth monitoring, and network diagnostics.',
    tag: 'Telecommunications',
    status: 'In Production',
    href: '/projects',
  },
  {
    icon: FaChartBar,
    title: 'Business Analytics Dashboard',
    desc: 'Real-time dashboards for sales, inventory, and operations — turning data into decisions for retail and service businesses.',
    tag: 'Data Analytics',
    status: 'Demo Available',
    href: '/projects',
  },
];

const ProductDemos = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #07142B 0%, #0B1E3D 100%)'
          : 'linear-gradient(180deg, #F8FAFF 0%, #EFF5FF 100%)',
        color: isDark ? '#fff' : '#07142B',
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                color: colors.primary,
                border: `1px solid ${colors.primary}25`,
              }}
            >
              Our Products
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              See Our Work{' '}
              <span style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>In Action</span>
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
            >
              Explore our flagship products and platforms — built to solve real business challenges.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {demos.map((demo, i) => {
            const Icon = demo.icon;
            return (
              <ScrollReveal key={demo.title} animation="fadeUp" delay={i * 80}>
                <div
                  className="group relative rounded-2xl p-7 lg:p-8 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    className="absolute top-0 left-6 right-6 h-0.5 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }}
                  />
                  <div className="flex items-start gap-5 mb-5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
                        border: `1px solid ${colors.primary}25`,
                      }}
                    >
                      <Icon className="text-xl" style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="text-lg font-bold"
                          style={{ color: isDark ? '#fff' : '#1e293b' }}
                        >
                          {demo.title}
                        </h3>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: `${colors.success}18`,
                            color: colors.success,
                          }}
                        >
                          {demo.status}
                        </span>
                      </div>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${colors.primary}12`,
                          color: colors.primary,
                        }}
                      >
                        {demo.tag}
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-sm leading-relaxed flex-grow mb-5"
                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
                  >
                    {demo.desc}
                  </p>
                  <Link
                    to={demo.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3"
                    style={{ color: colors.primary }}
                  >
                    Learn More
                    <FaArrowRight className="text-xs" />
                  </Link>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductDemos;
