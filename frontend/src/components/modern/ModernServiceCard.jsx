import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaArrowRight, FaExternalLinkAlt } from 'react-icons/fa';

const ModernServiceCard = ({
  icon: Icon,
  title,
  description,
  features = [],
  link,
  image,
  price,
  index = 0,
  className = ''
}) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const gradientColors = [
    ['#14B8A6', '#0D9488'],
    ['#3B82F6', '#1D4ED8'],
    ['#8B5CF6', '#7C3AED'],
    ['#EC4899', '#DB2777'],
    ['#F59E0B', '#D97706'],
    ['#10B981', '#059669']
  ];

  const [color1, color2] = gradientColors[index % gradientColors.length];

  return (
    <div
      className={`group relative rounded-3xl overflow-hidden transition-all duration-500 ${className}`}
      style={{
        backgroundColor: colors.surface,
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered 
          ? `0 30px 60px rgba(0,0,0,0.15), 0 0 40px ${color1}20`
          : '0 10px 40px rgba(0,0,0,0.08)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Gradient Bar */}
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${color1} 0%, ${color2} 100%)` }}
      />

      {/* Image */}
      {image && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700"
            style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${colors.surface} 0%, transparent 50%)`
            }}
          />
        </div>
      )}

      <div className="p-6">
        {/* Icon */}
        {Icon && (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300"
            style={{
              background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
              transform: isHovered ? 'rotate(-5deg) scale(1.1)' : 'rotate(0) scale(1)'
            }}
          >
            <Icon size={26} className="text-white" />
          </div>
        )}

        {/* Title & Price */}
        <div className="flex items-start justify-between mb-3">
          <h3
            className="text-xl font-bold"
            style={{ color: colors.text }}
          >
            {title}
          </h3>
          {price && (
            <span
              className="text-lg font-bold"
              style={{ color: color1 }}
            >
              {price}
            </span>
          )}
        </div>

        {/* Description */}
        <p
          className="text-sm leading-relaxed mb-4"
          style={{ color: colors.textSecondary }}
        >
          {description}
        </p>

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-2 mb-6">
            {features.slice(0, 4).map((feature, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm"
                style={{ color: colors.textSecondary }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color1 }}
                />
                {feature}
              </li>
            ))}
          </ul>
        )}

        {/* CTA Button */}
        {link && (
          <a
            href={link}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:gap-3"
            style={{ background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)` }}
          >
            Learn More
            <FaArrowRight size={12} />
          </a>
        )}
      </div>

      {/* Hover Glow Effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color1}10 0%, transparent 50%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
    </div>
  );
};

export default ModernServiceCard;
