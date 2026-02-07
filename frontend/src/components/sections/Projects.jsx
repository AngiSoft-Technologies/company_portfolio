import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { useSiteCopy } from '../../hooks/useSiteCopy';
import { 
    FaFolder, 
    FaExternalLinkAlt, 
    FaGithub,
    FaArrowRight,
    FaCode,
    FaMobileAlt,
    FaCloud,
    FaShieldAlt,
    FaChartLine,
    FaEye,
    FaCalendarAlt
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard } from '../modern';

const Projects = () => {
    const { colors, mode } = useTheme();
    const { copy: uiCopy } = useSiteCopy();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [hoveredProject, setHoveredProject] = useState(null);
    const isDark = mode === 'dark';
    const sectionCopy = uiCopy?.home?.projects || {};

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await apiGet('/projects');
                const published = Array.isArray(data) ? data.filter(p => p.published !== false) : [];
                setProjects(published);
            } catch (err) {
                setError('No projects available yet.');
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const displayProjects = projects;
    const getProjectCategory = (project) => project.type || project.category || 'Other';
    const formatCategory = (value) => {
        if (!value) return 'Other';
        return value
            .toString()
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (match) => match.toUpperCase());
    };
    const categories = ['all', ...new Set(displayProjects.map(getProjectCategory).filter(Boolean))];
    const filteredProjects = activeFilter === 'all' 
        ? displayProjects 
        : displayProjects.filter(p => getProjectCategory(p) === activeFilter);

    const getCategoryIcon = (category) => {
        const normalized = (category || '').toString().toLowerCase();
        if (normalized.includes('mobile')) return FaMobileAlt;
        if (normalized.includes('security') || normalized.includes('cyber')) return FaShieldAlt;
        if (normalized.includes('data') || normalized.includes('analysis')) return FaChartLine;
        if (normalized.includes('cloud') || normalized.includes('internet')) return FaCloud;
        if (normalized.includes('web') || normalized.includes('software')) return FaCode;
        return FaCode;
    };

    return (
        <section 
            id="projects" 
            className="relative py-28 overflow-hidden"
            style={{
                background: isDark 
                    ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)'
                    : 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 50%, #f1f5f9 100%)'
            }}
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                    className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
                    style={{ 
                        top: '20%', 
                        left: '-15%', 
                        background: `radial-gradient(circle, ${colors.primary}10 0%, transparent 70%)`
                    }}
                />
                <div 
                    className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
                    style={{ 
                        bottom: '10%', 
                        right: '-15%', 
                        background: `radial-gradient(circle, ${colors.secondary}10 0%, transparent 70%)`
                    }}
                />
                
                {/* Floating Shapes */}
                <div 
                    className="absolute w-20 h-20 rounded-2xl rotate-45 animate-pulse"
                    style={{ 
                        top: '15%', 
                        right: '10%', 
                        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 100%)`,
                        animationDuration: '4s'
                    }}
                />
                <div 
                    className="absolute w-16 h-16 rounded-full animate-pulse"
                    style={{ 
                        bottom: '20%', 
                        left: '8%', 
                        background: `linear-gradient(135deg, ${colors.secondary}20 0%, ${colors.primary}10 100%)`,
                        animationDuration: '6s'
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
                                <FaFolder />
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

                {/* Category Filters */}
                <ScrollReveal animation="fadeUp" delay={100}>
                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveFilter(category)}
                                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300"
                                style={{
                                    backgroundColor: activeFilter === category 
                                        ? colors.primary 
                                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    color: activeFilter === category 
                                        ? '#fff' 
                                        : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                                    boxShadow: activeFilter === category 
                                        ? `0 10px 30px ${colors.primary}40` 
                                        : 'none'
                                }}
                            >
                                {category === 'all' ? 'All Projects' : formatCategory(category)}
                            </button>
                        ))}
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
                        {filteredProjects.length === 0 && !error && (
                            <div className="text-center text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                No projects published yet.
                            </div>
                        )}
                        {/* Projects Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
                            {filteredProjects.slice(0, 6).map((project, idx) => {
                                const categoryLabel = getProjectCategory(project);
                                const CategoryIcon = getCategoryIcon(categoryLabel);
                                const projectYear = project.createdAt ? new Date(project.createdAt).getFullYear() : null;
                                const primaryImage = Array.isArray(project.images) && project.images.length > 0 ? project.images[0] : null;
                                const isHovered = hoveredProject === idx;
                                
                                return (
                                    <ScrollReveal key={project.id || idx} animation="scaleUp" delay={idx * 100}>
                                        <div 
                                            className="group relative h-full rounded-3xl overflow-hidden transition-all duration-500"
                                            style={{
                                                background: isDark 
                                                    ? 'rgba(30,41,59,0.6)'
                                                    : 'rgba(255,255,255,0.8)',
                                                backdropFilter: 'blur(20px)',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                                boxShadow: isDark 
                                                    ? '0 20px 40px rgba(0,0,0,0.3)'
                                                    : '0 20px 40px rgba(0,0,0,0.1)'
                                            }}
                                            onMouseEnter={() => setHoveredProject(idx)}
                                            onMouseLeave={() => setHoveredProject(null)}
                                        >
                                            {/* Image Container */}
                                            <div className="relative h-48 overflow-hidden">
                                                {primaryImage ? (
                                                    <img 
                                                        src={primaryImage}
                                                        alt={project.title}
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div 
                                                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${colors.primary}80 0%, ${colors.secondary}80 100%)`
                                                        }}
                                                    />
                                                )}
                                                <div 
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${colors.primary}40 0%, ${colors.secondary}40 100%)`
                                                    }}
                                                />
                                                
                                                {/* Overlay on hover */}
                                                <div 
                                                    className="absolute inset-0 flex items-center justify-center gap-4 transition-opacity duration-300"
                                                    style={{
                                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                                        opacity: isHovered ? 1 : 0
                                                    }}
                                                >
                                                    {project.id && (
                                                        <Link 
                                                            to={`/project/${project.id}`}
                                                            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                                                            style={{
                                                                backgroundColor: colors.primary
                                                            }}
                                                        >
                                                            <FaEye className="text-white" />
                                                        </Link>
                                                    )}
                                                    {project.demoUrl && (
                                                        <a 
                                                            href={project.demoUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur transition-transform hover:scale-110"
                                                        >
                                                            <FaExternalLinkAlt className="text-white" />
                                                        </a>
                                                    )}
                                                    {project.repoUrl && (
                                                        <a 
                                                            href={project.repoUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur transition-transform hover:scale-110"
                                                        >
                                                            <FaGithub className="text-white" />
                                                        </a>
                                                    )}
                                                </div>
                                                
                                                {/* Category Badge */}
                                                <div 
                                                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                                        color: colors.primary
                                                    }}
                                                >
                                                    <CategoryIcon className="text-xs" />
                                                    {formatCategory(categoryLabel)}
                                                </div>
                                                
                                                {/* Featured Badge */}
                                                {project.featured && (
                                                    <div 
                                                        className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                                        }}
                                                    >
                                                        Featured
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="p-5 md:p-6 flex flex-col">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FaCalendarAlt 
                                                        className="text-xs"
                                                        style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
                                                    />
                                                    <span 
                                                        className="text-xs"
                                                        style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
                                                    >
                                                        {projectYear || ''}
                                                    </span>
                                                </div>
                                                
                                                <h3 
                                                    className="text-lg md:text-xl font-bold mb-2 transition-colors group-hover:text-primary line-clamp-1"
                                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                                >
                                                    {project.title}
                                                </h3>
                                                
                                                <p 
                                                    className="text-sm mb-4 line-clamp-2 leading-relaxed"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                                >
                                                    {project.description}
                                                </p>
                                                
                                                {/* Tech Stack */}
                                                <div className="flex flex-wrap gap-1.5 mt-auto">
                                                    {(project.techStack || []).slice(0, 4).map((tech, tIdx) => (
                                                        <span 
                                                            key={tIdx}
                                                            className="px-2 py-1 rounded-full text-xs font-medium"
                                                            style={{
                                                                backgroundColor: `${colors.primary}15`,
                                                                color: colors.primary
                                                            }}
                                                        >
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                );
                            })}
                        </div>

                        {/* View All Button */}
                        {sectionCopy.ctaLabel && (
                            <ScrollReveal animation="fadeUp" delay={400}>
                                <div className="text-center mt-16">
                                    <Link 
                                        to="/projects"
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

export default Projects;
