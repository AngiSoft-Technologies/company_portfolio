import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, ParallaxSection } from '../components/modern';
import {
    FaGavel, FaHandshake, FaCalendarCheck, FaCreditCard, FaLightbulb,
    FaExclamationTriangle, FaPowerOff, FaBalanceScale, FaEnvelope,
    FaChevronRight, FaFileContract
} from 'react-icons/fa';

const sections = [
    { id: 'introduction', title: 'Introduction', icon: FaFileContract },
    { id: 'services', title: 'Our Services', icon: FaHandshake },
    { id: 'bookings', title: 'Bookings & Engagements', icon: FaCalendarCheck },
    { id: 'payments', title: 'Payments & Pricing', icon: FaCreditCard },
    { id: 'intellectual-property', title: 'Intellectual Property', icon: FaLightbulb },
    { id: 'liability', title: 'Limitation of Liability', icon: FaExclamationTriangle },
    { id: 'termination', title: 'Termination', icon: FaPowerOff },
    { id: 'governing-law', title: 'Governing Law', icon: FaBalanceScale },
    { id: 'contact', title: 'Contact Us', icon: FaEnvelope }
];

const Terms = () => {
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
                            background: `radial-gradient(circle, ${colors.accent}, transparent)`,
                            top: '10%',
                            right: '10%'
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
                            <FaGavel className="inline mr-2" />
                            Legal
                        </span>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span style={{ color: colors.text }}>Terms & </span>
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Conditions
                            </span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: colors.textSecondary }}
                        >
                            Last updated: May 16, 2026. Please read these terms carefully before using our services or engaging with our platform.
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
                                            These Terms and Conditions ("Terms") govern your use of the website, products, and services provided by AngiSoft Technologies ("Company," "we," "our," or "us"). By accessing our website or engaging our services, you agree to be bound by these Terms.
                                        </p>
                                        <p>
                                            If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms. If you do not have such authority, or if you do not agree with these Terms, you must not accept these Terms and may not use our services.
                                        </p>
                                        <p>
                                            We reserve the right to modify these Terms at any time. Changes will be effective upon posting to the website. Your continued use of our services after any such changes constitutes your acceptance of the new Terms.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Services */}
                            <ScrollReveal animation="fadeUp">
                                <div id="services" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaHandshake style={{ color: colors.primary }} />
                                        Our Services
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            AngiSoft Technologies provides the following services:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li><strong>Custom Software Development:</strong> Bespoke web and mobile application development using modern frameworks and technologies</li>
                                            <li><strong>SaaS Products:</strong> Cloud-based software products including PetroFlow, DukaFlow, KejaLink, and AngiTunes</li>
                                            <li><strong>Data Analytics:</strong> Business intelligence, dashboard creation, and data analysis services</li>
                                            <li><strong>Cyber Services:</strong> Document editing, government applications, and digital services</li>
                                            <li><strong>Consulting:</strong> Technology consulting, architecture design, and project planning</li>
                                            <li><strong>Maintenance & Support:</strong> Ongoing technical support, hosting, and maintenance services</li>
                                        </ul>
                                        <p>
                                            Service availability may vary by region. We reserve the right to modify, suspend, or discontinue any service with reasonable notice.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Bookings */}
                            <ScrollReveal animation="fadeUp">
                                <div id="bookings" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaCalendarCheck style={{ color: colors.primary }} />
                                        Bookings & Engagements
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            When you submit a booking request through our platform:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>All booking requests are subject to review and acceptance by our team</li>
                                            <li>We will provide a project scope, timeline, and cost estimate upon acceptance</li>
                                            <li>A formal agreement or Statement of Work (SOW) will be provided for custom development projects</li>
                                            <li>Project timelines are estimates and may be subject to change based on scope adjustments or unforeseen circumstances</li>
                                            <li>Client cooperation and timely feedback are essential for project delivery</li>
                                            <li>Changes to project scope may affect timeline and cost, and will be communicated in advance</li>
                                        </ul>
                                        <p>
                                            We reserve the right to decline any booking request at our discretion.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Payments */}
                            <ScrollReveal animation="fadeUp">
                                <div id="payments" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaCreditCard style={{ color: colors.primary }} />
                                        Payments & Pricing
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            Payment terms for our services:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Pricing for custom projects is provided in the project proposal and is valid for 30 days unless otherwise stated</li>
                                            <li>A deposit may be required before work commences, as specified in the project agreement</li>
                                            <li>SaaS product subscriptions are billed monthly or annually as selected at the time of purchase</li>
                                            <li>All prices are quoted in Kenyan Shillings (KES) unless otherwise specified</li>
                                            <li>Payments are processed through secure third-party payment processors</li>
                                            <li>Late payments may result in suspension of services after reasonable notice</li>
                                            <li>Refunds are handled on a case-by-case basis in accordance with our refund policy</li>
                                        </ul>
                                        <p>
                                            We reserve the right to modify pricing with 30 days' notice for subscription services. Price changes for existing projects require mutual agreement.
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Intellectual Property */}
                            <ScrollReveal animation="fadeUp">
                                <div id="intellectual-property" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaLightbulb style={{ color: colors.primary }} />
                                        Intellectual Property
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            Intellectual property rights are an important aspect of our business relationship:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li><strong>Client Content:</strong> You retain ownership of all content, data, and materials you provide to us</li>
                                            <li><strong>Custom Development:</strong> Upon full payment, ownership of custom-developed code is transferred to the client as specified in the project agreement</li>
                                            <li><strong>Our Tools & Frameworks:</strong> We retain ownership of our proprietary tools, frameworks, libraries, and pre-existing code used in the development process</li>
                                            <li><strong>SaaS Products:</strong> Our SaaS products (PetroFlow, DukaFlow, KejaLink, AngiTunes) and all associated intellectual property remain our exclusive property</li>
                                            <li><strong>License Grant:</strong> We grant clients a non-exclusive, non-transferable license to use our SaaS products for the duration of their subscription</li>
                                            <li><strong>Restrictions:</strong> You may not reverse-engineer, decompile, or attempt to extract the source code of our products</li>
                                        </ul>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Liability */}
                            <ScrollReveal animation="fadeUp">
                                <div id="liability" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaExclamationTriangle style={{ color: colors.primary }} />
                                        Limitation of Liability
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            To the maximum extent permitted by applicable law:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Our services are provided "as is" and "as available" without warranties of any kind, either express or implied</li>
                                            <li>We do not warrant that our services will be uninterrupted, error-free, or completely secure</li>
                                            <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages</li>
                                            <li>Our total liability for any claim arising from or related to our services shall not exceed the amount paid by you for the specific service in the 12 months preceding the claim</li>
                                            <li>We are not liable for damages resulting from third-party services, force majeure events, or circumstances beyond our reasonable control</li>
                                            <li>It is your responsibility to maintain adequate backups of your data</li>
                                        </ul>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Termination */}
                            <ScrollReveal animation="fadeUp">
                                <div id="termination" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaPowerOff style={{ color: colors.primary }} />
                                        Termination
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            Either party may terminate the engagement under the following conditions:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>SaaS subscriptions can be cancelled at any time, with access continuing until the end of the current billing period</li>
                                            <li>Custom project termination requires written notice and is subject to the terms outlined in the project agreement</li>
                                            <li>We may suspend or terminate your access to services immediately if you breach these Terms</li>
                                            <li>Upon termination, your right to use our services ceases immediately</li>
                                            <li>We will provide reasonable assistance for data export within 30 days of termination</li>
                                            <li>Outstanding payments for work completed remain due upon termination</li>
                                        </ul>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Governing Law */}
                            <ScrollReveal animation="fadeUp">
                                <div id="governing-law" className="mb-16 scroll-mt-24">
                                    <h2
                                        className="text-3xl font-bold mb-6 flex items-center gap-3"
                                        style={{ color: colors.text }}
                                    >
                                        <FaBalanceScale style={{ color: colors.primary }} />
                                        Governing Law
                                    </h2>
                                    <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                        <p>
                                            These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya, without regard to its conflict of law provisions.
                                        </p>
                                        <p>
                                            Any disputes arising from or relating to these Terms or our services shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to the jurisdiction of the courts of Nairobi, Kenya.
                                        </p>
                                        <p>
                                            If any provision of these Terms is held to be unenforceable or invalid, such provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.
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
                                            If you have any questions about these Terms and Conditions, please contact us:
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
                                            <p>Legal Department</p>
                                            <p>Email: legal@angisoft.co.ke</p>
                                            <p>Phone: +254 700 000 000</p>
                                            <p>Nairobi, Kenya</p>
                                        </div>
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

export default Terms;
