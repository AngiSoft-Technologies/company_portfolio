import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../../components/modern';
import { PRODUCT_LOGOS } from '../../utils/brandAssets';
import {
  FaArrowLeft, FaUserAlt, FaUpload, FaDollarSign,
  FaListUl, FaChartLine, FaRocket, FaCheckCircle, FaArrowRight,
  FaHeadphones, FaMicrophone, FaGlobeAfrica, FaPlay, FaHeart,
  FaPodcast, FaShieldAlt, FaMobileAlt
} from 'react-icons/fa';

const features = [
  {
    icon: FaHeadphones,
    title: 'Music Streaming',
    description: 'High-quality audio streaming with offline listening, queue management, and cross-device sync.'
  },
  {
    icon: FaUserAlt,
    title: 'Artist Pages',
    description: 'Customizable artist profiles with bio, discography, concert dates, and fan engagement tools.'
  },
  {
    icon: FaUpload,
    title: 'Uploads & Distribution',
    description: 'Upload your music once and distribute to all major streaming platforms worldwide.'
  },
  {
    icon: FaDollarSign,
    title: 'Monetization',
    description: 'Earn from streams, tips, merchandise sales, and exclusive content subscriptions.'
  },
  {
    icon: FaListUl,
    title: 'Playlists & Discovery',
    description: 'Curated playlists, algorithmic recommendations, and genre-based radio for listeners.'
  },
  {
    icon: FaChartLine,
    title: 'Analytics & Insights',
    description: 'Real-time streaming data, listener demographics, royalty tracking, and growth trends.'
  }
];

const forArtists = [
  'Upload and distribute music to all major platforms',
  'Set your own pricing for downloads and exclusive content',
  'Track royalties and earnings in real time',
  'Engage fans with behind-the-scenes content and updates',
  'Get discovered through curated playlists and algorithmic recommendations',
  'Access detailed analytics on listener demographics and geography'
];

const forListeners = [
  'Stream millions of songs in high quality',
  'Discover new artists through personalized recommendations',
  'Create and share playlists with friends',
  'Download music for offline listening',
  'Support artists directly through tips and purchases',
  'Follow artists for updates on new releases and events'
];

const AngiTunes = () => {
  const navigate = useNavigate();
  const { colors, mode } = useTheme();

  return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${colors.brandNavy} 0%, #E11D48 50%, ${colors.accent}80 100%)`
          }}
        />
        <div
          className="absolute top-10 right-20 w-80 h-80 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: '#E11D48' }}
        />
        <div
          className="absolute bottom-20 left-10 w-64 h-64 rounded-full blur-3xl opacity-20"
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
                  AngiTunes
                </h1>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={200}>
                <p className="text-xl md:text-2xl font-medium mb-6" style={{ color: '#F472B6' }}>
                  Music Streaming & Distribution Platform
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={300}>
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Empowering African artists to share their music with the world. AngiTunes
                  is a streaming and distribution platform built for creators and listeners,
                  with fair monetization, powerful analytics, and continent-wide reach.
                </p>
              </ScrollReveal>

              <ScrollReveal animation="fadeUp" delay={400}>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/book')}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #E11D48, #F472B6)',
                      color: 'white',
                      boxShadow: '0 4px 20px #E11D4850'
                    }}
                  >
                    <FaRocket />
                    Start Listening
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
                    <FaMicrophone />
                    For Artists
                  </button>
                </div>
              </ScrollReveal>
            </div>

            {/* Screenshot placeholder */}
            <ScrollReveal animation="fadeLeft" delay={300}>
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${colors.brandNavy}90, #E11D4840)`,
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
                      border: '1px solid rgba(244,114,182,0.3)',
                      boxShadow: '0 16px 36px rgba(0,0,0,0.28)'
                    }}
                  >
                    <img
                      src={PRODUCT_LOGOS.angitunes}
                      alt="AngiTunes logo"
                      className="max-w-[13rem] max-h-20 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="text-white/60 text-sm font-medium">AngiTunes Player Preview</p>
                  <div className="mt-6 w-full max-w-xs">
                    <div
                      className="rounded-xl p-4 flex items-center gap-4"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #E11D48, #F472B6)' }}
                      >
                        <FaPlay className="text-white text-sm ml-0.5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-xs text-white/50">Now Playing</div>
                        <div className="text-sm font-bold text-white/80">Sample Track</div>
                      </div>
                      <FaHeart className="text-white/30" />
                    </div>
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: '45%', background: 'linear-gradient(90deg, #E11D48, #F472B6)' }}
                      />
                    </div>
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
                style={{ backgroundColor: '#E11D4815', color: '#E11D48' }}
              >
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Music, Your Way
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                A platform built for the African music ecosystem — from independent artists to major labels.
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
                    style={{ background: 'linear-gradient(135deg, #E11D4820, #F472B620)' }}
                  >
                    <feature.icon className="text-xl" style={{ color: '#E11D48' }} />
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

      {/* For Artists Section */}
      <section
        className="py-20 px-4"
        style={{
          background: mode === 'dark'
            ? 'rgba(255,255,255,0.02)'
            : `linear-gradient(180deg, ${colors.backgroundTertiary} 0%, ${colors.background} 100%)`
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <ScrollReveal animation="fadeRight">
              <div>
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
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: 'linear-gradient(135deg, #E11D4820, #F472B620)' }}
                >
                  <FaMicrophone className="text-2xl" style={{ color: '#E11D48' }} />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: colors.text }}>
                  For Artists
                </h2>
                <p className="text-lg mb-8 leading-relaxed" style={{ color: colors.textSecondary }}>
                  Take control of your music career. AngiTunes gives you the tools to upload,
                  distribute, monetize, and grow your fanbase — all from one dashboard.
                </p>
                <button
                  onClick={() => navigate('/book')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #E11D48, #F472B6)',
                    color: 'white'
                  }}
                >
                  <FaRocket />
                  Start Uploading
                </button>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fadeLeft" delay={200}>
              <div className="space-y-3">
                {forArtists.map((text, idx) => (
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
                      style={{ color: '#E11D48' }}
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

      {/* For Listeners Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <ScrollReveal animation="fadeRight" delay={200}>
              <div className="space-y-3 order-2 md:order-1">
                {forListeners.map((text, idx) => (
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
                      style={{ color: colors.accent }}
                    />
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fadeLeft">
              <div className="order-1 md:order-2">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `linear-gradient(135deg, ${colors.accent}20, ${colors.primary}20)` }}
                >
                  <FaHeadphones className="text-2xl" style={{ color: colors.accent }} />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: colors.text }}>
                  For Listeners
                </h2>
                <p className="text-lg mb-8 leading-relaxed" style={{ color: colors.textSecondary }}>
                  Discover the best of African music and beyond. Stream high-quality audio,
                  build playlists, and support the artists you love — all for free.
                </p>
                <button
                  onClick={() => navigate('/book')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`,
                    color: 'white'
                  }}
                >
                  <FaPlay />
                  Start Listening
                </button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Why AngiTunes */}
      <section
        className="py-20 px-4"
        style={{
          background: mode === 'dark'
            ? 'rgba(255,255,255,0.02)'
            : `linear-gradient(180deg, ${colors.background} 0%, ${colors.backgroundTertiary} 100%)`
        }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal animation="fadeUp">
            <div className="text-center mb-12">
              <span
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                style={{ backgroundColor: '#E11D4815', color: '#E11D48' }}
              >
                Why AngiTunes
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                Built for Africa, by Africa
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
                We understand the unique challenges African artists face. AngiTunes is designed
                to solve them.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FaGlobeAfrica, title: 'Pan-African Reach', text: 'Distribute your music across all 54 African countries and beyond.' },
              { icon: FaDollarSign, title: 'Fair Royalties', text: 'Transparent royalty structure with payouts in local currencies.' },
              { icon: FaPodcast, title: 'Podcast Support', text: 'Host and distribute podcasts alongside your music catalog.' },
              { icon: FaShieldAlt, title: 'Content Protection', text: 'DRM and watermarking to protect your intellectual property.' },
              { icon: FaMobileAlt, title: 'Mobile Optimized', text: 'Lightweight app designed for African mobile networks.' },
              { icon: FaChartLine, title: 'Growth Tools', text: 'Promotional tools, playlist pitching, and social sharing features.' }
            ].map((item, idx) => (
              <ScrollReveal key={idx} animation="fadeUp" delay={idx * 80}>
                <div
                  className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg, #E11D4820, #F472B620)' }}
                  >
                    <item.icon className="text-xl" style={{ color: '#E11D48' }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                    {item.text}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 px-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.brandNavy} 0%, #E11D48 100%)`
        }}
      >
        <div
          className="absolute top-0 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.accent }}
        />
        <div
          className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: '#F472B6' }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <ScrollReveal animation="fadeUp">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Let the Music Play
            </h2>
            <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Whether you are an artist looking to reach new fans or a listener discovering
              fresh sounds, AngiTunes is your platform. Join the movement.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/book')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #E11D48, #F472B6)',
                  color: 'white',
                  boxShadow: '0 4px 20px #E11D4850'
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

export default AngiTunes;
