import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const VideoBackground = ({
  videoSrc,
  fallbackImage,
  overlay = true,
  overlayOpacity = 0.72,
  children,
  className = '',
  minHeight = '100vh',
  parallax = false,
  showParticles = false
}) => {
  const { colors } = useTheme();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (videoRef.current && !reduceMotion) {
      videoRef.current.playbackRate = 0.75;
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (!parallax || reduceMotion) return;

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallax, reduceMotion]);

  const parallaxStyle = parallax && !reduceMotion ? {
    transform: `translateY(${scrollY * 0.5}px)`
  } : {};

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      {videoSrc && !reduceMotion && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback"
          onLoadedData={() => setIsVideoLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover angi-video-bg"
          style={{
            ...parallaxStyle,
            opacity: isVideoLoaded ? 1 : 0,
            transition: 'opacity 1s ease-in-out'
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {fallbackImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${fallbackImage})`,
            ...parallaxStyle,
            opacity: isVideoLoaded && !reduceMotion ? 0 : 1,
            transition: 'opacity 1s ease-in-out'
          }}
        />
      )}

      <div className="absolute inset-0 angi-technical-grid-soft opacity-50" />
      <div className="angi-grain" />

      {overlay && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg,
              rgba(7, 20, 43, ${overlayOpacity}) 0%,
              rgba(7, 20, 43, ${Math.min(overlayOpacity + 0.12, 0.94)}) 62%,
              rgba(11, 30, 61, ${Math.min(overlayOpacity + 0.18, 0.96)}) 100%)`
          }}
        />
      )}

      {showParticles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="floating-shape shape-1" />
          <div className="floating-shape shape-2" />
          <div className="floating-shape shape-3" />
        </div>
      )}

      <div className="relative z-10 h-full">
        {children}
      </div>

      {showParticles && (
        <style>{`
          .floating-shape {
            position: absolute;
            border-radius: 50%;
            background: linear-gradient(135deg, ${colors.primary}16 0%, ${colors.secondary}0d 100%);
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
          @media (prefers-reduced-motion: reduce) {
            .floating-shape { animation: none; }
          }
        `}</style>
      )}
    </div>
  );
};

export default VideoBackground;
