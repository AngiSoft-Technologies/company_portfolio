import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { 
    FaArrowLeft, FaExternalLinkAlt, FaGithub, FaChevronLeft, FaChevronRight,
    FaCode, FaCalendarAlt, FaRocket, FaArrowRight, FaEye
} from 'react-icons/fa';

const placeholderImg = '/images/placeholder.jpg';

const ProjectDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [project, setProject] = useState(null);
    const [relatedProjects, setRelatedProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImage, setCurrentImage] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const data = await apiGet(`/projects/${id}`);
                setProject(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchRelatedProjects = async () => {
            try {
                const data = await apiGet('/projects');
                const published = Array.isArray(data) ? data.filter(p => p.published !== false && p.id !== id) : [];
                setRelatedProjects(published.slice(0, 3));
            } catch (err) {
                console.error('Error fetching related projects:', err);
            }
        };

        if (id) {
            fetchProjectDetails();
            fetchRelatedProjects();
        }
    }, [id]);

    const allImages = project?.images?.length > 0 
        ? project.images 
        : project?.image 
            ? [project.image] 
            : [placeholderImg];

    const nextImage = () => {
        setCurrentImage((prev) => (prev + 1) % allImages.length);
    };

    const prevImage = () => {
        setCurrentImage((prev) => (prev - 1 + allImages.length) % allImages.length);
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

    if (error || !project) {
        return (
            <div 
                style={{ backgroundColor: colors.background, color: colors.text }} 
                className="min-h-screen flex items-center justify-center p-8"
            >
                <GlassmorphismCard className="p-12 text-center max-w-lg">
                    <div className="text-6xl mb-6">⚠️</div>
                    <h2 
                        className="text-2xl font-bold mb-4"
                        style={{ color: colors.text }}
                    >
                        {error || 'Project not found'}
                    </h2>
                    <button
                        onClick={() => navigate('/projects')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                            color: 'white'
                        }}
                    >
                        <FaArrowLeft />
                        Back to Projects
                    </button>
                </GlassmorphismCard>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Lightbox */}
            {lightboxOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 text-white text-2xl hover:opacity-70"
                    >
                        ✕
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                    >
                        <FaChevronLeft />
                    </button>
                    <img
                        src={allImages[currentImage]}
                        alt={`${project.title} - Image ${currentImage + 1}`}
                        className="max-w-full max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            {/* Hero Section */}
            <ParallaxSection
                speed={0.3}
                className="relative py-24 overflow-hidden"
            >
                {/* Background */}
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
                            onClick={() => navigate('/projects')}
                            className="inline-flex items-center gap-2 mb-8 text-sm font-medium transition-colors hover:opacity-80"
                            style={{ color: colors.primary }}
                        >
                            <FaArrowLeft />
                            Back to Projects
                        </button>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Image Gallery */}
                        <ScrollReveal animation="fadeUp">
                            <div className="relative">
                                {/* Main Image */}
                                <div 
                                    className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl cursor-pointer group"
                                    onClick={() => setLightboxOpen(true)}
                                >
                                    <img
                                        src={allImages[currentImage]}
                                        alt={project.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    
                                    {/* Hover overlay */}
                                    <div 
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                                            <FaEye style={{ color: colors.primary }} className="text-2xl" />
                                        </div>
                                    </div>
                                    
                                    {/* Navigation arrows */}
                                    {allImages.length > 1 && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center transition-all hover:scale-110"
                                                style={{ color: colors.primaryDark }}
                                            >
                                                <FaChevronLeft />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center transition-all hover:scale-110"
                                                style={{ color: colors.primaryDark }}
                                            >
                                                <FaChevronRight />
                                            </button>
                                        </>
                                    )}

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
                                </div>

                                {/* Thumbnail Gallery */}
                                {allImages.length > 1 && (
                                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                                        {allImages.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentImage(idx)}
                                                className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all"
                                                style={{
                                                    border: currentImage === idx 
                                                        ? `3px solid ${colors.primary}` 
                                                        : '3px solid transparent',
                                                    opacity: currentImage === idx ? 1 : 0.6
                                                }}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`Thumbnail ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollReveal>

                        {/* Content */}
                        <div>
                            <ScrollReveal animation="fadeUp" delay={100}>
                                <h1 
                                    className="text-4xl md:text-5xl font-bold mb-4"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    {project.title}
                                </h1>
                            </ScrollReveal>

                            {project.createdAt && (
                                <ScrollReveal animation="fadeUp" delay={150}>
                                    <div 
                                        className="flex items-center gap-2 mb-6"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        <FaCalendarAlt />
                                        <span>{new Date(project.createdAt).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'long' 
                                        })}</span>
                                    </div>
                                </ScrollReveal>
                            )}

                            {/* Tech Stack */}
                            {project.techStack && project.techStack.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={200}>
                                    <div className="mb-6">
                                        <h3 
                                            className="text-sm font-semibold mb-3"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            TECH STACK
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {project.techStack.map((tech, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 rounded-full text-sm font-medium"
                                                    style={{
                                                        backgroundColor: `${colors.primary}20`,
                                                        color: colors.primary
                                                    }}
                                                >
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollReveal>
                            )}

                            {/* Action Buttons */}
                            <ScrollReveal animation="fadeUp" delay={250}>
                                <div className="flex flex-wrap gap-4 mb-8">
                                    {project.demoUrl && (
                                        <a
                                            href={project.demoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                                color: 'white'
                                            }}
                                        >
                                            <FaExternalLinkAlt />
                                            Live Demo
                                        </a>
                                    )}
                                    {project.repoUrl && (
                                        <a
                                            href={project.repoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                            style={{
                                                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                                color: colors.text,
                                                border: `2px solid ${colors.primary}`
                                            }}
                                        >
                                            <FaGithub />
                                            View Code
                                        </a>
                                    )}
                                </div>
                            </ScrollReveal>

                            {/* Description Card */}
                            <ScrollReveal animation="fadeUp" delay={300}>
                                <GlassmorphismCard className="p-6">
                                    <h3 
                                        className="text-lg font-bold mb-4"
                                        style={{ color: colors.text }}
                                    >
                                        Project Overview
                                    </h3>
                                    <p 
                                        className="leading-relaxed whitespace-pre-line"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        {project.description}
                                    </p>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        </div>
                    </div>
                </div>
            </ParallaxSection>

            {/* CTA Section */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div 
                            className="rounded-3xl p-12 text-center"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                            }}
                        >
                            <FaRocket className="text-4xl text-white/50 mx-auto mb-6" />
                            <h2 className="text-3xl font-bold text-white mb-4">
                                Want Something Similar?
                            </h2>
                            <p className="text-white/80 mb-8 max-w-xl mx-auto">
                                Let's build your dream project together. Our team is ready to bring your ideas to life.
                            </p>
                            <button
                                onClick={() => navigate('/book')}
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105"
                                style={{
                                    backgroundColor: 'white',
                                    color: colors.primaryDark
                                }}
                            >
                                <FaRocket />
                                Start Your Project
                            </button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Related Projects */}
            {relatedProjects.length > 0 && (
                <section 
                    className="py-20 px-4"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}05 0%, ${colors.secondary}05 100%)`
                    }}
                >
                    <div className="max-w-7xl mx-auto">
                        <ScrollReveal animation="fadeUp">
                            <div className="flex items-center justify-between mb-12">
                                <h2 
                                    className="text-3xl font-bold"
                                    style={{ color: colors.text }}
                                >
                                    Related Projects
                                </h2>
                                <button
                                    onClick={() => navigate('/projects')}
                                    className="flex items-center gap-2 font-semibold transition-colors hover:opacity-80"
                                    style={{ color: colors.primary }}
                                >
                                    View All
                                    <FaArrowRight />
                                </button>
                            </div>
                        </ScrollReveal>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {relatedProjects.map((proj, idx) => {
                                const projImage = proj.images?.[0] || proj.image || placeholderImg;
                                return (
                                    <ScrollReveal key={proj.id || proj._id} animation="fadeUp" delay={idx * 100}>
                                        <div 
                                            className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-xl"
                                            style={{
                                                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                                                border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                                            }}
                                            onClick={() => navigate(`/project/${proj.id || proj._id}`)}
                                        >
                                            <div className="relative h-48 overflow-hidden">
                                                <img
                                                    src={projImage}
                                                    alt={proj.title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                            <div className="p-6">
                                                <h3 
                                                    className="text-lg font-bold mb-2 transition-colors group-hover:text-[color:var(--primary)]"
                                                    style={{ color: colors.text, '--primary': colors.primary }}
                                                >
                                                    {proj.title}
                                                </h3>
                                                <p 
                                                    className="text-sm line-clamp-2"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    {proj.description}
                                                </p>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default ProjectDetails;
