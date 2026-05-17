import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, ParallaxSection } from '../components/modern';
import {
    FaShieldAlt, FaLock, FaEye, FaCookie, FaShareAlt, FaShieldVirus,
    FaUserShield, FaEnvelope, FaChevronRight, FaFileContract
} from 'react-icons/fa';

const sections = [
    { id: 'introduction', title: 'Introduction', icon: FaFileContract },
    { id: 'data-collection', title: 'Data We Collect', icon: FaEye },
    { id: 'data-usage', title: 'How We Use Data', icon: FaLock },
    { id: 'cookies', title: 'Cookies & Tracking', icon: FaCookie },
    { id: 'third-parties', title: 'Third-Party Sharing', icon: FaShareAlt },
    { id: 'security', title: 'Data Security', icon: FaShieldVirus },
    { id: 'rights', title: 'Your Rights', icon: FaUserShield },
    { id: 'contact', title: 'Contact Us', icon: FaEnvelope }
];

const Privacy = () => {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const [activeSection, setActiveSection] = useState('introduction');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
        );

        sections.forEach(section => {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

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
                            left: '10%'
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
                            <FaShieldAlt className="inline mr-2" />
                            Legal
                        </span>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span style={{ color: colors.text }}>Privacy </span>
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Policy
                            </span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: colors.textSecondary }}
                        >
                            Last updated: May 16, 2026. This policy describes how AngiSoft Technologies collects, uses, and protects your personal information.
                        </p>
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            {/* Content Section */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex gap-12">
                        {/* Sidebar TOC */}
                        <aside className="hidden lg:block w-72 flex-shrink-0">
                            <div className="sticky top-24">
                                <ScrollReveal animation="fadeLeft">
                                    <div
                                        className="p-6 rounded-2xl"
                                        style={{
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                                        }}
                                    >
                                        <h3
                                            className="text-sm font-semibold uppercase tracking-wider mb-4"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            Table of Contents
                                        </h3>
                                        <nav className="space-y-1">
                                            {sections.map((section) => (
                                                <button
                                                    key={section.id}
                                                    onClick={() => scrollToSection(section.id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-300"
                                                    style={{
                                                        backgroundColor: activeSection === section.id
                                                            ? `${colors.primary}15`
                                                            : 'transparent',
                                                        color: activeSection === section.id
                                                            ? colors.primary
                                                            : colors.textSecondary,
                                                        fontWeight: activeSection === section.id ? 600 : 400
                                                    }}
                                                >
                                                    <section.icon className="text-xs flex-shrink-0" />
                                                    <span className="truncate">{section.title}</span>
                                                    {activeSection === section.id && (
                                                        <FaChevronRight className="ml-auto text-xs flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </nav>
                                    </div>
                                </ScrollReveal>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <main className="flex-1 min-w-0 max-w-4xl">
                            {/* Introduction */}
                            <ScrollReveal animation="fadeUp">
                                <div id="introduction" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaFileContract style={{ color: colors.primary }} />
                                        Introduction
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            AngiSoft Technologies ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our products, or engage with our services.
                                        </p>
                                        <p>
                                            We respect your privacy and are committed to protecting personally identifiable information you may provide us through our website and services. We have adopted this privacy policy to explain what information may be collected, how we use this information, and under what circumstances we may disclose the information to third parties.
                                        </p>
                                        <p>
                                            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Data Collection */}
                            <ScrollReveal animation="fadeUp">
                                <div id="data-collection" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaEye style={{ color: colors.primary }} />
                                        Information We Collect
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            We collect information that you provide directly to us and information that is automatically collected when you use our services.
                                        </p>
                                        <h3
                                            className="text-xl font-semibold mt-6 mb-3"
                                            style={{ color: colors.text }}
                                        >
                                            Personal Information
                                        </h3>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Name, email address, phone number, and postal address</li>
                                            <li>Company name, job title, and professional details</li>
                                            <li>Payment and billing information (processed securely through third-party providers)</li>
                                            <li>Account credentials (username and encrypted password)</li>
                                            <li>Communications and correspondence with our team</li>
                                        </ul>

                                        <h3
                                            className="text-xl font-semibold mt-6 mb-3"
                                            style={{ color: colors.text }}
                                        >
                                            Automatically Collected Information
                                        </h3>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>IP address, browser type, and operating system</li>
                                            <li>Device identifiers and characteristics</li>
                                            <li>Pages visited, time spent, and navigation patterns</li>
                                            <li>Referring URLs and exit pages</li>
                                            <li>Location data (country/region level, with your consent)</li>
                                        </ul>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Data Usage */}
                            <ScrollReveal animation="fadeUp">
                                <div id="data-usage" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaLock style={{ color: colors.primary }} />
                                        How We Use Your Information
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            We use the information we collect for various purposes, including:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li><strong>Service Delivery:</strong> To provide, operate, and maintain our products and services</li>
                                            <li><strong>Communication:</strong> To respond to inquiries, send service updates, and provide customer support</li>
                                            <li><strong>Improvement:</strong> To analyze usage patterns and improve our website, products, and services</li>
                                            <li><strong>Marketing:</strong> To send promotional communications (with your consent) about our services, offers, and updates</li>
                                            <li><strong>Security:</strong> To detect, prevent, and address technical issues and fraudulent activities</li>
                                            <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our terms of service</li>
                                            <li><strong>Personalization:</strong> To customize your experience and deliver relevant content and recommendations</li>
                                        </ul>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Cookies */}
                            <ScrollReveal animation="fadeUp">
                                <div id="cookies" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaCookie style={{ color: colors.primary }} />
                                        Cookies & Tracking Technologies
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            We use cookies and similar tracking technologies to enhance your experience on our website. Cookies are small data files stored on your device.
                                        </p>
                                        <h3
                                            className="text-xl font-semibold mt-6 mb-3"
                                            style={{ color: colors.text }}
                                        >
                                            Types of Cookies We Use
                                        </h3>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li><strong>Essential Cookies:</strong> Required for the website to function properly (authentication, security)</li>
                                            <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
                                            <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                                            <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (with your consent)</li>
                                        </ul>
                                        <p>
                                            You can control cookie settings through your browser preferences. Note that disabling certain cookies may affect the functionality of our website.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Third Parties */}
                            <ScrollReveal animation="fadeUp">
                                <div id="third-parties" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaShareAlt style={{ color: colors.primary }} />
                                        Third-Party Sharing
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            We do not sell your personal information to third parties. We may share your information only in the following circumstances:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li><strong>Service Providers:</strong> With trusted third-party vendors who assist us in operating our business (hosting, payment processing, analytics)</li>
                                            <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process</li>
                                            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                                            <li><strong>Consent:</strong> With your explicit consent for specific purposes</li>
                                            <li><strong>Protection:</strong> To protect the rights, property, or safety of AngiSoft, our clients, or others</li>
                                        </ul>
                                        <p>
                                            All third-party service providers are contractually obligated to protect your information and use it only for the purposes we specify.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Security */}
                            <ScrollReveal animation="fadeUp">
                                <div id="security" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaShieldVirus style={{ color: colors.primary }} />
                                        Data Security
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                                            <li>Regular security assessments and penetration testing</li>
                                            <li>Access controls and authentication mechanisms</li>
                                            <li>Employee training on data protection best practices</li>
                                            <li>Incident response and breach notification procedures</li>
                                            <li>Regular backups and disaster recovery planning</li>
                                        </ul>
                                        <p>
                                            While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Rights */}
                            <ScrollReveal animation="fadeUp">
                                <div id="rights" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaUserShield style={{ color: colors.primary }} />
                                        Your Rights
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            Depending on your location, you may have the following rights regarding your personal data:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                                            <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                                            <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal obligations)</li>
                                            <li><strong>Restriction:</strong> Request that we limit the processing of your data</li>
                                            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                                            <li><strong>Objection:</strong> Object to the processing of your data for certain purposes</li>
                                            <li><strong>Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
                                        </ul>
                                        <p>
                                            To exercise any of these rights, please contact us using the information provided below. We will respond to your request within 30 days.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Contact */}
                            <ScrollReveal animation="fadeUp">
                                <div id="contact" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaEnvelope style={{ color: colors.primary }} />
                                        Contact Us
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
                                        </p>
                                        <div
                                            className="p-6 rounded-2xl mt-6"
                                            style={{
                                                backgroundColor: `${colors.primary}10`,
                                                border: `1px solid ${colors.primary}30`
                                            }}
                                        >
                                            <p className="font-semibold mb-1" style={{ color: colors.text }}>
                                                AngiSoft Technologies
                                            </p>
                                            <p>Data Protection Officer</p>
                                            <p>Email: privacy@angisoft.co.ke</p>
                                            <p>Phone: +254 700 000 000</p>
                                            <p>Nairobi, Kenya</p>
                                        </div>
                                        <p className="mt-4">
                                            We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>
                        </main>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Privacy;
