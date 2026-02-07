import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { useSiteCopy } from '../../hooks/useSiteCopy';
import { 
    FaUserTie, 
    FaLinkedin, 
    FaTwitter,
    FaGithub,
    FaEnvelope,
    FaArrowRight,
    FaCode,
    FaPalette,
    FaServer,
    FaMobileAlt,
    FaShieldAlt
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard, TeamMemberCard } from '../modern';

const Staff = () => {
    const { colors, mode } = useTheme();
    const { copy: uiCopy } = useSiteCopy();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hoveredMember, setHoveredMember] = useState(null);
    const isDark = mode === 'dark';
    const sectionCopy = uiCopy?.home?.team || {};

    const getRoleIcon = (role) => {
        if (role?.toLowerCase().includes('developer')) return FaCode;
        if (role?.toLowerCase().includes('designer')) return FaPalette;
        if (role?.toLowerCase().includes('devops')) return FaServer;
        if (role?.toLowerCase().includes('mobile')) return FaMobileAlt;
        if (role?.toLowerCase().includes('security')) return FaShieldAlt;
        return FaUserTie;
    };

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await apiGet('/staff');
                const activeStaff = Array.isArray(data) ? data.filter(s => s.active !== false) : [];
                setStaff(activeStaff);
            } catch (err) {
                setError('No staff profiles available yet.');
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const displayStaff = staff;

    return (
        <section 
            id="team" 
            className="relative py-28 overflow-hidden"
            style={{
                background: isDark 
                    ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)'
            }}
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Hexagon Pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='${encodeURIComponent(colors.primary)}' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}
                />
                
                {/* Gradient Orbs */}
                <div 
                    className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
                    style={{ 
                        top: '-10%', 
                        left: '-10%', 
                        background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`
                    }}
                />
                <div 
                    className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
                    style={{ 
                        bottom: '-15%', 
                        right: '-10%', 
                        background: `radial-gradient(circle, ${colors.secondary}10 0%, transparent 70%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <ScrollReveal animation="fadeUp">
                    <div className="text-center mb-16">
                        {sectionCopy.badge && (
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6"
                                style={{
                                    backgroundColor: `${colors.primary}15`,
                                    color: colors.primary
                                }}
                            >
                                <FaUserTie />
                                {sectionCopy.badge}
                            </div>
                        )}
                        {sectionCopy.title && (
                            <h2 
                                className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text"
                                }}
                            >
                                {sectionCopy.title}
                            </h2>
                        )}
                        {sectionCopy.subtitle && (
                            <p 
                                className="text-lg md:text-xl max-w-3xl mx-auto"
                                style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                            >
                                {sectionCopy.subtitle}
                            </p>
                        )}
                    </div>
                </ScrollReveal>

                {loading && (
                    <div className="flex justify-center py-12">
                        <div 
                            className="w-12 h-12 border-4 rounded-full animate-spin"
                            style={{ 
                                borderColor: `${colors.primary}30`, 
                                borderTopColor: colors.primary 
                            }}
                        />
                    </div>
                )}

                {!loading && (
                    <>
                        {error && (
                            <div className="text-center text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                {error}
                            </div>
                        )}
                        {displayStaff.length === 0 && !error && (
                            <div className="text-center text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                No staff profiles published yet.
                            </div>
                        )}
                        {/* Team Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
                            {displayStaff.slice(0, 6).map((member, idx) => {
                                const RoleIcon = getRoleIcon(member.role);
                                const isHovered = hoveredMember === idx;
                                const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.name || 'Team Member';
                                
                                return (
                                    <ScrollReveal key={member.id || idx} animation="fadeUp" delay={idx * 100}>
                                        <div 
                                            className="group relative h-full rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-3"
                                            style={{
                                                background: isDark 
                                                    ? 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)'
                                                    : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                                                backdropFilter: 'blur(20px)',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                                boxShadow: isDark 
                                                    ? '0 20px 40px rgba(0,0,0,0.3)'
                                                    : '0 20px 40px rgba(0,0,0,0.08)'
                                            }}
                                            onMouseEnter={() => setHoveredMember(idx)}
                                            onMouseLeave={() => setHoveredMember(null)}
                                        >
                                            {/* Avatar Section */}
                                            <div className="relative h-48 overflow-hidden flex items-center justify-center">
                                                <div 
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}20 100%)`
                                                    }}
                                                />
                                                
                                                {/* Avatar Circle */}
                                                <div 
                                                    className="relative z-10 w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white transition-transform duration-300 group-hover:scale-110"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                        boxShadow: `0 10px 40px ${colors.primary}40`
                                                    }}
                                                >
                                                    {member.avatarUrl ? (
                                                        <img 
                                                            src={member.avatarUrl}
                                                            alt={fullName}
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        fullName?.charAt(0) || 'A'
                                                    )}
                                                </div>
                                                
                                                {/* Role Badge */}
                                                <div 
                                                    className="absolute bottom-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center"
                                                    style={{
                                                        background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
                                                        backdropFilter: 'blur(10px)'
                                                    }}
                                                >
                                                    <RoleIcon style={{ color: colors.primary }} />
                                                </div>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="p-5 md:p-6 text-center flex flex-col">
                                                <h3 
                                                    className="text-lg md:text-xl font-bold mb-1"
                                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                                >
                                                    {fullName}
                                                </h3>
                                                <p 
                                                    className="text-sm font-medium mb-2"
                                                    style={{ color: colors.primary }}
                                                >
                                                    {member.role}
                                                </p>
                                                <p 
                                                    className="text-sm mb-4 line-clamp-2 leading-relaxed"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                                >
                                                    {member.bio}
                                                </p>
                                                
                                                {/* Skills */}
                                                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                                                    {(member.skills || []).slice(0, 3).map((skill, sIdx) => (
                                                        <span 
                                                            key={sIdx}
                                                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                                                            style={{
                                                                backgroundColor: `${colors.primary}15`,
                                                                color: colors.primary
                                                            }}
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                                
                                                {/* Social Links */}
                                                <div className="flex justify-center gap-3">
                                                    {member.linkedin && (
                                                        <a 
                                                            href={member.linkedin}
                                                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                                            style={{
                                                                backgroundColor: `${colors.primary}15`,
                                                                color: colors.primary
                                                            }}
                                                        >
                                                            <FaLinkedin className="text-sm" />
                                                        </a>
                                                    )}
                                                    {member.twitter && (
                                                        <a 
                                                            href={member.twitter}
                                                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                                            style={{
                                                                backgroundColor: `${colors.primary}15`,
                                                                color: colors.primary
                                                            }}
                                                        >
                                                            <FaTwitter className="text-sm" />
                                                        </a>
                                                    )}
                                                    {member.github && (
                                                        <a 
                                                            href={member.github}
                                                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                                            style={{
                                                                backgroundColor: `${colors.primary}15`,
                                                                color: colors.primary
                                                            }}
                                                        >
                                                            <FaGithub className="text-sm" />
                                                        </a>
                                                    )}
                                                    {member.email && (
                                                        <a 
                                                            href={`mailto:${member.email}`}
                                                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                                            style={{
                                                                backgroundColor: `${colors.primary}15`,
                                                                color: colors.primary
                                                            }}
                                                        >
                                                            <FaEnvelope className="text-sm" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                );
                            })}
                        </div>

                        {/* View All Button */}
                        {sectionCopy.ctaLabel && (
                            <ScrollReveal animation="fadeUp" delay={400}>
                                <div className="text-center mt-16">
                                    <Link 
                                        to="/staff"
                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:-translate-y-1 text-white"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                            boxShadow: `0 20px 40px ${colors.primary}40`
                                        }}
                                    >
                                        {sectionCopy.ctaLabel}
                                        <FaArrowRight />
                                    </Link>
                                </div>
                            </ScrollReveal>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default Staff;
