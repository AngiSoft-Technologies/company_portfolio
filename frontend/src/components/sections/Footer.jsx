import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet, apiPost } from '../../js/httpClient';
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
    const [footerData, setFooterData] = useState(null);
    const [contactData, setContactData] = useState(null);
    const [branding, setBranding] = useState(null);
    const [services, setServices] = useState([]);
    const [nlEmail, setNlEmail] = useState('');
    const [nlStatus, setNlStatus] = useState(''); // '' | 'loading' | 'success' | 'error'
    const [nlMessage, setNlMessage] = useState('');

    const handleSubscribe = async () => {
        if (!nlEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nlEmail)) {
            setNlStatus('error');
            setNlMessage('Please enter a valid email address.');
            return;
        }
        setNlStatus('loading');
        setNlMessage('');
        try {
            const res = await apiPost('/api/newsletter/subscribe', { email: nlEmail });
            setNlStatus('success');
            setNlMessage(res?.message || 'Thanks! Check your email to confirm your subscription.');
            setNlEmail('');
        } catch (err) {
            setNlStatus('error');
            setNlMessage(err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.');
        }
    };

    useEffect(() => {
        const fetchFooterData = async () => {
            try {
                const [footer, contact, brandingInfo, serviceList] = await Promise.all([
                    apiGet('/site/footer'),
                    apiGet('/site/contact'),
                    apiGet('/site/branding'),
                    apiGet('/services')
                ]);
                setFooterData(footer || null);
                setContactData(contact || null);
                setBranding(brandingInfo || null);
                setServices(Array.isArray(serviceList) ? serviceList.filter(s => s.published !== false) : []);
            } catch (err) {
                console.error('Failed to load footer data:', err);
            }
        };
        fetchFooterData();
    }, []);

    const sanitizeLinks = (links) => links.filter((link) => link && link.label && link.href);
    const servicesLinks = sanitizeLinks(services
        .filter((service) => service.slug)
        .slice(0, 5)
        .map((service) => ({
            label: service.title,
            href: `/service/${service.slug}`
        })));
    const companyLinks = sanitizeLinks(Array.isArray(footerData?.quickLinks) ? footerData.quickLinks : []);
    const supportLinks = sanitizeLinks(Array.isArray(footerData?.legalLinks) ? footerData.legalLinks : []);
    const newsletter = footerData?.newsletter;
    const copyright = footerData?.copyright
        ? footerData.copyright.replace('{year}', currentYear)
        : '';
    const description = footerData?.description || branding?.tagline || '';

    const socialLinks = [
        { icon: FaLinkedinIn, href: contactData?.social?.linkedin, label: 'LinkedIn' },
        { icon: FaTwitter, href: contactData?.social?.twitter, label: 'Twitter' },
        { icon: FaFacebookF, href: contactData?.social?.facebook, label: 'Facebook' },
        { icon: FaInstagram, href: contactData?.social?.instagram, label: 'Instagram' },
        { icon: FaGithub, href: contactData?.social?.github, label: 'GitHub' },
    ].filter(link => !!link.href);

    const contactInfo = [
        contactData?.email && { icon: FaEnvelope, text: contactData.email, href: `mailto:${contactData.email}` },
        contactData?.phone && { icon: FaPhone, text: contactData.phone, href: `tel:${contactData.phone.replace(/\\s/g, '')}` },
        (contactData?.address?.city || contactData?.address?.country) && {
            icon: FaMapMarkerAlt,
            text: [contactData?.address?.city, contactData?.address?.country].filter(Boolean).join(', '),
            href: '#'
        },
    ].filter(Boolean);

    const siteName = branding?.siteName || '';
    const [brandMain, ...brandRest] = siteName.split(' ');
    const brandSecondary = brandRest.join(' ');
    const logoSrc = isDark ? (branding?.logoDark || branding?.logo) : (branding?.logo || branding?.logoDark);

    const renderFooterLink = (link) => {
        const isExternal = /^https?:\/\//.test(link.href || '');
        const linkClasses = "text-white/60 hover:text-white transition-colors text-sm flex items-center gap-2 group";
        const content = (
            <>
                <FaChevronRight 
                    className="text-xs transition-transform group-hover:translate-x-1"
                    style={{ color: colors.primary }}
                />
                {link.label}
            </>
        );
        if (isExternal) {
            return (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                    {content}
                </a>
            );
        }
        return (
            <Link to={link.href} className={linkClasses}>
                {content}
            </Link>
        );
    };

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
                    {newsletter?.enabled !== false && (newsletter?.title || newsletter?.description) && (
                        <div 
                            className="mb-16 p-8 md:p-10 rounded-3xl"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 100%)`,
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="text-center md:text-left">
                                    {newsletter?.title && (
                                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                            {newsletter.title}
                                        </h3>
                                    )}
                                    {newsletter?.description && (
                                        <p className="text-white/60">
                                            {newsletter.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col w-full md:w-auto gap-3">
                                    <div className="flex w-full gap-3">
                                        <input 
                                            type="email" 
                                            placeholder="Enter your email"
                                            value={nlEmail}
                                            onChange={(e) => { setNlEmail(e.target.value); setNlStatus(''); setNlMessage(''); }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                                            className="flex-1 md:w-72 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:border-white/40 transition-colors"
                                            disabled={nlStatus === 'loading'}
                                        />
                                        <button 
                                            onClick={handleSubscribe}
                                            disabled={nlStatus === 'loading'}
                                            className="px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                boxShadow: `0 4px 20px ${colors.primary}40`
                                            }}
                                        >
                                            {nlStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                                            {nlStatus !== 'loading' && <FaArrowRight className="text-sm" />}
                                        </button>
                                    </div>
                                    {nlMessage && (
                                        <p className={`text-sm ${nlStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                            {nlMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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
                                    {logoSrc ? (
                                        <img src={logoSrc} alt={siteName || 'Brand'} className="w-8 h-8 object-contain" />
                                    ) : (
                                        <span className="text-white font-bold text-xl">{(brandMain || siteName || 'A').charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    {brandMain && (
                                        <span className="text-xl font-bold text-white">{brandMain}</span>
                                    )}
                                    {brandSecondary && (
                                        <span 
                                            className="text-xl font-light ml-1"
                                            style={{ color: colors.primary }}
                                        >
                                            {brandSecondary}
                                        </span>
                                    )}
                                </div>
                            </Link>
                            {description && (
                                <p className="text-white/60 mb-6 max-w-sm leading-relaxed">
                                    {description}
                                </p>
                            )}
                            
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
                        {servicesLinks.length > 0 && (
                            <div>
                                <h4 className="font-bold text-lg mb-5 text-white">Services</h4>
                                <ul className="space-y-3">
                                    {servicesLinks.map((link, idx) => (
                                        <li key={idx}>
                                            {renderFooterLink(link)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Company Links */}
                        {companyLinks.length > 0 && (
                            <div>
                                <h4 className="font-bold text-lg mb-5 text-white">Company</h4>
                                <ul className="space-y-3">
                                    {companyLinks.map((link, idx) => (
                                        <li key={idx}>
                                            {renderFooterLink(link)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Support Links */}
                        {supportLinks.length > 0 && (
                            <div>
                                <h4 className="font-bold text-lg mb-5 text-white">Support</h4>
                                <ul className="space-y-3">
                                    {supportLinks.map((link, idx) => (
                                        <li key={idx}>
                                            {renderFooterLink(link)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Bottom Bar */}
                    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        {copyright && (
                            <p className="text-white/50 text-sm text-center md:text-left">
                                {copyright}
                            </p>
                        )}
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
