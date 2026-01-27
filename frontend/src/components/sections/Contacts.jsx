import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { 
    FaEnvelope, 
    FaPhone, 
    FaMapMarkerAlt,
    FaClock,
    FaPaperPlane,
    FaLinkedin,
    FaTwitter,
    FaGithub,
    FaFacebook,
    FaInstagram,
    FaCheckCircle,
    FaSpinner
} from 'react-icons/fa';
import { ScrollReveal, GlassmorphismCard } from '../modern';

const Contacts = () => {
    const { colors, mode } = useTheme();
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
    const isDark = mode === 'dark';

    const defaultContact = {
        companyName: "AngiSoft Technologies",
        email: "info@angisofttechnologies.com",
        supportEmail: "support@angisofttechnologies.com",
        phone: "+254 700 000 000",
        altPhone: "+254 711 111 111",
        address: {
            street: "Westlands Business District",
            city: "Nairobi",
            country: "Kenya"
        },
        hours: {
            weekdays: "Mon - Fri: 8:00 AM - 6:00 PM",
            weekends: "Sat: 9:00 AM - 1:00 PM"
        },
        social: {
            linkedin: "#",
            twitter: "#",
            github: "#",
            facebook: "#",
            instagram: "#"
        }
    };

    useEffect(() => {
        const fetchContact = async () => {
            try {
                const data = await apiGet('/site/contact');
                setContactData(data || defaultContact);
            } catch (err) {
                console.error(err);
                setContactData(defaultContact);
            }
        };
        fetchContact();
    }, []);

    const contact = contactData || defaultContact;

    const contactInfo = [
        {
            icon: FaEnvelope,
            title: 'Email Us',
            details: [contact.email, contact.supportEmail].filter(Boolean),
            action: `mailto:${contact.email}`
        },
        {
            icon: FaPhone,
            title: 'Call Us',
            details: [contact.phone, contact.altPhone].filter(Boolean),
            action: `tel:${contact.phone?.replace(/\s/g, '')}`
        },
        {
            icon: FaMapMarkerAlt,
            title: 'Visit Us',
            details: [contact.address?.city + ', ' + contact.address?.country, contact.address?.street].filter(Boolean),
            action: 'https://maps.google.com'
        },
        {
            icon: FaClock,
            title: 'Working Hours',
            details: [contact.hours?.weekdays, contact.hours?.weekends].filter(Boolean),
            action: null
        }
    ];

    const socialLinks = [
        { icon: FaLinkedin, href: contact.social?.linkedin || '#', label: 'LinkedIn' },
        { icon: FaTwitter, href: contact.social?.twitter || '#', label: 'Twitter' },
        { icon: FaGithub, href: contact.social?.github || '#', label: 'GitHub' },
        { icon: FaFacebook, href: contact.social?.facebook || '#', label: 'Facebook' },
        { icon: FaInstagram, href: contact.social?.instagram || '#', label: 'Instagram' }
    ];

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        
        setTimeout(() => setIsSubmitted(false), 5000);
    };

    return (
        <section 
            id="contact" 
            className="relative py-28 overflow-hidden"
            style={{
                background: isDark 
                    ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)'
            }}
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}
                <div 
                    className="absolute w-[700px] h-[700px] rounded-full blur-3xl"
                    style={{ 
                        top: '-20%', 
                        right: '-20%', 
                        background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`
                    }}
                />
                <div 
                    className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
                    style={{ 
                        bottom: '-10%', 
                        left: '-10%', 
                        background: `radial-gradient(circle, ${colors.secondary}10 0%, transparent 70%)`
                    }}
                />
                
                {/* Decorative Lines */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                    {[...Array(10)].map((_, i) => (
                        <line 
                            key={i}
                            x1={`${i * 10}%`} 
                            y1="0" 
                            x2="100%" 
                            y2={`${100 - i * 10}%`} 
                            stroke={colors.primary}
                            strokeWidth="1"
                        />
                    ))}
                </svg>
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
                            <FaEnvelope />
                            Get In Touch
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
                            Contact Us
                        </h2>
                        <p 
                            className="text-lg md:text-xl max-w-2xl mx-auto"
                            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                        >
                            Have a project in mind? Let's discuss how we can help bring your ideas to life
                        </p>
                    </div>
                </ScrollReveal>

                <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
                    {/* Contact Info */}
                    <div className="lg:col-span-2 space-y-4 md:space-y-5">
                        <ScrollReveal animation="fadeLeft" delay={100}>
                            <div className="mb-8">
                                <h3 
                                    className="text-2xl font-bold mb-4"
                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                >
                                    Let's Talk
                                </h3>
                                <p 
                                    className="leading-relaxed"
                                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                >
                                    We're here to help and answer any questions you might have. 
                                    We look forward to hearing from you.
                                </p>
                            </div>
                        </ScrollReveal>

                        {contactInfo.map((info, idx) => (
                            <ScrollReveal key={idx} animation="fadeLeft" delay={150 + idx * 50}>
                                <a 
                                    href={info.action || '#'}
                                    className="group flex items-start gap-4 p-4 md:p-5 rounded-2xl transition-all duration-300 hover:-translate-x-1"
                                    style={{
                                        background: isDark 
                                            ? 'rgba(255,255,255,0.05)'
                                            : 'rgba(0,0,0,0.02)',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                                    }}
                                >
                                    <div 
                                        className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                        }}
                                    >
                                        <info.icon className="text-white text-base md:text-lg" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 
                                            className="font-semibold text-sm md:text-base mb-1"
                                            style={{ color: isDark ? '#fff' : '#1e293b' }}
                                        >
                                            {info.title}
                                        </h4>
                                        {info.details.map((detail, dIdx) => (
                                            <p 
                                                key={dIdx}
                                                className="text-xs md:text-sm leading-relaxed truncate"
                                                style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                                            >
                                                {detail}
                                            </p>
                                        ))}
                                    </div>
                                </a>
                            </ScrollReveal>
                        ))}

                        {/* Social Links */}
                        <ScrollReveal animation="fadeLeft" delay={400}>
                            <div className="pt-6">
                                <h4 
                                    className="font-semibold mb-4"
                                    style={{ color: isDark ? '#fff' : '#1e293b' }}
                                >
                                    Follow Us
                                </h4>
                                <div className="flex gap-3">
                                    {socialLinks.map((social, idx) => (
                                        <a 
                                            key={idx}
                                            href={social.href}
                                            aria-label={social.label}
                                            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 100%)`,
                                                color: colors.primary
                                            }}
                                        >
                                            <social.icon className="text-lg" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-3">
                        <ScrollReveal animation="fadeRight" delay={200}>
                            <div 
                                className="p-6 md:p-8 lg:p-10 rounded-3xl"
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
                                {isSubmitted ? (
                                    <div className="text-center py-12">
                                        <div 
                                            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                            }}
                                        >
                                            <FaCheckCircle className="text-white text-3xl" />
                                        </div>
                                        <h3 
                                            className="text-2xl font-bold mb-2"
                                            style={{ color: isDark ? '#fff' : '#1e293b' }}
                                        >
                                            Message Sent!
                                        </h3>
                                        <p style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                            Thank you for reaching out. We'll get back to you soon.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                            <div>
                                                <label 
                                                    className="block text-sm font-medium mb-2"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
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
                                                        color: isDark ? '#fff' : '#1e293b',
                                                        '--tw-ring-color': colors.primary
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label 
                                                    className="block text-sm font-medium mb-2"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
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
                                                        color: isDark ? '#fff' : '#1e293b'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label 
                                                    className="block text-sm font-medium mb-2"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
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
                                                        color: isDark ? '#fff' : '#1e293b'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label 
                                                    className="block text-sm font-medium mb-2"
                                                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
                                                >
                                                    Subject *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="subject"
                                                    value={formData.subject}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="Project Inquiry"
                                                    className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2"
                                                    style={{
                                                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                        color: isDark ? '#fff' : '#1e293b'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label 
                                                className="block text-sm font-medium mb-2"
                                                style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}
                                            >
                                                Your Message *
                                            </label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                rows={5}
                                                placeholder="Tell us about your project..."
                                                className="w-full px-5 py-3.5 rounded-xl outline-none transition-all focus:ring-2 resize-none"
                                                style={{
                                                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                    color: isDark ? '#fff' : '#1e293b'
                                                }}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg text-white transition-all duration-300 hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
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
                </div>

                {/* Map Section */}
                <ScrollReveal animation="fadeUp" delay={300}>
                    <div 
                        className="mt-20 rounded-3xl overflow-hidden h-[400px]"
                        style={{
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                        }}
                    >
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127635.89687807776!2d36.7052!3d-1.3031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f11655c311541%3A0x9dd769ac1c10b8f4!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1640000000000!5m2!1sen!2sus"
                            width="100%"
                            height="100%"
                            style={{ border: 0, filter: isDark ? 'invert(90%) hue-rotate(180deg)' : 'none' }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="AngiSoft Technologies Location"
                        />
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
};

export default Contacts;
