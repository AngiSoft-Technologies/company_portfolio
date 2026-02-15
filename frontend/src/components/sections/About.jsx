import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { apiGet } from '../../js/httpClient';
import { useSiteCopy } from '../../hooks/useSiteCopy';
import { 
  FaBuilding, 
  FaLightbulb, 
  FaHandshake, 
  FaAward, 
  FaUsers,
  FaPlay,
  FaGlobe,
  FaRocket,
  FaCheckCircle
} from "react-icons/fa";
import { ScrollReveal, GlassmorphismCard, AnimatedCounter } from "../modern";

const About = () => {
    const { colors, mode } = useTheme();
    const { copy: uiCopy } = useSiteCopy();
    const [about, setAbout] = useState(null);
    const [loading, setLoading] = useState(true);
    const videoRef = useRef(null);
    const [videoPlaying, setVideoPlaying] = useState(false);

    const getResponsiveValue = (values) => {
        const w = window.innerWidth;
        if (w < 360) return values[360];
        if (w < 420) return values[420];
        if (w < 475) return values[475];
        if (w < 575) return values[575];
        if (w < 768) return values[768];
        if (w < 900) return values[900];
        if (w < 1024) return values[1024];
        if (w < 1366) return values[1366];
        if (w < 1440) return values[1440];
        if (w < 1920) return values[1920];
        return values[1920];
    };

    useEffect(() => {
        const fetchAbout = async () => {
            try {
                const data = await apiGet('/site/about');
                setAbout(data || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAbout();
    }, []);

    const iconMap = {
        FaLightbulb,
        FaHandshake,
        FaAward,
        FaUsers,
        FaGlobe,
        FaRocket,
        FaCheckCircle
    };

    const content = about;
    const isDark = mode === 'dark';
    const headerTitle = content?.title;
    const headerSubtitle = content?.subtitle;
    const storyTitle = content?.storyTitle || content?.subtitle;
    const highlightStat = (content?.stats || []).find((stat) => /year|experience/i.test(stat.label || '')) || (content?.stats || [])[0];
    const hasVideo = !!content?.videoUrl;
    const posterImage = content?.imageUrl || undefined;
    const sectionCopy = uiCopy?.home?.about || {};

    if (loading) {
        return (
            <section id="about" className="relative py-28 overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <p>Loading about content...</p>
                </div>
            </section>
        );
    }

    if (!content) {
        return (
            <section id="about" className="relative py-28 overflow-hidden">
                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <p>About content not configured yet.</p>
                </div>
            </section>
        );
    }

    return (
        <section 
            id="about" 
            className="relative overflow-hidden"
            style={{
                paddingTop: getResponsiveValue({ 360: '3.5rem', 420: '3.75rem', 475: '4rem', 575: '4.5rem', 768: '5rem', 900: '5.5rem', 1024: '6rem', 1366: '6.5rem', 1440: '7rem', 1920: '7.5rem' }),
                paddingBottom: getResponsiveValue({ 360: '3.5rem', 420: '3.75rem', 475: '4rem', 575: '4.5rem', 768: '5rem', 900: '5.5rem', 1024: '6rem', 1366: '6.5rem', 1440: '7rem', 1920: '7.5rem' }),
                background: isDark 
                    ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                    : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)'
            }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, ${colors.primary} 1px, transparent 0)`,
                        backgroundSize: '50px 50px'
                    }}
                />
                {/* Decorative Blobs */}
                <div 
                    className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
                    style={{ 
                        top: '10%', 
                        left: '-10%', 
                        background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`
                    }}
                />
                <div 
                    className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
                    style={{ 
                        bottom: '10%', 
                        right: '-10%', 
                        background: `radial-gradient(circle, ${colors.secondary}10 0%, transparent 70%)`
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <ScrollReveal animation="fadeUp">
                    <div 
                        className="text-center"
                        style={{
                            marginBottom: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.75rem', 768: '3rem', 900: '3.25rem', 1024: '3.5rem', 1366: '4rem', 1440: '4.5rem', 1920: '5rem' })
                        }}
                    >
                        {sectionCopy.badge && (
                            <div 
                                className="inline-flex items-center gap-2 rounded-full text-sm font-semibold"
                                style={{
                                    padding: getResponsiveValue({ 360: '0.4rem 0.9rem', 420: '0.425rem 1rem', 475: '0.45rem 1.1rem', 575: '0.475rem 1.2rem', 768: '0.5rem 1.25rem', 900: '0.5rem 1.35rem', 1024: '0.525rem 1.5rem', 1366: '0.55rem 1.6rem', 1440: '0.6rem 1.75rem', 1920: '0.625rem 1.9rem' }),
                                    marginBottom: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.5rem', 1024: '1.5rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' }),
                                    backgroundColor: `${colors.primary}15`,
                                    color: colors.primary
                                }}
                            >
                                <FaBuilding />
                                {sectionCopy.badge}
                            </div>
                        )}
                        <h2 
                            className="font-black tracking-tight"
                            style={{
                                fontSize: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.75rem', 768: '3rem', 900: '3.5rem', 1024: '4rem', 1366: '4.5rem', 1440: '5rem', 1920: '5.5rem' }),
                                marginBottom: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.375rem', 1024: '1.5rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' }),
                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text"
                            }}
                        >
                            {headerTitle}
                        </h2>
                        {headerSubtitle && (
                            <p 
                                className="max-w-2xl mx-auto"
                                style={{
                                    fontSize: getResponsiveValue({ 360: '0.9rem', 420: '0.95rem', 475: '1rem', 575: '1.05rem', 768: '1.1rem', 900: '1.2rem', 1024: '1.25rem', 1366: '1.35rem', 1440: '1.45rem', 1920: '1.6rem' }),
                                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
                                }}
                            >
                                {headerSubtitle}
                            </p>
                        )}
                    </div>
                </ScrollReveal>

                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div 
                            className="w-12 h-12 border-4 rounded-full animate-spin"
                            style={{ 
                                borderColor: `${colors.primary}30`, 
                                borderTopColor: colors.primary 
                            }}
                        />
                    </div>
                )}

                {/* Main Content Grid */}
                {!loading && (
                    <div 
                        className="grid lg:grid-cols-2 items-center"
                        style={{
                            gap: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '3rem', 1024: '3.5rem', 1366: '4rem', 1440: '4.5rem', 1920: '5rem' }),
                            marginBottom: getResponsiveValue({ 360: '2.5rem', 420: '3rem', 475: '3.5rem', 575: '4rem', 768: '4.5rem', 900: '5rem', 1024: '5.5rem', 1366: '6rem', 1440: '6.5rem', 1920: '7rem' })
                        }}
                    >
                        {/* Left: Visual with Video */}
                        <ScrollReveal animation="fadeLeft" delay={100}>
                            <div className="relative">
                                {/* Main Image/Video Container */}
                                <div 
                                    className="relative z-10 rounded-3xl overflow-hidden shadow-2xl group cursor-pointer"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                        padding: '3px'
                                    }}
                                >
                                    <div 
                                        className="relative aspect-[4/3] rounded-3xl overflow-hidden"
                                        style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}
                                    >
                                        <video
                                            ref={videoRef}
                                            loop
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover"
                                            poster={posterImage}
                                        >
                                            {hasVideo && (
                                                <source src={content.videoUrl} type="video/mp4" />
                                            )}
                                        </video>
                                        
                                        {/* Play Button Overlay */}
                                        {hasVideo && (
                                            <div 
                                                className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
                                                style={{ 
                                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                                    opacity: videoPlaying ? 0 : 1
                                                }}
                                                onClick={() => {
                                                    if (videoRef.current) {
                                                        if (videoPlaying) {
                                                            videoRef.current.pause();
                                                        } else {
                                                            videoRef.current.play();
                                                        }
                                                        setVideoPlaying(!videoPlaying);
                                                    }
                                                }}
                                            >
                                                <div 
                                                    className="w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.2)',
                                                        backdropFilter: 'blur(10px)',
                                                        border: '2px solid rgba(255,255,255,0.3)'
                                                    }}
                                                >
                                                    <FaPlay className="text-white text-2xl ml-1" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Floating Stats Card */}
                                {highlightStat && (
                                    <div 
                                        className="absolute -bottom-6 -right-6 z-20 p-5 rounded-2xl shadow-xl"
                                        style={{
                                            background: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
                                            backdropFilter: 'blur(20px)',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }}
                                            >
                                                <FaRocket className="text-white text-xl" />
                                            </div>
                                            <div>
                                                <p 
                                                    className="text-2xl font-bold"
                                                    style={{ color: colors.primary }}
                                                >
                                                    {highlightStat.prefix || ''}
                                                    <AnimatedCounter end={Number(highlightStat.value) || 0} />
                                                    {highlightStat.suffix || ''}
                                                </p>
                                                <p 
                                                    className="text-sm"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                                                >
                                                    {highlightStat.label}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Decorative Elements */}
                                <div 
                                    className="absolute -top-6 -left-6 w-24 h-24 rounded-full blur-2xl"
                                    style={{ backgroundColor: `${colors.primary}30` }}
                                />
                                <div 
                                    className="absolute top-1/2 -right-4 w-8 h-32 rounded-full opacity-60"
                                    style={{ background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})` }}
                                />
                            </div>
                        </ScrollReveal>

                        {/* Right: Content */}
                        <ScrollReveal animation="fadeRight" delay={200}>
                            <div>
                                {sectionCopy.storyLabel && (
                                    <div 
                                        className="flex items-center gap-2"
                                        style={{
                                            color: colors.primary,
                                            marginBottom: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.375rem', 1024: '1.5rem', 1366: '1.625rem', 1440: '1.75rem', 1920: '2rem' })
                                        }}
                                    >
                                        <div className="w-12 h-0.5" style={{ backgroundColor: colors.primary }} />
                                        <span 
                                            className="font-semibold uppercase tracking-wider"
                                            style={{ fontSize: getResponsiveValue({ 360: '0.7rem', 420: '0.75rem', 475: '0.8rem', 575: '0.85rem', 768: '0.9rem', 900: '0.95rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.1rem', 1920: '1.15rem' }) }}
                                        >
                                            {sectionCopy.storyLabel}
                                        </span>
                                    </div>
                                )}
                                
                                {storyTitle && storyTitle !== headerTitle && (
                                    <h3 
                                        className="font-bold"
                                        style={{
                                            color: isDark ? '#fff' : '#1e293b',
                                            fontSize: getResponsiveValue({ 360: '1.5rem', 420: '1.6rem', 475: '1.75rem', 575: '1.9rem', 768: '2.1rem', 900: '2.3rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                                            marginBottom: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.375rem', 1024: '1.5rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' })
                                        }}
                                    >
                                        {storyTitle}
                                    </h3>
                                )}
                                
                                <div 
                                    className="space-y-4"
                                    style={{ marginBottom: getResponsiveValue({ 360: '1.25rem', 420: '1.5rem', 475: '1.75rem', 575: '2rem', 768: '2.25rem', 900: '2.5rem', 1024: '2.75rem', 1366: '3rem', 1440: '3.25rem', 1920: '3.5rem' }) }}
                                >
                                    {(content.description || []).map((desc, idx) => (
                                        <p 
                                            key={idx} 
                                            className="leading-relaxed"
                                            style={{
                                                fontSize: getResponsiveValue({ 360: '0.9rem', 420: '0.95rem', 475: '1rem', 575: '1.05rem', 768: '1.1rem', 900: '1.15rem', 1024: '1.2rem', 1366: '1.3rem', 1440: '1.4rem', 1920: '1.5rem' }),
                                                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                                            }}
                                        >
                                            {desc}
                                        </p>
                                    ))}
                                </div>

                                {/* Achievements List */}
                                <div 
                                    className="grid grid-cols-1 sm:grid-cols-2"
                                    style={{
                                        gap: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.875rem', 768: '1rem', 900: '1.125rem', 1024: '1.25rem', 1366: '1.375rem', 1440: '1.5rem', 1920: '1.75rem' }),
                                        marginBottom: getResponsiveValue({ 360: '1rem', 420: '1.25rem', 475: '1.5rem', 575: '1.75rem', 768: '2rem', 900: '2.25rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' })
                                    }}
                                >
                                    {(content.achievements || []).map((item, idx) => (
                                        <div 
                                            key={idx}
                                            className="flex items-center gap-3"
                                        >
                                            <FaCheckCircle style={{ color: colors.primary }} />
                                            <span 
                                                className="font-medium"
                                                style={{
                                                    fontSize: getResponsiveValue({ 360: '0.75rem', 420: '0.8rem', 475: '0.85rem', 575: '0.9rem', 768: '0.95rem', 900: '1rem', 1024: '1.05rem', 1366: '1.1rem', 1440: '1.15rem', 1920: '1.2rem' }),
                                                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
                                                }}
                                            >
                                                {item}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Stats Row */}
                                <div 
                                    className="flex flex-wrap"
                                    style={{
                                        gap: getResponsiveValue({ 360: '1rem', 420: '1.25rem', 475: '1.5rem', 575: '1.75rem', 768: '2rem', 900: '2.25rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                                        paddingTop: getResponsiveValue({ 360: '1rem', 420: '1.25rem', 475: '1.5rem', 575: '1.75rem', 768: '2rem', 900: '2.25rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                                    }}
                                >
                                    {(content.stats || []).map((stat, idx) => (
                                        <div key={idx} className="min-w-0">
                                            <p 
                                                className="font-bold"
                                                style={{
                                                    fontSize: getResponsiveValue({ 360: '1.25rem', 420: '1.35rem', 475: '1.5rem', 575: '1.65rem', 768: '1.8rem', 900: '2rem', 1024: '2.2rem', 1366: '2.4rem', 1440: '2.6rem', 1920: '2.8rem' }),
                                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                    backgroundClip: "text"
                                                }}
                                            >
                                                {stat.prefix}<AnimatedCounter end={stat.value} />{stat.suffix || ''}
                                            </p>
                                            <p 
                                                className=""
                                                style={{
                                                    fontSize: getResponsiveValue({ 360: '0.7rem', 420: '0.75rem', 475: '0.8rem', 575: '0.85rem', 768: '0.9rem', 900: '0.95rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.1rem', 1920: '1.15rem' }),
                                                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                {stat.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                )}

                {/* Core Values - Glassmorphism Cards */}
                <div
                    style={{
                        marginTop: getResponsiveValue({ 360: '2rem', 420: '2.25rem', 475: '2.5rem', 575: '2.75rem', 768: '3rem', 900: '3.5rem', 1024: '4rem', 1366: '4.5rem', 1440: '5rem', 1920: '5.5rem' })
                    }}
                >
                    <ScrollReveal animation="fadeUp">
                        <div
                            className="text-center"
                            style={{
                                marginBottom: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '2.75rem', 1024: '3rem', 1366: '3.5rem', 1440: '4rem', 1920: '4.5rem' })
                            }}
                        >
                            {sectionCopy.valuesTitle && (
                                <h3 
                                    className="font-bold"
                                    style={{
                                        color: isDark ? '#fff' : '#1e293b',
                                        fontSize: getResponsiveValue({ 360: '1.5rem', 420: '1.6rem', 475: '1.75rem', 575: '1.9rem', 768: '2.1rem', 900: '2.3rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                                        marginBottom: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.875rem', 768: '1rem', 900: '1.125rem', 1024: '1.25rem', 1366: '1.5rem', 1440: '1.75rem', 1920: '2rem' })
                                    }}
                                >
                                    {sectionCopy.valuesTitle}
                                </h3>
                            )}
                            {sectionCopy.valuesSubtitle && (
                                <p 
                                    className="max-w-xl mx-auto"
                                    style={{
                                        fontSize: getResponsiveValue({ 360: '0.9rem', 420: '0.95rem', 475: '1rem', 575: '1.05rem', 768: '1.1rem', 900: '1.15rem', 1024: '1.2rem', 1366: '1.3rem', 1440: '1.4rem', 1920: '1.5rem' }),
                                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
                                    }}
                                >
                                    {sectionCopy.valuesSubtitle}
                                </p>
                            )}
                        </div>
                    </ScrollReveal>
                    
                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                        style={{
                            gap: getResponsiveValue({ 360: '0.75rem', 420: '0.9rem', 475: '1rem', 575: '1.1rem', 768: '1.25rem', 900: '1.5rem', 1024: '1.75rem', 1366: '2rem', 1440: '2.25rem', 1920: '2.5rem' })
                        }}
                    >
                        {(content.values || []).map((value, idx) => {
                            const Icon = iconMap[value.icon] || FaCheckCircle;
                            return (
                                <ScrollReveal key={idx} animation="scaleUp" delay={idx * 100}>
                                    <GlassmorphismCard
                                        hoverEffect
                                        className="h-full"
                                        style={{
                                            padding: getResponsiveValue({ 360: '1rem', 420: '1.1rem', 475: '1.25rem', 575: '1.5rem', 768: '1.75rem', 900: '2rem', 1024: '2.25rem', 1366: '2.5rem', 1440: '2.75rem', 1920: '3rem' })
                                        }}
                                    >
                                        <div 
                                            className="rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                                            style={{ 
                                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                width: getResponsiveValue({ 360: '2.5rem', 420: '2.75rem', 475: '3rem', 575: '3.25rem', 768: '3.5rem', 900: '3.75rem', 1024: '4rem', 1366: '4.25rem', 1440: '4.5rem', 1920: '4.75rem' }),
                                                height: getResponsiveValue({ 360: '2.5rem', 420: '2.75rem', 475: '3rem', 575: '3.25rem', 768: '3.5rem', 900: '3.75rem', 1024: '4rem', 1366: '4.25rem', 1440: '4.5rem', 1920: '4.75rem' }),
                                                marginBottom: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.375rem', 1024: '1.5rem', 1366: '1.75rem', 1440: '1.875rem', 1920: '2rem' })
                                            }}
                                        >
                                            <Icon
                                                className="text-white"
                                                style={{
                                                    fontSize: getResponsiveValue({ 360: '1rem', 420: '1.1rem', 475: '1.2rem', 575: '1.3rem', 768: '1.4rem', 900: '1.5rem', 1024: '1.6rem', 1366: '1.75rem', 1440: '1.9rem', 1920: '2rem' })
                                                }}
                                            />
                                        </div>
                                        <h4 
                                            className="font-bold"
                                            style={{
                                                color: isDark ? '#fff' : '#1e293b',
                                                fontSize: getResponsiveValue({ 360: '1rem', 420: '1.1rem', 475: '1.2rem', 575: '1.3rem', 768: '1.4rem', 900: '1.5rem', 1024: '1.6rem', 1366: '1.75rem', 1440: '1.9rem', 1920: '2rem' }),
                                                marginBottom: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.875rem', 768: '1rem', 900: '1.125rem', 1024: '1.25rem', 1366: '1.5rem', 1440: '1.75rem', 1920: '2rem' })
                                            }}
                                        >
                                            {value.title}
                                        </h4>
                                        <p 
                                            className="leading-relaxed"
                                            style={{
                                                fontSize: getResponsiveValue({ 360: '0.85rem', 420: '0.9rem', 475: '0.95rem', 575: '1rem', 768: '1.05rem', 900: '1.1rem', 1024: '1.15rem', 1366: '1.2rem', 1440: '1.3rem', 1920: '1.4rem' }),
                                                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
                                            }}
                                        >
                                            {value.text}
                                        </p>
                                    </GlassmorphismCard>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                </div>

                {content.globalPresence && (
                    <ScrollReveal animation="fadeUp" delay={200}>
                        <div 
                            className="rounded-3xl text-center"
                            style={{
                                marginTop: getResponsiveValue({ 360: '2.5rem', 420: '3rem', 475: '3.5rem', 575: '4rem', 768: '4.5rem', 900: '5rem', 1024: '5.5rem', 1366: '6rem', 1440: '6.5rem', 1920: '7rem' }),
                                padding: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '3rem', 1024: '3.5rem', 1366: '4rem', 1440: '4.5rem', 1920: '5rem' }),
                                background: isDark 
                                    ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                                    : 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                            }}
                        >
                            <div 
                                className="mx-auto rounded-2xl flex items-center justify-center"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                    width: getResponsiveValue({ 360: '3rem', 420: '3.25rem', 475: '3.5rem', 575: '3.75rem', 768: '4rem', 900: '4.5rem', 1024: '5rem', 1366: '5.5rem', 1440: '6rem', 1920: '6.5rem' }),
                                    height: getResponsiveValue({ 360: '3rem', 420: '3.25rem', 475: '3.5rem', 575: '3.75rem', 768: '4rem', 900: '4.5rem', 1024: '5rem', 1366: '5.5rem', 1440: '6rem', 1920: '6.5rem' }),
                                    marginBottom: getResponsiveValue({ 360: '0.75rem', 420: '0.875rem', 475: '1rem', 575: '1.125rem', 768: '1.25rem', 900: '1.5rem', 1024: '1.75rem', 1366: '2rem', 1440: '2.25rem', 1920: '2.5rem' })
                                }}
                            >
                                <FaGlobe
                                    className="text-white"
                                    style={{ fontSize: getResponsiveValue({ 360: '1.5rem', 420: '1.75rem', 475: '2rem', 575: '2.25rem', 768: '2.5rem', 900: '2.75rem', 1024: '3rem', 1366: '3.25rem', 1440: '3.5rem', 1920: '3.75rem' }) }}
                                />
                            </div>
                            {content.globalPresence.title && (
                                <h4 
                                    className="font-bold"
                                    style={{
                                        color: isDark ? '#fff' : '#1e293b',
                                        fontSize: getResponsiveValue({ 360: '1.5rem', 420: '1.6rem', 475: '1.75rem', 575: '1.9rem', 768: '2.1rem', 900: '2.3rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                                        marginBottom: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.875rem', 768: '1rem', 900: '1.125rem', 1024: '1.25rem', 1366: '1.5rem', 1440: '1.75rem', 1920: '2rem' })
                                    }}
                                >
                                    {content.globalPresence.title}
                                </h4>
                            )}
                            {content.globalPresence.description && (
                                <p 
                                    className="max-w-2xl mx-auto"
                                    style={{
                                        fontSize: getResponsiveValue({ 360: '0.9rem', 420: '0.95rem', 475: '1rem', 575: '1.05rem', 768: '1.1rem', 900: '1.2rem', 1024: '1.3rem', 1366: '1.4rem', 1440: '1.5rem', 1920: '1.6rem' }),
                                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                                        marginBottom: getResponsiveValue({ 360: '1rem', 420: '1.25rem', 475: '1.5rem', 575: '1.75rem', 768: '2rem', 900: '2.25rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' })
                                    }}
                                >
                                    {content.globalPresence.description}
                                </p>
                            )}
                            {Array.isArray(content.globalPresence.locations) && content.globalPresence.locations.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-6">
                                    {content.globalPresence.locations.map((location, idx) => (
                                        <span 
                                            key={idx}
                                            className="rounded-full font-medium"
                                            style={{
                                                padding: getResponsiveValue({ 360: '0.35rem 0.75rem', 420: '0.4rem 0.85rem', 475: '0.45rem 1rem', 575: '0.5rem 1.1rem', 768: '0.55rem 1.2rem', 900: '0.6rem 1.3rem', 1024: '0.65rem 1.4rem', 1366: '0.7rem 1.5rem', 1440: '0.75rem 1.6rem', 1920: '0.8rem 1.75rem' }),
                                                fontSize: getResponsiveValue({ 360: '0.7rem', 420: '0.75rem', 475: '0.8rem', 575: '0.85rem', 768: '0.9rem', 900: '0.95rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.1rem', 1920: '1.15rem' }),
                                                backgroundColor: `${colors.primary}15`,
                                                color: colors.primary
                                            }}
                                        >
                                            {location}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollReveal>
                )}
            </div>
        </section>
    );
};

export default About;
