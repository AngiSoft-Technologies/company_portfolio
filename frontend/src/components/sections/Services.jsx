import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { 
    FaCogs, 
    FaLaptopCode, 
    FaMobileAlt, 
    FaCloud, 
    FaShieldAlt, 
    FaPaintBrush,
    FaArrowRight,
    FaCheckCircle
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard, ModernServiceCard } from '../modern';

const Services = () => {
    const { colors, mode } = useTheme();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeService, setActiveService] = useState(0);
    const isDark = mode === 'dark';

    const defaultServices = [
        {
            id: 1,
            icon: FaLaptopCode,
            title: 'Custom Web Development',
            description: 'Full-stack web applications built with modern technologies like React, Node.js, and cloud infrastructure. We create responsive, scalable solutions.',
            features: ['React & Next.js', 'Node.js Backend', 'Cloud Hosting', 'Real-time Apps'],
            gradient: 'from-blue-500 to-cyan-500',
            image: '/images/web-development.jpg'
        },
        {
            id: 2,
            icon: FaMobileAlt,
            title: 'Mobile App Development',
            description: 'Native and cross-platform mobile applications for iOS and Android using Flutter and React Native with seamless user experiences.',
            features: ['Flutter', 'React Native', 'Native iOS/Android', 'App Store Deployment'],
            gradient: 'from-violet-500 to-purple-600',
            image: '/images/web-development.jpg'
        },
        {
            id: 3,
            icon: FaCloud,
            title: 'Cloud Solutions',
            description: 'Scalable cloud architecture, DevOps, and managed services on AWS, Azure, and Google Cloud for maximum reliability.',
            features: ['AWS & Azure', 'DevOps', 'Auto-scaling', 'CI/CD Pipelines'],
            gradient: 'from-cyan-500 to-teal-600',
            image: '/images/programming-background-with-person-working-with-codes-computer.jpg'
        },
        {
            id: 4,
            icon: FaCogs,
            title: 'API Development',
            description: 'RESTful and GraphQL API design, development, and integration for seamless system connectivity and third-party integrations.',
            features: ['REST APIs', 'GraphQL', 'Webhooks', 'Microservices'],
            gradient: 'from-orange-500 to-red-600',
            image: '/images/web-development.jpg'
        },
        {
            id: 5,
            icon: FaShieldAlt,
            title: 'Cybersecurity',
            description: 'Security audits, penetration testing, and implementation of robust security measures to protect your digital assets.',
            features: ['Security Audits', 'Penetration Testing', 'Compliance', 'SIEM Solutions'],
            gradient: 'from-emerald-500 to-green-600',
            image: '/images/developer-8829735_1280.jpg'
        },
        {
            id: 6,
            icon: FaPaintBrush,
            title: 'UI/UX Design',
            description: 'User-centered design that combines aesthetics with functionality for exceptional digital experiences that convert.',
            features: ['Figma Design', 'Prototyping', 'User Research', 'Design Systems'],
            gradient: 'from-pink-500 to-rose-600',
            image: '/images/web-development.jpg'
        }
    ];

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const data = await apiGet('/services');
                const published = Array.isArray(data) ? data.filter(s => s.published !== false) : [];
                setServices(published.length > 0 ? published : defaultServices);
            } catch (err) {
                setServices(defaultServices);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    const displayServices = services.length > 0 ? services : defaultServices;

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
                        <div 
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6"
                            style={{
                                backgroundColor: `${colors.primary}15`,
                                color: colors.primary
                            }}
                        >
                            <FaCogs />
                            Our Services
                        </div>
                        <h2 
                            className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text"
                            }}
                        >
                            What We Offer
                        </h2>
                        <p 
                            className="text-lg md:text-xl max-w-3xl mx-auto"
                            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                        >
                            Comprehensive software solutions tailored to transform your business and accelerate growth
                        </p>
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
                        {/* Services Grid - Modern Card Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
                            {displayServices.slice(0, 6).map((service, idx) => {
                                const defaultService = defaultServices[idx] || defaultServices[0];
                                const ServiceIcon = service.icon || defaultService.icon;
                                const features = service.features || defaultService.features;
                                
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

                        {/* CTA Section */}
                        <ScrollReveal animation="fadeUp" delay={300}>
                            <div 
                                className="text-center p-12 rounded-3xl"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                    boxShadow: `0 25px 80px ${colors.primary}40`
                                }}
                            >
                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                    Ready to Start Your Project?
                                </h3>
                                <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                                    Let's discuss how we can help transform your ideas into powerful software solutions.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <Link 
                                        to="/services"
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold bg-white transition-all hover:-translate-y-1 hover:shadow-xl"
                                        style={{ color: colors.primary }}
                                    >
                                        View All Services
                                        <FaArrowRight />
                                    </Link>
                                    <Link 
                                        to="/book"
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white border-2 border-white/30 transition-all hover:bg-white/10 hover:-translate-y-1"
                                    >
                                        Get Free Quote
                                    </Link>
                                </div>
                            </div>
                        </ScrollReveal>
                    </>
                )}
            </div>
        </section>
    );
};

export default Services;
