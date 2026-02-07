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
            className="relative py-28 overflow-hidden"
            style={{
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
                    <div className="text-center mb-20">
                        {sectionCopy.badge && (
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6"
                                style={{
                                    backgroundColor: `${colors.primary}15`,
                                    color: colors.primary
                                }}
                            >
                                <FaBuilding />
                                {sectionCopy.badge}
                            </div>
                        )}
                        <h2 
                            className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight"
                            style={{
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
                                className="text-lg md:text-xl max-w-2xl mx-auto"
                                style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
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
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24">
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
                                        className="flex items-center gap-2 mb-4"
                                        style={{ color: colors.primary }}
                                    >
                                        <div className="w-12 h-0.5" style={{ backgroundColor: colors.primary }} />
                                        <span className="text-sm font-semibold uppercase tracking-wider">{sectionCopy.storyLabel}</span>
                                    </div>
                                )}
                                
                                {storyTitle && storyTitle !== headerTitle && (
                                    <h3 
                                        className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6"
                                        style={{ color: isDark ? '#fff' : '#1e293b' }}
                                    >
                                        {storyTitle}
                                    </h3>
                                )}
                                
                                <div className="space-y-4 mb-8">
                                    {(content.description || []).map((desc, idx) => (
                                        <p 
                                            key={idx} 
                                            className="text-lg leading-relaxed"
                                            style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
                                        >
                                            {desc}
                                        </p>
                                    ))}
                                </div>

                                {/* Achievements List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 mb-6 md:mb-8">
                                    {(content.achievements || []).map((item, idx) => (
                                        <div 
                                            key={idx}
                                            className="flex items-center gap-3"
                                        >
                                            <FaCheckCircle style={{ color: colors.primary }} />
                                            <span 
                                                className="text-sm font-medium"
                                                style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
                                            >
                                                {item}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Stats Row */}
                                <div 
                                    className="flex flex-wrap gap-6 md:gap-8 pt-6 md:pt-8"
                                    style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                                >
                                    {(content.stats || []).map((stat, idx) => (
                                        <div key={idx} className="min-w-0">
                                            <p 
                                                className="text-2xl md:text-3xl font-bold"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                    backgroundClip: "text"
                                                }}
                                            >
                                                {stat.prefix}<AnimatedCounter end={stat.value} />{stat.suffix || ''}
                                            </p>
                                            <p 
                                                className="text-sm"
                                                style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
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
                <div className="mt-12 md:mt-16">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-10 md:mb-12">
                            {sectionCopy.valuesTitle && (
                                <h3 
                                    className="text-2xl md:text-3xl font-bold mb-4"
                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                >
                                    {sectionCopy.valuesTitle}
                                </h3>
                            )}
                            {sectionCopy.valuesSubtitle && (
                                <p 
                                    className="max-w-xl mx-auto"
                                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                >
                                    {sectionCopy.valuesSubtitle}
                                </p>
                            )}
                        </div>
                    </ScrollReveal>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {(content.values || []).map((value, idx) => {
                            const Icon = iconMap[value.icon] || FaCheckCircle;
                            return (
                                <ScrollReveal key={idx} animation="scaleUp" delay={idx * 100}>
                                    <GlassmorphismCard hoverEffect className="p-5 md:p-6 lg:p-8 h-full">
                                        <div 
                                            className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 mb-4 md:mb-5 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                                            style={{ 
                                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` 
                                            }}
                                        >
                                            <Icon className="text-xl md:text-2xl text-white" />
                                        </div>
                                        <h4 
                                            className="font-bold text-lg md:text-xl mb-2 md:mb-3"
                                            style={{ color: isDark ? '#fff' : '#1e293b' }}
                                        >
                                            {value.title}
                                        </h4>
                                        <p 
                                            className="text-sm md:text-base leading-relaxed"
                                            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
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
                            className="mt-24 p-10 rounded-3xl text-center"
                            style={{
                                background: isDark 
                                    ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                                    : 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                            }}
                        >
                            <div 
                                className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }}
                            >
                                <FaGlobe className="text-3xl text-white" />
                            </div>
                            {content.globalPresence.title && (
                                <h4 
                                    className="text-2xl font-bold mb-4"
                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                >
                                    {content.globalPresence.title}
                                </h4>
                            )}
                            {content.globalPresence.description && (
                                <p 
                                    className="text-lg max-w-2xl mx-auto mb-6"
                                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                >
                                    {content.globalPresence.description}
                                </p>
                            )}
                            {Array.isArray(content.globalPresence.locations) && content.globalPresence.locations.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-6">
                                    {content.globalPresence.locations.map((location, idx) => (
                                        <span 
                                            key={idx}
                                            className="px-4 py-2 rounded-full text-sm font-medium"
                                            style={{
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
