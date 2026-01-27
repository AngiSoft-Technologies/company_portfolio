import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { 
    FaArrowLeft, FaLinkedin, FaTwitter, FaGithub, FaEnvelope,
    FaArrowRight, FaBriefcase, FaNewspaper, FaCode, FaUserTie,
    FaStar, FaGlobe
} from 'react-icons/fa';

const StaffDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await apiGet(`/staff/${id}`);
                setStaff(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchStaff();
    }, [id]);

    if (loading) {
        return (
            <div 
                style={{ backgroundColor: colors.background, color: colors.text }} 
                className="min-h-screen flex items-center justify-center"
            >
                <div 
                    className="w-16 h-16 border-4 rounded-full animate-spin"
                    style={{ 
                        borderColor: `${colors.primary}30`,
                        borderTopColor: colors.primary
                    }}
                />
            </div>
        );
    }

    if (error || !staff) {
        return (
            <div 
                style={{ backgroundColor: colors.background, color: colors.text }} 
                className="min-h-screen flex items-center justify-center p-8"
            >
                <GlassmorphismCard className="p-12 text-center max-w-lg">
                    <div className="text-6xl mb-6">⚠️</div>
                    <h2 
                        className="text-2xl font-bold mb-4"
                        style={{ color: colors.text }}
                    >
                        {error || 'Team member not found'}
                    </h2>
                    <button
                        onClick={() => navigate('/staff')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                            color: 'white'
                        }}
                    >
                        <FaArrowLeft />
                        Back to Team
                    </button>
                </GlassmorphismCard>
            </div>
        );
    }

    const socialLinks = [
        { icon: FaLinkedin, url: staff.linkedin, label: 'LinkedIn' },
        { icon: FaTwitter, url: staff.twitter, label: 'Twitter' },
        { icon: FaGithub, url: staff.github, label: 'GitHub' },
        { icon: FaGlobe, url: staff.website, label: 'Website' },
    ].filter(link => link.url);

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section */}
            <ParallaxSection
                speed={0.3}
                className="relative py-24 overflow-hidden"
            >
                {/* Background gradient */}
                <div 
                    className="absolute inset-0 z-0"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 50%, ${colors.primaryDark}20 100%)`
                    }}
                />
                
                {/* Floating shapes */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div 
                        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{ 
                            background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                            top: '10%',
                            right: '10%'
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4">
                    {/* Breadcrumb */}
                    <ScrollReveal animation="fadeUp">
                        <button
                            onClick={() => navigate('/staff')}
                            className="inline-flex items-center gap-2 mb-8 text-sm font-medium transition-colors hover:opacity-80"
                            style={{ color: colors.primary }}
                        >
                            <FaArrowLeft />
                            Back to Team
                        </button>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                        {/* Profile Card */}
                        <ScrollReveal animation="fadeUp">
                            <GlassmorphismCard className="p-8 text-center sticky top-24">
                                {/* Avatar */}
                                <div className="relative inline-block mb-6">
                                    {staff.avatarUrl ? (
                                        <img
                                            src={staff.avatarUrl}
                                            alt={`${staff.firstName} ${staff.lastName}`}
                                            className="w-40 h-40 rounded-full object-cover mx-auto"
                                            style={{
                                                border: `4px solid ${colors.primary}`
                                            }}
                                        />
                                    ) : (
                                        <div 
                                            className="w-40 h-40 rounded-full flex items-center justify-center text-white text-5xl font-bold mx-auto"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                            }}
                                        >
                                            {staff.firstName[0]}{staff.lastName[0]}
                                        </div>
                                    )}
                                    
                                    {/* Status indicator */}
                                    <div 
                                        className="absolute bottom-2 right-2 w-6 h-6 rounded-full border-4"
                                        style={{ 
                                            backgroundColor: '#22c55e',
                                            borderColor: mode === 'dark' ? '#1f2937' : 'white'
                                        }}
                                    />
                                </div>

                                {/* Name & Role */}
                                <h1 
                                    className="text-2xl font-bold mb-2"
                                    style={{ color: colors.text }}
                                >
                                    {staff.firstName} {staff.lastName}
                                </h1>
                                
                                <div 
                                    className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-semibold mb-6"
                                    style={{ 
                                        backgroundColor: `${colors.primary}20`,
                                        color: colors.primary
                                    }}
                                >
                                    <FaUserTie />
                                    {staff.role?.replace('_', ' ')}
                                </div>

                                {/* Social Links */}
                                {socialLinks.length > 0 && (
                                    <div className="flex justify-center gap-3 mb-6">
                                        {socialLinks.map((link, idx) => (
                                            <a
                                                key={idx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                                style={{
                                                    backgroundColor: `${colors.primary}20`,
                                                    color: colors.primary
                                                }}
                                                title={link.label}
                                            >
                                                <link.icon />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Contact Button */}
                                {staff.email && (
                                    <a
                                        href={`mailto:${staff.email}`}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 w-full justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                            color: 'white'
                                        }}
                                    >
                                        <FaEnvelope />
                                        Contact
                                    </a>
                                )}
                            </GlassmorphismCard>
                        </ScrollReveal>

                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* About */}
                            <ScrollReveal animation="fadeUp" delay={100}>
                                <GlassmorphismCard className="p-8">
                                    <h2 
                                        className="text-xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaStar style={{ color: colors.primary }} />
                                        About
                                    </h2>
                                    {staff.bio ? (
                                        <p 
                                            className="text-lg leading-relaxed whitespace-pre-line"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            {staff.bio}
                                        </p>
                                    ) : (
                                        <p style={{ color: colors.textSecondary }}>
                                            No bio available.
                                        </p>
                                    )}
                                </GlassmorphismCard>
                            </ScrollReveal>

                            {/* Skills */}
                            {staff.skills && staff.skills.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={150}>
                                    <GlassmorphismCard className="p-8">
                                        <h2 
                                            className="text-xl font-bold mb-6 flex items-center gap-3"
                                            style={{ color: colors.text }}
                                        >
                                            <FaCode style={{ color: colors.primary }} />
                                            Skills
                                        </h2>
                                        <div className="flex flex-wrap gap-3">
                                            {staff.skills.map((skill, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-4 py-2 rounded-full text-sm font-medium"
                                                    style={{
                                                        backgroundColor: `${colors.primary}20`,
                                                        color: colors.primary
                                                    }}
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </GlassmorphismCard>
                                </ScrollReveal>
                            )}

                            {/* Services */}
                            {staff.services && staff.services.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={200}>
                                    <div>
                                        <h2 
                                            className="text-xl font-bold mb-6 flex items-center gap-3"
                                            style={{ color: colors.text }}
                                        >
                                            <FaBriefcase style={{ color: colors.primary }} />
                                            Services
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {staff.services.map((service) => (
                                                <div
                                                    key={service.id}
                                                    onClick={() => navigate(`/services/${service.slug}`)}
                                                    className="p-6 rounded-2xl cursor-pointer transition-all hover:shadow-lg"
                                                    style={{
                                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                                                    }}
                                                >
                                                    <h3 
                                                        className="font-bold mb-2"
                                                        style={{ color: colors.text }}
                                                    >
                                                        {service.title}
                                                    </h3>
                                                    <p 
                                                        className="text-sm line-clamp-2"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        {service.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollReveal>
                            )}

                            {/* Blog Posts */}
                            {staff.posts && staff.posts.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={250}>
                                    <div>
                                        <h2 
                                            className="text-xl font-bold mb-6 flex items-center gap-3"
                                            style={{ color: colors.text }}
                                        >
                                            <FaNewspaper style={{ color: colors.primary }} />
                                            Recent Articles
                                        </h2>
                                        <div className="space-y-4">
                                            {staff.posts.map((post) => (
                                                <div
                                                    key={post.id}
                                                    onClick={() => navigate(`/blog/${post.slug}`)}
                                                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-lg"
                                                    style={{
                                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                                                    }}
                                                >
                                                    <div 
                                                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                                                        style={{ backgroundColor: `${colors.primary}20` }}
                                                    >
                                                        <FaNewspaper style={{ color: colors.primary }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 
                                                            className="font-bold truncate"
                                                            style={{ color: colors.text }}
                                                        >
                                                            {post.title}
                                                        </h3>
                                                        <p 
                                                            className="text-sm"
                                                            style={{ color: colors.textSecondary }}
                                                        >
                                                            {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <FaArrowRight style={{ color: colors.primary }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollReveal>
                            )}
                        </div>
                    </div>
                </div>
            </ParallaxSection>

            {/* CTA Section */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-12 text-center">
                            <h2 
                                className="text-3xl font-bold mb-6"
                                style={{ color: colors.text }}
                            >
                                Work with Our Team
                            </h2>
                            <p 
                                className="text-lg mb-8 max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                Ready to start a project? Our talented team is here to help bring your ideas to life.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    onClick={() => navigate('/book')}
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                        color: 'white'
                                    }}
                                >
                                    Start a Project
                                </button>
                                <button
                                    onClick={() => navigate('/staff')}
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                                    style={{
                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        color: colors.text,
                                        border: `2px solid ${colors.primary}`
                                    }}
                                >
                                    View All Team
                                    <FaArrowRight />
                                </button>
                            </div>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default StaffDetail;
