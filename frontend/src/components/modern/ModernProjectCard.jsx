import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaGithub, FaExternalLinkAlt, FaEye } from 'react-icons/fa';

const ModernProjectCard = ({
  title,
  description,
  image,
  tags = [],
  liveUrl,
  githubUrl,
  category,
  date,
  featured = false,
  index = 0,
  onClick,
  className = ''
}) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${className}`}
      style={{
        backgroundColor: colors.surface,
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 30px 60px rgba(0,0,0,0.15), 0 0 40px ${colors.primary}15`
          : '0 10px 40px rgba(0,0,0,0.08)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden">
        {/* Skeleton */}
        {!imageLoaded && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ backgroundColor: colors.backgroundSecondary }}
          />
        )}
        
        {/* Image */}
        <img
          src={image || '/images/project-placeholder.png'}
          alt={title}
          className="w-full h-full object-cover transition-all duration-700"
          style={{
            opacity: imageLoaded ? 1 : 0,
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `linear-gradient(to top, ${colors.surface} 0%, transparent 60%)`,
            opacity: isHovered ? 0.9 : 0.7
          }}
        />

        {/* Featured Badge */}
        {featured && (
          <div
            className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Featured
          </div>
        )}

        {/* Category Badge */}
        {category && (
          <div
            className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${colors.primary}20`,
              color: colors.primary
            }}
          >
            {category}
          </div>
        )}

        {/* Hover Action Buttons */}
        <div
          className="absolute inset-0 flex items-center justify-center gap-3 transition-all duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateY(0)' : 'translateY(20px)'
          }}
        >
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
            style={{ backgroundColor: colors.primary }}
            onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
          >
            <FaEye size={18} />
          </button>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
              style={{ backgroundColor: '#10B981' }}
              onClick={(e) => e.stopPropagation()}
            >
              <FaExternalLinkAlt size={16} />
            </a>
          )}
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
              style={{ backgroundColor: '#1F2937' }}
              onClick={(e) => e.stopPropagation()}
            >
              <FaGithub size={18} />
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3
          className="text-xl font-bold mb-2 line-clamp-1"
          style={{ color: colors.text }}
        >
          {title}
        </h3>
        
        <p
          className="text-sm leading-relaxed mb-4 line-clamp-2"
          style={{ color: colors.textSecondary }}
        >
          {description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 4).map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textSecondary
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textMuted
                }}
              >
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        {date && (
          <div
            className="pt-4 border-t text-xs"
            style={{
              borderColor: colors.border,
              color: colors.textMuted
            }}
          >
            {new Date(date).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernProjectCard;
