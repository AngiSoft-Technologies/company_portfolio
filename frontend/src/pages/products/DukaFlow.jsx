import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../../components/modern';
import { PRODUCT_LOGOS } from '../../utils/brandAssets';
import {
  FaArrowLeft, FaCashRegister, FaBoxes, FaUserFriends, FaTruck,
  FaCalculator, FaCodeBranch, FaPrint, FaChartPie, FaRocket,
  FaCheckCircle, FaArrowRight, FaStore, FaUtensils, FaIndustry,
  FaShoppingBag, FaStethoscope, FaLaptop
} from 'react-icons/fa';

const features = [
  {
    icon: FaCashRegister,
    title: 'Sales Management',
    description: 'Fast, intuitive point-of-sale interface with barcode scanning, quick keys, and split payments.'
  },
  {
    icon: FaBoxes,
    title: 'Inventory Control',
    description: 'Real-time stock tracking, low-stock alerts, batch management, and automated reorder suggestions.'
  },
  {
    icon: FaUserFriends,
    title: 'Customer Management',
    description: 'Build customer profiles, track purchase history, manage loyalty points, and run targeted promotions.'
  },
  {
    icon: FaTruck,
    title: 'Supplier Management',
    description: 'Manage supplier contacts, purchase orders, goods receiving, and payment tracking in one place.'
  },
  {
    icon: FaCalculator,
    title: 'Accounting',
    description: 'Integrated expense tracking, profit/loss reports, tax calculations, and bank reconciliation.'
  },
  {
    icon: FaCodeBranch,
    title: 'Multi-branch Support',
    description: 'Centralised dashboard to manage multiple branches with consolidated reporting and inter-branch transfers.'
  },
  {
    icon: FaPrint,
    title: 'Receipt Printing',
    description: 'Compatible with thermal printers. Custom receipt layouts with your branding and QR codes.'
  },
  {
    icon: FaChartPie,
    title: 'Reports & Analytics',
    description: 'Sales reports, inventory valuation, staff performance, and customer insights — all exportable.'
  }
];

const industries = [
  { icon: FaStore, name: 'Retail Shops', description: 'Supermarkets, convenience stores, and general merchandise.' },
  { icon: FaIndustry, name: 'Wholesale', description: 'Bulk distributors and wholesale warehouses.' },
  { icon: FaUtensils, name: 'Restaurants', description: 'Restaurants, cafes, fast food, and catering services.' },
  { icon: FaShoppingBag, name: 'Fashion & Apparel', description: 'Clothing stores, boutiques, and shoe shops.' },
  { icon: FaStethoscope, name: 'Pharmacies', description: 'Chemists and pharmaceutical retailers with expiry tracking.' },
  { icon: FaLaptop, name: 'Electronics', description: 'Phone shops, computer stores, and electronics dealers.' }
];

const DukaFlow = () => {
  const navigate = useNavigate();
  const { colors, mode } = useTheme();

  return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${colors.brandNavy} 0%, ${colors.accent}80 50%, ${colors.primary}60 100%)`
          }}
        />
        <div
          className="absolute top-10 left-1/2 w-80 h-80 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: colors.secondary }}
        />
        <div
          className="absolute bottom-20 right-10 w-64 h-64 rounded-full blur-3xl opacity-20"
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
                  DukaFlow
                </h1>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={200}>
                <p className="text-xl md:text-2xl font-medium mb-6" style={{ color: colors.secondary }}>
                  POS & ERP Platform
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={300}>
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  The all-in-one point-of-sale and business management platform for shops,
                  restaurants, and wholesale businesses. Manage sales, inventory, customers,
                  suppliers, and accounts from a single, intuitive dashboard.
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={400}>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/book')}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`,
                      color: 'white',
                      boxShadow: `0 4px 20px ${colors.accent}50`
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
                  background: `linear-gradient(135deg, ${colors.brandNavy}90, ${colors.accent}40)`,
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
                      src={PRODUCT_LOGOS.dukaflow}
                      alt="DukaFlow logo"
                      className="max-w-[13rem] max-h-20 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="text-white/60 text-sm font-medium">DukaFlow POS Dashboard Preview</p>
                  <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
                    {['Today\'s Sales', 'Stock', 'Customers', 'Revenue'].map((label) => (
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
                style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}
              >
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Everything You Need to Run Your Business
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                DukaFlow combines POS, inventory, accounting, and CRM into one seamless platform.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <ScrollReveal key={idx} animation="fadeUp" delay={idx * 80}>
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
                    style={{ background: `linear-gradient(135deg, ${colors.accent}20, ${colors.primary}20)` }}
                  >
                    <feature.icon className="text-xl" style={{ color: colors.accent }} />
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

      {/* Industries Section */}
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
                style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
              >
                Industries
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Built for Every Business Type
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                DukaFlow adapts to your industry with custom workflows, receipt formats, and reporting.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, idx) => (
              <ScrollReveal key={idx} animation="fadeUp" delay={idx * 80}>
                <div
                  className="rounded-2xl p-6 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: mode === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'white',
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${colors.accent}20, ${colors.primary}20)` }}
                  >
                    <industry.icon className="text-xl" style={{ color: colors.accent }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                      {industry.name}
                    </h3>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>
                      {industry.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why DukaFlow Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <ScrollReveal animation="fadeRight">
              <div>
                <span
                  className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                  style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}
                >
                  Why DukaFlow
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: colors.text }}>
                  Replace Multiple Tools with One Platform
                </h2>
                <p className="text-lg mb-8 leading-relaxed" style={{ color: colors.textSecondary }}>
                  Stop juggling separate apps for sales, inventory, accounting, and customer management.
                  DukaFlow unifies everything so you can focus on growing your business.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/book')}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`,
                      color: 'white'
                    }}
                  >
                    <FaRocket />
                    Get Started
                  </button>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fadeLeft" delay={200}>
              <div className="space-y-4">
                {[
                  'Cloud-based — access from anywhere, no server required',
                  'Works offline with automatic sync when back online',
                  'Thermal printer compatible with custom receipt templates',
                  'Multi-user with role-based access control',
                  'Automated daily backups and data encryption',
                  'Free onboarding and training for your team'
                ].map((text, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{
                      background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <FaCheckCircle
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: colors.success }}
                    />
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                      {text}
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
          background: `linear-gradient(135deg, ${colors.brandNavy} 0%, ${colors.accent} 100%)`
        }}
      >
        <div
          className="absolute top-0 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.primary }}
        />
        <div
          className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: colors.secondary }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <ScrollReveal animation="fadeUp">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Start Selling Smarter Today
            </h2>
            <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Thousands of businesses across Kenya trust DukaFlow to manage their sales,
              inventory, and accounts. Book a free demo and see it in action.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/book')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`,
                  color: 'white',
                  boxShadow: `0 4px 20px ${colors.accent}50`
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

export default DukaFlow;
