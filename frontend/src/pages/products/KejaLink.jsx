import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../../components/modern';
import { PRODUCT_LOGOS } from '../../utils/brandAssets';
import {
  FaArrowLeft, FaListAlt, FaUserTie, FaMapMarkedAlt,
  FaCalendarCheck, FaKey, FaRocket, FaCheckCircle, FaArrowRight,
  FaSearch, FaBuilding, FaHandshake, FaShieldAlt, FaMobileAlt,
  FaStar
} from 'react-icons/fa';

const features = [
  {
    icon: FaSearch,
    title: 'House Hunting',
    description: 'Advanced search filters by location, price, property type, amenities, and more to find your perfect home.'
  },
  {
    icon: FaListAlt,
    title: 'Property Listings',
    description: 'Rich listings with photos, virtual tours, floor plans, and detailed property descriptions.'
  },
  {
    icon: FaUserTie,
    title: 'Landlord Management',
    description: 'Dashboard for landlords to list properties, manage inquiries, screen tenants, and track occupancy.'
  },
  {
    icon: FaMapMarkedAlt,
    title: 'Maps Integration',
    description: 'Interactive map view to explore properties by neighbourhood, proximity to amenities, and commute times.'
  },
  {
    icon: FaCalendarCheck,
    title: 'Booking & Viewing',
    description: 'Schedule property viewings directly through the platform with calendar integration and reminders.'
  },
  {
    icon: FaKey,
    title: 'Tenant Management',
    description: 'Lease tracking, rent collection, maintenance requests, and tenant communication — all in one place.'
  }
];

const tenantSteps = [
  { step: '01', title: 'Search', description: 'Use smart filters to find properties that match your budget, location, and preferences.' },
  { step: '02', title: 'Explore', description: 'View photos, take virtual tours, check neighbourhood details, and compare listings.' },
  { step: '03', title: 'Book', description: 'Schedule a viewing at your convenience and get instant confirmation from the landlord.' },
  { step: '04', title: 'Move In', description: 'Complete the agreement digitally, make payments, and get your keys.' }
];

const landlordSteps = [
  { step: '01', title: 'List', description: 'Add your properties with photos, descriptions, pricing, and availability details.' },
  { step: '02', title: 'Manage', description: 'Track inquiries, screen tenants, and manage viewing schedules from your dashboard.' },
  { step: '03', title: 'Lease', description: 'Generate digital lease agreements, collect deposits, and onboard new tenants.' },
  { step: '04', title: 'Earn', description: 'Track rent payments, manage maintenance, and monitor occupancy rates in real time.' }
];

const KejaLink = () => {
  const navigate = useNavigate();
  const { colors, mode } = useTheme();

  return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${colors.brandNavy} 0%, #16C95B 50%, ${colors.secondary}80 100%)`
          }}
        />
        <div
          className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: colors.success }}
        />
        <div
          className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.primary }}
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
                  KejaLink
                </h1>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={200}>
                <p className="text-xl md:text-2xl font-medium mb-6" style={{ color: colors.success }}>
                  Property Discovery Platform
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={300}>
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Find your next home or manage your properties with ease. KejaLink connects
                  tenants and landlords on a modern platform with smart search, virtual tours,
                  digital leases, and integrated rent management.
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={400}>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/book')}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${colors.success}, #16C95B)`,
                      color: colors.brandNavy,
                      boxShadow: `0 4px 20px ${colors.success}50`
                    }}
                  >
                    <FaRocket />
                    List Your Property
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
                    Find a Home
                  </button>
                </div>
              </ScrollReveal>
            </div>

            {/* Screenshot placeholder */}
            <ScrollReveal animation="fadeLeft" delay={300}>
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.brandNavy}90, ${colors.success}30)`,
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
                      src={PRODUCT_LOGOS.kejalink}
                      alt="KejaLink logo"
                      className="max-w-[13rem] max-h-20 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="text-white/60 text-sm font-medium">KejaLink Property Explorer Preview</p>
                  <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
                    {['Listings', 'Views', 'Bookings', 'Tenants'].map((label) => (
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
                style={{ backgroundColor: `${colors.success}15`, color: '#16C95B' }}
              >
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                A Better Way to Find and Manage Properties
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                KejaLink simplifies the property journey for both tenants and landlords.
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
                    style={{ background: `linear-gradient(135deg, ${colors.success}20, ${colors.secondary}20)` }}
                  >
                    <feature.icon className="text-xl" style={{ color: '#16C95B' }} />
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

      {/* How It Works - Tenants */}
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
                style={{ backgroundColor: `${colors.success}15`, color: '#16C95B' }}
              >
                For Tenants
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Find Your Dream Home in Minutes
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                From search to move-in, KejaLink makes renting simple and transparent.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tenantSteps.map((item, idx) => (
              <ScrollReveal key={idx} animation="fadeUp" delay={idx * 120}>
                <div
                  className="rounded-2xl p-6 h-full"
                  style={{
                    background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                    border: `1px solid ${colors.border}`,
                    boxShadow: `0 4px 20px ${colors.success}08`
                  }}
                >
                  <div
                    className="text-4xl font-black mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${colors.success}, ${colors.secondary})`,
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
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Landlords */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal animation="fadeUp">
            <div className="text-center mb-16">
              <span
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
              >
                For Landlords
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Manage Properties Like a Pro
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                List, manage, and earn — KejaLink gives landlords full control with minimal hassle.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {landlordSteps.map((item, idx) => (
              <ScrollReveal key={idx} animation="fadeUp" delay={idx * 120}>
                <div
                  className="rounded-2xl p-6 h-full"
                  style={{
                    background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                    border: `1px solid ${colors.border}`,
                    boxShadow: `0 4px 20px ${colors.primary}08`
                  }}
                >
                  <div
                    className="text-4xl font-black mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
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
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
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
                  style={{ backgroundColor: `${colors.success}15`, color: '#16C95B' }}
                >
                  Why KejaLink
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: colors.text }}>
                  Trusted by Tenants and Landlords Alike
                </h2>
                <p className="text-lg mb-8 leading-relaxed" style={{ color: colors.textSecondary }}>
                  KejaLink removes the friction from renting. No more endless phone calls,
                  fake listings, or paper leases. Everything is digital, verified, and transparent.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fadeLeft" delay={200}>
              <div className="space-y-4">
                {[
                  { icon: FaShieldAlt, text: 'Verified listings — every property is checked before going live' },
                  { icon: FaMobileAlt, text: 'Mobile-first design for searching and managing on the go' },
                  { icon: FaHandshake, text: 'Digital lease agreements with e-signatures' },
                  { icon: FaBuilding, text: 'Supports residential, commercial, and shared spaces' },
                  { icon: FaStar, text: 'Rating system for tenants and landlords builds trust' },
                  { icon: FaCheckCircle, text: 'Integrated rent payment tracking and receipts' }
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
                      style={{ background: `linear-gradient(135deg, ${colors.success}15, ${colors.secondary}15)` }}
                    >
                      <item.icon style={{ color: '#16C95B' }} />
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
          background: `linear-gradient(135deg, ${colors.brandNavy} 0%, #16C95B 100%)`
        }}
      >
        <div
          className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.secondary }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: colors.primary }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <ScrollReveal animation="fadeUp">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Your Next Home is a Click Away
            </h2>
            <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Whether you are looking for a house or listing one, KejaLink makes the process
              fast, safe, and hassle-free. Join the platform today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/book')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${colors.success}, #16C95B)`,
                  color: colors.brandNavy,
                  boxShadow: `0 4px 20px ${colors.success}50`
                }}
              >
                <FaRocket />
                Get Started
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

export default KejaLink;
