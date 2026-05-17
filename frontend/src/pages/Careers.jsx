import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiGet } from '../js/httpClient';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import {
    FaBriefcase, FaUsers, FaRocket, FaGraduationCap, FaHeart, FaGlobe,
    FaCode, FaPaintBrush, FaChartLine, FaCogs, FaMapMarkerAlt, FaClock,
    FaMoneyBillWave, FaArrowRight, FaCheckCircle, FaLaptop, FaCoffee,
    FaHandshake, FaLightbulb, FaPlane, FaBook, FaShieldAlt, FaEnvelope
} from 'react-icons/fa';

const staticPositions = [
    {
        id: 1,
        title: 'Senior Full-Stack Developer',
        department: 'Engineering',
        type: 'Full-Time',
        location: 'Nairobi, Kenya (Hybrid)',
        description: 'Join our engineering team to build and scale our SaaS products. You will work with React, Node.js, and PostgreSQL to deliver high-quality features that serve thousands of users.',
        requirements: ['4+ years full-stack experience', 'React & Node.js proficiency', 'PostgreSQL or similar RDBMS', 'REST API design & testing'],
        icon: FaCode
    },
    {
        id: 2,
        title: 'UI/UX Designer',
        department: 'Design',
        type: 'Full-Time',
        location: 'Nairobi, Kenya (Remote OK)',
        description: 'Create intuitive and visually compelling user experiences for our products and client projects. Collaborate closely with developers and product managers.',
        requirements: ['3+ years UI/UX experience', 'Figma proficiency', 'Portfolio of shipped products', 'User research & testing experience'],
        icon: FaPaintBrush
    },
    {
        id: 3,
        title: 'Mobile Developer (Flutter)',
        department: 'Engineering',
        type: 'Full-Time',
        location: 'Nairobi, Kenya (Hybrid)',
        description: 'Build cross-platform mobile applications using Flutter. Work on DukaFlow mobile, KejaLink tenant app, and new product initiatives.',
        requirements: ['2+ years Flutter experience', 'Dart proficiency', 'REST API integration', 'App Store / Play Store publishing'],
        icon: FaLaptop
    },
    {
        id: 4,
        title: 'Data Analyst',
        department: 'Data & Analytics',
        type: 'Full-Time',
        location: 'Nairobi, Kenya (On-site)',
        description: 'Transform raw data into actionable insights for our clients and internal teams. Build dashboards, generate reports, and support data-driven decision making.',
        requirements: ['2+ years data analysis experience', 'Python / Excel / SQL proficiency', 'Dashboard & visualization tools', 'Strong communication skills'],
        icon: FaChartLine
    }
];

const benefits = [
    {
        icon: FaMoneyBillWave,
        title: 'Competitive Salary',
        description: 'Market-competitive compensation reviewed regularly to reward your contributions.'
    },
    {
        icon: FaLaptop,
        title: 'Flexible Work',
        description: 'Hybrid and remote options available. We focus on results, not hours at a desk.'
    },
    {
        icon: FaGraduationCap,
        title: 'Learning & Growth',
        description: 'Annual training budget, conference attendance, and continuous learning support.'
    },
    {
        icon: FaShieldAlt,
        title: 'Health Coverage',
        description: 'Comprehensive health insurance for you and your dependents.'
    },
    {
        icon: FaPlane,
        title: 'Paid Time Off',
        description: 'Generous vacation policy, public holidays, and personal days to recharge.'
    },
    {
        icon: FaCoffee,
        title: 'Great Environment',
        description: 'Modern office with snacks, team events, and a collaborative culture.'
    },
    {
        icon: FaLightbulb,
        title: 'Innovation Time',
        description: 'Dedicated time for personal projects, experimentation, and skill development.'
    },
    {
        icon: FaHandshake,
        title: 'Team Culture',
        description: 'Inclusive, supportive team that values diversity, transparency, and mutual respect.'
    }
];

const cultureItems = [
    {
        icon: FaRocket,
        title: 'Innovation-Driven',
        description: 'We encourage experimentation and creative problem-solving. Your ideas matter here.'
    },
    {
        icon: FaUsers,
        title: 'Collaborative Spirit',
        description: 'Work alongside talented engineers, designers, and strategists who support each other.'
    },
    {
        icon: FaGlobe,
        title: 'Impact-Focused',
        description: 'Build products that make a real difference for businesses and communities across Africa.'
    },
    {
        icon: FaBook,
        title: 'Always Learning',
        description: 'We invest in your growth with mentorship, training, and opportunities to tackle new challenges.'
    }
];

const Careers = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredCard, setHoveredCard] = useState(null);

    useEffect(() => {
        const fetchCareers = async () => {
            try {
                const data = await apiGet('/site/careers');
                if (Array.isArray(data) && data.length > 0) {
                    setPositions(data);
                } else {
                    setPositions(staticPositions);
                }
            } catch (err) {
                setPositions(staticPositions);
            } finally {
                setLoading(false);
            }
        };
        fetchCareers();
    }, []);

    const displayPositions = positions.length > 0 ? positions : staticPositions;

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section */}
            <ParallaxSection speed={0.3} className="relative py-32 overflow-hidden">
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}15 50%, ${colors.accent}15 100%)`
                    }}
                />
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div
                        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{
                            background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                            top: '10%',
                            left: '5%'
                        }}
                    />
                    <div
                        className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{
                            background: `radial-gradient(circle, ${colors.accent}, transparent)`,
                            bottom: '10%',
                            right: '10%',
                            animationDelay: '1.5s'
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
                            <FaBriefcase className="inline mr-2" />
                            Careers at AngiSoft
                        </span>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span style={{ color: colors.text }}>Build the </span>
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Future
                            </span>
                            <span style={{ color: colors.text }}> With Us</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p
                            className="text-xl md:text-2xl max-w-3xl mx-auto mb-12"
                            style={{ color: colors.textSecondary }}
                        >
                            Join a team of passionate technologists building innovative solutions that empower businesses across Africa. We're looking for talented people who share our vision.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={300}>
                        <div className="flex flex-wrap justify-center gap-8">
                            {[
                                { value: '15+', label: 'Team Members' },
                                { value: '4', label: 'Open Positions' },
                                { value: '3+', label: 'Departments' },
                                { value: '100%', label: 'Growth Mindset' }
                            ].map((stat, idx) => (
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
                                        {stat.value}
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

            {/* Culture Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <span
                                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4"
                                style={{ color: colors.primary }}
                            >
                                <FaHeart className="inline" />
                                Our Culture
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>Why You'll Love </span>
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Working Here
                                </span>
                            </h2>
                            <p
                                className="text-xl max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                We've built a culture where innovation thrives, people grow, and every contribution makes an impact
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {cultureItems.map((item, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 100}>
                                <GlassmorphismCard className="p-8 text-center h-full">
                                    <div
                                        className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`
                                        }}
                                    >
                                        <item.icon
                                            className="text-2xl"
                                            style={{ color: colors.primary }}
                                        />
                                    </div>
                                    <h3
                                        className="text-xl font-bold mb-3"
                                        style={{ color: colors.text }}
                                    >
                                        {item.title}
                                    </h3>
                                    <p style={{ color: colors.textSecondary }}>
                                        {item.description}
                                    </p>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Open Positions */}
            <section
                className="py-20 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}08 100%)`
                }}
            >
                <div className="max-w-5xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <span
                                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4"
                                style={{ color: colors.primary }}
                            >
                                <FaBriefcase className="inline" />
                                Open Roles
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>Current </span>
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Openings
                                </span>
                            </h2>
                            <p
                                className="text-xl max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                Find your next opportunity and help us build products that matter
                            </p>
                        </div>
                    </ScrollReveal>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div
                                className="w-16 h-16 border-4 rounded-full animate-spin"
                                style={{
                                    borderColor: `${colors.primary}30`,
                                    borderTopColor: colors.primary
                                }}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {displayPositions.map((position, idx) => {
                                const PositionIcon = position.icon || FaBriefcase;
                                return (
                                    <ScrollReveal key={position.id || idx} animation="fadeUp" delay={idx * 100}>
                                        <div
                                            className="group rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer"
                                            style={{
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                                transform: hoveredCard === idx ? 'translateY(-4px)' : 'translateY(0)',
                                                boxShadow: hoveredCard === idx
                                                    ? `0 20px 40px -12px ${colors.primary}25`
                                                    : '0 4px 6px -1px rgba(0,0,0,0.05)'
                                            }}
                                            onMouseEnter={() => setHoveredCard(idx)}
                                            onMouseLeave={() => setHoveredCard(null)}
                                        >
                                            <div className="p-6 md:p-8">
                                                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                                                    <div
                                                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                            transform: hoveredCard === idx ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
                                                        }}
                                                    >
                                                        <PositionIcon className="text-xl text-white" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                                            <h3
                                                                className="text-xl font-bold transition-colors duration-300"
                                                                style={{
                                                                    color: hoveredCard === idx ? colors.primary : colors.text
                                                                }}
                                                            >
                                                                {position.title}
                                                            </h3>
                                                            <span
                                                                className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                                                                style={{
                                                                    backgroundColor: `${colors.success}20`,
                                                                    color: colors.success
                                                                }}
                                                            >
                                                                {position.type || 'Full-Time'}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-wrap gap-4 mb-4">
                                                            <span
                                                                className="flex items-center gap-1.5 text-sm"
                                                                style={{ color: colors.textSecondary }}
                                                            >
                                                                <FaBriefcase style={{ color: colors.primary }} />
                                                                {position.department}
                                                            </span>
                                                            <span
                                                                className="flex items-center gap-1.5 text-sm"
                                                                style={{ color: colors.textSecondary }}
                                                            >
                                                                <FaMapMarkerAlt style={{ color: colors.primary }} />
                                                                {position.location}
                                                            </span>
                                                        </div>

                                                        <p
                                                            className="mb-4"
                                                            style={{ color: colors.textSecondary }}
                                                        >
                                                            {position.description}
                                                        </p>

                                                        {position.requirements && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                                                {position.requirements.map((req, rIdx) => (
                                                                    <div
                                                                        key={rIdx}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        <FaCheckCircle
                                                                            className="text-xs flex-shrink-0"
                                                                            style={{ color: colors.success }}
                                                                        />
                                                                        <span
                                                                            className="text-sm"
                                                                            style={{ color: colors.textSecondary }}
                                                                        >
                                                                            {req}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div
                                                            className="flex items-center gap-2 font-semibold transition-all duration-300"
                                                            style={{
                                                                color: colors.primary,
                                                                transform: hoveredCard === idx ? 'translateX(10px)' : 'translateX(0)'
                                                            }}
                                                        >
                                                            <span>Apply Now</span>
                                                            <FaArrowRight className="transition-transform duration-300" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Benefits & Perks */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <span
                                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4"
                                style={{ color: colors.primary }}
                            >
                                <FaHeart className="inline" />
                                Benefits & Perks
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>What We </span>
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Offer
                                </span>
                            </h2>
                            <p
                                className="text-xl max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                We take care of our team so they can focus on building great things
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {benefits.map((benefit, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 80}>
                                <GlassmorphismCard className="p-6 h-full text-center">
                                    <div
                                        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`
                                        }}
                                    >
                                        <benefit.icon
                                            className="text-xl"
                                            style={{ color: colors.primary }}
                                        />
                                    </div>
                                    <h3
                                        className="text-lg font-bold mb-2"
                                        style={{ color: colors.text }}
                                    >
                                        {benefit.title}
                                    </h3>
                                    <p
                                        className="text-sm"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        {benefit.description}
                                    </p>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Application CTA */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div
                            className="relative rounded-3xl overflow-hidden p-12 text-center"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                            }}
                        >
                            <div className="absolute inset-0 opacity-10">
                                <div
                                    className="absolute top-0 left-0 w-full h-full"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                                        backgroundSize: '30px 30px'
                                    }}
                                />
                            </div>

                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                    Don't See Your Role?
                                </h2>
                                <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                                    We're always looking for talented individuals. Send us your resume and tell us how you can contribute to the AngiSoft team.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <a
                                        href="mailto:careers@angisoft.co.ke"
                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                        style={{
                                            backgroundColor: 'white',
                                            color: colors.primaryDark
                                        }}
                                    >
                                        <FaEnvelope />
                                        Send Your Resume
                                    </a>
                                    <button
                                        onClick={() => navigate('/#contact-me')}
                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            color: 'white',
                                            border: '2px solid rgba(255,255,255,0.3)'
                                        }}
                                    >
                                        <FaRocket />
                                        Contact Us
                                    </button>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default Careers;
