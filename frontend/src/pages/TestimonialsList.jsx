import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { useSiteCopy } from '../hooks/useSiteCopy';
import { 
    FaStar, FaQuoteLeft, FaUser, FaBuilding,
    FaArrowRight, FaComment
} from 'react-icons/fa';

const TestimonialsList = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const { copy: uiCopy } = useSiteCopy();
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pageCopy = uiCopy?.pages?.testimonials || {};

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const data = await apiGet('/testimonials');
                const approved = Array.isArray(data) ? data.filter(t => t.approved !== false) : [];
                setTestimonials(approved);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTestimonials();
    }, []);

    const stats = [
        { value: testimonials.length, label: pageCopy.stats?.clientsLabel || '' },
        { value: Math.round(testimonials.reduce((acc, t) => acc + (t.rating || 5), 0) / testimonials.length * 10) / 10 || 5, label: pageCopy.stats?.ratingLabel || '' },
        { value: '100%', label: pageCopy.stats?.satisfactionLabel || '' },
    ].filter(stat => stat.label);

    const renderStars = (rating) => {
        return [...Array(5)].map((_, i) => (
            <FaStar
                key={i}
                className="text-lg"
                style={{ 
                    color: i < (rating || 5) ? '#fbbf24' : mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                }}
            />
        ));
    };

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
                            top: '5%',
                            right: '10%'
                        }}
                    />
                    <div 
                        className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{ 
                            background: `radial-gradient(circle, ${colors.secondary}, transparent)`,
                            bottom: '15%',
                            left: '5%',
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
                                <FaComment className="inline mr-2" />
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
                                            {stat.value}{typeof stat.value === 'number' && stat.label !== pageCopy.stats?.ratingLabel ? '+' : ''}
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

            {/* Testimonials Grid */}
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
                            {testimonials.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {testimonials.map((testimonial, idx) => (
                                        <ScrollReveal 
                                            key={testimonial.id || idx} 
                                            animation="fadeUp" 
                                            delay={idx * 100}
                                        >
                                            <GlassmorphismCard className="p-8 h-full flex flex-col">
                                                {/* Quote Icon */}
                                                <FaQuoteLeft 
                                                    className="text-3xl mb-4"
                                                    style={{ color: `${colors.primary}40` }}
                                                />
                                                
                                                {/* Rating */}
                                                <div className="flex gap-1 mb-4">
                                                    {renderStars(testimonial.rating)}
                                                </div>
                                                
                                                {/* Content */}
                                                <p 
                                                    className="flex-1 text-lg leading-relaxed mb-6"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    "{testimonial.content || testimonial.text}"
                                                </p>
                                                
                                                {/* Author */}
                                                <div className="flex items-center gap-4 pt-4 border-t" style={{ borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                                    {testimonial.avatar || testimonial.avatarUrl ? (
                                                        <img
                                                            src={testimonial.avatar || testimonial.avatarUrl}
                                                            alt={testimonial.name || testimonial.author}
                                                            className="w-12 h-12 rounded-full object-cover"
                                                            style={{ border: `2px solid ${colors.primary}` }}
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                                            style={{ 
                                                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                                            }}
                                                        >
                                                            <FaUser className="text-white" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 
                                                            className="font-bold"
                                                            style={{ color: colors.text }}
                                                        >
                                                            {testimonial.name || testimonial.author}
                                                        </h4>
                                                        {(testimonial.company || testimonial.role) && (
                                                            <div 
                                                                className="flex items-center gap-1 text-sm"
                                                                style={{ color: colors.textSecondary }}
                                                            >
                                                                <FaBuilding className="text-xs" />
                                                                <span>{testimonial.role ? `${testimonial.role}, ` : ''}{testimonial.company}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </GlassmorphismCard>
                                        </ScrollReveal>
                                    ))}
                                </div>
                            ) : (
                                <ScrollReveal animation="fadeUp">
                                    <div 
                                        className="text-center py-20 rounded-2xl"
                                        style={{ 
                                            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <FaComment 
                                            className="text-6xl mx-auto mb-4"
                                            style={{ color: colors.textSecondary }}
                                        />
                                        <p style={{ color: colors.textSecondary }}>
                                            No testimonials available at the moment.
                                        </p>
                                    </div>
                                </ScrollReveal>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div 
                            className="rounded-3xl p-12 text-center"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                            }}
                        >
                            <FaStar className="text-4xl text-white/50 mx-auto mb-6" />
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Ready to Join Our Happy Clients?
                            </h2>
                            <p className="text-white/80 mb-8 max-w-xl mx-auto">
                                Let's create something amazing together. Start your project today!
                            </p>
                            <button
                                onClick={() => navigate('/book')}
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                                style={{
                                    backgroundColor: 'white',
                                    color: colors.primaryDark
                                }}
                            >
                                Start Your Project
                                <FaArrowRight />
                            </button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default TestimonialsList;
