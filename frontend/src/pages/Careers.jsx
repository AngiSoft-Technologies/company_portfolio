import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiGet } from '../js/httpClient';
import { ScrollReveal, GlassmorphismCard } from '../components/modern';
import {
    FaBriefcase, FaUsers, FaRocket, FaGraduationCap, FaHeart, FaGlobe,
    FaCode, FaPaintBrush, FaChartLine, FaMapMarkerAlt, FaClock,
    FaMoneyBillWave, FaArrowRight, FaCheckCircle, FaLaptop, FaCoffee,
    FaHandshake, FaLightbulb, FaPlane, FaBook, FaShieldAlt, FaEnvelope,
    FaChevronDown, FaChevronUp, FaRegClock, FaRegBuilding
} from 'react-icons/fa';

const fallbackPositions = [
    {
        id: 1, title: 'Senior Full-Stack Developer', department: 'Engineering',
        type: 'Full-Time', location: 'Nairobi, Kenya (Hybrid)',
        description: 'Join our engineering team to build and scale our SaaS products. You will work with React, Node.js, and PostgreSQL to deliver high-quality features.',
        requirements: ['4+ years full-stack experience', 'React & Node.js proficiency', 'PostgreSQL or similar RDBMS', 'REST API design & testing'],
    },
    {
        id: 2, title: 'UI/UX Designer', department: 'Design',
        type: 'Full-Time', location: 'Nairobi, Kenya (Remote OK)',
        description: 'Create intuitive and visually compelling user experiences for our products and client projects.',
        requirements: ['3+ years UI/UX experience', 'Figma proficiency', 'Portfolio of shipped products', 'User research & testing experience'],
    },
    {
        id: 3, title: 'Mobile Developer (Flutter)', department: 'Engineering',
        type: 'Full-Time', location: 'Nairobi, Kenya (Hybrid)',
        description: 'Build cross-platform mobile applications using Flutter. Work on DukaFlow mobile, KejaLink tenant app, and new product initiatives.',
        requirements: ['2+ years Flutter experience', 'Dart proficiency', 'REST API integration', 'App Store / Play Store publishing'],
    },
    {
        id: 4, title: 'Data Analyst', department: 'Data & Analytics',
        type: 'Full-Time', location: 'Nairobi, Kenya (On-site)',
        description: 'Transform raw data into actionable insights for our clients and internal teams.',
        requirements: ['2+ years data analysis experience', 'Python / Excel / SQL proficiency', 'Dashboard & visualization tools', 'Strong communication skills'],
    }
];

const benefits = [
    { icon: FaMoneyBillWave, title: 'Competitive Salary', description: 'Market-competitive compensation reviewed regularly.' },
    { icon: FaLaptop, title: 'Flexible Work', description: 'Hybrid and remote options. Results, not hours.' },
    { icon: FaGraduationCap, title: 'Learning & Growth', description: 'Annual training budget and conference attendance.' },
    { icon: FaShieldAlt, title: 'Health Coverage', description: 'Comprehensive health insurance for you and dependents.' },
    { icon: FaPlane, title: 'Paid Time Off', description: 'Generous vacation, holidays, and personal days.' },
    { icon: FaCoffee, title: 'Great Environment', description: 'Modern office with snacks, team events, and culture.' },
    { icon: FaLightbulb, title: 'Innovation Time', description: 'Dedicated time for personal projects and experimentation.' },
    { icon: FaHandshake, title: 'Team Culture', description: 'Inclusive, supportive, transparent, and diverse.' },
];

const culturePillars = [
    { icon: FaRocket, title: 'Innovation-Driven', description: 'We encourage experimentation and creative problem-solving. Your ideas matter here.' },
    { icon: FaUsers, title: 'Collaborative Spirit', description: 'Work alongside talented engineers, designers, and strategists who support each other.' },
    { icon: FaGlobe, title: 'Impact-Focused', description: 'Build products that make a real difference for businesses and communities across Africa.' },
    { icon: FaBook, title: 'Always Learning', description: 'We invest in your growth with mentorship, training, and new challenges.' },
];

const departmentIcons = {
    'Engineering': FaCode,
    'Design': FaPaintBrush,
    'Data': FaChartLine,
    'default': FaBriefcase,
};

const getDeptIcon = (dept) => {
    if (!dept) return departmentIcons.default;
    for (const [key, icon] of Object.entries(departmentIcons)) {
        if (dept.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return departmentIcons.default;
};

const Careers = () => {
    const navigate = useNavigate();
    const { colors } = useTheme();
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedJob, setExpandedJob] = useState(null);
    const [activeDept, setActiveDept] = useState('All');

    useEffect(() => {
        apiGet('/careers')
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setPositions(data);
                } else {
                    setPositions(fallbackPositions);
                }
            })
            .catch(() => setPositions(fallbackPositions))
            .finally(() => setLoading(false));
    }, []);

    const displayPositions = positions.length > 0 ? positions : fallbackPositions;
    const departments = ['All', ...new Set(displayPositions.map(p => p.department).filter(Boolean))];
    const filteredPositions = activeDept === 'All'
        ? displayPositions
        : displayPositions.filter(p => p.department === activeDept);

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">

            {/* ── Cinematic Hero ── */}
            <section className="relative py-32 md:py-40 overflow-hidden">
                {/* Ambient glow orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute w-[600px] h-[600px] rounded-full blur-[160px] opacity-[0.07]"
                        style={{ background: colors.primary, top: '-20%', left: '-10%' }} />
                    <div className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.05]"
                        style={{ background: colors.secondary, bottom: '-15%', right: '-5%' }} />
                </div>
                {/* Grid texture */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                    }} />

                <div className="relative z-10 max-w-6xl mx-auto px-4">
                    <ScrollReveal animation="fadeUp">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-[2px]" style={{ background: `linear-gradient(90deg, ${colors.primary}, transparent)` }} />
                            <span className="text-sm font-semibold uppercase tracking-[0.2em]"
                                style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                Join the team
                            </span>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-8"
                            style={{ fontFamily: 'Sora, sans-serif' }}>
                            <span style={{ color: '#fff' }}>Build What </span>
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, #39FF6A)`,
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>Matters</span>
                            <br />
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>With Us</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p className="text-lg md:text-xl max-w-2xl mb-12"
                            style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7 }}>
                            Join a team of passionate technologists building innovative solutions that empower businesses across Africa. We're looking for talented people who share our vision.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={300}>
                        <div className="flex flex-wrap gap-6">
                            {[
                                { value: displayPositions.length, label: 'Open Roles' },
                                { value: departments.length - 1, label: 'Departments' },
                                { value: 'Nairobi', label: 'HQ Location' },
                                { value: '2024', label: 'Founded' },
                            ].map((stat, idx) => (
                                <div key={idx} className="px-6 py-4 rounded-2xl"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        backdropFilter: 'blur(12px)',
                                    }}>
                                    <div className="text-2xl md:text-3xl font-bold mb-1"
                                        style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                        {stat.value}
                                    </div>
                                    <div className="text-xs uppercase tracking-wider"
                                        style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ── Culture Pillars ── */}
            <section className="py-24 px-4 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, transparent, ${colors.primary}06, transparent)` }} />
                <div className="relative z-10 max-w-6xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="mb-16">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                Our Culture
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold"
                                style={{ fontFamily: 'Sora, sans-serif' }}>
                                Why You'll Love{' '}
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>It Here</span>
                            </h2>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {culturePillars.map((item, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 100}>
                                <div className="p-8 rounded-2xl h-full transition-all duration-500 hover:-translate-y-2 group"
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110"
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)` }}>
                                        <item.icon className="text-xl" style={{ color: colors.primary }} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-3"
                                        style={{ fontFamily: 'Sora, sans-serif' }}>{item.title}</h3>
                                    <p className="text-sm leading-relaxed"
                                        style={{ color: 'rgba(255,255,255,0.5)' }}>{item.description}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Open Positions ── */}
            <section className="py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="mb-12">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                Open Roles
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-8"
                                style={{ fontFamily: 'Sora, sans-serif' }}>
                                Current{' '}
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Openings</span>
                            </h2>

                            {/* Department filter tabs */}
                            <div className="flex flex-wrap gap-2">
                                {departments.map((dept) => (
                                    <button key={dept}
                                        onClick={() => setActiveDept(dept)}
                                        className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                                        style={{
                                            background: activeDept === dept
                                                ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                                : 'rgba(255,255,255,0.05)',
                                            color: activeDept === dept ? '#fff' : 'rgba(255,255,255,0.5)',
                                            border: `1px solid ${activeDept === dept ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                                        }}>
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </ScrollReveal>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-12 h-12 border-2 rounded-full animate-spin"
                                style={{ borderColor: `${colors.primary}20`, borderTopColor: colors.primary }} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredPositions.map((position, idx) => {
                                const DeptIcon = getDeptIcon(position.department);
                                const isExpanded = expandedJob === (position.id || idx);
                                return (
                                    <ScrollReveal key={position.id || idx} animation="fadeUp" delay={idx * 60}>
                                        <div className="rounded-2xl overflow-hidden transition-all duration-500"
                                            style={{
                                                background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${isExpanded ? `${colors.primary}30` : 'rgba(255,255,255,0.06)'}`,
                                            }}>
                                            {/* Card header — always visible */}
                                            <button
                                                onClick={() => setExpandedJob(isExpanded ? null : (position.id || idx))}
                                                className="w-full text-left p-6 md:p-8 flex items-center gap-6 group">
                                                <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                                                    style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                                                    <DeptIcon className="text-lg text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg md:text-xl font-bold mb-1 transition-colors duration-300 group-hover:text-[var(--primary)]"
                                                        style={{ fontFamily: 'Sora, sans-serif' }}>
                                                        {position.title}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                                        <span className="flex items-center gap-1.5">
                                                            <FaRegBuilding className="text-xs" style={{ color: colors.primary }} />
                                                            {position.department}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <FaMapMarkerAlt className="text-xs" style={{ color: colors.primary }} />
                                                            {position.location}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <FaRegClock className="text-xs" style={{ color: colors.primary }} />
                                                            {position.type || 'Full-Time'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                                                    style={{ background: isExpanded ? `${colors.primary}15` : 'rgba(255,255,255,0.05)' }}>
                                                    {isExpanded ? <FaChevronUp style={{ color: colors.primary }} /> : <FaChevronDown style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                                </div>
                                            </button>

                                            {/* Expandable detail */}
                                            <div className="overflow-hidden transition-all duration-500"
                                                style={{ maxHeight: isExpanded ? '600px' : '0', opacity: isExpanded ? 1 : 0 }}>
                                                <div className="px-6 md:px-8 pb-8 pt-0">
                                                    <div className="border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                        <p className="mb-6 leading-relaxed"
                                                            style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans, sans-serif' }}>
                                                            {position.description}
                                                        </p>

                                                        {position.requirements && position.requirements.length > 0 && (
                                                            <div className="mb-6">
                                                                <h4 className="text-sm font-semibold uppercase tracking-wider mb-3"
                                                                    style={{ color: colors.primary }}>Requirements</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {position.requirements.map((req, rIdx) => (
                                                                        <div key={rIdx} className="flex items-start gap-2">
                                                                            <FaCheckCircle className="text-xs mt-1 flex-shrink-0" style={{ color: colors.success }} />
                                                                            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{req}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {position.salaryRange && (
                                                            <div className="mb-6 flex items-center gap-2">
                                                                <FaMoneyBillWave style={{ color: colors.primary }} />
                                                                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                                    {position.salaryRange}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <a href={`mailto:careers@angisoft.co.ke?subject=Application: ${position.title}`}
                                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                                color: '#fff',
                                                            }}>
                                                            Apply Now <FaArrowRight />
                                                        </a>
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

            {/* ── Benefits ── */}
            <section className="py-24 px-4 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, transparent, ${colors.secondary}05, transparent)` }} />
                <div className="relative z-10 max-w-6xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="mb-16">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                Benefits & Perks
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold"
                                style={{ fontFamily: 'Sora, sans-serif' }}>
                                What We{' '}
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Offer</span>
                            </h2>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {benefits.map((b, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 60}>
                                <div className="p-6 rounded-2xl h-full transition-all duration-500 hover:-translate-y-1 group"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                    <b.icon className="text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                                        style={{ color: colors.primary }} />
                                    <h3 className="text-base font-bold mb-2"
                                        style={{ fontFamily: 'Sora, sans-serif' }}>{b.title}</h3>
                                    <p className="text-sm leading-relaxed"
                                        style={{ color: 'rgba(255,255,255,0.45)' }}>{b.description}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center"
                            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}>
                            {/* Dot pattern */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }} />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4"
                                    style={{ fontFamily: 'Sora, sans-serif' }}>
                                    Don't See Your Role?
                                </h2>
                                <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto"
                                    style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    We're always looking for talented individuals. Send your resume and tell us how you can contribute.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <a href="mailto:careers@angisoft.co.ke"
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105"
                                        style={{ backgroundColor: '#fff', color: colors.primaryDark }}>
                                        <FaEnvelope /> Send Your Resume
                                    </a>
                                    <button onClick={() => navigate('/#contact-me')}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                                        <FaRocket /> Contact Us
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
