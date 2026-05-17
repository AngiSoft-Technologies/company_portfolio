import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import {
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaClock,
    FaPaperPlane,
    FaWhatsapp,
    FaCheckCircle,
    FaSpinner,
    FaUpload,
    FaLock,
    FaHeadset
} from 'react-icons/fa';
import { ScrollReveal } from '../modern';

const Contacts = () => {
    const { colors, mode } = useTheme();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
        communication: 'email',
        nda: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [contactData, setContactData] = useState(null);
    const [loading, setLoading] = useState(true);
    const isDark = mode === 'dark';

    useEffect(() => {
        apiGet('/site/contact')
            .then((data) => setContactData(data || null))
            .catch(() => setContactData(null))
            .finally(() => setLoading(false));
    }, []);

    const contact = contactData || {};

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', phone: '', company: '', message: '', communication: 'email', nda: false });
        setTimeout(() => setIsSubmitted(false), 5000);
    };

    const inputStyle = {
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        color: isDark ? '#fff' : '#1e293b',
    };

    const contactMethods = [
        { icon: FaPhone, label: 'Call Us', value: contact.phone || '+254 710 398 690', href: `tel:${(contact.phone || '+254710398690').replace(/\s/g, '')}` },
        { icon: FaEnvelope, label: 'Email Us', value: contact.email || 'info@angisoft.co.ke', href: `mailto:${contact.email || 'info@angisoft.co.ke'}` },
        { icon: FaWhatsapp, label: 'WhatsApp', value: '+254 710 398 690', href: 'https://wa.me/254710398690' },
        { icon: FaMapMarkerAlt, label: 'Office', value: contact.address?.city ? `${contact.address.city}, ${contact.address.country}` : 'Nairobi, Kenya', href: null },
    ];

    if (loading) {
        return (
            <section id="contact" className="py-28">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <FaSpinner className="animate-spin inline-block mr-2" />
                    Loading contact info...
                </div>
            </section>
        );
    }

    return (
        <section
            id="contact"
            className="relative py-20 md:py-28 overflow-hidden"
            style={{
                background: isDark
                    ? 'linear-gradient(180deg, #07142B 0%, #0B1E3D 100%)'
                    : 'linear-gradient(180deg, #F8FAFF 0%, #EFF5FF 100%)',
            }}
        >
            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <ScrollReveal animation="fadeUp">
                    <div className="text-center mb-16">
                        <div
                            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-sm font-medium"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                                color: colors.primary,
                                border: `1px solid ${colors.primary}25`,
                            }}
                        >
                            Get In Touch
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            Let's Start{' '}
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>Your Project</span>
                        </h2>
                        <p
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
                        >
                            Share your project details and we'll get back to you within 24 hours.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* LEFT: Contact Form */}
                    <ScrollReveal animation="fadeLeft" delay={100}>
                        <div
                            className="p-6 md:p-8 lg:p-10 rounded-3xl"
                            style={{
                                background: isDark
                                    ? 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)'
                                    : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                                backdropFilter: 'blur(20px)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                boxShadow: isDark ? '0 25px 80px rgba(0,0,0,0.4)' : '0 25px 80px rgba(0,0,0,0.08)',
                            }}
                        >
                            <h3
                                className="text-2xl font-bold mb-6"
                                style={{ color: isDark ? '#fff' : '#1e293b' }}
                            >
                                Tell Us About Your Project
                            </h3>

                            {isSubmitted ? (
                                <div className="text-center py-12">
                                    <div
                                        className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                                    >
                                        <FaCheckCircle className="text-white text-3xl" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                                        Message Sent!
                                    </h3>
                                    <p style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                        Thank you for reaching out. We'll get back to you within 24 hours.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Message textarea */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                                            Your Message *
                                        </label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows={4}
                                            placeholder="Describe your project, goals, and timeline..."
                                            className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2 resize-none"
                                            style={{ ...inputStyle, '--tw-ring-color': colors.primary }}
                                        />
                                    </div>

                                    {/* File upload area */}
                                    <div
                                        className="rounded-xl p-4 text-center cursor-pointer transition-all hover:border-opacity-60"
                                        style={{
                                            border: `2px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                        }}
                                    >
                                        <FaUpload className="mx-auto mb-2 text-lg" style={{ color: colors.primary }} />
                                        <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                                            Drag & drop files or <span style={{ color: colors.primary }} className="font-medium">browse</span>
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
                                            PDF, DOC, PNG, JPG up to 10MB
                                        </p>
                                    </div>

                                    {/* Name & Company */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="John Doe"
                                                className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                style={{ ...inputStyle, '--tw-ring-color': colors.primary }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                                                Company
                                            </label>
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                placeholder="Your company"
                                                className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                style={{ ...inputStyle, '--tw-ring-color': colors.primary }}
                                            />
                                        </div>
                                    </div>

                                    {/* Email & Phone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                                                Work Email *
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder="john@company.com"
                                                className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                style={{ ...inputStyle, '--tw-ring-color': colors.primary }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                                                Phone
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="+254 7XX XXX XXX"
                                                className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                style={{ ...inputStyle, '--tw-ring-color': colors.primary }}
                                            />
                                        </div>
                                    </div>

                                    {/* Preferred Communication */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
                                            Preferred Communication
                                        </label>
                                        <div className="flex gap-3">
                                            {['email', 'phone', 'whatsapp'].map((method) => (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, communication: method }))}
                                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all capitalize"
                                                    style={{
                                                        background: formData.communication === method
                                                            ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                                            : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                                        color: formData.communication === method ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                                                        border: `1px solid ${formData.communication === method ? 'transparent' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                                    }}
                                                >
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* NDA Checkbox */}
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="nda"
                                            checked={formData.nda}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded"
                                            style={{ accentColor: colors.primary }}
                                        />
                                        <span className="flex items-center gap-2 text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                                            <FaLock className="text-xs" style={{ color: colors.secondary }} />
                                            I'd like to sign an NDA before sharing details
                                        </span>
                                    </label>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg text-white transition-all duration-300 hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                            boxShadow: `0 15px 40px ${colors.primary}40`,
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <><FaSpinner className="animate-spin" /> Sending...</>
                                        ) : (
                                            <><FaPaperPlane /> Send Message</>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </ScrollReveal>

                    {/* RIGHT: Contact Info */}
                    <ScrollReveal animation="fadeRight" delay={200}>
                        <div className="space-y-5">
                            <h3
                                className="text-2xl font-bold mb-6"
                                style={{ color: isDark ? '#fff' : '#1e293b' }}
                            >
                                Get In Touch Instantly
                            </h3>

                            {contactMethods.map((method, idx) => (
                                <a
                                    key={idx}
                                    href={method.href || '#'}
                                    target={method.href?.startsWith('http') ? '_blank' : undefined}
                                    rel={method.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    className="group flex items-start gap-4 p-5 rounded-2xl transition-all duration-300 hover:-translate-x-1"
                                    style={{
                                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                    }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                                    >
                                        <method.icon className="text-white text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                                            {method.label}
                                        </h4>
                                        <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                            {method.value}
                                        </p>
                                    </div>
                                </a>
                            ))}

                            {/* Live Chat / Support */}
                            <div
                                className="p-6 rounded-2xl mt-6"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`,
                                    border: `1px solid ${colors.primary}20`,
                                }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <FaHeadset className="text-xl" style={{ color: colors.primary }} />
                                    <h4 className="font-bold" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                                        Need Immediate Help?
                                    </h4>
                                </div>
                                <p className="text-sm mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}>
                                    Our team is available Monday to Saturday, 8AM - 6PM EAT for urgent inquiries.
                                </p>
                                <a
                                    href="https://wa.me/254710398690"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                                    style={{ background: '#25D366', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}
                                >
                                    <FaWhatsapp /> Chat on WhatsApp
                                </a>
                            </div>

                            {/* Request a Call mini form */}
                            <div
                                className="p-6 rounded-2xl"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                }}
                            >
                                <h4 className="font-bold mb-3" style={{ color: isDark ? '#fff' : '#1e293b' }}>
                                    Request a Call Back
                                </h4>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        placeholder="Your phone number"
                                        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm outline-none"
                                        style={inputStyle}
                                    />
                                    <button
                                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                                    >
                                        Call Me
                                    </button>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </div>
        </section>
    );
};

export default Contacts;
