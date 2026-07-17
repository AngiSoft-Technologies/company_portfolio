import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { apiGet } from '../js/httpClient';
import { ScrollReveal, ParallaxSection } from '../components/modern';
import {
    FaEnvelope, FaPhone, FaMapMarkerAlt, FaWhatsapp,
    FaPaperPlane, FaCheckCircle, FaSpinner
} from 'react-icons/fa';

const Contact = () => {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [contactData, setContactData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContact = async () => {
            try {
                const data = await apiGet('/site/contact');
                setContactData(data || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchContact();
    }, []);

    const contact = contactData || {};

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });

        setTimeout(() => setIsSubmitted(false), 5000);
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
                            left: '5%'
                        }}
                    />
                    <div
                        className="absolute w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{
                            background: `radial-gradient(circle, ${colors.secondary}, transparent)`,
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
                            <FaEnvelope className="inline mr-2" />
                            Get in Touch
                        </span>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span style={{ color: colors.text }}>Contact </span>
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Us
                            </span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p
                            className="text-xl md:text-2xl max-w-3xl mx-auto"
                            style={{ color: colors.textSecondary }}
                        >
                            Have a project in mind? We'd love to hear from you. Reach out and let's build something amazing together.
                        </p>
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            {/* Form + Map Section */}
            <section
                className="py-20 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}08 100%)`
                }}
            >
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Contact Form */}
                        <div className="lg:col-span-1">
                            <ScrollReveal animation="fadeLeft">
                                <div
                                    className="p-8 md:p-10 rounded-3xl"
                                    style={{
                                        background: isDark
                                            ? 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)'
                                            : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                                        backdropFilter: 'blur(20px)',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                        boxShadow: isDark
                                            ? '0 25px 80px rgba(0,0,0,0.4)'
                                            : '0 25px 80px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <h2
                                        className="text-2xl font-bold mb-2"
                                        style={{ color: colors.text }}
                                    >
                                        Send Us a Message
                                    </h2>
                                    <p
                                        className="mb-8"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        Fill out the form below and we'll get back to you within 24 hours.
                                    </p>

                                    {isSubmitted ? (
                                        <div className="text-center py-12">
                                            <div
                                                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                                }}
                                            >
                                                <FaCheckCircle className="text-white text-3xl" />
                                            </div>
                                            <h3
                                                className="text-2xl font-bold mb-2"
                                                style={{ color: colors.text }}
                                            >
                                                Message Sent!
                                            </h3>
                                            <p style={{ color: colors.textSecondary }}>
                                                Thank you for reaching out. We'll get back to you shortly.
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label
                                                        className="block text-sm font-medium mb-2"
                                                        style={{ color: colors.text }}
                                                    >
                                                        Your Name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="John Doe"
                                                        className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                        style={{
                                                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                            color: colors.text,
                                                            '--tw-ring-color': colors.primary
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        className="block text-sm font-medium mb-2"
                                                        style={{ color: colors.text }}
                                                    >
                                                        Email Address *
                                                    </label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="john@example.com"
                                                        className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                        style={{
                                                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                            color: colors.text
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label
                                                        className="block text-sm font-medium mb-2"
                                                        style={{ color: colors.text }}
                                                    >
                                                        Phone Number
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        placeholder="+254 700 000 000"
                                                        className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                        style={{
                                                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                            color: colors.text
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        className="block text-sm font-medium mb-2"
                                                        style={{ color: colors.text }}
                                                    >
                                                        Subject *
                                                    </label>
                                                    <select
                                                        name="subject"
                                                        value={formData.subject}
                                                        onChange={handleChange}
                                                        required
                                                        className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                        style={{
                                                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                            color: colors.text
                                                        }}
                                                    >
                                                        <option value="">Select a subject</option>
                                                        <option value="general">General Inquiry</option>
                                                        <option value="project">Project Discussion</option>
                                                        <option value="support">Technical Support</option>
                                                        <option value="partnership">Partnership</option>
                                                        <option value="careers">Careers</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label
                                                    className="block text-sm font-medium mb-2"
                                                    style={{ color: colors.text }}
                                                >
                                                    Your Message *
                                                </label>
                                                <textarea
                                                    name="message"
                                                    value={formData.message}
                                                    onChange={handleChange}
                                                    required
                                                    rows={5}
                                                    placeholder="Tell us about your project or inquiry..."
                                                    className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2 resize-none"
                                                    style={{
                                                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                        color: colors.text
                                                    }}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg text-white transition-all duration-300 hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                                    boxShadow: `0 15px 40px ${colors.primary}40`
                                                }}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <FaSpinner className="animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaPaperPlane />
                                                        Send Message
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </ScrollReveal>
                        </div>

                        {/* Map */}
                        <div className="lg:col-span-1">
                            <ScrollReveal animation="fadeRight" delay={100}>
                                <div
                                    className="rounded-3xl overflow-hidden h-full min-h-[500px]"
                                    style={{
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                        boxShadow: isDark
                                            ? '0 25px 80px rgba(0,0,0,0.4)'
                                            : '0 25px 80px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <iframe
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127635.89687807776!2d36.7052!3d-1.3031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f11655c311541%3A0x9dd769ac1c10b8f4!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1640000000000!5m2!1sen!2sus"
                                        width="100%"
                                        height="100%"
                                        style={{
                                            border: 0,
                                            filter: isDark ? 'invert(90%) hue-rotate(180deg)' : 'none'
                                        }}
                                        allowFullScreen=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="AngiSoft Technologies Location"
                                    />
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
