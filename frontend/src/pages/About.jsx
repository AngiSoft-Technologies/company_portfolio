import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import {
    FaBuilding, FaLightbulb, FaEye, FaHeart, FaHistory, FaUsers,
    FaRocket, FaCheckCircle, FaStar, FaHandshake, FaAward, FaGlobe,
    FaArrowRight, FaEnvelope, FaCogs, FaShieldAlt, FaChartLine, FaCode
} from 'react-icons/fa';

const timeline = [
    {
        year: '2018',
        title: 'Founded',
        description: 'AngiSoft Technologies was established in Nairobi, Kenya, with a vision to deliver innovative software solutions across Africa.'
    },
    {
        year: '2019',
        title: 'First Major Client',
        description: 'Secured our first enterprise contract, building a custom POS system for a growing retail chain.'
    },
    {
        year: '2020',
        title: 'Mobile Expansion',
        description: 'Expanded into mobile development with Flutter and Kotlin, launching DukaFlow for small businesses.'
    },
    {
        year: '2021',
        title: 'Team Growth',
        description: 'Grew to a team of 10+ engineers, designers, and project managers serving clients across East Africa.'
    },
    {
        year: '2022',
        title: 'Product Launches',
        description: 'Launched KejaLink and PetroFlow, purpose-built SaaS products for property and fuel station management.'
    },
    {
        year: '2023',
        title: 'Regional Expansion',
        description: 'Expanded operations to serve clients in Uganda, Tanzania, and Rwanda with localized solutions.'
    },
    {
        year: '2024',
        title: 'AI Integration',
        description: 'Integrated AI-powered features into our product suite, including smart analytics and automated workflows.'
    },
    {
        year: '2025',
        title: 'Continued Innovation',
        description: 'Launching AngiTunes and expanding our cyber services division to serve a broader market.'
    }
];

const values = [
    {
        icon: FaLightbulb,
        title: 'Innovation',
        description: 'We embrace cutting-edge technologies and creative problem-solving to build solutions that set new industry standards.'
    },
    {
        icon: FaHandshake,
        title: 'Integrity',
        description: 'We conduct business with honesty, transparency, and respect for every client, partner, and team member.'
    },
    {
        icon: FaAward,
        title: 'Excellence',
        description: 'We are committed to delivering the highest quality in every line of code, every design, and every interaction.'
    },
    {
        icon: FaUsers,
        title: 'Collaboration',
        description: 'We believe in the power of teamwork, working closely with clients to transform their vision into reality.'
    },
    {
        icon: FaShieldAlt,
        title: 'Reliability',
        description: 'Our solutions are built to last, with robust architectures, thorough testing, and dedicated ongoing support.'
    },
    {
        icon: FaGlobe,
        title: 'Impact',
        description: 'We measure success by the positive impact our technology creates for businesses and communities across Africa.'
    }
];

const whyChooseUs = [
    {
        icon: FaCode,
        title: 'Expert Engineering',
        description: 'Our team of skilled developers uses modern frameworks and best practices to build scalable, maintainable software.'
    },
    {
        icon: FaCogs,
        title: 'End-to-End Solutions',
        description: 'From ideation and design to development, deployment, and ongoing support, we handle the complete lifecycle.'
    },
    {
        icon: FaChartLine,
        title: 'Data-Driven Approach',
        description: 'We leverage analytics and user research to make informed decisions that maximize your return on investment.'
    },
    {
        icon: FaRocket,
        title: 'Rapid Delivery',
        description: 'Agile methodologies and efficient workflows allow us to deliver high-quality products on time and within budget.'
    }
];

const About = () => {
    const navigate = useNavigate();
    const { colors } = useTheme();

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section */}
            <ParallaxSection speed={0.25} treatment="image" backgroundImage="/images/Branding/AngiSoft%20T-Shirts%20Design.png" className="relative py-32 overflow-hidden">
                <div className="absolute inset-0 angi-spotlight" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
                    <ScrollReveal animation="fadeUp">
                        <img
                            src="/images/Logos/AngiSoft Logo Symbol Only.png"
                            alt="AngiSoft"
                            className="w-20 h-20 mx-auto mb-6 object-contain"
                            style={{ filter: 'brightness(1.2)' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={80}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span style={{ color: '#fff' }}>About </span>
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, #39FF6A)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                AngiSoft
                            </span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={160}>
                        <p
                            className="text-lg md:text-xl max-w-3xl mx-auto mb-10"
                            style={{ color: 'rgba(255,255,255,0.72)' }}
                        >
                            AngiSoft Technologies is a Nairobi-based software company delivering innovative digital solutions that empower businesses across Africa and beyond.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={240}>
                        <div className="flex flex-wrap justify-center gap-4">
                            {['Custom Software', 'Data Analytics', 'Cyber Services', 'Mobile Apps'].map((badge, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: '#fff',
                                    }}
                                >
                                    <FaCheckCircle style={{ color: colors.primary }} />
                                    <span className="text-sm font-medium">{badge}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            {/* Mission, Vision, Story Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <ScrollReveal animation="fadeLeft">
                            <div>
                                <span
                                    className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4"
                                    style={{ color: colors.primary }}
                                >
                                    <div className="w-12 h-0.5" style={{ backgroundColor: colors.primary }} />
                                    Our Story
                                </span>
                                <h2
                                    className="text-3xl md:text-4xl font-bold mb-6"
                                    style={{ color: colors.text }}
                                >
                                    Building the Future of
                                    <span style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}> African Tech</span>
                                </h2>
                                <div className="space-y-4">
                                    <p style={{ color: colors.textSecondary }}>
                                        Founded in 2018, AngiSoft Technologies began with a simple mission: to provide African businesses with world-class software solutions that are affordable, reliable, and tailored to local needs.
                                    </p>
                                    <p style={{ color: colors.textSecondary }}>
                                        What started as a small team of passionate developers has grown into a full-service technology company, offering custom software development, mobile applications, data analytics, cyber services, and a suite of proprietary SaaS products.
                                    </p>
                                    <p style={{ color: colors.textSecondary }}>
                                        Today, we serve clients across East Africa and beyond, helping startups, SMEs, and enterprises harness the power of technology to grow, compete, and thrive in the digital economy.
                                    </p>
                                </div>
                            </div>
                        </ScrollReveal>

                        <ScrollReveal animation="fadeRight" delay={200}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    {
                                        icon: FaRocket,
                                        title: 'Our Mission',
                                        description: 'To empower businesses with innovative, reliable, and affordable technology solutions that drive growth and operational efficiency.',
                                        gradient: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                                    },
                                    {
                                        icon: FaEye,
                                        title: 'Our Vision',
                                        description: 'To be the leading software solutions provider in Africa, recognized for excellence, innovation, and positive impact on communities.',
                                        gradient: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`
                                    },
                                    {
                                        icon: FaHeart,
                                        title: 'Our Passion',
                                        description: 'We are passionate about technology and its potential to transform businesses, create opportunities, and improve lives across the continent.',
                                        gradient: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`
                                    },
                                    {
                                        icon: FaGlobe,
                                        title: 'Our Reach',
                                        description: 'Serving clients across Kenya, Uganda, Tanzania, Rwanda, and expanding to new markets with localized, scalable solutions.',
                                        gradient: `linear-gradient(135deg, ${colors.success}, ${colors.secondary})`
                                    }
                                ].map((card, idx) => (
                                    <GlassmorphismCard key={idx} className="p-6">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                                            style={{ background: card.gradient }}
                                        >
                                            <card.icon className="text-2xl text-white" />
                                        </div>
                                        <h3
                                            className="text-lg font-bold mb-2"
                                            style={{ color: colors.text }}
                                        >
                                            {card.title}
                                        </h3>
                                        <p
                                            className="text-sm leading-relaxed"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            {card.description}
                                        </p>
                                    </GlassmorphismCard>
                                ))}
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* Core Values Section */}
            <section
                className="py-20 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}08 100%)`
                }}
            >
                <div className="max-w-7xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <span
                                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4"
                                style={{ color: colors.primary }}
                            >
                                <FaHeart className="inline" />
                                What We Stand For
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>Our Core </span>
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Values
                                </span>
                            </h2>
                            <p
                                className="text-xl max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                The principles that guide every decision we make and every solution we build
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {values.map((value, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 100}>
                                <GlassmorphismCard className="p-8 h-full">
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`
                                        }}
                                    >
                                        <value.icon
                                            className="text-2xl"
                                            style={{ color: colors.primary }}
                                        />
                                    </div>
                                    <h3
                                        className="text-xl font-bold mb-3"
                                        style={{ color: colors.text }}
                                    >
                                        {value.title}
                                    </h3>
                                    <p style={{ color: colors.textSecondary }}>
                                        {value.description}
                                    </p>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <span
                                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4"
                                style={{ color: colors.primary }}
                            >
                                <FaHistory className="inline" />
                                Our Journey
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>Company </span>
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Timeline
                                </span>
                            </h2>
                        </div>
                    </ScrollReveal>

                    <div className="relative">
                        {/* Timeline line */}
                        <div
                            className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5"
                            style={{
                                background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`
                            }}
                        />

                        {timeline.map((item, idx) => (
                            <ScrollReveal key={idx} animation={idx % 2 === 0 ? 'fadeLeft' : 'fadeRight'} delay={idx * 100}>
                                <div className={`relative flex items-start mb-12 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                    {/* Year badge */}
                                    <div
                                        className="absolute left-8 md:left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center z-10"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                            boxShadow: `0 0 30px ${colors.primary}40`
                                        }}
                                    >
                                        <span className="text-white font-bold text-sm">{item.year}</span>
                                    </div>

                                    {/* Content card */}
                                    <div className={`ml-20 md:ml-0 md:w-[45%] ${idx % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                                        <GlassmorphismCard className="p-6">
                                            <h3
                                                className="text-lg font-bold mb-2"
                                                style={{ color: colors.text }}
                                            >
                                                {item.title}
                                            </h3>
                                            <p
                                                className="text-sm"
                                                style={{ color: colors.textSecondary }}
                                            >
                                                {item.description}
                                            </p>
                                        </GlassmorphismCard>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section
                className="py-20 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}10 100%)`
                }}
            >
                <div className="max-w-7xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>Why </span>
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Choose Us
                                </span>
                            </h2>
                            <p
                                className="text-xl max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                What sets AngiSoft apart from the competition
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {whyChooseUs.map((item, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 100}>
                                <GlassmorphismCard className="text-center p-8 h-full">
                                    <div
                                        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                        }}
                                    >
                                        <item.icon className="text-3xl text-white" />
                                    </div>
                                    <h3
                                        className="text-xl font-bold mb-4"
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

            {/* Team Preview Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-12 text-center">
                            <div
                                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                }}
                            >
                                <FaUsers className="text-3xl text-white" />
                            </div>
                            <h2
                                className="text-3xl md:text-4xl font-bold mb-6"
                                style={{ color: colors.text }}
                            >
                                Meet Our Team
                            </h2>
                            <p
                                className="text-xl mb-8 max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                Our talented team of engineers, designers, and strategists is the backbone of everything we do. Get to know the people behind the technology.
                            </p>
                            <button
                                onClick={() => navigate('/staff')}
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                    color: 'white'
                                }}
                            >
                                <FaUsers />
                                View Our Team
                                <FaArrowRight />
                            </button>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </section>

            {/* CTA Section */}
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
                                    Ready to Work With Us?
                                </h2>
                                <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                                    Let's discuss your project and explore how AngiSoft can help your business grow with the right technology solutions.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button
                                        onClick={() => navigate('/book')}
                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                        style={{
                                            backgroundColor: 'white',
                                            color: colors.primaryDark
                                        }}
                                    >
                                        <FaRocket />
                                        Book a Consultation
                                    </button>
                                    <button
                                        onClick={() => navigate('/#contact-me')}
                                        className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            color: 'white',
                                            border: '2px solid rgba(255,255,255,0.3)'
                                        }}
                                    >
                                        <FaEnvelope />
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

export default About;
