import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const GlassmorphismCard = ({
  children,
  className = '',
  blur = 20,
  opacity = 0.1,
  border = true,
  glow = false,
  hover = true,
  onClick,
  as: Component = 'div'
}) => {
  const { colors, mode } = useTheme();
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current || !hover) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const bgColor = mode === 'dark' 
    ? `rgba(255, 255, 255, ${opacity})` 
    : `rgba(255, 255, 255, ${opacity + 0.6})`;

  const borderColor = mode === 'dark'
    ? `rgba(255, 255, 255, ${opacity + 0.1})`
    : `rgba(255, 255, 255, ${opacity + 0.3})`;

  return (
    <Component
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${className}`}
      style={{
        background: bgColor,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        border: border ? `1px solid ${borderColor}` : 'none',
        boxShadow: glow 
          ? `0 8px 32px rgba(0, 0, 0, 0.1), 0 0 40px ${colors.primary}20`
          : '0 8px 32px rgba(0, 0, 0, 0.1)',
        transform: isHovered && hover ? 'translateY(-4px)' : 'translateY(0)',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Gradient highlight on hover */}
      {hover && isHovered && (
        <div
          className="absolute pointer-events-none transition-opacity duration-300"
          style={{
            width: '300px',
            height: '300px',
            left: mousePosition.x - 150,
            top: mousePosition.y - 150,
            background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`,
            opacity: isHovered ? 1 : 0
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </Component>
  );
};

export default GlassmorphismCard;
