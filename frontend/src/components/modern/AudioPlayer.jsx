import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaMusic } from 'react-icons/fa';

const AudioPlayer = ({
  src,
  title,
  artist,
  cover,
  className = ''
}) => {
  const { colors } = useTheme();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = pos * duration;
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`
      }}
    >
      <audio ref={audioRef} src={src} />

      <div className="flex items-center gap-4">
        {/* Cover / Icon */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            background: cover ? 'none' : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
          }}
        >
          {cover ? (
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          ) : (
            <FaMusic size={24} className="text-white" />
          )}
        </div>

        {/* Info & Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="truncate">
              <h4
                className="font-semibold truncate"
                style={{ color: colors.text }}
              >
                {title}
              </h4>
              {artist && (
                <p
                  className="text-sm truncate"
                  style={{ color: colors.textSecondary }}
                >
                  {artist}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textSecondary
                }}
              >
                {isMuted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                style={{ backgroundColor: colors.primary }}
              >
                {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs w-10"
              style={{ color: colors.textMuted }}
            >
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full cursor-pointer"
              style={{ backgroundColor: colors.backgroundTertiary || colors.backgroundSecondary }}
              onClick={handleSeek}
            >
              <div
                className="h-full rounded-full relative"
                style={{
                  width: `${progress}%`,
                  backgroundColor: colors.primary
                }}
              />
            </div>
            <span
              className="text-xs w-10 text-right"
              style={{ color: colors.textMuted }}
            >
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
