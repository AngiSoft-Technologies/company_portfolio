import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard } from '../components/modern';
import { FaHome, FaSearch, FaEnvelope, FaArrowRight } from 'react-icons/fa';

const NotFound = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();

    const quickLinks = [
        { icon: FaHome, label: 'Home', path: '/' },
        { icon: FaSearch, label: 'Services', path: '/services' },
        { icon: FaEnvelope, label: 'Contact', path: '/#contact-me' },
    ];

    return (
        <div 
            style={{ backgroundColor: colors.background, color: colors.text }} 
            className="min-h-screen flex items-center justify-center px-4 py-20 relative overflow-hidden"
        >
            {/* Background elements */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div 
                    className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
                    style={{ 
                        background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                        top: '10%',
                        left: '10%'
                    }}
                />
                <div 
                    className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
                    style={{ 
                        background: `radial-gradient(circle, ${colors.secondary}, transparent)`,
                        bottom: '10%',
                        right: '15%',
                        animationDelay: '1s'
                    }}
                />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto text-center">
                <ScrollReveal animation="scaleUp">
                    {/* 404 Number */}
                    <div 
                        className="text-[150px] md:text-[200px] font-bold leading-none mb-4"
                        style={{ 
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: `0 10px 30px ${colors.primary}30`
                        }}
                    >
                        404
                    </div>
                </ScrollReveal>

                <ScrollReveal animation="fadeUp" delay={100}>
                    <h1 
                        className="text-3xl md:text-4xl font-bold mb-4"
                        style={{ color: colors.text }}
                    >
                        Oops! Page Not Found
                    </h1>
                </ScrollReveal>

                <ScrollReveal animation="fadeUp" delay={200}>
                    <p 
                        className="text-lg mb-8 max-w-md mx-auto"
                        style={{ color: colors.textSecondary }}
                    >
                        The page you're looking for seems to have wandered off. 
                        Don't worry, let's get you back on track!
                    </p>
                </ScrollReveal>

                {/* Quick Links */}
                <ScrollReveal animation="fadeUp" delay={300}>
                    <GlassmorphismCard className="p-8 mb-8">
                        <p 
                            className="text-sm font-semibold mb-4"
                            style={{ color: colors.textSecondary }}
                        >
                            QUICK LINKS
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            {quickLinks.map((link, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(link.path)}
                                    className="flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-all hover:scale-105"
                                    style={{
                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        color: colors.text
                                    }}
                                >
                                    <link.icon style={{ color: colors.primary }} />
                                    {link.label}
                                </button>
                            ))}
                        </div>
                    </GlassmorphismCard>
                </ScrollReveal>

                <ScrollReveal animation="fadeUp" delay={400}>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                            color: 'white'
                        }}
                    >
                        <FaHome />
                        Back to Home
                        <FaArrowRight />
                    </button>
                </ScrollReveal>

                {/* Fun animation */}
                <ScrollReveal animation="fadeUp" delay={500}>
                    <div className="mt-12">
                        <div 
                            className="inline-block animate-bounce"
                            style={{ 
                                fontSize: '64px',
                                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
                            }}
                        >
                            🚀
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </div>
    );
};

export default NotFound;
