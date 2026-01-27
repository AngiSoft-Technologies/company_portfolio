import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const VideoBackground = ({ 
  videoSrc, 
  fallbackImage, 
  overlay = true, 
  overlayOpacity = 0.6,
  children,
  className = '',
  minHeight = '100vh',
  parallax = false
}) => {
  const { colors } = useTheme();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75;
    }
  }, []);

  useEffect(() => {
    if (!parallax) return;
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallax]);

  const parallaxStyle = parallax ? {
    transform: `translateY(${scrollY * 0.5}px)`
  } : {};

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      {/* Video Layer */}
      {videoSrc && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            ...parallaxStyle,
            opacity: isVideoLoaded ? 1 : 0,
            transition: 'opacity 1s ease-in-out'
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Fallback Image */}
      {fallbackImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${fallbackImage})`,
            ...parallaxStyle,
            opacity: isVideoLoaded ? 0 : 1,
            transition: 'opacity 1s ease-in-out'
          }}
        />
      )}

      {/* Gradient Overlay */}
      {overlay && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, 
              rgba(15, 23, 42, ${overlayOpacity}) 0%, 
              rgba(30, 58, 95, ${overlayOpacity * 0.8}) 50%, 
              ${colors.primary}${Math.round(overlayOpacity * 40).toString(16).padStart(2, '0')} 100%)`
          }}
        />
      )}

      {/* Animated Particles/Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-shape shape-1" />
        <div className="floating-shape shape-2" />
        <div className="floating-shape shape-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>

      <style>{`
        .floating-shape {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 100%);
          animation: float 20s ease-in-out infinite;
        }
        .shape-1 {
          width: 300px;
          height: 300px;
          top: 10%;
          left: -5%;
          animation-delay: 0s;
        }
        .shape-2 {
          width: 200px;
          height: 200px;
          top: 60%;
          right: -3%;
          animation-delay: -7s;
        }
        .shape-3 {
          width: 150px;
          height: 150px;
          bottom: 10%;
          left: 30%;
          animation-delay: -14s;
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -30px) rotate(5deg); }
          50% { transform: translate(-10px, 20px) rotate(-5deg); }
          75% { transform: translate(30px, 10px) rotate(3deg); }
        }
      `}</style>
    </div>
  );
};

export default VideoBackground;
