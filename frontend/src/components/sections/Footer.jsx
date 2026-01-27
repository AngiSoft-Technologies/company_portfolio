import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { 
    FaLinkedinIn, 
    FaTwitter, 
    FaFacebookF, 
    FaInstagram, 
    FaGithub,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaArrowRight,
    FaHeart,
    FaChevronRight,
    FaLock
} from 'react-icons/fa';

const Footer = () => {
    const { colors, mode } = useTheme();
    const currentYear = new Date().getFullYear();
    const isDark = mode === 'dark';
    
    const footerLinks = {
        services: [
            { label: "Web Development", href: "/services" },
            { label: "Mobile Apps", href: "/services" },
            { label: "Cloud Solutions", href: "/services" },
            { label: "API Development", href: "/services" },
            { label: "UI/UX Design", href: "/services" },
        ],
        company: [
            { label: "About Us", href: "/#about" },
            { label: "Our Team", href: "/staff" },
            { label: "Projects", href: "/projects" },
            { label: "Blog", href: "/blog" },
            { label: "Testimonials", href: "/testimonials" },
        ],
        support: [
            { label: "Get a Quote", href: "/book" },
            { label: "Contact Us", href: "/#contact" },
            { label: "FAQs", href: "#" },
            { label: "Support", href: "#" },
            { label: "Privacy Policy", href: "#" },
        ],
    };

    const socialLinks = [
        { icon: FaLinkedinIn, href: '#', label: 'LinkedIn' },
        { icon: FaTwitter, href: '#', label: 'Twitter' },
        { icon: FaFacebookF, href: '#', label: 'Facebook' },
        { icon: FaInstagram, href: '#', label: 'Instagram' },
        { icon: FaGithub, href: '#', label: 'GitHub' },
    ];

    const contactInfo = [
        { icon: FaEnvelope, text: 'info@angisoft.tech', href: 'mailto:info@angisoft.tech' },
        { icon: FaPhone, text: '+254 700 000 000', href: 'tel:+254700000000' },
        { icon: FaMapMarkerAlt, text: 'Nairobi, Kenya', href: '#' },
    ];

    return (
        <footer className="relative overflow-hidden">
            {/* Top Wave */}
            <svg 
                className="absolute top-0 left-0 w-full h-12 -translate-y-full"
                viewBox="0 0 1440 48" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
            >
                <path 
                    d="M0 48H1440V0C1440 0 1320 24 1080 24C840 24 720 0 480 0C240 0 120 24 0 24V48Z" 
                    fill={isDark ? '#0f172a' : '#1e293b'}
                />
            </svg>

            {/* Main Footer */}
            <div 
                className="relative"
                style={{
                    background: isDark 
                        ? 'linear-gradient(180deg, #0f172a 0%, #020617 100%)'
                        : 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                }}
            >
                {/* Background Decorations */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div 
                        className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
                        style={{ background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)` }}
                    />
                    <div 
                        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-3xl"
                        style={{ background: `radial-gradient(circle, ${colors.secondary}10 0%, transparent 70%)` }}
                    />
                    
                    {/* Grid Pattern */}
                    <div 
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                            backgroundSize: '50px 50px'
                        }}
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-8">
                    {/* Newsletter Section */}
                    <div 
                        className="mb-16 p-8 md:p-10 rounded-3xl"
                        style={{
                            background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 100%)`,
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                    Stay Updated
                                </h3>
                                <p className="text-white/60">
                                    Subscribe to our newsletter for the latest updates and insights.
                                </p>
                            </div>
                            <div className="flex w-full md:w-auto gap-3">
                                <input 
                                    type="email" 
                                    placeholder="Enter your email"
                                    className="flex-1 md:w-72 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:border-white/40 transition-colors"
                                />
                                <button 
                                    className="px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center gap-2"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                        boxShadow: `0 4px 20px ${colors.primary}40`
                                    }}
                                >
                                    Subscribe
                                    <FaArrowRight className="text-sm" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Footer Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
                        {/* Brand Section */}
                        <div className="lg:col-span-2">
                            <Link to="/" className="flex items-center gap-3 mb-6">
                                <div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                                    }}
                                >
                                    <span className="text-white font-bold text-xl">A</span>
                                </div>
                                <div>
                                    <span className="text-xl font-bold text-white">AngiSoft</span>
                                    <span 
                                        className="text-xl font-light ml-1"
                                        style={{ color: colors.primary }}
                                    >
                                        Technologies
                                    </span>
                                </div>
                            </Link>
                            <p className="text-white/60 mb-6 max-w-sm leading-relaxed">
                                Transforming businesses through innovative software solutions. 
                                Your trusted partner in digital excellence since 2019.
                            </p>
                            
                            {/* Contact Info */}
                            <div className="space-y-3 mb-6">
                                {contactInfo.map((info, idx) => (
                                    <a 
                                        key={idx}
                                        href={info.href}
                                        className="flex items-center gap-3 text-white/60 hover:text-white transition-colors group"
                                    >
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors group-hover:scale-110"
                                            style={{ backgroundColor: `${colors.primary}20` }}
                                        >
                                            <info.icon 
                                                className="text-sm"
                                                style={{ color: colors.primary }}
                                            />
                                        </div>
                                        <span className="text-sm">{info.text}</span>
                                    </a>
                                ))}
                            </div>
                            
                            {/* Social Links */}
                            <div className="flex gap-3">
                                {socialLinks.map((social, idx) => (
                                    <a 
                                        key={idx}
                                        href={social.href}
                                        aria-label={social.label}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-1"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'rgba(255,255,255,0.7)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = colors.primary;
                                            e.currentTarget.style.borderColor = colors.primary;
                                            e.currentTarget.style.color = '#fff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                                        }}
                                    >
                                        <social.icon className="text-sm" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Services Links */}
                        <div>
                            <h4 className="font-bold text-lg mb-5 text-white">Services</h4>
                            <ul className="space-y-3">
                                {footerLinks.services.map((link, idx) => (
                                    <li key={idx}>
                                        <Link 
                                            to={link.href} 
                                            className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                                        >
                                            <FaChevronRight 
                                                className="text-xs transition-transform group-hover:translate-x-1"
                                                style={{ color: colors.primary }}
                                            />
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Company Links */}
                        <div>
                            <h4 className="font-bold text-lg mb-5 text-white">Company</h4>
                            <ul className="space-y-3">
                                {footerLinks.company.map((link, idx) => (
                                    <li key={idx}>
                                        <Link 
                                            to={link.href} 
                                            className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                                        >
                                            <FaChevronRight 
                                                className="text-xs transition-transform group-hover:translate-x-1"
                                                style={{ color: colors.primary }}
                                            />
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Support Links */}
                        <div>
                            <h4 className="font-bold text-lg mb-5 text-white">Support</h4>
                            <ul className="space-y-3">
                                {footerLinks.support.map((link, idx) => (
                                    <li key={idx}>
                                        <Link 
                                            to={link.href} 
                                            className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                                        >
                                            <FaChevronRight 
                                                className="text-xs transition-transform group-hover:translate-x-1"
                                                style={{ color: colors.primary }}
                                            />
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-white/50 text-sm text-center md:text-left">
                            © {currentYear} AngiSoft Technologies. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <Link
                                to="/admin/login"
                                className="text-white/40 text-sm hover:text-white/70 transition-colors flex items-center gap-2"
                            >
                                <FaLock className="text-xs" />
                                Staff Login
                            </Link>
                            <p className="text-white/50 text-sm flex items-center gap-1">
                                Made with <FaHeart className="text-red-500 mx-1" /> in Kenya
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
