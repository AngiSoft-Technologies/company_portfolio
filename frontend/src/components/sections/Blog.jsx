import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { useSiteCopy } from '../../hooks/useSiteCopy';
import { 
    FaBlog, 
    FaArrowRight,
    FaClock,
    FaUser,
    FaTag,
    FaCalendarAlt,
    FaBookOpen
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard } from '../modern';

const Blog = () => {
    const { colors, mode } = useTheme();
    const { copy: uiCopy } = useSiteCopy();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const isDark = mode === 'dark';
    const sectionCopy = uiCopy?.home?.blog || {};

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const data = await apiGet('/blogs');
                const published = Array.isArray(data) ? data.filter(p => p.published !== false) : [];
                setPosts(published);
            } catch (err) {
                setError('No blog posts available yet.');
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    const displayPosts = posts;

    const getAuthorName = (post) => {
        if (post?.author && typeof post.author === 'object') {
            return `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || 'AngiSoft Team';
        }
        return post?.author || 'AngiSoft Team';
    };

    const getAuthorInitial = (post) => getAuthorName(post).charAt(0);

    const getExcerpt = (post) => {
        if (post?.excerpt) return post.excerpt;
        if (post?.content) {
            const clean = post.content.replace(/[#*_`>\\-]/g, '').trim();
            return clean.length > 140 ? `${clean.slice(0, 140)}...` : clean;
        }
        return '';
    };

    const getCategory = (post) => {
        if (post?.category) return post.category;
        if (Array.isArray(post?.tags) && post.tags.length > 0) return post.tags[0];
        return 'Updates';
    };

    const getDate = (post) => {
        if (post?.date) return post.date;
        const date = post?.publishedAt || post?.createdAt;
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getReadTime = (post) => {
        if (post?.readTime) return post.readTime;
        const words = post?.content ? post.content.trim().split(/\\s+/).length : 0;
        const minutes = Math.max(1, Math.round(words / 200));
        return `${minutes} min read`;
    };

    return (
        <section 
            id="blog" 
            className="relative py-28 overflow-hidden"
            style={{
                background: isDark 
                    ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)'
            }}
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}
                <div 
                    className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
                    style={{ 
                        top: '-15%', 
                        left: '-10%', 
                        background: `radial-gradient(circle, ${colors.primary}10 0%, transparent 70%)`
                    }}
                />
                <div 
                    className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
                    style={{ 
                        bottom: '-15%', 
                        right: '-10%', 
                        background: `radial-gradient(circle, ${colors.secondary}10 0%, transparent 70%)`
                    }}
                />
                
                {/* Decorative Pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, ${colors.primary} 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <ScrollReveal animation="fadeUp">
                    <div className="text-center mb-16">
                        {sectionCopy.badge && (
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6"
                                style={{
                                    backgroundColor: `${colors.primary}15`,
                                    color: colors.primary
                                }}
                            >
                                <FaBlog />
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
                                className="text-lg md:text-xl max-w-2xl mx-auto"
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
                        {displayPosts.length === 0 && !error && (
                            <div className="text-center text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                No blog posts published yet.
                            </div>
                        )}
                        {/* Featured Post */}
                        {displayPosts.length > 0 && (
                            <ScrollReveal animation="fadeUp" delay={100}>
                                <div 
                                    className="relative mb-12 rounded-3xl overflow-hidden group cursor-pointer"
                                    onClick={() => navigate(`/blog/${displayPosts[0].id}`)}
                                    style={{
                                        background: isDark 
                                            ? 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)'
                                            : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                                        backdropFilter: 'blur(20px)',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                        boxShadow: isDark 
                                            ? '0 25px 80px rgba(0,0,0,0.4)'
                                            : '0 25px 80px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <div className="grid md:grid-cols-2 gap-0">
                                        {/* Image */}
                                        <div className="relative h-64 md:h-auto overflow-hidden">
                                            <div 
                                                className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary}80 0%, ${colors.secondary}80 100%)`
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <FaBookOpen className="text-white/30 text-6xl" />
                                            </div>
                                            
                                            {/* Featured Badge */}
                                            {sectionCopy.featuredLabel && (
                                                <div 
                                                    className="absolute top-4 left-4 px-4 py-2 rounded-full text-sm font-semibold text-white"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                                    }}
                                                >
                                                    {sectionCopy.featuredLabel}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="p-8 md:p-10 flex flex-col justify-center">
                                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                                <span 
                                                    className="px-3 py-1 rounded-full text-xs font-semibold"
                                                    style={{
                                                        backgroundColor: `${colors.primary}15`,
                                                        color: colors.primary
                                                    }}
                                                >
                                                    {getCategory(displayPosts[0])}
                                                </span>
                                                <div 
                                                    className="flex items-center gap-2 text-sm"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                                                >
                                                    <FaCalendarAlt className="text-xs" />
                                                    {getDate(displayPosts[0])}
                                                </div>
                                                <div 
                                                    className="flex items-center gap-2 text-sm"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                                                >
                                                    <FaClock className="text-xs" />
                                                    {getReadTime(displayPosts[0])}
                                                </div>
                                            </div>
                                            
                                            <h3 
                                                className="text-2xl md:text-3xl font-bold mb-4 transition-colors group-hover:text-primary"
                                                style={{ color: isDark ? '#fff' : '#1e293b' }}
                                            >
                                                {displayPosts[0].title}
                                            </h3>
                                            
                                            <p 
                                                className="text-lg mb-6"
                                                style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                            >
                                                {getExcerpt(displayPosts[0])}
                                            </p>
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                                        }}
                                                    >
                                                        {getAuthorInitial(displayPosts[0])}
                                                    </div>
                                                    <span 
                                                        className="text-sm font-medium"
                                                        style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                                                    >
                                                        {getAuthorName(displayPosts[0])}
                                                    </span>
                                                </div>
                                                
                                                {sectionCopy.readLabel && (
                                                    <span 
                                                        className="inline-flex items-center gap-2 font-semibold transition-all group-hover:gap-3"
                                                        style={{ color: colors.primary }}
                                                    >
                                                        {sectionCopy.readLabel}
                                                        <FaArrowRight className="text-sm" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        )}

                        {/* Blog Posts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {displayPosts.slice(1, 4).map((post, idx) => (
                                <ScrollReveal key={post.id || idx} animation="fadeUp" delay={(idx + 1) * 100}>
                                    <div 
                                        className="group h-full rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-3"
                                        onClick={() => navigate(`/blog/${post.id}`)}
                                        style={{
                                            background: isDark 
                                                ? 'rgba(30,41,59,0.6)'
                                                : 'rgba(255,255,255,0.8)',
                                            backdropFilter: 'blur(20px)',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                            boxShadow: isDark 
                                                ? '0 20px 40px rgba(0,0,0,0.3)'
                                                : '0 20px 40px rgba(0,0,0,0.08)'
                                        }}
                                    >
                                        {/* Image */}
                                        <div className="relative h-48 overflow-hidden">
                                            <div 
                                                className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary}60 0%, ${colors.secondary}60 100%)`
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <FaBookOpen className="text-white/30 text-4xl" />
                                            </div>
                                            
                                            {/* Category Badge */}
                                            <div 
                                                className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                                                style={{
                                                    background: 'rgba(0,0,0,0.5)',
                                                    backdropFilter: 'blur(10px)'
                                                }}
                                            >
                                                {getCategory(post)}
                                            </div>
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="p-6">
                                            <div 
                                                className="flex items-center gap-4 text-xs mb-3"
                                                style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                                            >
                                                <span className="flex items-center gap-1">
                                                    <FaCalendarAlt />
                                                    {getDate(post)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FaClock />
                                                    {getReadTime(post)}
                                                </span>
                                            </div>
                                            
                                            <h3 
                                                className="text-lg font-bold mb-3 line-clamp-2 transition-colors"
                                                style={{ color: isDark ? '#fff' : '#1e293b' }}
                                            >
                                                {post.title}
                                            </h3>
                                            
                                            <p 
                                                className="text-sm mb-4 line-clamp-2"
                                                style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                            >
                                                {getExcerpt(post)}
                                            </p>
                                            
                                            {/* Author & Read More */}
                                            <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                                        }}
                                                    >
                                                        {getAuthorInitial(post)}
                                                    </div>
                                                    <span 
                                                        className="text-xs font-medium"
                                                        style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                                                    >
                                                        {getAuthorName(post)}
                                                    </span>
                                                </div>
                                                
                                                {sectionCopy.readLabel && (
                                                    <span 
                                                        className="inline-flex items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2"
                                                        style={{ color: colors.primary }}
                                                    >
                                                        {sectionCopy.readLabel}
                                                        <FaArrowRight className="text-xs" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>

                        {/* View All Button */}
                        {sectionCopy.ctaLabel && (
                            <ScrollReveal animation="fadeUp" delay={400}>
                                <div className="text-center mt-16">
                                    <Link 
                                        to="/blog"
                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:-translate-y-1 text-white"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                            boxShadow: `0 20px 40px ${colors.primary}40`
                                        }}
                                    >
                                        {sectionCopy.ctaLabel}
                                        <FaArrowRight />
                                    </Link>
                                </div>
                            </ScrollReveal>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default Blog;
