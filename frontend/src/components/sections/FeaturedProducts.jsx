import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { PRODUCT_LOGOS } from '../../utils/brandAssets';
import { getProductDetailPath } from '../../utils/detailPaths';
import { ScrollReveal } from '../modern';
import {
  FaArrowRight,
  FaCheck,
  FaStar
} from 'react-icons/fa';

const products = [
  {
    name: 'PetroFlow',
    tagline: 'Fuel Station Management',
    logo: PRODUCT_LOGOS.petroflow,
    accent: '#0A3DFF',
    features: [
      'Real-time fuel inventory tracking',
      'Automated pump meter integration',
      'Sales analytics & reporting',
      'Multi-station dashboard'
    ]
  },
  {
    name: 'DukaFlow',
    tagline: 'POS & ERP System',
    logo: PRODUCT_LOGOS.dukaflow,
    accent: '#8A2BE2',
    features: [
      'Point-of-sale with barcode scanning',
      'Inventory & supplier management',
      'Financial reporting & invoicing',
      'Multi-branch synchronization'
    ]
  },
  {
    name: 'KejaLink',
    tagline: 'Property Management',
    logo: PRODUCT_LOGOS.kejalink,
    accent: '#00C2FF',
    features: [
      'Tenant & lease management',
      'Automated rent collection',
      'Maintenance request tracking',
      'Vacancy listing portal'
    ]
  },
  {
    name: 'AngiTunes',
    tagline: 'Music Distribution',
    logo: PRODUCT_LOGOS.angitunes,
    accent: '#39FF6A',
    features: [
      'Multi-platform music distribution',
      'Royalty tracking & analytics',
      'Artist profile management',
      'Playlist submission tools'
    ]
  }
];

const FeaturedProducts = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const navigate = useNavigate();

  return (
    <section
      id="products"
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #0B1E3D 0%, #07142B 100%)'
          : 'linear-gradient(180deg, #EFF5FF 0%, #F8FAFF 100%)',
        color: isDark ? '#fff' : '#07142B',
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ top: '-10%', right: '-5%', backgroundColor: colors.primary }}
        />
        <div
          className="absolute w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ bottom: '-10%', left: '-5%', backgroundColor: colors.secondary }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(${isDark ? 'rgba(0,194,255,0.08)' : 'rgba(10,61,255,0.04)'} 1px, transparent 1px),
                              linear-gradient(90deg, ${isDark ? 'rgba(0,194,255,0.08)' : 'rgba(10,61,255,0.04)'} 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}15 100%)`,
                color: colors.primary,
                border: `1px solid ${colors.primary}25`
              }}
            >
              <FaStar style={{ color: colors.secondary }} />
              Our Products
            </div>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
            >
              Powerful Software{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Solutions
              </span>
            </h2>
            <p
              className="text-lg md:text-xl max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
            >
              Purpose-built products designed to streamline operations and accelerate growth for businesses across Africa.
            </p>
          </div>
        </ScrollReveal>

        {/* Products Grid — Logo-only cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {products.map((product, index) => {
            const detailPath = getProductDetailPath(product);

            return (
              <ScrollReveal
                key={product.name}
                animation="fadeUp"
                delay={index * 100}
              >
                <div
                  className="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 h-full flex flex-col cursor-pointer"
                  role="link"
                  tabIndex={0}
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.8) 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: isDark
                      ? '0 8px 32px rgba(0,0,0,0.3)'
                      : '0 8px 32px rgba(0,0,0,0.06)',
                  }}
                  onClick={() => navigate(detailPath)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(detailPath);
                    }
                  }}
                >
                  {/* Top accent line */}
                  <div
                    className="h-1 w-full"
                    style={{ background: `linear-gradient(90deg, ${product.accent}, ${colors.secondary})` }}
                  />

                  {/* Logo area */}
                  <div
                    className="flex items-center justify-center pt-8 pb-4 px-6"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${product.accent}12 0%, transparent 70%)`
                    }}
                  >
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-110"
                      style={{
                        background: isDark
                          ? `linear-gradient(135deg, ${product.accent}15 0%, ${product.accent}08 100%)`
                          : `linear-gradient(135deg, ${product.accent}10 0%, ${product.accent}05 100%)`,
                        border: `1px solid ${product.accent}20`,
                      }}
                    >
                      <img
                        src={product.logo}
                        alt={`${product.name} logo`}
                        className="w-14 h-14 object-contain"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="px-6 pb-6 flex-1 flex flex-col text-center">
                    <h3
                      className="text-lg font-bold mb-0.5"
                      style={{ color: isDark ? '#fff' : '#1e293b' }}
                    >
                      {product.name}
                    </h3>
                    <p
                      className="text-sm font-medium mb-4"
                      style={{ color: product.accent }}
                    >
                      {product.tagline}
                    </p>

                    {/* Feature list */}
                    <ul className="space-y-2 mb-6 flex-1 text-left">
                      {product.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                        >
                          <FaCheck
                            className="mt-0.5 flex-shrink-0"
                            style={{ color: colors.success, fontSize: '0.65rem' }}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Learn More link */}
                    <Link
                      to={detailPath}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 text-sm font-semibold group/link transition-all duration-300 mt-auto pt-2"
                      style={{ color: product.accent }}
                    >
                      <span className="group-hover/link:underline">Learn More</span>
                      <FaArrowRight
                        className="transition-transform duration-300 group-hover/link:translate-x-1"
                        style={{ fontSize: '0.7rem' }}
                      />
                    </Link>
                  </div>

                  {/* Hover glow effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{
                      boxShadow: `0 0 40px ${product.accent}15, inset 0 0 40px ${product.accent}05`
                    }}
                  />
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
