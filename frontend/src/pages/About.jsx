import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard } from '../components/modern';
import { apiGet } from '../js/httpClient';
import { resolveAssetUrl } from '../utils/constants';
import { getStaffDetailPath } from '../utils/detailPaths';
import {
    FaLightbulb, FaEye, FaHeart, FaHistory, FaUsers,
    FaRocket, FaCheckCircle, FaHandshake, FaAward, FaGlobe,
    FaArrowRight, FaEnvelope, FaCogs, FaShieldAlt, FaChartLine, FaCode,
    FaMapMarkerAlt, FaLinkedin, FaQuoteLeft, FaPlay, FaChevronRight,
    FaMobile, FaPaintBrush, FaDatabase, FaCloud, FaLock, FaBolt,
    FaPython, FaReact, FaNodeJs, FaDocker
} from 'react-icons/fa';

/* ───────── Icon registry for CMS values ───────── */
const iconRegistry = {
    FaLightbulb, FaEye, FaHeart, FaHistory, FaUsers,
    FaRocket, FaCheckCircle, FaHandshake, FaAward, FaGlobe,
    FaArrowRight, FaEnvelope, FaCogs, FaShieldAlt, FaChartLine, FaCode,
};
const resolveIcon = (name) => iconRegistry[name] || FaLightbulb;

/* ───────── Fallback data ───────── */
const fallbackTimeline = [
    { year: 'Dec 2024', title: 'Official Beginning', description: 'AngiSoft officially began with Prof Angera as the only developer and operator, solving practical everyday technical problems for students, businesses, creators, and local communities.' },
    { year: 'Foundation', title: 'Practical Technical Work', description: 'Early work included debugging student projects, coding school projects, teaching beginners programming, editing documents, KRA/SHA support, installations, graphics, data analysis, and networking.' },
    { year: 'Evolution', title: 'From Services to Platforms', description: 'The vision expanded from local technical support into scalable platforms, software products, automation, cloud systems, AI, and digital ecosystems.' },
    { year: 'Today', title: 'African Technology Ecosystem', description: 'AngiSoft is growing into a software engineering company, digital innovation brand, SaaS/product company, and future-focused African technology brand.' },
];

const fallbackValues = [
    { icon: 'FaLightbulb', title: 'Innovation', description: 'We embrace cutting-edge technologies and creative problem-solving to build solutions that set new industry standards.' },
    { icon: 'FaHandshake', title: 'Integrity', description: 'We conduct business with honesty, transparency, and respect for every client, partner, and team member.' },
    { icon: 'FaAward', title: 'Excellence', description: 'We are committed to delivering the highest quality in every line of code, every design, and every interaction.' },
    { icon: 'FaUsers', title: 'Collaboration', description: 'We believe in the power of teamwork, working closely with clients to transform their vision into reality.' },
    { icon: 'FaShieldAlt', title: 'Reliability', description: 'Our solutions are built to last, with robust architectures, thorough testing, and dedicated ongoing support.' },
    { icon: 'FaGlobe', title: 'Impact', description: 'We measure success by the positive impact our technology creates for businesses and communities across Africa.' },
];

/* ───────── Tab data ───────── */
const companyTabs = [
    {
        id: 'who',
        label: 'Who We Are',
        content: 'AngiSoft Technologies is a Nairobi-based software company founded in December 2024. We started with practical technical work — debugging student projects, building school systems, teaching programming, and supporting local businesses with digital solutions. That hands-on foundation shaped who we are today: an evolving African technology ecosystem driven by real-world problem solving.',
        highlights: ['Founded Dec 2024', 'Nairobi, Kenya', 'African-First Focus'],
    },
    {
        id: 'what',
        label: 'What We Do',
        content: 'We deliver end-to-end digital solutions: custom software development (mobile and web), data analytics dashboards, cyber services (document editing, KRA/SHA applications), product development (DukaFlow, KejaLink, PetroFlow, AngiTunes), and digital transformation consulting for businesses across East Africa.',
        highlights: ['Custom Software', 'Data Analytics', 'SaaS Products', 'Cyber Services'],
    },
    {
        id: 'how',
        label: 'How We Work',
        content: 'Our philosophy is Innovate → Build → Empower. We identify real problems, engineer practical solutions, and help people grow through technology. Every project follows agile methodology with transparent communication, iterative delivery, and continuous feedback from stakeholders.',
        highlights: ['Agile Methodology', 'Iterative Delivery', 'Client-Centric', 'Quality First'],
    },
];

/* ───────── Services showcase ───────── */
const servicesShowcase = [
    { icon: FaCode, title: 'Custom Software', desc: 'Web & mobile apps tailored to your business logic', color: '#0875FF' },
    { icon: FaMobile, title: 'Mobile Development', desc: 'Flutter cross-platform apps for iOS and Android', color: '#00AFFF' },
    { icon: FaChartLine, title: 'Data Analytics', desc: 'Python/Excel dashboards that drive decisions', color: '#18D8FF' },
    { icon: FaPaintBrush, title: 'UI/UX Design', desc: 'Interfaces that are beautiful and intuitive', color: '#39FF6A' },
    { icon: FaCloud, title: 'Cloud & DevOps', desc: 'Scalable infrastructure and CI/CD pipelines', color: '#0875FF' },
    { icon: FaLock, title: 'Cyber Services', desc: 'Document editing, KRA/SHA, digital applications', color: '#00AFFF' },
];

/* ───────── Tech stack ───────── */
const techStack = [
    { name: 'React', icon: FaReact, color: '#61DAFB' },
    { name: 'Node.js', icon: FaNodeJs, color: '#339933' },
    { name: 'Flutter', icon: FaCode, color: '#02569B' },
    { name: 'Python', icon: FaPython, color: '#3776AB' },
    { name: 'PostgreSQL', icon: FaDatabase, color: '#4169E1' },
    { name: 'TypeScript', icon: FaCode, color: '#3178C6' },
    { name: 'Tailwind', icon: FaPaintBrush, color: '#06B6D4' },
    { name: 'Docker', icon: FaDocker, color: '#2496ED' },
];

/* ───────── Hardcoded dark theme fallback ───────── */
const DARK_BG = '#07142B';
const DARK_SURFACE = '#0B1E3D';
const BLUE_PRIMARY = '#0875FF';
const BLUE_SECONDARY = '#00AFFF';
const CYAN_ACCENT = '#18D8FF';
const GREEN = '#39FF6A';

const About = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const colors = theme?.colors || {};
    const [about, setAbout] = useState(null);
    const [staff, setStaff] = useState([]);
    const [activeTab, setActiveTab] = useState('who');

    /* Resolve colors with hardcoded fallbacks so the page never renders white */
    const bg          = colors.background       || DARK_BG;
    const text        = colors.text             || '#F5F7FA';
    const primary     = colors.primary          || BLUE_PRIMARY;
    const secondary   = colors.secondary        || BLUE_SECONDARY;
    const primaryDark = colors.primaryDark      || '#003BCE';

    useEffect(() => {
        apiGet('/site/about').then(setAbout).catch(() => {});
        apiGet('/staff').then((data) => { if (Array.isArray(data)) setStaff(data); }).catch(() => {});
    }, []);

    const teamCount = staff.length > 0 ? staff.length : null; // null = API hasn't responded yet

    const descriptions = about?.description || [];
    const values = (about?.values || fallbackValues).map((v) => ({
        ...v,
        icon: typeof v.icon === 'string' ? resolveIcon(v.icon) : v.icon,
    }));
    const timelineItems = about?.timeline || fallbackTimeline;
    const teamPreview = staff.slice(0, 4);
    const activeTabData = companyTabs.find(t => t.id === activeTab);

    return (
        <div style={{ backgroundColor: bg, color: text }} className="min-h-screen">

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 1 — CINEMATIC SPLIT HERO                   ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="relative min-h-[90vh] flex items-center overflow-hidden">
                {/* Ambient glow orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute w-[800px] h-[800px] rounded-full blur-[200px] opacity-[0.07]"
                        style={{ background: primary, top: '-30%', right: '-15%' }} />
                    <div className="absolute w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.05]"
                        style={{ background: secondary, bottom: '-20%', left: '-10%' }} />
                    <div className="absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.04]"
                        style={{ background: '#39FF6A', top: '50%', left: '50%' }} />
                </div>
                {/* Diagonal grid */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${primary} 1px, transparent 1px), linear-gradient(90deg, ${primary} 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                        transform: 'skY(-3deg)',
                    }} />

                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-32">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Text */}
                        <div>
                            <ScrollReveal animation="fadeUp">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
                                    style={{
                                        background: `${primary}10`,
                                        border: `1px solid ${primary}20`,
                                    }}>
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: primary }} />
                                    <span className="text-xs font-semibold uppercase tracking-[0.15em]"
                                        style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                        Est. 2024 · Nairobi, Kenya
                                    </span>
                                </div>
                            </ScrollReveal>

                            <ScrollReveal animation="fadeUp" delay={100}>
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.92] mb-8"
                                    style={{ fontFamily: 'Sora, sans-serif' }}>
                                    <span style={{ color: '#fff' }}>We Don't Just</span><br />
                                    <span style={{ color: '#fff' }}>Write Code.</span><br />
                                    <span style={{
                                        background: `linear-gradient(135deg, ${primary}, #39FF6A)`,
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    }}>We Build Futures.</span>
                                </h1>
                            </ScrollReveal>

                            <ScrollReveal animation="fadeUp" delay={200}>
                                <p className="text-lg max-w-lg mb-10 leading-relaxed"
                                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
                                    {descriptions[0] || 'AngiSoft Technologies is an African software company delivering innovative digital solutions — from custom software and SaaS products to data analytics and cyber services — that empower businesses to grow.'}
                                </p>
                            </ScrollReveal>

                            <ScrollReveal animation="fadeUp" delay={300}>
                                <div className="flex flex-wrap gap-4">
                                    <button onClick={() => navigate('/book')}
                                        className="group inline-flex items-center gap-3 px-7 py-4 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                                        style={{
                                            background: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
                                            color: '#fff', fontFamily: 'Sora, sans-serif',
                                            boxShadow: `0 8px 32px ${primary}30`,
                                        }}>
                                        Start a Project
                                        <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                                    </button>
                                    <button onClick={() => navigate('/services')}
                                        className="inline-flex items-center gap-3 px-7 py-4 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105"
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'rgba(255,255,255,0.8)',
                                            fontFamily: 'Sora, sans-serif',
                                        }}>
                                        Our Services <FaChevronRight className="text-xs" />
                                    </button>
                                </div>
                            </ScrollReveal>
                        </div>

                        {/* Right: Visual — brand image with glow frame */}
                        <ScrollReveal animation="fadeRight" delay={200}>
                            <div className="relative hidden lg:block">
                                {/* Glow frame */}
                                <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
                                    style={{ background: `linear-gradient(135deg, ${primary}40, ${secondary}20)` }} />
                                {/* Image container */}
                                <div className="relative rounded-2xl overflow-hidden"
                                    style={{ border: `1px solid rgba(255,255,255,0.08)` }}>
                                    <img
                                        src="/images/Branding/AngiSoft%20T-Shirts%20Design.png"
                                        alt="AngiSoft Brand"
                                        className="w-full h-auto object-cover"
                                        style={{ maxHeight: '520px' }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/images/Software-Development-Company.jpg';
                                        }}
                                    />
                                    {/* Overlay gradient */}
                                    <div className="absolute inset-0"
                                        style={{ background: 'linear-gradient(to top, rgba(7,20,43,0.6) 0%, transparent 50%)' }} />
                                </div>
                                {/* Floating stat card */}
                                <div className="absolute -bottom-6 -left-6 px-6 py-4 rounded-2xl"
                                    style={{
                                        background: 'rgba(7,20,43,0.9)',
                                        border: `1px solid ${primary}30`,
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
                                    }}>
                                    <div className="text-3xl font-bold" style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                        2024
                                    </div>
                                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Year Founded</div>
                                </div>
                                {/* Floating team card */}
                                {staff.length > 0 && (
                                    <div className="absolute -top-4 -right-4 px-5 py-3 rounded-2xl"
                                        style={{
                                            background: 'rgba(7,20,43,0.9)',
                                            border: `1px solid ${secondary}30`,
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
                                        }}>
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                {staff.slice(0, 3).map((m, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full overflow-hidden border-2"
                                                        style={{ borderColor: bg }}>
                                                        {m.avatarUrl ? (
                                                            <img src={resolveAssetUrl(m.avatarUrl)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white"
                                                                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                                                                {m.firstName?.[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
                                                    {staff.length}+
                                                </div>
                                                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Team Members</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 2 — ANIMATED STATS BAR                      ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-20 px-6 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, ${primary}06, transparent)` }} />
                <div className="relative z-10 max-w-6xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { value: `${teamCount ?? 5}+`, label: 'Team Members', icon: FaUsers },
                                { value: '15+', label: 'Projects Delivered', icon: FaRocket },
                                { value: '4', label: 'SaaS Products', icon: FaBolt },
                                { value: '100%', label: 'Client Satisfaction', icon: FaAward },
                            ].map((stat, idx) => (
                                <div key={idx} className="text-center p-8 rounded-2xl transition-all duration-500 hover:-translate-y-1"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                    <stat.icon className="text-2xl mx-auto mb-4" style={{ color: primary, opacity: 0.6 }} />
                                    <div className="text-4xl md:text-5xl font-bold mb-2"
                                        style={{ fontFamily: 'Sora, sans-serif', color: '#fff' }}>
                                        {stat.value}
                                    </div>
                                    <div className="text-xs uppercase tracking-[0.15em] font-medium"
                                        style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 3 — COMPANY OVERVIEW WITH TABS              ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-28 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-5 gap-16 items-start">
                        {/* Left: Label + Heading + Tab content */}
                        <div className="lg:col-span-3">
                            <ScrollReveal animation="fadeLeft">
                                <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                    style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                    Company Profile
                                </span>
                                <h2 className="text-4xl md:text-5xl font-bold mb-10 leading-tight"
                                    style={{ fontFamily: 'Sora, sans-serif' }}>
                                    Building Africa's{' '}
                                    <span style={{
                                        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    }}>Digital Future</span>
                                </h2>
                            </ScrollReveal>

                            {/* Tab navigation */}
                            <ScrollReveal animation="fadeUp" delay={100}>
                                <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    {companyTabs.map((tab) => (
                                        <button key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300"
                                            style={{
                                                background: activeTab === tab.id
                                                    ? `linear-gradient(135deg, ${primary}, ${primaryDark})`
                                                    : 'transparent',
                                                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                                                fontFamily: 'Sora, sans-serif',
                                            }}>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </ScrollReveal>

                            {/* Tab content */}
                            <ScrollReveal animation="fadeUp" delay={200}>
                                <div className="min-h-[160px]">
                                    {activeTabData && (
                                        <>
                                            <p className="text-base leading-relaxed mb-6"
                                                style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DM Sans, sans-serif' }}>
                                                {activeTabData.content}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {activeTabData.highlights.map((h, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                                        style={{
                                                            background: `${primary}10`,
                                                            color: primary,
                                                            border: `1px solid ${primary}15`,
                                                        }}>
                                                        <FaCheckCircle className="text-[10px]" /> {h}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </ScrollReveal>
                        </div>

                        {/* Right: Mission / Vision / Philosophy */}
                        <div className="lg:col-span-2">
                            <ScrollReveal animation="fadeRight" delay={200}>
                                <div className="space-y-5">
                                    {[
                                        { icon: FaRocket, label: 'Mission', text: 'To empower businesses with innovative, reliable, and affordable technology solutions that drive growth.', gradient: [primary, primaryDark] },
                                        { icon: FaEye, label: 'Vision', text: 'To be the leading software provider in Africa, recognized for excellence and positive community impact.', gradient: [secondary, primary] },
                                        { icon: FaHeart, label: 'Philosophy', text: 'Innovate → Build → Empower. Identify real problems, engineer practical solutions, help people grow through technology.', gradient: ['#39FF6A', primary] },
                                    ].map((card, idx) => (
                                        <div key={idx} className="p-6 rounded-2xl flex gap-5 transition-all duration-500 hover:-translate-y-1 group"
                                            style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                            }}>
                                            <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                                style={{ background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})` }}>
                                                <card.icon className="text-lg text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold mb-1.5 uppercase tracking-wider"
                                                    style={{ color: card.gradient[0], fontFamily: 'Sora, sans-serif' }}>
                                                    {card.label}
                                                </h3>
                                                <p className="text-sm leading-relaxed"
                                                    style={{ color: 'rgba(255,255,255,0.5)' }}>
                                                    {card.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 4 — SERVICES SHOWCASE                       ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-28 px-6 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, transparent, ${primary}04, transparent)` }} />
                <div className="relative z-10 max-w-6xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="flex items-end justify-between mb-16">
                            <div>
                                <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                    style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                    What We Do
                                </span>
                                <h2 className="text-4xl md:text-5xl font-bold"
                                    style={{ fontFamily: 'Sora, sans-serif' }}>
                                    Our{' '}
                                    <span style={{
                                        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    }}>Expertise</span>
                                </h2>
                            </div>
                            <button onClick={() => navigate('/services')}
                                className="hidden md:inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 hover:gap-3"
                                style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                All Services <FaArrowRight />
                            </button>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {servicesShowcase.map((svc, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 80}>
                                <div className="p-7 rounded-2xl h-full group transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                    {/* Hover glow */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                        style={{ background: `radial-gradient(circle at 50% 0%, ${svc.color}08, transparent 70%)` }} />
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                            style={{ background: `${svc.color}15` }}>
                                            <svc.icon className="text-xl" style={{ color: svc.color }} />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                                            {svc.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                            {svc.desc}
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 5 — CORE VALUES (asymmetric cards)          ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-28 px-6">
                <div className="max-w-6xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="mb-16">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                What We Stand For
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold"
                                style={{ fontFamily: 'Sora, sans-serif' }}>
                                Core{' '}
                                <span style={{
                                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Values</span>
                            </h2>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {values.map((value, idx) => {
                            const IconComp = typeof value.icon === 'function' ? value.icon : resolveIcon(value.icon);
                            return (
                                <ScrollReveal key={idx} animation="fadeUp" delay={idx * 80}>
                                    <div className="relative p-7 rounded-2xl h-full group transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                                        style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                        }}>
                                        {/* Large watermark number */}
                                        <div className="absolute -top-2 -right-1 text-[100px] font-bold leading-none opacity-[0.025] select-none pointer-events-none"
                                            style={{ fontFamily: 'Sora, sans-serif' }}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="relative z-10">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                                style={{ background: `linear-gradient(135deg, ${primary}15, ${secondary}15)` }}>
                                                <IconComp className="text-lg" style={{ color: primary }} />
                                            </div>
                                            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                                                {value.title}
                                            </h3>
                                            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                                {value.description}
                                            </p>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 6 — TECH STACK                              ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-24 px-6 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, transparent, ${secondary}04, transparent)` }} />
                <div className="relative z-10 max-w-6xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-14">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                Our Toolkit
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold"
                                style={{ fontFamily: 'Sora, sans-serif' }}>
                                Technologies We{' '}
                                <span style={{
                                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Master</span>
                            </h2>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <div className="flex flex-wrap justify-center gap-4">
                            {techStack.map((tech, idx) => (
                                <div key={idx}
                                    className="group flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 hover:-translate-y-1 cursor-default"
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                    <tech.icon className="text-xl transition-transform duration-300 group-hover:scale-110"
                                        style={{ color: tech.color }} />
                                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Sora, sans-serif' }}>
                                        {tech.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 7 — TIMELINE                                ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-28 px-6">
                <div className="max-w-5xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-20">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                Our Journey
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold"
                                style={{ fontFamily: 'Sora, sans-serif' }}>
                                How We{' '}
                                <span style={{
                                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Got Here</span>
                            </h2>
                        </div>
                    </ScrollReveal>

                    {/* Horizontal-style timeline on desktop */}
                    <div className="relative">
                        {/* Center line */}
                        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-[1px] md:-translate-x-[0.5px]"
                            style={{ background: `linear-gradient(to bottom, ${primary}30, ${secondary}30, ${primary}30)` }} />

                        {timelineItems.map((item, idx) => (
                            <ScrollReveal key={idx} animation={idx % 2 === 0 ? 'fadeLeft' : 'fadeRight'} delay={idx * 120}>
                                <div className={`relative flex items-start mb-16 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                    {/* Node */}
                                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10">
                                        <div className="w-5 h-5 rounded-full"
                                            style={{
                                                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                                boxShadow: `0 0 24px ${primary}60`,
                                            }} />
                                    </div>

                                    {/* Content card */}
                                    <div className={`ml-16 md:ml-0 md:w-[44%] ${idx % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                                        <div className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                                            style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                            }}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                                                    style={{
                                                        background: `${primary}15`,
                                                        color: primary,
                                                        fontFamily: 'Sora, sans-serif',
                                                    }}>
                                                    {item.year}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                                                {item.title}
                                            </h3>
                                            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 8 — FOUNDER QUOTE                           ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-24 px-6 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, transparent, ${primary}06, transparent)` }} />
                <div className="relative z-10 max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div className="text-center">
                            <FaQuoteLeft className="text-4xl mx-auto mb-8 opacity-20" style={{ color: primary }} />
                            <blockquote className="text-2xl md:text-3xl font-bold leading-snug mb-8"
                                style={{ fontFamily: 'Sora, sans-serif', color: 'rgba(255,255,255,0.85)' }}>
                                "Technology should solve real problems for real people. That's not just our tagline — it's how every project starts at AngiSoft."
                            </blockquote>
                            <div className="flex items-center justify-center gap-4">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                                    style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                                    PA
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>Prof Angera</div>
                                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Founder & Lead Engineer</div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 9 — TEAM PREVIEW (live data)               ║
                ╚══════════════════════════════════════════════════════╝ */}
            {teamPreview.length > 0 && (
                <section className="py-28 px-6">
                    <div className="max-w-6xl mx-auto">
                        <ScrollReveal animation="fadeUp">
                            <div className="flex items-end justify-between mb-16">
                                <div>
                                    <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                        style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                        The People
                                    </span>
                                    <h2 className="text-4xl md:text-5xl font-bold"
                                        style={{ fontFamily: 'Sora, sans-serif' }}>
                                        Meet the{' '}
                                        <span style={{
                                            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                        }}>Team</span>
                                    </h2>
                                </div>
                                <button onClick={() => navigate('/staff')}
                                    className="hidden md:inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 hover:gap-3"
                                    style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                    View All <FaArrowRight />
                                </button>
                            </div>
                        </ScrollReveal>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {teamPreview.map((member, idx) => (
                                <ScrollReveal key={member.id} animation="fadeUp" delay={idx * 100}>
                                    <div onClick={() => navigate(getStaffDetailPath(member))}
                                        className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2"
                                        style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                        }}>
                                        {/* Avatar */}
                                        <div className="relative h-60 overflow-hidden">
                                            {member.avatarUrl ? (
                                                <img src={resolveAssetUrl(member.avatarUrl)}
                                                    alt={`${member.firstName} ${member.lastName}`}
                                                    loading="lazy" decoding="async"
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white"
                                                    style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                                                    {member.firstName?.[0]}{member.lastName?.[0]}
                                                </div>
                                            )}
                                            <div className="absolute inset-0"
                                                style={{ background: 'linear-gradient(to top, rgba(7,20,43,0.95) 0%, transparent 60%)' }} />
                                            <div className="absolute bottom-4 left-5 right-5">
                                                <h3 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
                                                    {member.firstName} {member.lastName}
                                                </h3>
                                                <p className="text-xs" style={{ color: primary }}>
                                                    {member.publicTitle || member.role?.toLowerCase().replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            {(member.publicSummary || member.bio) && (
                                                <p className="text-sm mb-4 line-clamp-2 leading-relaxed"
                                                    style={{ color: 'rgba(255,255,255,0.45)' }}>
                                                    {member.publicSummary || member.bio}
                                                </p>
                                            )}
                                            {member.skills && member.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    {member.skills.slice(0, 3).map((skill, sIdx) => (
                                                        <span key={sIdx} className="px-2 py-0.5 rounded text-[10px] font-medium"
                                                            style={{
                                                                background: `${primary}12`,
                                                                color: primary,
                                                                border: `1px solid ${primary}20`,
                                                            }}>
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs font-semibold transition-all duration-300 opacity-60 group-hover:opacity-100"
                                                style={{ color: primary }}>
                                                View Profile <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>

                        <div className="md:hidden text-center mt-10">
                            <button onClick={() => navigate('/staff')}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
                                style={{
                                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                    color: '#fff',
                                }}>
                                View All Team Members <FaArrowRight />
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 10 — GEOGRAPHIC PRESENCE                    ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-24 px-6 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(180deg, transparent, ${secondary}04, transparent)` }} />
                <div className="relative z-10 max-w-6xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-14">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 block"
                                style={{ color: primary, fontFamily: 'Sora, sans-serif' }}>
                                Where We Operate
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold"
                                style={{ fontFamily: 'Sora, sans-serif' }}>
                                East African{' '}
                                <span style={{
                                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>Presence</span>
                            </h2>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <div className="flex flex-wrap justify-center gap-4">
                            {[
                                { country: 'Kenya', city: 'Nairobi', flag: '🇰🇪', primary: true },
                                { country: 'Uganda', city: 'Kampala', flag: '🇺🇬' },
                                { country: 'Tanzania', city: 'Dar es Salaam', flag: '🇹🇿' },
                                { country: 'Rwanda', city: 'Kigali', flag: '🇷🇼' },
                            ].map((loc, idx) => (
                                <div key={idx}
                                    className="flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                                    style={{
                                        background: loc.primary ? `${primary}10` : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${loc.primary ? `${primary}25` : 'rgba(255,255,255,0.05)'}`,
                                    }}>
                                    <span className="text-3xl">{loc.flag}</span>
                                    <div>
                                        <div className="text-sm font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
                                            {loc.country}
                                        </div>
                                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                            {loc.city} {loc.primary && '· HQ'}
                                        </div>
                                    </div>
                                    {loc.primary && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                                            style={{ background: `${primary}20`, color: primary }}>
                                            HQ
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════════╗
                ║  SECTION 11 — CTA                                   ║
                ╚══════════════════════════════════════════════════════╝ */}
            <section className="py-28 px-6">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div className="relative rounded-3xl overflow-hidden p-12 md:p-20 text-center"
                            style={{
                                background: `linear-gradient(135deg, ${primary}, ${primaryDark})`,
                                boxShadow: `0 40px 100px ${primary}25`,
                            }}>
                            {/* Noise texture */}
                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                                }} />
                            {/* Dot pattern */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                                    backgroundSize: '28px 28px',
                                }} />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-5"
                                    style={{ fontFamily: 'Sora, sans-serif' }}>
                                    Let's Build Something
                                    <br />Extraordinary Together
                                </h2>
                                <p className="text-lg text-white/60 mb-10 max-w-lg mx-auto"
                                    style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    Whether you need custom software, a SaaS product, or data analytics — we're ready to deliver.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button onClick={() => navigate('/book')}
                                        className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105"
                                        style={{ backgroundColor: '#fff', color: primaryDark, fontFamily: 'Sora, sans-serif' }}>
                                        Start a Conversation
                                        <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                                    </button>
                                    <button onClick={() => navigate('/services')}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.12)',
                                            color: '#fff',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            fontFamily: 'Sora, sans-serif',
                                        }}>
                                        Browse Services
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

export default About;
