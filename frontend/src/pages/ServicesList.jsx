import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { 
    FaCode, FaCog, FaMobile, FaCloud, FaDatabase, FaPaintBrush,
    FaRocket, FaArrowRight, FaCheckCircle, FaQuoteLeft,
    FaLaptopCode, FaHeadset, FaStar
} from 'react-icons/fa';

const iconMap = {
    'code': FaCode,
    'cog': FaCog,
    'mobile': FaMobile,
    'cloud': FaCloud,
    'database': FaDatabase,
    'paint': FaPaintBrush,
    'laptop': FaLaptopCode,
    'headset': FaHeadset,
    'default': FaCog
};

const getIcon = (iconLink) => {
    if (!iconLink) return iconMap['default'];
    const iconName = iconLink.toLowerCase().split(' ').pop()?.replace('fa-', '');
    return iconMap[iconName] || iconMap['default'];
};

const ServicesList = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const data = await apiGet('/services');
                const published = Array.isArray(data) ? data.filter(s => s.published !== false) : [];
                setServices(published);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    const features = [
        { icon: FaCheckCircle, text: 'Custom Solutions' },
        { icon: FaCheckCircle, text: 'Expert Team' },
        { icon: FaCheckCircle, text: '24/7 Support' },
        { icon: FaCheckCircle, text: 'On-Time Delivery' },
    ];

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section with Parallax */}
            <ParallaxSection
                speed={0.3}
                className="relative py-32 overflow-hidden"
            >
                {/* Background with gradient */}
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

                <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
                    <ScrollReveal animation="fadeUp">
                        <span 
                            className="inline-block px-6 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{ 
                                backgroundColor: `${colors.primary}20`,
                                color: colors.primary,
                                border: `1px solid ${colors.primary}40`
                            }}
                        >
                            Our Expertise
                        </span>
                    </ScrollReveal>
                    
                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span style={{ color: colors.text }}>Our </span>
                            <span style={{ 
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Services
                            </span>
                        </h1>
                    </ScrollReveal>
                    
                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p 
                            className="text-xl md:text-2xl max-w-3xl mx-auto mb-10"
                            style={{ color: colors.textSecondary }}
                        >
                            Comprehensive solutions to transform your ideas into reality
                        </p>
                    </ScrollReveal>

                    {/* Feature badges */}
                    <ScrollReveal animation="fadeUp" delay={300}>
                        <div className="flex flex-wrap justify-center gap-4">
                            {features.map((feature, idx) => (
                                <div 
                                    key={idx}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{ 
                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    <feature.icon style={{ color: colors.primary }} />
                                    <span className="text-sm font-medium">{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            {/* Services Grid */}
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
                            {services.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {services.map((service, idx) => {
                                        const IconComponent = getIcon(service.iconLink);
                                        return (
                                            <ScrollReveal 
                                                key={service.id || service._id} 
                                                animation="fadeUp" 
                                                delay={idx * 100}
                                            >
                                                <div 
                                                    className="group relative h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500"
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
                                                    onClick={() => navigate(`/services/${service.slug}`)}
                                                >
                                                    {/* Gradient top bar */}
                                                    <div 
                                                        className="h-2 w-full transition-all duration-500"
                                                        style={{
                                                            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                                                            transform: hoveredCard === idx ? 'scaleX(1)' : 'scaleX(0.3)',
                                                            transformOrigin: 'left'
                                                        }}
                                                    />
                                                    
                                                    <div className="p-8">
                                                        {/* Icon */}
                                                        <div 
                                                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
                                                                transform: hoveredCard === idx ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
                                                            }}
                                                        >
                                                            <IconComponent 
                                                                className="text-3xl"
                                                                style={{ color: colors.primary }}
                                                            />
                                                        </div>
                                                        
                                                        {/* Content */}
                                                        <h3 
                                                            className="text-xl font-bold mb-3 transition-colors duration-300"
                                                            style={{ color: hoveredCard === idx ? colors.primary : colors.text }}
                                                        >
                                                            {service.title}
                                                        </h3>
                                                        
                                                        <p 
                                                            className="mb-6 line-clamp-3"
                                                            style={{ color: colors.textSecondary }}
                                                        >
                                                            {service.description}
                                                        </p>
                                                        
                                                        {/* Price if available */}
                                                        {service.priceFrom && (
                                                            <p 
                                                                className="text-lg font-bold mb-4"
                                                                style={{ color: colors.primary }}
                                                            >
                                                                From {service.currency || 'KES'} {service.priceFrom}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Arrow indicator */}
                                                        <div 
                                                            className="flex items-center gap-2 font-semibold transition-all duration-300"
                                                            style={{ 
                                                                color: colors.primary,
                                                                transform: hoveredCard === idx ? 'translateX(10px)' : 'translateX(0)'
                                                            }}
                                                        >
                                                            <span>Learn More</span>
                                                            <FaArrowRight className="transition-transform duration-300" />
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
                                        <FaCog 
                                            className="text-6xl mx-auto mb-4"
                                            style={{ color: colors.textSecondary }}
                                        />
                                        <p style={{ color: colors.textSecondary }}>
                                            No services available at the moment. Please check back soon.
                                        </p>
                                    </div>
                                </ScrollReveal>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section 
                className="py-20 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}10 100%)`
                }}
            >
                <div className="max-w-7xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>Why </span>
                                <span style={{ 
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Choose Us
                                </span>
                            </h2>
                            <p 
                                className="text-xl max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                We deliver excellence through innovation and dedication
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: FaStar,
                                title: 'Quality First',
                                description: 'We never compromise on quality. Every project is crafted with attention to detail.'
                            },
                            {
                                icon: FaHeadset,
                                title: '24/7 Support',
                                description: 'Our dedicated support team is always ready to help you with any queries.'
                            },
                            {
                                icon: FaRocket,
                                title: 'Fast Delivery',
                                description: 'We understand time is valuable. We deliver projects on time, every time.'
                            }
                        ].map((item, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 150}>
                                <GlassmorphismCard className="text-center p-8 h-full">
                                    <div 
                                        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                        }}
                                    >
                                        <item.icon className="text-3xl text-white" />
                                    </div>
                                    <h3 
                                        className="text-xl font-bold mb-4"
                                        style={{ color: colors.text }}
                                    >
                                        {item.title}
                                    </h3>
                                    <p style={{ color: colors.textSecondary }}>
                                        {item.description}
                                    </p>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div 
                            className="relative rounded-3xl overflow-hidden p-12 text-center"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                            }}
                        >
                            {/* Background pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 left-0 w-full h-full" 
                                    style={{
                                        backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                                        backgroundSize: '30px 30px'
                                    }}
                                />
                            </div>
                            
                            <div className="relative z-10">
                                <FaQuoteLeft className="text-4xl text-white opacity-50 mx-auto mb-6" />
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                    Ready to Get Started?
                                </h2>
                                <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                                    Let's discuss your project and bring your ideas to life with our expert team.
                                </p>
                                <button
                                    onClick={() => navigate('/book')}
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                    style={{
                                        backgroundColor: 'white',
                                        color: colors.primaryDark
                                    }}
                                >
                                    <FaRocket />
                                    Request a Quote
                                </button>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default ServicesList;
