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

  const defaultHero = {
    headline: "Building Tomorrow's",
    headlineHighlight: "Digital Solutions",
    subheadline: "Today",
    tagline: "We transform ideas into powerful software products that drive business growth and innovation across Africa and beyond.",
    ctaPrimary: { text: "Start Your Project", link: "/booking" },
    ctaSecondary: { text: "View Our Work", link: "/#projects" },
    stats: [
      { value: 50, suffix: '+', label: 'Happy Clients', icon: 'FaUsers' },
      { value: 100, suffix: '+', label: 'Projects Delivered', icon: 'FaProjectDiagram' },
      { value: 5, suffix: '+', label: 'Years Experience', icon: 'FaAward' },
      { value: 24, suffix: '/7', label: 'Support Available', icon: 'FaHeadset' }
    ],
    backgroundVideo: "/videos/Logo - AngiSoft Technologies.mp4",
    backgroundImage: "/images/Logo - AngiSoft Technologies.png"
  };

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const data = await apiGet('/site/hero');
        setHeroData(data || defaultHero);
      } catch (err) {
        console.error(err);
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

  const content = heroData || defaultHero;
  const stats = (content.stats || []).map(s => ({
    ...s,
    icon: iconMap[s.icon] || FaUsers
  }));

  return (
    <section 
      id="hero" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: videoLoaded ? 0.4 : 0, transition: 'opacity 1s ease' }}
          poster="/images/Logo - AngiSoft Technologies.png"
        >
          <source src="/videos/Logo - AngiSoft Technologies.mp4" type="video/mp4" />
        </video>
        
        {/* Fallback Gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #0c4a6e 0%, #1e3a5f 30%, #0f172a 100%)`
          }}
        />
      </div>

      {/* Animated Gradient Overlay */}
      <div 
        className="absolute inset-0 z-1"
        style={{
          background: `radial-gradient(ellipse at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, 
            ${colors.primary}30 0%, 
            transparent 50%)`
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
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center pt-28 pb-20">
        {/* Status Badge */}
        <ScrollReveal animation="fadeDown" delay={0}>
          <div 
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-sm font-medium mb-8"
            style={{
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
          <h2 className="text-xl md:text-2xl font-medium text-white/70 mb-4">
            Welcome to
          </h2>
        </ScrollReveal>
        
        <ScrollReveal animation="scaleUp" delay={200}>
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight"
            style={{ 
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
        
        <ScrollReveal animation="fadeUp" delay={300}>
          <h3 className="text-xl md:text-2xl lg:text-3xl font-medium text-white/90 mb-6">
            Your Partner in Digital Innovation
          </h3>
        </ScrollReveal>
        
        <ScrollReveal animation="fadeUp" delay={400}>
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-3xl mx-auto leading-relaxed">
            {content.tagline}
          </p>
        </ScrollReveal>
        
        {/* CTA Buttons */}
        <ScrollReveal animation="fadeUp" delay={500}>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 md:gap-4 mt-8 md:mt-10">
            <Link 
              to={content.ctaPrimary?.link || "/booking"}
              className="group inline-flex items-center justify-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-semibold text-base md:text-lg transition-all duration-300 text-white shadow-xl hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark || colors.primary} 100%)`,
                boxShadow: `0 20px 40px ${colors.primary}40`
              }}
            >
              <FaRocket className="group-hover:rotate-12 transition-transform" />
              Explore Services
              <FaArrowRight className="text-sm opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </Link>
            <Link 
              to="/book"
              className="group inline-flex items-center justify-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-semibold text-base md:text-lg transition-all duration-300 text-white border-2 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(255,255,255,0.2)'
              }}
            >
              <FaCalendarCheck className="group-hover:scale-110 transition-transform" />
              Request a Quote
            </Link>
          </div>
        </ScrollReveal>

        {/* Video Showreel Button */}
        <ScrollReveal animation="fadeUp" delay={600}>
          <button 
            className="mt-8 inline-flex items-center gap-3 text-white/70 hover:text-white transition-colors group"
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <FaPlay size={14} className="ml-0.5" />
            </div>
            <span className="text-sm font-medium">Watch Our Showreel</span>
          </button>
        </ScrollReveal>

        {/* Stats Section */}
        <ScrollReveal animation="fadeUp" delay={700}>
          <div 
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 lg:gap-6 mt-16 md:mt-20 pt-8 md:pt-10"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group text-center p-4 md:p-5 rounded-xl md:rounded-2xl transition-all duration-300 hover:-translate-y-2"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div 
                  className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-lg md:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}20 100%)`
                  }}
                >
                  <stat.icon size={18} className="md:text-xl" style={{ color: colors.primary }} />
                </div>
                <p 
                  className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}
                >
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-white/50 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <a 
            href="#about" 
            className="flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="text-xs uppercase tracking-widest font-medium">Scroll</span>
            <FaChevronDown size={14} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;