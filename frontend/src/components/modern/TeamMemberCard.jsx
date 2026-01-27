import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaEnvelope, FaPhone, FaLinkedin, FaTwitter, FaGithub, FaGlobe } from 'react-icons/fa';

const TeamMemberCard = ({
  name,
  role,
  department,
  avatar,
  bio,
  email,
  phone,
  socialLinks = {},
  skills = [],
  featured = false,
  onClick,
  className = ''
}) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const socialIcons = {
    linkedin: FaLinkedin,
    twitter: FaTwitter,
    github: FaGithub,
    website: FaGlobe
  };

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
      {/* Avatar Section */}
      <div className="relative h-64 overflow-hidden">
        {/* Background Pattern */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary || colors.primary} 100%)`
          }}
        />
        
        {/* Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />

        {/* Avatar Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 transition-transform duration-500"
            style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
          >
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl font-bold text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                {name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
            Team Lead
          </div>
        )}

        {/* Department Badge */}
        {department && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
            {department}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 text-center">
        <h3
          className="text-xl font-bold mb-1"
          style={{ color: colors.text }}
        >
          {name}
        </h3>
        
        <p
          className="text-sm font-medium mb-3"
          style={{ color: colors.primary }}
        >
          {role}
        </p>

        {bio && (
          <p
            className="text-sm leading-relaxed mb-4 line-clamp-2"
            style={{ color: colors.textSecondary }}
          >
            {bio}
          </p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textSecondary
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Contact & Social */}
        <div className="flex items-center justify-center gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
          {email && (
            <a
              href={`mailto:${email}`}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{
                backgroundColor: colors.backgroundSecondary,
                color: colors.textSecondary
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <FaEnvelope size={16} />
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{
                backgroundColor: colors.backgroundSecondary,
                color: colors.textSecondary
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <FaPhone size={16} />
            </a>
          )}
          {Object.entries(socialLinks).map(([platform, url]) => {
            const Icon = socialIcons[platform];
            if (!Icon || !url) return null;
            return (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textSecondary
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon size={16} />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamMemberCard;
