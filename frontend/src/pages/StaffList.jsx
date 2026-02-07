
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { useSiteCopy } from '../hooks/useSiteCopy';
import { 
    FaUsers, FaLinkedin, FaTwitter, FaGithub, FaEnvelope,
    FaArrowRight, FaUserTie, FaCode, FaPaintBrush, FaCog,
    FaStar, FaBriefcase
} from 'react-icons/fa';

const roleIcons = {
    'admin': FaUserTie,
    'developer': FaCode,
    'designer': FaPaintBrush,
    'manager': FaBriefcase,
    'default': FaCog
};

const getRoleIcon = (role) => {
    if (!role) return roleIcons['default'];
    const roleLower = role.toLowerCase();
    for (const [key, icon] of Object.entries(roleIcons)) {
        if (roleLower.includes(key)) return icon;
    }
    return roleIcons['default'];
};

const StaffList = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const { copy: uiCopy } = useSiteCopy();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);
    const pageCopy = uiCopy?.pages?.staff || {};

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await apiGet('/staff');
                setStaff(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const stats = [
        { value: staff.length, label: pageCopy.stats?.teamLabel || '' },
        { value: new Set(staff.map(s => s.role)).size, label: pageCopy.stats?.departmentsLabel || '' },
        { value: pageCopy.stats?.experienceValue || '5+', label: pageCopy.stats?.experienceLabel || '' },
    ].filter(stat => stat.label);

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section */}
            <ParallaxSection
                speed={0.3}
                className="relative py-32 overflow-hidden"
            >
                {/* Background gradient */}
                <div 
                    className="absolute inset-0 z-0"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}15 50%, ${colors.primaryDark}15 100%)`
                    }}
                />
                
                {/* Floating shapes */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div 
                        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{ 
                            background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                            top: '10%',
                            left: '5%'
                        }}
                    />
                    <div 
                        className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{ 
                            background: `radial-gradient(circle, ${colors.secondary}, transparent)`,
                            bottom: '10%',
                            right: '10%',
                            animationDelay: '1.5s'
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
                    <ScrollReveal animation="fadeUp">
                        {pageCopy.badge && (
                            <span 
                                className="inline-block px-6 py-2 rounded-full text-sm font-semibold mb-6"
                                style={{ 
                                    backgroundColor: `${colors.primary}20`,
                                    color: colors.primary,
                                    border: `1px solid ${colors.primary}40`
                                }}
                            >
                                <FaUsers className="inline mr-2" />
                                {pageCopy.badge}
                            </span>
                        )}
                    </ScrollReveal>
                    
                    <ScrollReveal animation="fadeUp" delay={100}>
                        {pageCopy.title && (
                            <h1 className="text-5xl md:text-7xl font-bold mb-6">
                                <span style={{ color: colors.text }}>{pageCopy.title}</span>
                            </h1>
                        )}
                    </ScrollReveal>
                    
                    <ScrollReveal animation="fadeUp" delay={200}>
                        {pageCopy.subtitle && (
                            <p 
                                className="text-xl md:text-2xl max-w-3xl mx-auto mb-12"
                                style={{ color: colors.textSecondary }}
                            >
                                {pageCopy.subtitle}
                            </p>
                        )}
                    </ScrollReveal>

                    {/* Stats */}
                    {stats.length > 0 && (
                        <ScrollReveal animation="fadeUp" delay={300}>
                            <div className="flex flex-wrap justify-center gap-8">
                                {stats.map((stat, idx) => (
                                    <div 
                                        key={idx}
                                        className="text-center px-6 py-4 rounded-2xl"
                                        style={{ 
                                            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    >
                                        <div 
                                            className="text-3xl font-bold mb-1"
                                            style={{ color: colors.primary }}
                                        >
                                            {stat.value}{typeof stat.value === 'number' ? '+' : ''}
                                        </div>
                                        <div 
                                            className="text-sm"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollReveal>
                    )}
                </div>
            </ParallaxSection>

            {/* Team Grid */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    {loading && (
                        <div className="flex justify-center items-center py-20">
                            <div 
                                className="w-16 h-16 border-4 rounded-full animate-spin"
                                style={{ 
                                    borderColor: `${colors.primary}30`,
                                    borderTopColor: colors.primary
                                }}
                            />
                        </div>
                    )}
                    
                    {error && (
                        <ScrollReveal animation="scaleUp">
                            <div 
                                className="text-center p-8 rounded-2xl"
                                style={{ backgroundColor: `${colors.danger || '#ef4444'}20` }}
                            >
                                <p style={{ color: colors.danger || '#ef4444' }}>{error}</p>
                            </div>
                        </ScrollReveal>
                    )}
                    
                    {!loading && !error && (
                        <>
                            {staff.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {staff.map((member, idx) => {
                                        const RoleIcon = getRoleIcon(member.role);
                                        return (
                                            <ScrollReveal 
                                                key={member.id} 
                                                animation="fadeUp" 
                                                delay={idx * 100}
                                            >
                                                <div 
                                                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500"
                                                    style={{
                                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                        transform: hoveredCard === idx ? 'translateY(-10px)' : 'translateY(0)',
                                                        boxShadow: hoveredCard === idx 
                                                            ? `0 25px 50px -12px ${colors.primary}30`
                                                            : '0 4px 6px -1px rgba(0,0,0,0.1)'
                                                    }}
                                                    onMouseEnter={() => setHoveredCard(idx)}
                                                    onMouseLeave={() => setHoveredCard(null)}
                                                    onClick={() => navigate(`/staff/${member.id}`)}
                                                >
                                                    {/* Avatar Section */}
                                                    <div 
                                                        className="relative pt-8 pb-4 px-6"
                                                        style={{
                                                            background: hoveredCard === idx 
                                                                ? `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`
                                                                : 'transparent'
                                                        }}
                                                    >
                                                        <div className="flex justify-center">
                                                            {member.avatarUrl ? (
                                                                <div className="relative">
                                                                    <img
                                                                        src={member.avatarUrl}
                                                                        alt={`${member.firstName} ${member.lastName}`}
                                                                        className="w-28 h-28 rounded-full object-cover transition-transform duration-500"
                                                                        style={{
                                                                            border: `4px solid ${colors.primary}`,
                                                                            transform: hoveredCard === idx ? 'scale(1.1)' : 'scale(1)'
                                                                        }}
                                                                    />
                                                                    {/* Online indicator */}
                                                                    <div 
                                                                        className="absolute bottom-2 right-2 w-5 h-5 rounded-full border-2"
                                                                        style={{ 
                                                                            backgroundColor: '#22c55e',
                                                                            borderColor: colors.background
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div 
                                                                    className="w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-transform duration-500"
                                                                    style={{
                                                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                                        transform: hoveredCard === idx ? 'scale(1.1)' : 'scale(1)'
                                                                    }}
                                                                >
                                                                    {member.firstName[0]}{member.lastName[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div className="p-6 pt-2 text-center">
                                                        <h3 
                                                            className="text-xl font-bold mb-1 transition-colors duration-300"
                                                            style={{ color: hoveredCard === idx ? colors.primary : colors.text }}
                                                        >
                                                            {member.firstName} {member.lastName}
                                                        </h3>
                                                        
                                                        <div 
                                                            className="flex items-center justify-center gap-2 mb-3"
                                                        >
                                                            <RoleIcon 
                                                                className="text-sm"
                                                                style={{ color: colors.primary }}
                                                            />
                                                            <span 
                                                                className="text-sm font-medium capitalize"
                                                                style={{ color: colors.primary }}
                                                            >
                                                                {member.role?.toLowerCase().replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        
                                                        {member.bio && (
                                                            <p 
                                                                className="text-sm mb-4 line-clamp-2"
                                                                style={{ color: colors.textSecondary }}
                                                            >
                                                                {member.bio}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Social Links */}
                                                        <div className="flex justify-center gap-3 mb-4">
                                                            {member.linkedin && (
                                                                <a
                                                                    href={member.linkedin}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                    style={{
                                                                        backgroundColor: `${colors.primary}20`,
                                                                        color: colors.primary
                                                                    }}
                                                                >
                                                                    <FaLinkedin />
                                                                </a>
                                                            )}
                                                            {member.twitter && (
                                                                <a
                                                                    href={member.twitter}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                    style={{
                                                                        backgroundColor: `${colors.primary}20`,
                                                                        color: colors.primary
                                                                    }}
                                                                >
                                                                    <FaTwitter />
                                                                </a>
                                                            )}
                                                            {member.github && (
                                                                <a
                                                                    href={member.github}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                    style={{
                                                                        backgroundColor: `${colors.primary}20`,
                                                                        color: colors.primary
                                                                    }}
                                                                >
                                                                    <FaGithub />
                                                                </a>
                                                            )}
                                                            {member.email && (
                                                                <a
                                                                    href={`mailto:${member.email}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                    style={{
                                                                        backgroundColor: `${colors.primary}20`,
                                                                        color: colors.primary
                                                                    }}
                                                                >
                                                                    <FaEnvelope />
                                                                </a>
                                                            )}
                                                        </div>
                                                        
                                                        {/* View Profile */}
                                                        <div 
                                                            className="flex items-center justify-center gap-2 font-semibold transition-all duration-300"
                                                            style={{ 
                                                                color: colors.primary,
                                                                opacity: hoveredCard === idx ? 1 : 0.7
                                                            }}
                                                        >
                                                            <span>View Profile</span>
                                                            <FaArrowRight 
                                                                className="transition-transform duration-300"
                                                                style={{
                                                                    transform: hoveredCard === idx ? 'translateX(5px)' : 'translateX(0)'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </ScrollReveal>
                                        );
                                    })}
                                </div>
                            ) : (
                                <ScrollReveal animation="fadeUp">
                                    <div 
                                        className="text-center py-20 rounded-2xl"
                                        style={{ 
                                            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <FaUsers 
                                            className="text-6xl mx-auto mb-4"
                                            style={{ color: colors.textSecondary }}
                                        />
                                        <p style={{ color: colors.textSecondary }}>
                                            No team members available at the moment.
                                        </p>
                                    </div>
                                </ScrollReveal>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Join Our Team Section */}
            <section 
                className="py-20 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}10 100%)`
                }}
            >
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-12 text-center">
                            <div 
                                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                }}
                            >
                                <FaStar className="text-3xl text-white" />
                            </div>
                            <h2 
                                className="text-3xl md:text-4xl font-bold mb-6"
                                style={{ color: colors.text }}
                            >
                                Join Our Team
                            </h2>
                            <p 
                                className="text-xl mb-8 max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                We're always looking for talented individuals to join our growing team.
                                If you're passionate about technology, we'd love to hear from you.
                            </p>
                            <button
                                onClick={() => navigate('/#contact-me')}
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                    color: 'white'
                                }}
                            >
                                <FaEnvelope />
                                Get in Touch
                            </button>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default StaffList;
