import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { 
    FaCode, FaExternalLinkAlt, FaGithub, FaFilter,
    FaLaptopCode, FaRocket, FaEye, FaArrowRight
} from 'react-icons/fa';

const ProjectLists = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [hoveredCard, setHoveredCard] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/projects`);
                const data = await response.json();
                const published = Array.isArray(data) ? data.filter(p => p.published !== false) : [];
                setProjects(published);
                setFilteredProjects(published);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    // Get unique project types/categories
    const categories = ['all', ...new Set(projects.map(p => p.type || 'other').filter(Boolean))];

    const handleFilter = (category) => {
        setActiveFilter(category);
        if (category === 'all') {
            setFilteredProjects(projects);
        } else {
            setFilteredProjects(projects.filter(p => (p.type || 'other') === category));
        }
    };

    const stats = [
        { value: projects.length, label: 'Total Projects' },
        { value: categories.length - 1, label: 'Categories' },
        { value: projects.filter(p => p.featured).length || Math.floor(projects.length / 3), label: 'Featured' },
    ];

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section with Parallax */}
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
                
                {/* Animated shapes */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div 
                        className="absolute w-80 h-80 rounded-full blur-3xl opacity-20"
                        style={{ 
                            background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                            top: '20%',
                            right: '10%',
                            animation: 'pulse 4s ease-in-out infinite'
                        }}
                    />
                    <div 
                        className="absolute w-64 h-64 rounded-full blur-3xl opacity-20"
                        style={{ 
                            background: `radial-gradient(circle, ${colors.secondary}, transparent)`,
                            bottom: '20%',
                            left: '10%',
                            animation: 'pulse 4s ease-in-out infinite 2s'
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
                            <FaLaptopCode className="inline mr-2" />
                            Portfolio
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
                                Projects
                            </span>
                        </h1>
                    </ScrollReveal>
                    
                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p 
                            className="text-xl md:text-2xl max-w-3xl mx-auto mb-12"
                            style={{ color: colors.textSecondary }}
                        >
                            Discover our portfolio of innovative solutions and creative work
                        </p>
                    </ScrollReveal>

                    {/* Stats */}
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
                                        {stat.value}+
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
                </div>
            </ParallaxSection>

            {/* Filter Section */}
            <section className="py-8 px-4 sticky top-0 z-20" style={{ backgroundColor: colors.background }}>
                <div className="max-w-7xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <FaFilter style={{ color: colors.textSecondary }} className="mr-2" />
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => handleFilter(category)}
                                    className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300"
                                    style={{
                                        backgroundColor: activeFilter === category 
                                            ? colors.primary 
                                            : mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        color: activeFilter === category 
                                            ? 'white' 
                                            : colors.text,
                                        transform: activeFilter === category ? 'scale(1.05)' : 'scale(1)'
                                    }}
                                >
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </button>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Projects Grid */}
            <section className="py-12 px-4">
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
                            {filteredProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredProjects.map((project, idx) => {
                                        const mainImage = project.images && project.images.length > 0 
                                            ? project.images[0] 
                                            : (project.image || '/images/placeholder.jpg');
                                        
                                        return (
                                            <ScrollReveal 
                                                key={project.id || project._id} 
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
                                                    onClick={() => navigate(`/projects/${project.id || project._id}`)}
                                                >
                                                    {/* Image Container */}
                                                    <div className="relative h-56 overflow-hidden">
                                                        <img
                                                            src={mainImage}
                                                            alt={project.title}
                                                            className="w-full h-full object-cover transition-transform duration-700"
                                                            style={{
                                                                transform: hoveredCard === idx ? 'scale(1.1)' : 'scale(1)'
                                                            }}
                                                        />
                                                        
                                                        {/* Overlay on hover */}
                                                        <div 
                                                            className="absolute inset-0 flex items-center justify-center gap-4 transition-opacity duration-300"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${colors.primary}90, ${colors.primaryDark}90)`,
                                                                opacity: hoveredCard === idx ? 1 : 0
                                                            }}
                                                        >
                                                            <button 
                                                                className="w-12 h-12 rounded-full bg-white flex items-center justify-center transition-transform duration-300 hover:scale-110"
                                                            >
                                                                <FaEye style={{ color: colors.primary }} className="text-xl" />
                                                            </button>
                                                            {project.demoUrl && (
                                                                <a 
                                                                    href={project.demoUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center transition-transform duration-300 hover:scale-110"
                                                                >
                                                                    <FaExternalLinkAlt style={{ color: colors.primary }} className="text-lg" />
                                                                </a>
                                                            )}
                                                            {project.repoUrl && (
                                                                <a 
                                                                    href={project.repoUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center transition-transform duration-300 hover:scale-110"
                                                                >
                                                                    <FaGithub style={{ color: colors.primary }} className="text-xl" />
                                                                </a>
                                                            )}
                                                        </div>

                                                        {/* Category badge */}
                                                        {project.type && (
                                                            <div 
                                                                className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold"
                                                                style={{ 
                                                                    backgroundColor: colors.primary,
                                                                    color: 'white'
                                                                }}
                                                            >
                                                                {project.type}
                                                            </div>
                                                        )}

                                                        {/* Featured badge */}
                                                        {project.featured && (
                                                            <div 
                                                                className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                                                                style={{ 
                                                                    backgroundColor: colors.secondary,
                                                                    color: 'white'
                                                                }}
                                                            >
                                                                Featured
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div className="p-6">
                                                        <h3 
                                                            className="text-xl font-bold mb-3 transition-colors duration-300"
                                                            style={{ color: hoveredCard === idx ? colors.primary : colors.text }}
                                                        >
                                                            {project.title}
                                                        </h3>
                                                        
                                                        <p 
                                                            className="mb-4 line-clamp-2"
                                                            style={{ color: colors.textSecondary }}
                                                        >
                                                            {project.description}
                                                        </p>
                                                        
                                                        {/* Tech Stack */}
                                                        {project.techStack && project.techStack.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                {project.techStack.slice(0, 3).map((tech, tidx) => (
                                                                    <span
                                                                        key={tidx}
                                                                        className="px-2 py-1 rounded text-xs font-medium"
                                                                        style={{
                                                                            backgroundColor: `${colors.primary}20`,
                                                                            color: colors.primary
                                                                        }}
                                                                    >
                                                                        {tech}
                                                                    </span>
                                                                ))}
                                                                {project.techStack.length > 3 && (
                                                                    <span
                                                                        className="px-2 py-1 rounded text-xs font-medium"
                                                                        style={{
                                                                            backgroundColor: `${colors.secondary}20`,
                                                                            color: colors.secondary
                                                                        }}
                                                                    >
                                                                        +{project.techStack.length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {/* View Details */}
                                                        <div 
                                                            className="flex items-center gap-2 font-semibold transition-all duration-300"
                                                            style={{ 
                                                                color: colors.primary,
                                                                transform: hoveredCard === idx ? 'translateX(10px)' : 'translateX(0)'
                                                            }}
                                                        >
                                                            <span>View Details</span>
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
                                        <FaCode 
                                            className="text-6xl mx-auto mb-4"
                                            style={{ color: colors.textSecondary }}
                                        />
                                        <p style={{ color: colors.textSecondary }}>
                                            No projects found in this category. Try another filter.
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
                        <GlassmorphismCard className="p-12 text-center">
                            <FaRocket 
                                className="text-5xl mx-auto mb-6"
                                style={{ color: colors.primary }}
                            />
                            <h2 
                                className="text-3xl md:text-4xl font-bold mb-6"
                                style={{ color: colors.text }}
                            >
                                Have a Project in Mind?
                            </h2>
                            <p 
                                className="text-xl mb-8 max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                Let's collaborate and build something amazing together. 
                                We turn ideas into reality.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    onClick={() => navigate('/book')}
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                        color: 'white'
                                    }}
                                >
                                    <FaRocket />
                                    Start a Project
                                </button>
                                <button
                                    onClick={() => navigate('/#contact-me')}
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                    style={{
                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        color: colors.text,
                                        border: `2px solid ${colors.primary}`
                                    }}
                                >
                                    Contact Us
                                </button>
                            </div>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default ProjectLists;
