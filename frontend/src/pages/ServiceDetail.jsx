import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { 
    FaArrowLeft, FaRocket, FaCheckCircle, FaClock, FaDollarSign,
    FaEnvelope, FaPhoneAlt, FaChevronLeft, FaChevronRight,
    FaStar, FaQuoteLeft, FaArrowRight
} from 'react-icons/fa';

const ServiceDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImage, setCurrentImage] = useState(0);

    useEffect(() => {
        const fetchService = async () => {
            try {
                const services = await apiGet('/services');
                const found = services.find(s => s.slug === slug);
                if (!found) {
                    setError('Service not found');
                    setLoading(false);
                    return;
                }
                setService(found);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchService();
    }, [slug]);

    const nextImage = () => {
        if (service?.images?.length > 1) {
            setCurrentImage((prev) => (prev + 1) % service.images.length);
        }
    };

    const prevImage = () => {
        if (service?.images?.length > 1) {
            setCurrentImage((prev) => (prev - 1 + service.images.length) % service.images.length);
        }
    };

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

    if (error || !service) {
        return (
            <div 
                style={{ backgroundColor: colors.background, color: colors.text }} 
                className="min-h-screen flex items-center justify-center p-8"
            >
                <GlassmorphismCard className="p-12 text-center max-w-lg">
                    <div 
                        className="text-6xl mb-6"
                        style={{ color: colors.danger || '#ef4444' }}
                    >
                        ⚠️
                    </div>
                    <h2 
                        className="text-2xl font-bold mb-4"
                        style={{ color: colors.text }}
                    >
                        {error || 'Service not found'}
                    </h2>
                    <button
                        onClick={() => navigate('/services')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                            color: 'white'
                        }}
                    >
                        <FaArrowLeft />
                        Back to Services
                    </button>
                </GlassmorphismCard>
            </div>
        );
    }

    const features = [
        'Professional Quality',
        'Fast Turnaround',
        'Dedicated Support',
        'Competitive Pricing',
        'Custom Solutions',
        'Satisfaction Guaranteed'
    ];

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

                <div className="relative z-10 max-w-7xl mx-auto px-4">
                    {/* Breadcrumb */}
                    <ScrollReveal animation="fadeUp">
                        <button
                            onClick={() => navigate('/services')}
                            className="inline-flex items-center gap-2 mb-8 text-sm font-medium transition-colors hover:opacity-80"
                            style={{ color: colors.primary }}
                        >
                            <FaArrowLeft />
                            Back to Services
                        </button>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Content */}
                        <div>
                            <ScrollReveal animation="fadeUp">
                                <span 
                                    className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                                    style={{ 
                                        backgroundColor: `${colors.primary}20`,
                                        color: colors.primary
                                    }}
                                >
                                    Service
                                </span>
                            </ScrollReveal>
                            
                            <ScrollReveal animation="fadeUp" delay={100}>
                                <h1 
                                    className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    {service.title}
                                </h1>
                            </ScrollReveal>

                            {service.priceFrom && (
                                <ScrollReveal animation="fadeUp" delay={200}>
                                    <div 
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                                        style={{ 
                                            backgroundColor: `${colors.primary}20`,
                                            color: colors.primary
                                        }}
                                    >
                                        <FaDollarSign />
                                        <span className="text-xl font-bold">
                                            Starting from {service.currency || 'KES'} {service.priceFrom}
                                        </span>
                                    </div>
                                </ScrollReveal>
                            )}

                            <ScrollReveal animation="fadeUp" delay={300}>
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        onClick={() => navigate('/book')}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                            color: 'white'
                                        }}
                                    >
                                        <FaRocket />
                                        Request Quote
                                    </button>
                                    <button
                                        onClick={() => navigate('/#contact-me')}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                            color: colors.text,
                                            border: `2px solid ${colors.primary}`
                                        }}
                                    >
                                        <FaEnvelope />
                                        Contact Us
                                    </button>
                                </div>
                            </ScrollReveal>
                        </div>

                        {/* Image Gallery */}
                        {service.images && service.images.length > 0 && (
                            <ScrollReveal animation="fadeLeft" delay={200}>
                                <div className="relative">
                                    <div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl">
                                        <img
                                            src={service.images[currentImage]}
                                            alt={`${service.title} - Image ${currentImage + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        
                                        {/* Navigation arrows */}
                                        {service.images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={prevImage}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center transition-all hover:scale-110"
                                                    style={{ color: colors.primaryDark }}
                                                >
                                                    <FaChevronLeft />
                                                </button>
                                                <button
                                                    onClick={nextImage}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center transition-all hover:scale-110"
                                                    style={{ color: colors.primaryDark }}
                                                >
                                                    <FaChevronRight />
                                                </button>
                                            </>
                                        )}
                                        
                                        {/* Dots indicator */}
                                        {service.images.length > 1 && (
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                                {service.images.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentImage(idx)}
                                                        className="w-2 h-2 rounded-full transition-all"
                                                        style={{
                                                            backgroundColor: currentImage === idx ? colors.primary : 'rgba(255,255,255,0.5)',
                                                            transform: currentImage === idx ? 'scale(1.5)' : 'scale(1)'
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollReveal>
                        )}
                    </div>
                </div>
            </ParallaxSection>

            {/* Description Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            <ScrollReveal animation="fadeUp">
                                <GlassmorphismCard className="p-8 mb-8">
                                    <h2 
                                        className="text-2xl font-bold mb-6"
                                        style={{ color: colors.text }}
                                    >
                                        Service Details
                                    </h2>
                                    <div 
                                        className="prose prose-lg max-w-none"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        <p className="text-lg leading-relaxed whitespace-pre-line">
                                            {service.description}
                                        </p>
                                    </div>
                                </GlassmorphismCard>
                            </ScrollReveal>

                            {/* Features */}
                            <ScrollReveal animation="fadeUp" delay={100}>
                                <GlassmorphismCard className="p-8">
                                    <h3 
                                        className="text-xl font-bold mb-6"
                                        style={{ color: colors.text }}
                                    >
                                        What's Included
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {features.map((feature, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-center gap-3"
                                            >
                                                <FaCheckCircle 
                                                    className="flex-shrink-0"
                                                    style={{ color: colors.primary }}
                                                />
                                                <span style={{ color: colors.textSecondary }}>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Quick Info */}
                            <ScrollReveal animation="fadeUp" delay={200}>
                                <GlassmorphismCard className="p-6">
                                    <h3 
                                        className="text-lg font-bold mb-4"
                                        style={{ color: colors.text }}
                                    >
                                        Quick Info
                                    </h3>
                                    <div className="space-y-4">
                                        {service.priceFrom && (
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: `${colors.primary}20` }}
                                                >
                                                    <FaDollarSign style={{ color: colors.primary }} />
                                                </div>
                                                <div>
                                                    <p className="text-sm" style={{ color: colors.textSecondary }}>Starting Price</p>
                                                    <p className="font-bold" style={{ color: colors.text }}>
                                                        {service.currency || 'KES'} {service.priceFrom}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: `${colors.primary}20` }}
                                            >
                                                <FaClock style={{ color: colors.primary }} />
                                            </div>
                                            <div>
                                                <p className="text-sm" style={{ color: colors.textSecondary }}>Response Time</p>
                                                <p className="font-bold" style={{ color: colors.text }}>Within 24 hours</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: `${colors.primary}20` }}
                                            >
                                                <FaStar style={{ color: colors.primary }} />
                                            </div>
                                            <div>
                                                <p className="text-sm" style={{ color: colors.textSecondary }}>Satisfaction</p>
                                                <p className="font-bold" style={{ color: colors.text }}>100% Guaranteed</p>
                                            </div>
                                        </div>
                                    </div>
                                </GlassmorphismCard>
                            </ScrollReveal>

                            {/* CTA Card */}
                            <ScrollReveal animation="fadeUp" delay={300}>
                                <div 
                                    className="rounded-2xl p-6 text-center"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                                    }}
                                >
                                    <FaQuoteLeft className="text-3xl text-white/50 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-4">
                                        Ready to Get Started?
                                    </h3>
                                    <p className="text-white/80 mb-6 text-sm">
                                        Let's discuss how we can help you achieve your goals.
                                    </p>
                                    <button
                                        onClick={() => navigate('/book')}
                                        className="w-full py-3 rounded-full font-semibold transition-all hover:scale-105"
                                        style={{
                                            backgroundColor: 'white',
                                            color: colors.primaryDark
                                        }}
                                    >
                                        Request Quote
                                    </button>
                                </div>
                            </ScrollReveal>

                            {/* Contact Card */}
                            <ScrollReveal animation="fadeUp" delay={400}>
                                <GlassmorphismCard className="p-6">
                                    <h3 
                                        className="text-lg font-bold mb-4"
                                        style={{ color: colors.text }}
                                    >
                                        Need Help?
                                    </h3>
                                    <div className="space-y-3">
                                        <a 
                                            href="tel:+254700000000"
                                            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                                            style={{ 
                                                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                color: colors.text
                                            }}
                                        >
                                            <FaPhoneAlt style={{ color: colors.primary }} />
                                            <span>Call Us</span>
                                        </a>
                                        <a 
                                            href="mailto:contact@angisoft.com"
                                            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                                            style={{ 
                                                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                color: colors.text
                                            }}
                                        >
                                            <FaEnvelope style={{ color: colors.primary }} />
                                            <span>Email Us</span>
                                        </a>
                                    </div>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* Related Services CTA */}
            <section 
                className="py-16 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}10 100%)`
                }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <ScrollReveal animation="fadeUp">
                        <h2 
                            className="text-3xl font-bold mb-6"
                            style={{ color: colors.text }}
                        >
                            Explore More Services
                        </h2>
                        <p 
                            className="text-lg mb-8"
                            style={{ color: colors.textSecondary }}
                        >
                            Discover our full range of professional services
                        </p>
                        <button
                            onClick={() => navigate('/services')}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                color: 'white'
                            }}
                        >
                            View All Services
                            <FaArrowRight />
                        </button>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default ServiceDetail;
