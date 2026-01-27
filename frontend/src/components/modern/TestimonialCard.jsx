import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaStar, FaQuoteLeft, FaLinkedin, FaTwitter } from 'react-icons/fa';

const TestimonialCard = ({
  name,
  role,
  company,
  avatar,
  content,
  rating = 5,
  socialLinks,
  featured = false,
  className = ''
}) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative rounded-3xl p-8 transition-all duration-500 ${className}`}
      style={{
        backgroundColor: featured ? colors.primary : colors.surface,
        border: featured ? 'none' : `1px solid ${colors.border}`,
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 25px 50px rgba(0,0,0,0.12), 0 0 30px ${colors.primary}15`
          : '0 4px 20px rgba(0,0,0,0.05)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Quote Icon */}
      <div
        className="absolute top-6 right-6 opacity-20"
        style={{ color: featured ? '#ffffff' : colors.primary }}
      >
        <FaQuoteLeft size={40} />
      </div>

      {/* Rating Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <FaStar
            key={i}
            size={16}
            style={{
              color: i < rating 
                ? featured ? '#FCD34D' : '#F59E0B'
                : featured ? 'rgba(255,255,255,0.3)' : colors.border
            }}
          />
        ))}
      </div>

      {/* Content */}
      <p
        className="text-base leading-relaxed mb-6 relative z-10"
        style={{
          color: featured ? 'rgba(255,255,255,0.9)' : colors.textSecondary
        }}
      >
        "{content}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
          style={{
            border: featured ? '3px solid rgba(255,255,255,0.3)' : `3px solid ${colors.border}`
          }}
        >
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: featured ? 'rgba(255,255,255,0.2)' : colors.backgroundSecondary,
                color: featured ? '#ffffff' : colors.primary
              }}
            >
              {name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h4
            className="font-semibold"
            style={{ color: featured ? '#ffffff' : colors.text }}
          >
            {name}
          </h4>
          <p
            className="text-sm"
            style={{ color: featured ? 'rgba(255,255,255,0.7)' : colors.textSecondary }}
          >
            {role}{company ? ` at ${company}` : ''}
          </p>
        </div>

        {/* Social Links */}
        {socialLinks && (
          <div className="flex gap-2">
            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: featured ? 'rgba(255,255,255,0.1)' : colors.backgroundSecondary,
                  color: featured ? 'rgba(255,255,255,0.8)' : colors.textSecondary
                }}
              >
                <FaLinkedin size={16} />
              </a>
            )}
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: featured ? 'rgba(255,255,255,0.1)' : colors.backgroundSecondary,
                  color: featured ? 'rgba(255,255,255,0.8)' : colors.textSecondary
                }}
              >
                <FaTwitter size={16} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestimonialCard;
