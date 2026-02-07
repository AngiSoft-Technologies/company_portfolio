import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { useSiteCopy } from '../../hooks/useSiteCopy';
import { 
    FaCogs, 
    FaLaptopCode, 
    FaMobileAlt, 
    FaShieldAlt, 
    FaChartLine,
    FaBullhorn,
    FaArrowRight,
    FaCheckCircle
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard, ModernServiceCard } from '../modern';

const Services = () => {
    const { colors, mode } = useTheme();
    const { copy: uiCopy } = useSiteCopy();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeService, setActiveService] = useState(0);
    const isDark = mode === 'dark';
    const sectionCopy = uiCopy?.home?.services || {};
    const ctaCopy = sectionCopy?.cta || {};

    const getCategoryMeta = (service) => {
        const category = (service.categoryRef?.name || service.category || '').toLowerCase();
        if (category.includes('mobile')) return { icon: FaMobileAlt, gradient: 'from-violet-500 to-purple-600' };
        if (category.includes('data')) return { icon: FaChartLine, gradient: 'from-orange-500 to-red-600' };
        if (category.includes('cyber') || category.includes('security')) return { icon: FaShieldAlt, gradient: 'from-emerald-500 to-green-600' };
        if (category.includes('advert')) return { icon: FaBullhorn, gradient: 'from-pink-500 to-rose-600' };
        if (category.includes('automation') || category.includes('debug')) return { icon: FaCogs, gradient: 'from-cyan-500 to-teal-600' };
        if (category.includes('software') || category.includes('web') || category.includes('system')) return { icon: FaLaptopCode, gradient: 'from-blue-500 to-cyan-500' };
        return { icon: FaCogs, gradient: 'from-blue-500 to-cyan-500' };
    };

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const data = await apiGet('/services');
                const published = Array.isArray(data) ? data.filter(s => s.published !== false) : [];
                setServices(published);
            } catch (err) {
                setError('Failed to load services.');
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    const displayServices = services;

    return (
        <section 
            id="services" 
            className="relative py-28 overflow-hidden"
            style={{
                background: isDark 
                    ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)'
            }}
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Animated Gradient Mesh */}
                <div 
                    className="absolute w-[800px] h-[800px] rounded-full blur-3xl opacity-30"
                    style={{ 
                        top: '-20%', 
                        right: '-10%', 
                        background: `conic-gradient(from 0deg, ${colors.primary}20, ${colors.secondary}20, ${colors.primary}20)`
                    }}
                />
                <div 
                    className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
                    style={{ 
                        bottom: '-20%', 
                        left: '-10%', 
                        background: `radial-gradient(circle, ${colors.secondary}30 0%, transparent 70%)`
                    }}
                />
                
                {/* Grid Pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), 
                                          linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <ScrollReveal animation="fadeUp">
                    <div className="text-center mb-20">
                        {sectionCopy.badge && (
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6"
                                style={{
                                    backgroundColor: `${colors.primary}15`,
                                    color: colors.primary
                                }}
                            >
                                <FaCogs />
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
                        {displayServices.length === 0 && !error && (
                            <div className="text-center text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                No services published yet.
                            </div>
                        )}
                        {/* Services Grid - Modern Card Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
                            {displayServices.slice(0, 6).map((service, idx) => {
                                const { icon: ServiceIcon } = getCategoryMeta(service);
                                const categoryLabel = service.categoryRef?.name || service.category;
                                const features = [
                                    categoryLabel ? `${categoryLabel}` : null,
                                    service.targetAudience ? `Audience: ${service.targetAudience}` : null,
                                    service.scope ? `Scope: ${service.scope}` : null,
                                    service.priceFrom ? `From ${service.currency || 'KES'} ${service.priceFrom}` : null
                                ].filter(Boolean);

                                return (
                                    <ScrollReveal key={service.id || idx} animation="fadeUp" delay={idx * 100}>
                                        <div 
                                            className="group relative h-full rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-3"
                                            style={{
                                                background: isDark 
                                                    ? 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)'
                                                    : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                                                backdropFilter: 'blur(20px)',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                                boxShadow: isDark 
                                                    ? '0 25px 50px -12px rgba(0,0,0,0.5)'
                                                    : '0 25px 50px -12px rgba(0,0,0,0.15)'
                                            }}
                                            onMouseEnter={() => setActiveService(idx)}
                                        >
                                            {/* Top Gradient Bar */}
                                            <div 
                                                className="h-1.5 w-full"
                                                style={{
                                                    background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                                }}
                                            />
                                            
                                            <div className="p-6 md:p-8 flex flex-col h-full">
                                                {/* Icon */}
                                                <div 
                                                    className="w-14 h-14 md:w-16 md:h-16 mb-5 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                                                    style={{ 
                                                        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 100%)`,
                                                        boxShadow: `0 10px 30px ${colors.primary}20`
                                                    }}
                                                >
                                                    <ServiceIcon 
                                                        className="text-xl md:text-2xl"
                                                        style={{ color: colors.primary }}
                                                    />
                                                </div>
                                                
                                                {/* Title */}
                                                <h3 
                                                    className="text-lg md:text-xl font-bold mb-3 transition-colors"
                                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                                >
                                                    {service.title}
                                                </h3>
                                                
                                                {/* Description */}
                                                <p 
                                                    className="text-sm md:text-base mb-5 leading-relaxed flex-grow"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                                >
                                                    {service.description}
                                                </p>
                                                
                                                {/* Features */}
                                                {features.length > 0 && (
                                                    <div className="space-y-2.5 mb-5">
                                                        {features.slice(0, 3).map((feature, fIdx) => (
                                                            <div 
                                                                key={fIdx}
                                                                className="flex items-center gap-3"
                                                            >
                                                                <FaCheckCircle 
                                                                    className="text-sm flex-shrink-0"
                                                                    style={{ color: colors.primary }}
                                                                />
                                                                <span 
                                                                    className="text-sm"
                                                                    style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                                                                >
                                                                    {feature}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* Learn More Link */}
                                                <Link 
                                                    to="/services"
                                                    className="inline-flex items-center gap-2 font-semibold text-sm transition-all group-hover:gap-3 mt-auto pt-2"
                                                    style={{ color: colors.primary }}
                                                >
                                                    Learn More 
                                                    <FaArrowRight className="text-xs" />
                                                </Link>
                                            </div>
                                            
                                            {/* Hover Glow Effect */}
                                            <div 
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                                style={{
                                                    background: `radial-gradient(circle at 50% 0%, ${colors.primary}10 0%, transparent 60%)`
                                                }}
                                            />
                                        </div>
                                    </ScrollReveal>
                                );
                            })}
                        </div>

                        {(ctaCopy.title || ctaCopy.subtitle || ctaCopy.primaryLabel || ctaCopy.secondaryLabel) && (
                            <ScrollReveal animation="fadeUp" delay={300}>
                                <div 
                                    className="text-center p-12 rounded-3xl"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                        boxShadow: `0 25px 80px ${colors.primary}40`
                                    }}
                                >
                                    {ctaCopy.title && (
                                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                            {ctaCopy.title}
                                        </h3>
                                    )}
                                    {ctaCopy.subtitle && (
                                        <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                                            {ctaCopy.subtitle}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap justify-center gap-4">
                                        {ctaCopy.primaryLabel && (
                                            <Link 
                                                to={ctaCopy.primaryLink || "/services"}
                                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold bg-white transition-all hover:-translate-y-1 hover:shadow-xl"
                                                style={{ color: colors.primary }}
                                            >
                                                {ctaCopy.primaryLabel}
                                                <FaArrowRight />
                                            </Link>
                                        )}
                                        {ctaCopy.secondaryLabel && (
                                            <Link 
                                                to={ctaCopy.secondaryLink || "/book"}
                                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white border-2 border-white/30 transition-all hover:bg-white/10 hover:-translate-y-1"
                                            >
                                                {ctaCopy.secondaryLabel}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </ScrollReveal>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default Services;
