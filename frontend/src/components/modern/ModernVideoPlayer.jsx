import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaPlay, FaPause, FaExpand, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

const ModernVideoPlayer = ({
  src,
  poster,
  title,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  className = ''
}) => {
  const { colors } = useTheme();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  useEffect(() => {
    let timeout;
    if (isPlaying && !isHovering) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, isHovering]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = pos * duration;
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative group rounded-2xl overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ backgroundColor: '#000' }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        className="w-full h-full object-cover"
        onClick={togglePlay}
      />

      {/* Play Button Overlay (when paused) */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={togglePlay}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: colors.primary }}
          >
            <FaPlay size={28} className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      {controls && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))'
          }}
        >
          {/* Progress Bar */}
          <div
            className="w-full h-1 rounded-full cursor-pointer mb-3 group/progress"
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full relative transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: colors.primary
              }}
            >
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ backgroundColor: colors.primary }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="text-white hover:opacity-80 transition-opacity"
              >
                {isPlaying ? <FaPause size={18} /> : <FaPlay size={18} />}
              </button>

              <button
                onClick={toggleMute}
                className="text-white hover:opacity-80 transition-opacity"
              >
                {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
              </button>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {title && (
                <span className="text-white text-sm font-medium">{title}</span>
              )}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:opacity-80 transition-opacity"
              >
                <FaExpand size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernVideoPlayer;
