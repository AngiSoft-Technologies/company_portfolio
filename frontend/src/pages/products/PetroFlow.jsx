import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../../components/modern';
import { PRODUCT_LOGOS } from '../../utils/brandAssets';
import {
  FaArrowLeft, FaGasPump, FaTachometerAlt, FaBoxes, FaChartBar,
  FaUsers, FaBuilding, FaRocket, FaCheckCircle, FaArrowRight,
  FaCog, FaShieldAlt, FaMobileAlt, FaHeadset
} from 'react-icons/fa';

const features = [
  {
    icon: FaGasPump,
    title: 'Fuel Management',
    description: 'Track fuel levels, deliveries, and consumption in real time across every tank and grade.'
  },
  {
    icon: FaTachometerAlt,
    title: 'Pump Management',
    description: 'Monitor pump status, nozzle readings, and dispensing accuracy from a central dashboard.'
  },
  {
    icon: FaBoxes,
    title: 'Inventory Tracking',
    description: 'Automated stock reconciliation with variance alerts and loss prevention insights.'
  },
  {
    icon: FaChartBar,
    title: 'Analytics Dashboard',
    description: 'Sales trends, margin analysis, and operational KPIs visualised in interactive reports.'
  },
  {
    icon: FaUsers,
    title: 'Staff Management',
    description: 'Shift scheduling, attendance tracking, and performance monitoring for your station team.'
  },
  {
    icon: FaBuilding,
    title: 'Multi-station Support',
    description: 'Manage all your fuel stations from one unified platform with consolidated reporting.'
  }
];

const steps = [
  {
    step: '01',
    title: 'Install & Connect',
    description: 'We deploy PetroFlow on your existing hardware and integrate with pumps, tanks, and POS systems.'
  },
  {
    step: '02',
    title: 'Configure & Train',
    description: 'Set up fuel grades, pricing rules, and staff accounts. We train your team on the dashboard.'
  },
  {
    step: '03',
    title: 'Operate & Monitor',
    description: 'Manage daily operations from the real-time dashboard — sales, inventory, and staff at a glance.'
  },
  {
    step: '04',
    title: 'Analyse & Grow',
    description: 'Use built-in analytics to spot trends, reduce losses, and make data-driven decisions.'
  }
];

const benefits = [
  { value: '40%', label: 'Reduction in fuel losses' },
  { value: '3x', label: 'Faster end-of-day reconciliation' },
  { value: '99.5%', label: 'System uptime guarantee' },
  { value: '24/7', label: 'Real-time monitoring' }
];

const PetroFlow = () => {
  const navigate = useNavigate();
  const { colors, mode } = useTheme();

  return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${colors.brandNavy} 0%, ${colors.primary}80 50%, ${colors.secondary}60 100%)`
          }}
        />
        {/* Decorative orbs */}
        <div
          className="absolute top-20 right-10 w-72 h-72 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: colors.secondary }}
        />
        <div
          className="absolute bottom-10 left-10 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.accent }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <ScrollReveal animation="fadeUp">
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 mb-8 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              <FaArrowLeft />
              Back to Products
            </button>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <ScrollReveal animation="fadeUp">
                <span
                  className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  AngiSoft Product
                </span>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={100}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white">
                  PetroFlow
                </h1>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={200}>
                <p className="text-xl md:text-2xl font-medium mb-6" style={{ color: colors.secondary }}>
                  Fuel Station Automation Platform
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={300}>
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Automate your fuel station operations from pump to profit. PetroFlow gives you
                  real-time visibility into fuel levels, sales, inventory, and staff — all from
                  one powerful dashboard.
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={400}>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/book')}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      color: 'white',
                      boxShadow: `0 4px 20px ${colors.primary}50`
                    }}
                  >
                    <FaRocket />
                    Book a Demo
                  </button>
                  <button
                    onClick={() => navigate('/#contact-me')}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    Contact Sales
                  </button>
                </div>
              </ScrollReveal>
            </div>

            {/* Screenshot placeholder */}
            <ScrollReveal animation="fadeLeft" delay={300}>
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.brandNavy}90, ${colors.primary}40)`,
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  aspectRatio: '16/10'
                }}
              >
                <div className="p-8 h-full flex flex-col justify-center items-center text-center">
                  <div
                    className="mb-4 rounded-2xl px-6 py-4 flex items-center justify-center"
                    style={{
                      background: 'rgba(6, 19, 36, 0.72)',
                      border: '1px solid rgba(0,194,255,0.28)',
                      boxShadow: '0 16px 36px rgba(0,0,0,0.28)'
                    }}
                  >
                    <img
                      src={PRODUCT_LOGOS.petroflow}
                      alt="PetroFlow logo"
                      className="max-w-[13rem] max-h-20 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="text-white/60 text-sm font-medium">PetroFlow Dashboard Preview</p>
                  <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-xs">
                    {['Sales', 'Fuel', 'Staff'].map((label) => (
                      <div
                        key={label}
                        className="rounded-lg p-3 text-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                      >
                        <div className="text-xs text-white/50">{label}</div>
                        <div className="text-sm font-bold text-white/80 mt-1">--</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal animation="fadeUp">
            <div className="text-center mb-16">
              <span
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
              >
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Everything Your Station Needs
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                A complete fuel station management suite built for efficiency, accuracy, and growth.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <ScrollReveal key={idx} animation="fadeUp" delay={idx * 100}>
                <div
                  className="rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: mode === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${colors.border}`,
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)` }}
                  >
                    <feature.icon className="text-xl" style={{ color: colors.primary }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        className="py-20 px-4"
        style={{
          background: mode === 'dark'
            ? 'rgba(255,255,255,0.02)'
            : `linear-gradient(180deg, ${colors.backgroundTertiary} 0%, ${colors.background} 100%)`
        }}
      >
        <div className="max-w-7xl mx-auto">
          <ScrollReveal animation="fadeUp">
            <div className="text-center mb-16">
              <span
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                style={{ backgroundColor: `${colors.secondary}15`, color: colors.secondary }}
              >
                How It Works
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                From Setup to Success
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                Get PetroFlow running at your station in four simple steps.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, idx) => (
              <ScrollReveal key={idx} animation="fadeUp" delay={idx * 120}>
                <div className="relative h-full">
                  <div
                    className="rounded-2xl p-6 h-full"
                    style={{
                      background: mode === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : 'white',
                      border: `1px solid ${colors.border}`,
                      boxShadow: `0 4px 20px ${colors.primary}08`
                    }}
                  >
                    <div
                      className="text-4xl font-black mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal animation="fadeUp">
            <div className="text-center mb-16">
              <span
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                style={{ backgroundColor: `${colors.success}20`, color: colors.successDark || '#16C95B' }}
              >
                Results
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Measurable Impact
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                PetroFlow delivers tangible improvements from day one.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((item, idx) => (
              <ScrollReveal key={idx} animation="scaleUp" delay={idx * 100}>
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <div
                    className="text-3xl md:text-4xl font-black mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    {item.value}
                  </div>
                  <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                    {item.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Benefits List */}
      <section
        className="py-20 px-4"
        style={{
          background: mode === 'dark'
            ? 'rgba(255,255,255,0.02)'
            : `linear-gradient(180deg, ${colors.background} 0%, ${colors.backgroundTertiary} 100%)`
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <ScrollReveal animation="fadeRight">
              <div>
                <span
                  className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                  style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
                >
                  Why PetroFlow
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: colors.text }}>
                  Built for Station Owners Who Want More
                </h2>
                <p className="text-lg mb-8 leading-relaxed" style={{ color: colors.textSecondary }}>
                  PetroFlow is not just another POS system. It is a purpose-built platform
                  designed specifically for fuel station operations, giving you the tools to
                  run a tighter, more profitable operation.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fadeLeft" delay={200}>
              <div className="space-y-4">
                {[
                  { icon: FaShieldAlt, text: 'Reduce fuel theft and shrinkage with automated reconciliation' },
                  { icon: FaMobileAlt, text: 'Monitor your station remotely from any device, anywhere' },
                  { icon: FaCog, text: 'Integrates with existing pumps, tanks, and payment systems' },
                  { icon: FaHeadset, text: 'Dedicated onboarding and ongoing technical support' },
                  { icon: FaChartBar, text: 'Detailed reports for compliance and business planning' },
                  { icon: FaCheckCircle, text: 'Automated alerts for low stock, price changes, and anomalies' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)` }}
                    >
                      <item.icon style={{ color: colors.primary }} />
                    </div>
                    <p className="text-sm font-medium pt-2" style={{ color: colors.textSecondary }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 px-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.brandNavy} 0%, ${colors.primary} 100%)`
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.secondary }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: colors.accent }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <ScrollReveal animation="fadeUp">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Ready to Automate Your Fuel Station?
            </h2>
            <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Join station owners across Kenya who trust PetroFlow to run smarter,
              more profitable operations. Book a free demo today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/book')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  color: 'white',
                  boxShadow: `0 4px 20px ${colors.primary}50`
                }}
              >
                <FaRocket />
                Book a Free Demo
              </button>
              <button
                onClick={() => navigate('/products')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              >
                View All Products
                <FaArrowRight />
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};

export default PetroFlow;
