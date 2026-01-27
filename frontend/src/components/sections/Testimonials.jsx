import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { 
    FaStar, 
    FaQuoteLeft,
    FaChevronLeft,
    FaChevronRight,
    FaLinkedin,
    FaTwitter,
    FaUser
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard } from '../modern';

const Testimonials = () => {
    const { colors, mode } = useTheme();
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const sliderRef = useRef(null);
    const isDark = mode === 'dark';

    const defaultTestimonials = [
        {
            id: 1,
            username: "Sarah Johnson",
            title: "CEO",
            company: "TechStart Inc.",
            rating: 5,
            message: "AngiSoft Technologies delivered our mobile app ahead of schedule. Their team's expertise and communication were exceptional throughout the project. We've seen a 40% increase in user engagement since launch.",
            imageLink: null,
            linkedin: "#",
            twitter: "#"
        },
        {
            id: 2,
            username: "Michael Oduya",
            title: "Founder",
            company: "PayQuick Kenya",
            rating: 5,
            message: "Working with AngiSoft was a game-changer for our fintech startup. They built a secure, scalable payment platform that our customers love. The attention to security and compliance was impressive.",
            imageLink: null,
            linkedin: "#",
            twitter: "#"
        },
        {
            id: 3,
            username: "Jennifer Wanjiku",
            title: "Operations Manager",
            company: "LogiTrack",
            rating: 5,
            message: "The fleet management system AngiSoft built for us has reduced our operational costs by 30%. Their ongoing support and maintenance have been invaluable. Highly recommend their services!",
            imageLink: null,
            linkedin: "#",
            twitter: "#"
        },
        {
            id: 4,
            username: "David Mwangi",
            title: "CTO",
            company: "HealthTech Africa",
            rating: 5,
            message: "AngiSoft's technical expertise is unmatched. They delivered a HIPAA-compliant telemedicine platform that has transformed healthcare delivery in our region. Professional team with excellent communication.",
            imageLink: null,
            linkedin: "#",
            twitter: "#"
        },
        {
            id: 5,
            username: "Grace Akinyi",
            title: "Director",
            company: "EduLearn Institute",
            rating: 5,
            message: "Our LMS platform by AngiSoft has revolutionized how we deliver education. The intuitive design and robust features have increased student engagement by 60%. Exceptional work!",
            imageLink: null,
            linkedin: "#",
            twitter: "#"
        }
    ];

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const data = await apiGet('/testimonials');
                setTestimonials(data && data.length > 0 ? data : defaultTestimonials);
            } catch (err) {
                setTestimonials(defaultTestimonials);
            } finally {
                setLoading(false);
            }
        };
        fetchTestimonials();
    }, []);

    // Auto-play slider
    useEffect(() => {
        if (!isAutoPlaying) return;
        
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % displayTestimonials.length);
        }, 5000);
        
        return () => clearInterval(interval);
    }, [isAutoPlaying, testimonials.length]);

    const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;

    const handlePrev = () => {
        setIsAutoPlaying(false);
        setActiveIndex(prev => prev === 0 ? displayTestimonials.length - 1 : prev - 1);
    };

    const handleNext = () => {
        setIsAutoPlaying(false);
        setActiveIndex(prev => (prev + 1) % displayTestimonials.length);
    };

    const renderStars = (rating = 5) => {
        return Array.from({ length: 5 }, (_, i) => (
            <FaStar 
                key={i} 
                className={i < rating ? 'text-amber-400' : 'text-gray-300'}
            />
        ));
    };

    return (
        <section 
            id="testimonials" 
            className="relative py-28 overflow-hidden"
            style={{
                background: isDark 
                    ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)'
            }}
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Large Quote Marks */}
                <FaQuoteLeft 
                    className="absolute opacity-[0.03] text-[400px]"
                    style={{ 
                        top: '10%', 
                        left: '5%', 
                        color: colors.primary 
                    }}
                />
                <FaQuoteLeft 
                    className="absolute opacity-[0.03] text-[300px] rotate-180"
                    style={{ 
                        bottom: '10%', 
                        right: '5%', 
                        color: colors.secondary 
                    }}
                />
                
                {/* Gradient Orbs */}
                <div 
                    className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
                    style={{ 
                        top: '-20%', 
                        right: '-10%', 
                        background: `radial-gradient(circle, ${colors.primary}10 0%, transparent 70%)`
                    }}
                />
                <div 
                    className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
                    style={{ 
                        bottom: '-20%', 
                        left: '-10%', 
                        background: `radial-gradient(circle, ${colors.secondary}10 0%, transparent 70%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <ScrollReveal animation="fadeUp">
                    <div className="text-center mb-16">
                        <div 
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6"
                            style={{
                                backgroundColor: `${colors.primary}15`,
                                color: colors.primary
                            }}
                        >
                            <FaStar />
                            Testimonials
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
                            What Our Clients Say
                        </h2>
                        <p 
                            className="text-lg md:text-xl max-w-2xl mx-auto"
                            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                        >
                            Trusted by businesses across Africa and beyond — hear from our satisfied clients
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
                        {/* Featured Testimonial - Large Card */}
                        <ScrollReveal animation="fadeUp" delay={100}>
                            <div 
                                className="relative max-w-4xl mx-auto mb-16 p-8 md:p-12 rounded-3xl"
                                style={{
                                    background: isDark 
                                        ? 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)'
                                        : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                                    backdropFilter: 'blur(20px)',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                    boxShadow: isDark 
                                        ? '0 25px 80px rgba(0,0,0,0.4)'
                                        : '0 25px 80px rgba(0,0,0,0.1)'
                                }}
                            >
                                {/* Quote Icon */}
                                <div 
                                    className="absolute -top-6 left-8 w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                        boxShadow: `0 10px 30px ${colors.primary}40`
                                    }}
                                >
                                    <FaQuoteLeft className="text-white text-lg" />
                                </div>
                                
                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        <div 
                                            className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                boxShadow: `0 10px 40px ${colors.primary}30`
                                            }}
                                        >
                                            {displayTestimonials[activeIndex]?.imageLink ? (
                                                <img 
                                                    src={displayTestimonials[activeIndex].imageLink}
                                                    alt={displayTestimonials[activeIndex].username}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                displayTestimonials[activeIndex]?.username?.charAt(0) || 'A'
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 text-center md:text-left">
                                        {/* Stars */}
                                        <div className="flex gap-1 justify-center md:justify-start mb-4">
                                            {renderStars(displayTestimonials[activeIndex]?.rating)}
                                        </div>
                                        
                                        {/* Message */}
                                        <p 
                                            className="text-lg md:text-xl leading-relaxed mb-6 italic"
                                            style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
                                        >
                                            "{Array.isArray(displayTestimonials[activeIndex]?.message) 
                                                ? displayTestimonials[activeIndex].message.join(' ')
                                                : displayTestimonials[activeIndex]?.message}"
                                        </p>
                                        
                                        {/* Author Info */}
                                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                            <div>
                                                <h4 
                                                    className="font-bold text-lg"
                                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                                >
                                                    {displayTestimonials[activeIndex]?.username}
                                                </h4>
                                                <p 
                                                    className="text-sm"
                                                    style={{ color: colors.primary }}
                                                >
                                                    {displayTestimonials[activeIndex]?.title}, {displayTestimonials[activeIndex]?.company}
                                                </p>
                                            </div>
                                            
                                            {/* Social Links */}
                                            <div className="flex gap-2 justify-center md:justify-start">
                                                <a 
                                                    href={displayTestimonials[activeIndex]?.linkedin || '#'}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                                    style={{
                                                        backgroundColor: `${colors.primary}15`,
                                                        color: colors.primary
                                                    }}
                                                >
                                                    <FaLinkedin className="text-sm" />
                                                </a>
                                                <a 
                                                    href={displayTestimonials[activeIndex]?.twitter || '#'}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                                    style={{
                                                        backgroundColor: `${colors.primary}15`,
                                                        color: colors.primary
                                                    }}
                                                >
                                                    <FaTwitter className="text-sm" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Navigation Arrows */}
                                <div className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-6">
                                    <button 
                                        onClick={handlePrev}
                                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 text-white"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                            boxShadow: `0 10px 30px ${colors.primary}40`
                                        }}
                                    >
                                        <FaChevronLeft />
                                    </button>
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-6">
                                    <button 
                                        onClick={handleNext}
                                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 text-white"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                            boxShadow: `0 10px 30px ${colors.primary}40`
                                        }}
                                    >
                                        <FaChevronRight />
                                    </button>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Testimonial Indicators */}
                        <div className="flex justify-center gap-2 mb-16">
                            {displayTestimonials.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setIsAutoPlaying(false);
                                        setActiveIndex(idx);
                                    }}
                                    className="transition-all duration-300"
                                    style={{
                                        width: activeIndex === idx ? '32px' : '10px',
                                        height: '10px',
                                        borderRadius: '999px',
                                        backgroundColor: activeIndex === idx 
                                            ? colors.primary 
                                            : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                                    }}
                                />
                            ))}
                        </div>

                        {/* Mini Testimonial Cards */}
                        <ScrollReveal animation="fadeUp" delay={200}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                {displayTestimonials.slice(0, 3).map((testimonial, idx) => (
                                    <GlassmorphismCard 
                                        key={testimonial.id || idx}
                                        className="p-4 md:p-6 cursor-pointer h-full"
                                        hoverEffect
                                        onClick={() => {
                                            setIsAutoPlaying(false);
                                            setActiveIndex(idx);
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div 
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                                }}
                                            >
                                                {testimonial.username?.charAt(0)}
                                            </div>
                                            <div>
                                                <h5 
                                                    className="font-semibold text-sm"
                                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                                >
                                                    {testimonial.username}
                                                </h5>
                                                <p 
                                                    className="text-xs"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                                                >
                                                    {testimonial.company}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5 mb-3">
                                            {renderStars(testimonial.rating)}
                                        </div>
                                        <p 
                                            className="text-sm line-clamp-3"
                                            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                        >
                                            "{Array.isArray(testimonial.message) 
                                                ? testimonial.message.join(' ').substring(0, 100)
                                                : testimonial.message?.substring(0, 100)}..."
                                        </p>
                                    </GlassmorphismCard>
                                ))}
                            </div>
                        </ScrollReveal>
                    </>
                )}
            </div>
        </section>
    );
};

export default Testimonials;
