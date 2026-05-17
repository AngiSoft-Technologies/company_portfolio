import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { FaStar, FaQuoteLeft, FaChevronLeft, FaChevronRight, FaArrowRight } from 'react-icons/fa';
import ScrollReveal from '../modern/ScrollReveal';

const TestimonialSlider = () => {
  const { colors, mode } = useTheme();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isDark = mode === 'dark';

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    apiGet('/testimonials')
      .then((data) => setTestimonials(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isPlaying || testimonials.length === 0 || reduceMotion) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying, testimonials.length, reduceMotion]);

  const prev = () => {
    setIsPlaying(false);
    setActiveIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const next = () => {
    setIsPlaying(false);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const renderStars = (rating = 5) =>
    Array.from({ length: 5 }, (_, i) => (
      <FaStar key={i} className={i < rating ? 'text-amber-400' : 'text-gray-400'} />
    ));

  if (loading || testimonials.length === 0) return null;

  const t = testimonials[activeIndex];
  const name = t.name || 'Client';
  const role = t.role || '';
  const message = t.text || t.message || '';
  const company = t.company || '';
  const avatar = t.imageUrl || null;

  return (
    <section
      className="testimonial-slider"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #07142B 0%, #0B1E3D 50%, #07142B 100%)'
          : 'linear-gradient(180deg, #F8FAFF 0%, #EFF5FF 50%, #F8FAFF 100%)',
        color: isDark ? '#fff' : '#07142B',
      }}
    >
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold mb-5"
              style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
            >
              <FaStar />
              What Our Clients Say
            </div>
            <h2 className="text-3xl md:text-5xl font-bold">
              Trusted by <span style={{ color: colors.primary }}>Businesses</span> Across Africa
            </h2>
          </div>
        </ScrollReveal>

        {/* Main testimonial card */}
        <div className="relative">
          <div
            className="testimonial-slider__card"
            style={{
              background: isDark
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(255,255,255,0.9)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              backdropFilter: 'blur(16px)',
            }}
          >
            <FaQuoteLeft
              className="text-4xl mb-6 opacity-20"
              style={{ color: colors.primary }}
            />

            <p className="testimonial-slider__message">
              {message}
            </p>

            <div className="testimonial-slider__author">
              {avatar && (
                <img
                  src={avatar}
                  alt={name}
                  className="testimonial-slider__avatar"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div>
                <div className="font-semibold text-lg">{name}</div>
                {role && (
                  <div style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
                    {role}{company ? ` · ${company}` : ''}
                  </div>
                )}
                <div className="flex gap-1 mt-1">{renderStars(t.rating || 5)}</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="testimonial-slider__nav">
            <button onClick={prev} aria-label="Previous testimonial" className="testimonial-slider__arrow">
              <FaChevronLeft />
            </button>
            <div className="testimonial-slider__dots">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Testimonial ${i + 1}`}
                  onClick={() => { setIsPlaying(false); setActiveIndex(i); }}
                  className="testimonial-slider__dot"
                  style={i === activeIndex ? { backgroundColor: colors.primary, transform: 'scale(1.3)' } : {}}
                />
              ))}
            </div>
            <button onClick={next} aria-label="Next testimonial" className="testimonial-slider__arrow">
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Link to all testimonials */}
        <div className="text-center mt-10">
          <Link
            to="/testimonials"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: colors.primary }}
          >
            Read All Testimonials <FaArrowRight />
          </Link>
        </div>
      </div>

      <style>{`
        .testimonial-slider {
          position: relative;
          padding: 5rem 0;
          overflow: hidden;
        }
        .testimonial-slider__card {
          max-width: 720px;
          margin: 0 auto;
          padding: 2.5rem 2rem;
          border-radius: 1.25rem;
          text-align: center;
        }
        .testimonial-slider__message {
          font-size: clamp(1rem, 2vw, 1.25rem);
          line-height: 1.7;
          margin-bottom: 2rem;
          font-style: italic;
        }
        .testimonial-slider__author {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .testimonial-slider__avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(0,194,255,0.3);
        }
        .testimonial-slider__nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .testimonial-slider__arrow {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(128,128,128,0.25);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: inherit;
          transition: background 0.2s;
        }
        .testimonial-slider__arrow:hover {
          background: rgba(128,128,128,0.1);
        }
        .testimonial-slider__dots {
          display: flex;
          gap: 0.5rem;
        }
        .testimonial-slider__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: rgba(128,128,128,0.3);
          cursor: pointer;
          transition: background 0.3s, transform 0.3s;
        }
        @media (max-width: 640px) {
          .testimonial-slider__card { padding: 2rem 1.25rem; }
        }
      `}</style>
    </section>
  );
};

export default TestimonialSlider;
