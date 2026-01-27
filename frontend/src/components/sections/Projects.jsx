import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
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
    FaCalendarAlt,
    FaTag
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard } from '../modern';

const Projects = () => {
    const { colors, mode } = useTheme();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [hoveredProject, setHoveredProject] = useState(null);
    const isDark = mode === 'dark';

    const defaultProjects = [
        {
            id: 1,
            title: 'PayQuick Mobile Banking',
            description: 'A comprehensive mobile banking solution for a leading Kenyan fintech, featuring real-time transactions, biometric authentication, and M-Pesa integration.',
            category: 'Mobile App',
            technologies: ['Flutter', 'Node.js', 'PostgreSQL', 'AWS'],
            image: '/images/projects/banking-app.jpg',
            liveLink: '#',
            githubLink: '#',
            featured: true,
            year: '2024'
        },
        {
            id: 2,
            title: 'LogiTrack Fleet Management',
            description: 'Real-time fleet tracking and management system for logistics companies with GPS tracking, route optimization, and driver performance analytics.',
            category: 'Web App',
            technologies: ['React', 'Express', 'MongoDB', 'Google Maps API'],
            image: '/images/projects/fleet-management.jpg',
            liveLink: '#',
            githubLink: '#',
            featured: true,
            year: '2024'
        },
        {
            id: 3,
            title: 'SecureVault Enterprise',
            description: 'Enterprise-grade cybersecurity solution with threat detection, automated response, and compliance reporting for financial institutions.',
            category: 'Security',
            technologies: ['Python', 'TensorFlow', 'Kubernetes', 'Azure'],
            image: '/images/projects/security-platform.jpg',
            liveLink: '#',
            githubLink: '#',
            featured: true,
            year: '2023'
        },
        {
            id: 4,
            title: 'HealthConnect Telemedicine',
            description: 'HIPAA-compliant telemedicine platform enabling remote consultations, prescription management, and health record integration.',
            category: 'Web App',
            technologies: ['Next.js', 'GraphQL', 'WebRTC', 'AWS'],
            image: '/images/projects/telemedicine.jpg',
            liveLink: '#',
            githubLink: '#',
            featured: false,
            year: '2023'
        },
        {
            id: 5,
            title: 'AgriSmart IoT Platform',
            description: 'Smart agriculture platform with IoT sensor integration, weather forecasting, and AI-powered crop recommendations for farmers.',
            category: 'IoT',
            technologies: ['React', 'Python', 'MQTT', 'TensorFlow'],
            image: '/images/projects/agriculture-iot.jpg',
            liveLink: '#',
            githubLink: '#',
            featured: false,
            year: '2023'
        },
        {
            id: 6,
            title: 'EduLearn LMS',
            description: 'Modern learning management system with video conferencing, interactive assessments, and progress tracking for educational institutions.',
            category: 'Web App',
            technologies: ['Vue.js', 'Laravel', 'MySQL', 'WebRTC'],
            image: '/images/projects/lms.jpg',
            liveLink: '#',
            githubLink: '#',
            featured: false,
            year: '2022'
        }
    ];

    const categories = ['all', 'Web App', 'Mobile App', 'Security', 'IoT'];

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await apiGet('/projects');
                const published = Array.isArray(data) ? data.filter(p => p.published !== false) : [];
                setProjects(published.length > 0 ? published : defaultProjects);
            } catch (err) {
                setProjects(defaultProjects);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const displayProjects = projects.length > 0 ? projects : defaultProjects;
    const filteredProjects = activeFilter === 'all' 
        ? displayProjects 
        : displayProjects.filter(p => p.category === activeFilter);

    const getCategoryIcon = (category) => {
        switch(category) {
            case 'Mobile App': return FaMobileAlt;
            case 'Security': return FaShieldAlt;
            case 'IoT': return FaChartLine;
            case 'Cloud': return FaCloud;
            default: return FaCode;
        }
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
                        <div 
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6"
                            style={{
                                backgroundColor: `${colors.primary}15`,
                                color: colors.primary
                            }}
                        >
                            <FaFolder />
                            Our Portfolio
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
                            Featured Projects
                        </h2>
                        <p 
                            className="text-lg md:text-xl max-w-3xl mx-auto"
                            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                        >
                            Explore our latest work and see how we help businesses achieve their digital goals
                        </p>
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
                                {category === 'all' ? 'All Projects' : category}
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
                        {/* Projects Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
                            {filteredProjects.slice(0, 6).map((project, idx) => {
                                const CategoryIcon = getCategoryIcon(project.category);
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
                                                <div 
                                                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${colors.primary}80 0%, ${colors.secondary}80 100%)`
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
                                                    <a 
                                                        href={project.liveLink || '#'}
                                                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                                                        style={{
                                                            backgroundColor: colors.primary
                                                        }}
                                                    >
                                                        <FaEye className="text-white" />
                                                    </a>
                                                    <a 
                                                        href={project.githubLink || '#'}
                                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur transition-transform hover:scale-110"
                                                    >
                                                        <FaGithub className="text-white" />
                                                    </a>
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
                                                    {project.category}
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
                                                        {project.year || '2024'}
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
                                                    {(project.technologies || []).slice(0, 4).map((tech, tIdx) => (
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
                                    View All Projects
                                    <FaArrowRight />
                                </Link>
                            </div>
                        </ScrollReveal>
                    </>
                )}
            </div>
        </section>
    );
};

export default Projects;
