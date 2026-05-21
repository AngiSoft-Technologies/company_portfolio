import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarCheck, FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const merchImages = [
  { src: '/images/Branding/AngiSoft T-Shirts Design.png', alt: 'AngiSoft T-Shirts' },
  { src: '/images/Branding/AngiSoft Hoodie Design.png', alt: 'AngiSoft Hoodie' },
  { src: '/images/Branding/AngiSoft Muggs and cups Design.png', alt: 'AngiSoft Mugs & Cups' },
  { src: '/images/Branding/AngiSoft NoteBooks Design.png', alt: 'AngiSoft Notebooks' },
  { src: '/images/Branding/AngiSoft Car Branding.png', alt: 'AngiSoft Car Branding' },
  { src: '/images/Branding/AngiSoft Capes Design.png', alt: 'AngiSoft Caps' },
  { src: '/images/Branding/AngiSoft Pens Design.png', alt: 'AngiSoft Pens' },
  { src: '/images/Branding/AngiSoft Stickers Design.png', alt: 'AngiSoft Stickers' },
  { src: '/images/Branding/AngiSoft Envelop Design.png', alt: 'AngiSoft Envelope' },
  { src: '/images/Business Cards/AngiSoft Business Card Front View.png', alt: 'Business Card' },
];

const BrandCTA = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % merchImages.length);
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const prev = () => { setCurrent((c) => (c - 1 + merchImages.length) % merchImages.length); setPaused(true); };
  const next = () => { setCurrent((c) => (c + 1) % merchImages.length); setPaused(true); };

  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      padding: '6rem 0',
      background: 'linear-gradient(135deg, #07142B 0%, #0B1E3D 40%, #102A55 70%, #07142B 100%)',
    }}>
      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '10%', width: '500px', height: '500px', borderRadius: '50%', filter: 'blur(120px)', background: 'var(--primary)', opacity: 0.12, pointerEvents: 'none', animation: 'angi-glow-pulse 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', filter: 'blur(120px)', background: 'var(--secondary)', opacity: 0.08, pointerEvents: 'none', animation: 'angi-glow-pulse 8s ease-in-out infinite 4s' }} />

      {/* Grid pattern overlay */}
      <div className="angi-grid-bg" />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

          {/* LEFT: Text content */}
          <div>
            {/* Promise badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.375rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem',
              fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              background: 'rgba(8, 117, 255, 0.12)', color: 'var(--primary)',
              border: '1px solid rgba(8, 117, 255, 0.2)', marginBottom: '1.5rem',
            }}>
              Innovate &middot; Build &middot; Empower
            </div>

            {/* Heading */}
            <h2 style={{
              fontFamily: "'Sora', sans-serif", fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em',
              color: 'var(--text-primary)', marginBottom: '1.25rem',
            }}>
              From planning to deployment,{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                secure, scalable, and maintainable
              </span>{' '}
              software that helps businesses work smarter.
            </h2>

            {/* Description */}
            <p style={{
              fontSize: '1.0625rem', lineHeight: 1.8, color: 'rgba(245,247,250,0.6)',
              marginBottom: '2.5rem', maxWidth: '28rem',
            }}>
              We combine technical excellence with deep business understanding to build digital products that drive real, measurable growth across East Africa.
            </p>

            {/* CTA */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <Link to="/book" className="angi-btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
                <FaCalendarCheck /> Book Discovery Call
              </Link>
              <Link to="/services" className="angi-btn-secondary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
                Explore Services <FaArrowRight style={{ fontSize: '0.75rem' }} />
              </Link>
            </div>
          </div>

          {/* RIGHT: Merchandise slider */}
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Slider frame */}
            <div style={{
              position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,175,255,0.1)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 80px rgba(8,117,255,0.06)',
            }}>
              {/* Image container */}
              <div style={{ position: 'relative', height: '420px', overflow: 'hidden' }}>
                {merchImages.map((img, i) => (
                  <img
                    key={i}
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    decoding="async"
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'contain', padding: '2rem',
                      opacity: i === current ? 1 : 0,
                      transform: i === current ? 'scale(1)' : 'scale(0.95)',
                      transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                ))}

                {/* Overlay gradient at bottom */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
                  background: 'linear-gradient(transparent, rgba(7,20,43,0.8))',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Navigation arrows */}
              <button onClick={prev} style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: 'none',
                background: 'rgba(7,20,43,0.7)', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)', transition: 'all 0.3s', zIndex: 5,
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(7,20,43,0.7)'}
              >
                <FaChevronLeft style={{ fontSize: '0.75rem' }} />
              </button>
              <button onClick={next} style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: 'none',
                background: 'rgba(7,20,43,0.7)', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)', transition: 'all 0.3s', zIndex: 5,
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(7,20,43,0.7)'}
              >
                <FaChevronRight style={{ fontSize: '0.75rem' }} />
              </button>

              {/* Label */}
              <div style={{
                padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '1px solid rgba(0,175,255,0.08)', background: 'rgba(7,20,43,0.5)',
              }}>
                <span style={{
                  fontFamily: "'Sora', sans-serif", fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  {merchImages[current].alt}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(245,247,250,0.4)' }}>
                  AngiSoft Brand
                </span>
              </div>
            </div>

            {/* Dot indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              {merchImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); setPaused(true); }}
                  style={{
                    width: i === current ? '2rem' : '0.5rem',
                    height: '0.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                    background: i === current ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandCTA;
