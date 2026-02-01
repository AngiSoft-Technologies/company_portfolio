import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { Link } from "react-router-dom";
import { apiGet } from '../../js/httpClient';
import { 
  FaRocket, 
  FaArrowRight, 
  FaCalendarCheck, 
  FaUsers, 
  FaProjectDiagram, 
  FaAward, 
  FaHeadset,
  FaPlay,
  FaChevronDown
} from "react-icons/fa";
import { AnimatedCounter, ScrollReveal } from "../modern";

// Icon mapping for dynamic icons from database
const iconMap = {
  FaUsers, FaProjectDiagram, FaAward, FaHeadset, FaRocket, FaCalendarCheck
};

const Hero = () => {
  const { colors } = useTheme();
  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [heroData, setHeroData] = useState(null);

  const getResponsiveValue = (values) => {
    const w = window.innerWidth;
    if (w < 360) return values[360];
    if (w < 420) return values[420];
    if (w < 475) return values[475];
    if (w < 575) return values[575];
    if (w < 768) return values[768];
    if (w < 900) return values[900];
    if (w < 1024) return values[1024];
    if (w < 1366) return values[1366];
    if (w < 1440) return values[1440];
    if (w < 1920) return values[1920];
    return values[1920];
  };

  const defaultHero = {
    headline: "Building Tomorrow's",
    headlineHighlight: "Digital Solutions",
    subheadline: "Today",
    tagline: "We transform ideas into powerful software products that drive business growth and innovation across Africa and beyond.",
    ctaPrimary: { text: "Start Your Project", link: "/booking" },
    ctaSecondary: { text: "View Our Work", link: "/#projects" },
    stats: [
      { value: 50, suffix: '+', label: 'Happy Clients', icon: 'FaUsers' },
      { value: 5, suffix: '+', label: 'Projects Delivered', icon: 'FaProjectDiagram' },
      { value: 2, suffix: '+', label: 'Years Experience', icon: 'FaAward' },
      { value: 24, suffix: '/7', label: 'Support Available', icon: 'FaHeadset' }
    ],
    backgroundVideo: "/videos/Matrix_rain_code.mp4",
    backgroundImage: "/images/Software-Development-Company.jpg",
    alternativeVideos: ["/videos/Hacked_screen_video.mp4", "/videos/Logo - AngiSoft Technologies.mp4"]
  };

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const data = await apiGet('/site/hero');
        setHeroData(data || defaultHero);
        console.log('Hero data fetched:', data || defaultHero);
      } catch (err) {
        console.error('Failed to fetch hero data:', err);
        setHeroData(defaultHero);
      }
    };
    fetchHero();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle video autoplay with fallback
  useEffect(() => {
    console.log('Setting up video autoplay');
    if (videoRef.current) {
      console.log('Video ref found, current src:', videoRef.current.src);
      videoRef.current.setAttribute('autoplay', '');
      videoRef.current.setAttribute('muted', '');
      videoRef.current.setAttribute('playsinline', '');
      
      const playVideo = async () => {
        try {
          console.log('Attempting to play video...');
          await videoRef.current.play();
          console.log('✅ Video playing');
        } catch (error) {
          console.log('❌ Autoplay failed, showing poster:', error);
          setVideoLoaded(false);
        }
      };
      
      // Delay to ensure video element is ready
      setTimeout(playVideo, 500);
    } else {
      console.log('⚠️ Video ref not found');
    }
  }, [heroData]);

  const content = heroData || defaultHero;
  const stats = (content.stats || []).map(s => ({
    ...s,
    icon: iconMap[s.icon] || FaUsers
  }));

  return (
    <section 
      id="hero" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        marginTop: getResponsiveValue({ 360: '3.5rem', 420: '3.75rem', 475: '4rem', 575: '4.25rem', 768: '4.5rem', 900: '4.75rem', 1024: '5rem', 1366: '5.25rem', 1440: '5.5rem', 1920: '5.75rem' })
      }}
    >
      {/* Video Background */}
      <div className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }}>
        {/* Base gradient - always visible */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #0c4a6e 0%, #1e3a5f 30%, #0f172a 100%)`
          }}
        />
        
        {/* Image Poster - Primary fallback */}
        <img 
          src="/images/Software-Development-Company.jpg"
          alt="Hero Background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            opacity: videoLoaded ? 0 : 0.8,
            transition: 'opacity 0.8s ease-in-out'
          }}
          onLoad={() => console.log('✅ Image loaded')}
          onError={(e) => console.error('❌ Image failed:', e.target.src)}
        />
        
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay={true}
          loop={true}
          muted={true}
          playsInline={true}
          controls={false}
          disablePictureInPicture={true}
          preload="auto"
          onLoadedData={() => {
            console.log('✅ Video loaded (onLoadedData)');
            setVideoLoaded(true);
          }}
          onCanPlay={() => {
            console.log('✅ Video can play (onCanPlay)');
          }}
          onError={(e) => {
            console.error('❌ Video error:', e);
            setVideoLoaded(false);
          }}
          onPlay={() => console.log('✅ Video playing')}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            opacity: videoLoaded ? 0.4 : 0, 
            transition: 'opacity 0.8s ease-in-out',
            display: 'block',
            width: '100%',
            height: '100%',
            zIndex: 1,
            pointerEvents: 'none'
          }}
          poster="/images/Software-Development-Company.jpg"
        >
          <source src="/videos/Matrix_rain_code.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Animated Gradient Overlay */}
      <div 
        className="absolute inset-0 z-1"
        style={{
          background: `radial-gradient(ellipse at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, 
            ${colors.primary}30 0%, 
            transparent 50%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ 
            top: '10%', 
            left: '5%', 
            backgroundColor: `${colors.primary}20`,
            animationDuration: '4s'
          }} 
        />
        <div 
          className="absolute w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{ 
            bottom: '15%', 
            right: '10%', 
            backgroundColor: `${colors.secondary}15`,
            animationDuration: '6s',
            animationDelay: '2s'
          }} 
        />
        <div 
          className="absolute w-64 h-64 rounded-full blur-3xl animate-pulse"
          style={{ 
            top: '40%', 
            right: '30%', 
            backgroundColor: `${colors.primary}10`,
            animationDuration: '8s',
            animationDelay: '1s'
          }} 
        />
      </div>

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] z-1"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Animated Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-5 z-1" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
        </defs>
        {[...Array(5)].map((_, i) => (
          <line 
            key={i}
            x1={`${i * 20}%`} 
            y1="100%" 
            x2="100%" 
            y2={`${i * 20}%`} 
            stroke="url(#lineGrad)" 
            strokeWidth="1"
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </svg>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center" style={{ 
        paddingTop: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.75rem', 1366: '3rem', 1440: '3.25rem', 1920: '3.5rem' }),
        paddingBottom: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.75rem', 1366: '3rem', 1440: '3.25rem', 1920: '3.5rem' })
      }}>
        {/* Status Badge */}
        <ScrollReveal animation="fadeDown" delay={0}>
          <div 
            className="inline-flex items-center gap-3 rounded-full text-sm font-medium"
            style={{
              padding: getResponsiveValue({ 360: '0.4rem 0.75rem', 420: '0.425rem 0.875rem', 475: '0.45rem 1rem', 575: '0.475rem 1.125rem', 768: '0.5rem 1.25rem', 900: '0.5rem 1.375rem', 1024: '0.525rem 1.5rem', 1366: '0.55rem 1.625rem', 1440: '0.6rem 1.75rem', 1920: '0.625rem 2rem' }),
              marginBottom: getResponsiveValue({ 360: '1rem', 420: '1.125rem', 475: '1.25rem', 575: '1.375rem', 768: '1.5rem', 900: '1.5rem', 1024: '1.625rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' }),
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.9)'
            }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span 
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: colors.primary }}
              />
              <span 
                className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ backgroundColor: colors.primary }}
              />
            </span>
            Trusted by 50+ Clients Worldwide
          </div>
        </ScrollReveal>
        
        {/* Heading */}
        <ScrollReveal animation="fadeUp" delay={100}>
          <h2 className="font-medium text-white/70" style={{
            fontSize: getResponsiveValue({ 360: '0.9rem', 420: '0.95rem', 475: '1rem', 575: '1.05rem', 768: '1.1rem', 900: '1.15rem', 1024: '1.2rem', 1366: '1.3rem', 1440: '1.4rem', 1920: '1.5rem' }),
            marginBottom: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.75rem', 768: '0.875rem', 900: '0.875rem', 1024: '1rem', 1366: '1.125rem', 1440: '1.25rem', 1920: '1.375rem' })
          }}>
            Welcome to
          </h2>
        </ScrollReveal>
        
        <ScrollReveal animation="scaleUp" delay={200}>
          <h1 
            className="font-black tracking-tight"
            style={{ 
              fontSize: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.75rem', 768: '3rem', 900: '3.5rem', 1024: '4rem', 1366: '4.5rem', 1440: '5rem', 1920: '5.5rem' }),
              marginBottom: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.375rem', 1024: '1.5rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' }),
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, #a78bfa 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: '0 0 80px rgba(20, 184, 166, 0.3)'
            }}
          >
            AngiSoft Technologies
          </h1>
        </ScrollReveal>
        
        <ScrollReveal animation="slideUp" delay={300}>
          <h3 
            className="font-semibold tracking-wide text-white/90"
            style={{ 
              fontSize: getResponsiveValue({ 360: '0.9rem', 420: '0.95rem', 475: '1rem', 575: '1.1rem', 768: '1.2rem', 900: '1.35rem', 1024: '1.5rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' }),
              marginBottom: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.875rem', 768: '1rem', 900: '1.125rem', 1024: '1.25rem', 1366: '1.375rem', 1440: '1.5rem', 1920: '1.75rem' })
            }}
          >
            Your Partner in Digital Innovation
          </h3>
        </ScrollReveal>
        
        <ScrollReveal animation="fadeUp" delay={400}>
          <p 
            className="text-white/60 max-w-3xl mx-auto leading-relaxed"
            style={{
              fontSize: getResponsiveValue({ 360: '0.875rem', 420: '0.9rem', 475: '0.95rem', 575: '1rem', 768: '1.05rem', 900: '1.1rem', 1024: '1.15rem', 1366: '1.2rem', 1440: '1.25rem', 1920: '1.375rem' }),
              marginBottom: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.75rem', 1366: '3rem', 1440: '3.25rem', 1920: '3.5rem' })
            }}
          >
            {content.tagline}
          </p>
        </ScrollReveal>
        
        {/* CTA Buttons */}
        <ScrollReveal animation="fadeUp" delay={500}>
          <div 
            className="flex flex-col sm:flex-row flex-wrap justify-center"
            style={{
              gap: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.25rem', 1024: '1.375rem', 1366: '1.5rem', 1440: '1.625rem', 1920: '1.75rem' })
            }}
          >
            <Link 
              to={content.ctaPrimary?.link || "/booking"}
              className="group inline-flex items-center justify-center text-white shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-xl font-semibold"
              style={{
                padding: getResponsiveValue({ 360: '0.4rem 1rem', 420: '0.425rem 1.125rem', 475: '0.45rem 1.25rem', 575: '0.475rem 1.375rem', 768: '0.5rem 1.5rem', 900: '0.5rem 1.5rem', 1024: '0.525rem 1.625rem', 1366: '0.55rem 1.75rem', 1440: '0.6rem 1.875rem', 1920: '0.625rem 2rem' }),
                fontSize: getResponsiveValue({ 360: '0.75rem', 420: '0.8rem', 475: '0.85rem', 575: '0.9rem', 768: '0.95rem', 900: '1rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.1rem', 1920: '1.2rem' }),
                gap: getResponsiveValue({ 360: '0.4rem', 420: '0.5rem', 475: '0.5rem', 575: '0.6rem', 768: '0.75rem', 900: '0.75rem', 1024: '0.75rem', 1366: '1rem', 1440: '1rem', 1920: '1rem' }),
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark || colors.primary} 100%)`,
                boxShadow: `0 20px 40px ${colors.primary}40`
              }}
            >
              <FaRocket className="group-hover:rotate-12 transition-transform" style={{ fontSize: getResponsiveValue({ 360: '0.6rem', 420: '0.65rem', 475: '0.7rem', 575: '0.75rem', 768: '0.8rem', 900: '0.85rem', 1024: '0.9rem', 1366: '1rem', 1440: '1.05rem', 1920: '1.15rem' }) }} />
              Explore Services
              <FaArrowRight className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" style={{ fontSize: getResponsiveValue({ 360: '0.5rem', 420: '0.55rem', 475: '0.6rem', 575: '0.6rem', 768: '0.65rem', 900: '0.7rem', 1024: '0.7rem', 1366: '0.8rem', 1440: '0.85rem', 1920: '0.95rem' }) }} />
            </Link>
            <Link 
              to="/book"
              className="group inline-flex items-center justify-center text-white border-2 hover:-translate-y-1 transition-all duration-300 rounded-xl font-semibold"
              style={{
                padding: getResponsiveValue({ 360: '0.4rem 1rem', 420: '0.425rem 1.125rem', 475: '0.45rem 1.25rem', 575: '0.475rem 1.375rem', 768: '0.5rem 1.5rem', 900: '0.5rem 1.5rem', 1024: '0.525rem 1.625rem', 1366: '0.55rem 1.75rem', 1440: '0.6rem 1.875rem', 1920: '0.625rem 2rem' }),
                fontSize: getResponsiveValue({ 360: '0.75rem', 420: '0.8rem', 475: '0.85rem', 575: '0.9rem', 768: '0.95rem', 900: '1rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.1rem', 1920: '1.2rem' }),
                gap: getResponsiveValue({ 360: '0.4rem', 420: '0.5rem', 475: '0.5rem', 575: '0.6rem', 768: '0.75rem', 900: '0.75rem', 1024: '0.75rem', 1366: '1rem', 1440: '1rem', 1920: '1rem' }),
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(255,255,255,0.2)'
              }}
            >
              <FaCalendarCheck className="group-hover:scale-110 transition-transform" style={{ fontSize: getResponsiveValue({ 360: '0.6rem', 420: '0.65rem', 475: '0.7rem', 575: '0.75rem', 768: '0.8rem', 900: '0.85rem', 1024: '0.9rem', 1366: '1rem', 1440: '1.05rem', 1920: '1.15rem' }) }} />
              Request a Quote
            </Link>
          </div>
        </ScrollReveal>

        {/* Video Showreel Button */}
        <ScrollReveal animation="fadeUp" delay={600}>
          <button 
            className="inline-flex items-center text-white/70 hover:text-white transition-colors group"
            style={{
              marginTop: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.75rem', 1366: '3rem', 1440: '3.25rem', 1920: '3.5rem' }),
              gap: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.75rem', 768: '0.875rem', 900: '0.875rem', 1024: '1rem', 1366: '1rem', 1440: '1.125rem', 1920: '1.25rem' })
            }}
          >
            <div 
              className="rounded-full flex items-center justify-center transition-all group-hover:scale-110"
              style={{
                width: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.5rem', 768: '2.75rem', 900: '2.75rem', 1024: '3rem', 1366: '3rem', 1440: '3.25rem', 1920: '3.5rem' }),
                height: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.5rem', 768: '2.75rem', 900: '2.75rem', 1024: '3rem', 1366: '3rem', 1440: '3.25rem', 1920: '3.5rem' }),
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <FaPlay size={14} className="ml-0.5" style={{ fontSize: getResponsiveValue({ 360: '0.6rem', 420: '0.65rem', 475: '0.7rem', 575: '0.75rem', 768: '0.8rem', 900: '0.85rem', 1024: '0.9rem', 1366: '1rem', 1440: '1.05rem', 1920: '1.15rem' }) }} />
            </div>
            <span className="font-medium" style={{ fontSize: getResponsiveValue({ 360: '0.65rem', 420: '0.7rem', 475: '0.75rem', 575: '0.8rem', 768: '0.85rem', 900: '0.9rem', 1024: '0.95rem', 1366: '1rem', 1440: '1rem', 1920: '1.05rem' }) }}>Watch Our Showreel</span>
          </button>
        </ScrollReveal>

        {/* Stats Section */}
        <ScrollReveal animation="fadeUp" delay={700}>
          <div 
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ 
              gap: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.875rem', 768: '1rem', 900: '1rem', 1024: '1.125rem', 1366: '1.25rem', 1440: '1.375rem', 1920: '1.5rem' }),
              marginTop: getResponsiveValue({ 360: '2rem', 420: '2.5rem', 475: '2.75rem', 575: '3rem', 768: '3.5rem', 900: '3.5rem', 1024: '3.75rem', 1366: '4rem', 1440: '4.25rem', 1920: '4.5rem' }),
              paddingTop: getResponsiveValue({ 360: '1rem', 420: '1.125rem', 475: '1.25rem', 575: '1.375rem', 768: '1.5rem', 900: '1.5rem', 1024: '1.625rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' }),
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group text-center rounded-xl transition-all duration-300 hover:-translate-y-2"
                style={{
                  padding: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.25rem', 1024: '1.375rem', 1366: '1.5rem', 1440: '1.625rem', 1920: '1.75rem' }),
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div 
                  className="mx-auto rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ 
                    width: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.75rem', 768: '3rem', 900: '3rem', 1024: '3.25rem', 1366: '3.5rem', 1440: '3.75rem', 1920: '4rem' }),
                    height: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.75rem', 768: '3rem', 900: '3rem', 1024: '3.25rem', 1366: '3.5rem', 1440: '3.75rem', 1920: '4rem' }),
                    marginBottom: getResponsiveValue({ 360: '0.4rem', 420: '0.5rem', 475: '0.625rem', 575: '0.625rem', 768: '0.75rem', 900: '0.75rem', 1024: '0.875rem', 1366: '0.875rem', 1440: '1rem', 1920: '1.125rem' }),
                    background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}20 100%)`
                  }}
                >
                  <stat.icon style={{ color: colors.primary, fontSize: getResponsiveValue({ 360: '1rem', 420: '1.1rem', 475: '1.2rem', 575: '1.25rem', 768: '1.4rem', 900: '1.4rem', 1024: '1.5rem', 1366: '1.6rem', 1440: '1.7rem', 1920: '1.875rem' }) }} />
                </div>
                <p 
                  className="font-bold"
                  style={{
                    fontSize: getResponsiveValue({ 360: '1.25rem', 420: '1.375rem', 475: '1.5rem', 575: '1.75rem', 768: '1.875rem', 900: '2rem', 1024: '2.25rem', 1366: '2.5rem', 1440: '2.75rem', 1920: '3rem' }),
                    marginBottom: getResponsiveValue({ 360: '0.2rem', 420: '0.25rem', 475: '0.25rem', 575: '0.375rem', 768: '0.375rem', 900: '0.375rem', 1024: '0.5rem', 1366: '0.5rem', 1440: '0.625rem', 1920: '0.75rem' }),
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}
                >
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p 
                  className="text-white/50"
                  style={{
                    fontSize: getResponsiveValue({ 360: '0.7rem', 420: '0.75rem', 475: '0.8rem', 575: '0.85rem', 768: '0.9rem', 900: '0.95rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.1rem', 1920: '1.15rem' })
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Scroll Indicator */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 animate-bounce"
          style={{
            bottom: getResponsiveValue({ 360: '1rem', 420: '1.125rem', 475: '1.25rem', 575: '1.375rem', 768: '1.5rem', 900: '1.5rem', 1024: '1.75rem', 1366: '1.875rem', 1440: '2rem', 1920: '2rem' })
          }}
        >
          <a 
            href="#about" 
            className="flex flex-col items-center text-white/40 hover:text-white/70 transition-colors"
            style={{
              gap: getResponsiveValue({ 360: '0.3rem', 420: '0.375rem', 475: '0.4rem', 575: '0.5rem', 768: '0.5rem', 900: '0.5rem', 1024: '0.5rem', 1366: '0.625rem', 1440: '0.625rem', 1920: '0.75rem' })
            }}
          >
            <span 
              className="uppercase tracking-widest font-medium"
              style={{
                fontSize: getResponsiveValue({ 360: '0.55rem', 420: '0.6rem', 475: '0.65rem', 575: '0.7rem', 768: '0.75rem', 900: '0.8rem', 1024: '0.8rem', 1366: '0.85rem', 1440: '0.9rem', 1920: '0.95rem' })
              }}
            >
              Scroll
            </span>
            <FaChevronDown style={{ fontSize: getResponsiveValue({ 360: '0.7rem', 420: '0.75rem', 475: '0.8rem', 575: '0.85rem', 768: '0.9rem', 900: '0.95rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.1rem', 1920: '1.25rem' }) }} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;