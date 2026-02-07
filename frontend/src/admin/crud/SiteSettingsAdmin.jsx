import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../js/httpClient';
import { 
    FaHome, 
    FaInfoCircle, 
    FaEnvelope, 
    FaPalette,
    FaFont,
    FaClipboardList,
    FaSave,
    FaUndo,
    FaSpinner,
    FaCheckCircle,
    FaExclamationTriangle
} from 'react-icons/fa';

const API_BASE = '/site';

const SiteSettingsAdmin = ({ theme }) => {
    const [activeTab, setActiveTab] = useState('hero');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // All settings
    const [hero, setHero] = useState({});
    const [about, setAbout] = useState({});
    const [contact, setContact] = useState({});
    const [footer, setFooter] = useState({});
    const [branding, setBranding] = useState({});
    const [uiCopy, setUiCopy] = useState({});
    const [bookingSettings, setBookingSettings] = useState({});

    useEffect(() => {
        fetchAllSettings();
    }, []);

    const fetchAllSettings = async () => {
        setLoading(true);
        try {
            const [heroData, aboutData, contactData, footerData, brandingData, uiData, bookingData] = await Promise.all([
                apiGet(`${API_BASE}/hero`),
                apiGet(`${API_BASE}/about`),
                apiGet(`${API_BASE}/contact`),
                apiGet(`${API_BASE}/footer`),
                apiGet(`${API_BASE}/branding`),
                apiGet(`${API_BASE}/ui`),
                apiGet(`${API_BASE}/booking`)
            ]);
            setHero(heroData || {});
            setAbout(aboutData || {});
            setContact(contactData || {});
            setFooter(footerData || {});
            setBranding(brandingData || {});
            setUiCopy(uiData || {});
            setBookingSettings(bookingData || {});
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (key, data) => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await apiPut(`${API_BASE}/${key}`, data);
            setMessage({ type: 'success', text: `${key.charAt(0).toUpperCase() + key.slice(1)} settings saved successfully!` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: `Failed to save ${key} settings` });
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'hero', label: 'Hero Section', icon: FaHome },
        { id: 'about', label: 'About Section', icon: FaInfoCircle },
        { id: 'contact', label: 'Contact Info', icon: FaEnvelope },
        { id: 'branding', label: 'Branding', icon: FaPalette },
        { id: 'ui', label: 'UI Copy', icon: FaFont },
        { id: 'booking', label: 'Booking Copy', icon: FaClipboardList }
    ];

    const inputClass = `w-full px-4 py-3 rounded-lg border transition-all focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
        theme === 'dark' 
            ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' 
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
    }`;

    const labelClass = `block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`;

    const updateHomeCopy = (section, field, value) => {
        setUiCopy((prev) => ({
            ...prev,
            home: {
                ...(prev.home || {}),
                [section]: {
                    ...((prev.home || {})[section] || {}),
                    [field]: value
                }
            }
        }));
    };

    const updateHomeCta = (section, field, value) => {
        setUiCopy((prev) => ({
            ...prev,
            home: {
                ...(prev.home || {}),
                [section]: {
                    ...((prev.home || {})[section] || {}),
                    cta: {
                        ...(((prev.home || {})[section] || {}).cta || {}),
                        [field]: value
                    }
                }
            }
        }));
    };

    const updatePageCopy = (page, field, value) => {
        setUiCopy((prev) => ({
            ...prev,
            pages: {
                ...(prev.pages || {}),
                [page]: {
                    ...((prev.pages || {})[page] || {}),
                    [field]: value
                }
            }
        }));
    };

    const updatePageStats = (page, field, value) => {
        setUiCopy((prev) => ({
            ...prev,
            pages: {
                ...(prev.pages || {}),
                [page]: {
                    ...((prev.pages || {})[page] || {}),
                    stats: {
                        ...(((prev.pages || {})[page] || {}).stats || {}),
                        [field]: value
                    }
                }
            }
        }));
    };

    const updatePageCta = (page, field, value) => {
        setUiCopy((prev) => ({
            ...prev,
            pages: {
                ...(prev.pages || {}),
                [page]: {
                    ...((prev.pages || {})[page] || {}),
                    cta: {
                        ...(((prev.pages || {})[page] || {}).cta || {}),
                        [field]: value
                    }
                }
            }
        }));
    };

    const updateBooking = (field, value) => {
        setBookingSettings((prev) => ({ ...prev, [field]: value }));
    };

    const updateBookingNested = (section, field, value) => {
        setBookingSettings((prev) => ({
            ...prev,
            [section]: {
                ...(prev[section] || {}),
                [field]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center py-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <FaSpinner className="animate-spin text-4xl text-cyan-500" />
                <span className="ml-3 text-lg">Loading site settings...</span>
            </div>
        );
    }

    return (
        <div className={`site-settings-admin ${theme}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Site Settings
                    </h1>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        Manage your website's content and appearance
                    </p>
                </div>
                <button
                    onClick={fetchAllSettings}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-colors"
                >
                    <FaUndo size={14} />
                    Refresh
                </button>
            </div>

            {/* Message */}
            {message.text && (
                <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
                    message.type === 'success' 
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                        : 'bg-red-500/20 border border-red-500/30 text-red-400'
                }`}>
                    {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                            activeTab === tab.id
                                ? 'bg-cyan-500 text-white'
                                : theme === 'dark'
                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Hero Section Tab */}
            {activeTab === 'hero' && (
                <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Hero Section Content
                    </h2>
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Headline</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={hero.headline || ''}
                                    onChange={(e) => setHero({...hero, headline: e.target.value})}
                                    placeholder="Building Tomorrow's"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Highlight Text</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={hero.headlineHighlight || ''}
                                    onChange={(e) => setHero({...hero, headlineHighlight: e.target.value})}
                                    placeholder="Digital Solutions"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Subheadline</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={hero.subheadline || ''}
                                    onChange={(e) => setHero({...hero, subheadline: e.target.value})}
                                    placeholder="Today"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Tagline</label>
                            <textarea
                                className={inputClass}
                                rows={3}
                                value={hero.tagline || ''}
                                onChange={(e) => setHero({...hero, tagline: e.target.value})}
                                placeholder="We transform ideas into powerful software products..."
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Primary CTA Text</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={hero.ctaPrimary?.text || ''}
                                    onChange={(e) => setHero({...hero, ctaPrimary: {...(hero.ctaPrimary || {}), text: e.target.value}})}
                                    placeholder="Start Your Project"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Primary CTA Link</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={hero.ctaPrimary?.link || ''}
                                    onChange={(e) => setHero({...hero, ctaPrimary: {...(hero.ctaPrimary || {}), link: e.target.value}})}
                                    placeholder="/booking"
                                />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Background Video URL</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={hero.backgroundVideo || ''}
                                    onChange={(e) => setHero({...hero, backgroundVideo: e.target.value})}
                                    placeholder="/videos/hero-bg.mp4"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Background Image URL</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={hero.backgroundImage || ''}
                                    onChange={(e) => setHero({...hero, backgroundImage: e.target.value})}
                                    placeholder="/images/hero-bg.jpg"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => saveSettings('hero', hero)}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Save Hero Settings
                        </button>
                    </div>
                </div>
            )}

            {/* About Section Tab */}
            {activeTab === 'about' && (
                <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        About Section Content
                    </h2>
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Title</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={about.title || ''}
                                    onChange={(e) => setAbout({...about, title: e.target.value})}
                                    placeholder="Who We Are"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Subtitle</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={about.subtitle || ''}
                                    onChange={(e) => setAbout({...about, subtitle: e.target.value})}
                                    placeholder="Your Trusted Technology Partner"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Description (one paragraph per line)</label>
                            <textarea
                                className={inputClass}
                                rows={6}
                                value={Array.isArray(about.description) ? about.description.join('\n\n') : about.description || ''}
                                onChange={(e) => setAbout({...about, description: e.target.value.split('\n\n').filter(p => p.trim())})}
                                placeholder="AngiSoft Technologies is a premier software development company..."
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Achievements (one per line)</label>
                            <textarea
                                className={inputClass}
                                rows={4}
                                value={Array.isArray(about.achievements) ? about.achievements.join('\n') : ''}
                                onChange={(e) => setAbout({...about, achievements: e.target.value.split('\n').filter(a => a.trim())})}
                                placeholder="ISO 27001 Security Standards Compliant&#10;24/7 Support & Maintenance"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => saveSettings('about', about)}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Save About Settings
                        </button>
                    </div>
                </div>
            )}

            {/* Contact Info Tab */}
            {activeTab === 'contact' && (
                <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Contact Information
                    </h2>
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Company Name</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={contact.companyName || ''}
                                    onChange={(e) => setContact({...contact, companyName: e.target.value})}
                                    placeholder="AngiSoft Technologies"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Primary Email</label>
                                <input
                                    type="email"
                                    className={inputClass}
                                    value={contact.email || ''}
                                    onChange={(e) => setContact({...contact, email: e.target.value})}
                                    placeholder="info@angisoft.co.ke"
                                />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Phone Number</label>
                                <input
                                    type="tel"
                                    className={inputClass}
                                    value={contact.phone || ''}
                                    onChange={(e) => setContact({...contact, phone: e.target.value})}
                                    placeholder="+254710398690"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Alternative Phone</label>
                                <input
                                    type="tel"
                                    className={inputClass}
                                    value={contact.altPhone || ''}
                                    onChange={(e) => setContact({...contact, altPhone: e.target.value})}
                                    placeholder="+254710398690"
                                />
                            </div>
                        </div>
                        
                        <h3 className={`font-semibold mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            Address
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Street</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={contact.address?.street || ''}
                                    onChange={(e) => setContact({...contact, address: {...(contact.address || {}), street: e.target.value}})}
                                    placeholder="Kimathi Street"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>City</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={contact.address?.city || ''}
                                    onChange={(e) => setContact({...contact, address: {...(contact.address || {}), city: e.target.value}})}
                                    placeholder="Nairobi"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Country</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={contact.address?.country || ''}
                                    onChange={(e) => setContact({...contact, address: {...(contact.address || {}), country: e.target.value}})}
                                    placeholder="Kenya"
                                />
                            </div>
                        </div>

                        <h3 className={`font-semibold mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            Social Media Links
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>LinkedIn</label>
                                <input
                                    type="url"
                                    className={inputClass}
                                    value={contact.social?.linkedin || ''}
                                    onChange={(e) => setContact({...contact, social: {...(contact.social || {}), linkedin: e.target.value}})}
                                    placeholder="https://linkedin.com/company/..."
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Twitter/X</label>
                                <input
                                    type="url"
                                    className={inputClass}
                                    value={contact.social?.twitter || ''}
                                    onChange={(e) => setContact({...contact, social: {...(contact.social || {}), twitter: e.target.value}})}
                                    placeholder="https://twitter.com/..."
                                />
                            </div>
                            <div>
                                <label className={labelClass}>GitHub</label>
                                <input
                                    type="url"
                                    className={inputClass}
                                    value={contact.social?.github || ''}
                                    onChange={(e) => setContact({...contact, social: {...(contact.social || {}), github: e.target.value}})}
                                    placeholder="https://github.com/..."
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Facebook</label>
                                <input
                                    type="url"
                                    className={inputClass}
                                    value={contact.social?.facebook || ''}
                                    onChange={(e) => setContact({...contact, social: {...(contact.social || {}), facebook: e.target.value}})}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => saveSettings('contact', contact)}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Save Contact Settings
                        </button>
                    </div>
                </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
                <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Branding Settings
                    </h2>
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Site Name</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={branding.siteName || ''}
                                    onChange={(e) => setBranding({...branding, siteName: e.target.value})}
                                    placeholder="AngiSoft Technologies"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Tagline</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={branding.tagline || ''}
                                    onChange={(e) => setBranding({...branding, tagline: e.target.value})}
                                    placeholder="Building Tomorrow's Digital Solutions Today"
                                />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Logo URL (Light)</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={branding.logo || ''}
                                    onChange={(e) => setBranding({...branding, logo: e.target.value})}
                                    placeholder="/images/logo.png"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Logo URL (Dark)</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={branding.logoDark || ''}
                                    onChange={(e) => setBranding({...branding, logoDark: e.target.value})}
                                    placeholder="/images/logo-dark.png"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Favicon URL</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={branding.favicon || ''}
                                    onChange={(e) => setBranding({...branding, favicon: e.target.value})}
                                    placeholder="/favicon.ico"
                                />
                            </div>
                        </div>

                        <h3 className={`font-semibold mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            Brand Colors
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Primary Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        className="w-12 h-12 rounded cursor-pointer"
                                        value={branding.colors?.primary || '#0891b2'}
                                        onChange={(e) => setBranding({...branding, colors: {...(branding.colors || {}), primary: e.target.value}})}
                                    />
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={branding.colors?.primary || '#0891b2'}
                                        onChange={(e) => setBranding({...branding, colors: {...(branding.colors || {}), primary: e.target.value}})}
                                        placeholder="#0891b2"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Secondary Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        className="w-12 h-12 rounded cursor-pointer"
                                        value={branding.colors?.secondary || '#06b6d4'}
                                        onChange={(e) => setBranding({...branding, colors: {...(branding.colors || {}), secondary: e.target.value}})}
                                    />
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={branding.colors?.secondary || '#06b6d4'}
                                        onChange={(e) => setBranding({...branding, colors: {...(branding.colors || {}), secondary: e.target.value}})}
                                        placeholder="#06b6d4"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Accent Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        className="w-12 h-12 rounded cursor-pointer"
                                        value={branding.colors?.accent || '#f59e0b'}
                                        onChange={(e) => setBranding({...branding, colors: {...(branding.colors || {}), accent: e.target.value}})}
                                    />
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={branding.colors?.accent || '#f59e0b'}
                                        onChange={(e) => setBranding({...branding, colors: {...(branding.colors || {}), accent: e.target.value}})}
                                        placeholder="#f59e0b"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => saveSettings('branding', branding)}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Save Branding Settings
                        </button>
                    </div>
                </div>
            )}

            {/* UI Copy Tab */}
            {activeTab === 'ui' && (
                <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        UI Copy Settings
                    </h2>
                    <div className="grid gap-8">
                        <div>
                            <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                                Home Page Sections
                            </h3>
                            <div className="grid gap-6">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Hero Welcome Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.hero?.welcomeLabel || ''}
                                            onChange={(e) => updateHomeCopy('hero', 'welcomeLabel', e.target.value)}
                                            placeholder="Welcome to"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Hero Showreel Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.hero?.showreelLabel || ''}
                                            onChange={(e) => updateHomeCopy('hero', 'showreelLabel', e.target.value)}
                                            placeholder="Watch Our Showreel"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>About Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.about?.badge || ''}
                                            onChange={(e) => updateHomeCopy('about', 'badge', e.target.value)}
                                            placeholder="About Us"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>About Story Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.about?.storyLabel || ''}
                                            onChange={(e) => updateHomeCopy('about', 'storyLabel', e.target.value)}
                                            placeholder="Our Story"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>About Values Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.about?.valuesTitle || ''}
                                            onChange={(e) => updateHomeCopy('about', 'valuesTitle', e.target.value)}
                                            placeholder="Our Core Values"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className={labelClass}>About Values Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.about?.valuesSubtitle || ''}
                                            onChange={(e) => updateHomeCopy('about', 'valuesSubtitle', e.target.value)}
                                            placeholder="The principles that guide everything we do"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Services Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.badge || ''}
                                            onChange={(e) => updateHomeCopy('services', 'badge', e.target.value)}
                                            placeholder="Our Services"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.title || ''}
                                            onChange={(e) => updateHomeCopy('services', 'title', e.target.value)}
                                            placeholder="What We Offer"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.subtitle || ''}
                                            onChange={(e) => updateHomeCopy('services', 'subtitle', e.target.value)}
                                            placeholder="Describe your services"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services CTA Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.cta?.title || ''}
                                            onChange={(e) => updateHomeCta('services', 'title', e.target.value)}
                                            placeholder="Ready to Start Your Project?"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services CTA Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.cta?.subtitle || ''}
                                            onChange={(e) => updateHomeCta('services', 'subtitle', e.target.value)}
                                            placeholder="CTA description"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services CTA Primary Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.cta?.primaryLabel || ''}
                                            onChange={(e) => updateHomeCta('services', 'primaryLabel', e.target.value)}
                                            placeholder="View All Services"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services CTA Primary Link</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.cta?.primaryLink || ''}
                                            onChange={(e) => updateHomeCta('services', 'primaryLink', e.target.value)}
                                            placeholder="/services"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services CTA Secondary Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.cta?.secondaryLabel || ''}
                                            onChange={(e) => updateHomeCta('services', 'secondaryLabel', e.target.value)}
                                            placeholder="Get Free Quote"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services CTA Secondary Link</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.services?.cta?.secondaryLink || ''}
                                            onChange={(e) => updateHomeCta('services', 'secondaryLink', e.target.value)}
                                            placeholder="/book"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Projects Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.projects?.badge || ''}
                                            onChange={(e) => updateHomeCopy('projects', 'badge', e.target.value)}
                                            placeholder="Our Portfolio"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.projects?.title || ''}
                                            onChange={(e) => updateHomeCopy('projects', 'title', e.target.value)}
                                            placeholder="Featured Projects"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.projects?.subtitle || ''}
                                            onChange={(e) => updateHomeCopy('projects', 'subtitle', e.target.value)}
                                            placeholder="Explore our latest work"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects CTA Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.projects?.ctaLabel || ''}
                                            onChange={(e) => updateHomeCopy('projects', 'ctaLabel', e.target.value)}
                                            placeholder="View All Projects"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Blog Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.blog?.badge || ''}
                                            onChange={(e) => updateHomeCopy('blog', 'badge', e.target.value)}
                                            placeholder="Our Blog"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.blog?.title || ''}
                                            onChange={(e) => updateHomeCopy('blog', 'title', e.target.value)}
                                            placeholder="Latest Insights"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.blog?.subtitle || ''}
                                            onChange={(e) => updateHomeCopy('blog', 'subtitle', e.target.value)}
                                            placeholder="Thoughts and tutorials"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog CTA Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.blog?.ctaLabel || ''}
                                            onChange={(e) => updateHomeCopy('blog', 'ctaLabel', e.target.value)}
                                            placeholder="View All Articles"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog Featured Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.blog?.featuredLabel || ''}
                                            onChange={(e) => updateHomeCopy('blog', 'featuredLabel', e.target.value)}
                                            placeholder="Featured"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog Read Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.blog?.readLabel || ''}
                                            onChange={(e) => updateHomeCopy('blog', 'readLabel', e.target.value)}
                                            placeholder="Read"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Testimonials Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.testimonials?.badge || ''}
                                            onChange={(e) => updateHomeCopy('testimonials', 'badge', e.target.value)}
                                            placeholder="Testimonials"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Testimonials Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.testimonials?.title || ''}
                                            onChange={(e) => updateHomeCopy('testimonials', 'title', e.target.value)}
                                            placeholder="What Our Clients Say"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Testimonials Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.testimonials?.subtitle || ''}
                                            onChange={(e) => updateHomeCopy('testimonials', 'subtitle', e.target.value)}
                                            placeholder="Trusted by businesses"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Team Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.team?.badge || ''}
                                            onChange={(e) => updateHomeCopy('team', 'badge', e.target.value)}
                                            placeholder="Our Team"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Team Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.team?.title || ''}
                                            onChange={(e) => updateHomeCopy('team', 'title', e.target.value)}
                                            placeholder="Meet The Experts"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Team Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.team?.subtitle || ''}
                                            onChange={(e) => updateHomeCopy('team', 'subtitle', e.target.value)}
                                            placeholder="A talented team..."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Team CTA Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.team?.ctaLabel || ''}
                                            onChange={(e) => updateHomeCopy('team', 'ctaLabel', e.target.value)}
                                            placeholder="View Full Team"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Contact Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.contact?.badge || ''}
                                            onChange={(e) => updateHomeCopy('contact', 'badge', e.target.value)}
                                            placeholder="Get In Touch"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Contact Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.contact?.title || ''}
                                            onChange={(e) => updateHomeCopy('contact', 'title', e.target.value)}
                                            placeholder="Contact Us"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Contact Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.contact?.subtitle || ''}
                                            onChange={(e) => updateHomeCopy('contact', 'subtitle', e.target.value)}
                                            placeholder="Have a project in mind?"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Contact Intro Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.contact?.introTitle || ''}
                                            onChange={(e) => updateHomeCopy('contact', 'introTitle', e.target.value)}
                                            placeholder="Let's Talk"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Contact Intro Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.contact?.introSubtitle || ''}
                                            onChange={(e) => updateHomeCopy('contact', 'introSubtitle', e.target.value)}
                                            placeholder="We are here to help..."
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Skills Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.skills?.title || ''}
                                            onChange={(e) => updateHomeCopy('skills', 'title', e.target.value)}
                                            placeholder="Technologies We Use"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Skills Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.home?.skills?.subtitle || ''}
                                            onChange={(e) => updateHomeCopy('skills', 'subtitle', e.target.value)}
                                            placeholder="We leverage the latest technologies..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                                Page Copy
                            </h3>
                            <div className="grid gap-6">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Services Page Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.services?.badge || ''}
                                            onChange={(e) => updatePageCopy('services', 'badge', e.target.value)}
                                            placeholder="Our Expertise"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services Page Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.services?.title || ''}
                                            onChange={(e) => updatePageCopy('services', 'title', e.target.value)}
                                            placeholder="Our Services"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Services Page Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.services?.subtitle || ''}
                                            onChange={(e) => updatePageCopy('services', 'subtitle', e.target.value)}
                                            placeholder="Software, data, and cyber solutions..."
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className={labelClass}>Services Feature Badges (one per line)</label>
                                        <textarea
                                            className={inputClass}
                                            rows={4}
                                            value={Array.isArray(uiCopy.pages?.services?.featureBadges) ? uiCopy.pages.services.featureBadges.join('\n') : ''}
                                            onChange={(e) => updatePageCopy('services', 'featureBadges', e.target.value.split('\n').filter(l => l.trim()))}
                                            placeholder="Custom Software&#10;Data Analysis&#10;Cyber Services"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Projects Page Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.badge || ''}
                                            onChange={(e) => updatePageCopy('projects', 'badge', e.target.value)}
                                            placeholder="Portfolio"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects Page Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.title || ''}
                                            onChange={(e) => updatePageCopy('projects', 'title', e.target.value)}
                                            placeholder="Our Projects"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects Page Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.subtitle || ''}
                                            onChange={(e) => updatePageCopy('projects', 'subtitle', e.target.value)}
                                            placeholder="Discover our portfolio..."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects Total Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.stats?.totalLabel || ''}
                                            onChange={(e) => updatePageStats('projects', 'totalLabel', e.target.value)}
                                            placeholder="Total Projects"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects Categories Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.stats?.categoriesLabel || ''}
                                            onChange={(e) => updatePageStats('projects', 'categoriesLabel', e.target.value)}
                                            placeholder="Categories"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects Featured Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.stats?.featuredLabel || ''}
                                            onChange={(e) => updatePageStats('projects', 'featuredLabel', e.target.value)}
                                            placeholder="Featured"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className={labelClass}>Projects Empty State</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.emptyMessage || ''}
                                            onChange={(e) => updatePageCopy('projects', 'emptyMessage', e.target.value)}
                                            placeholder="No projects found in this category..."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects CTA Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.cta?.title || ''}
                                            onChange={(e) => updatePageCta('projects', 'title', e.target.value)}
                                            placeholder="Have a Project in Mind?"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects CTA Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.cta?.subtitle || ''}
                                            onChange={(e) => updatePageCta('projects', 'subtitle', e.target.value)}
                                            placeholder="Let's collaborate..."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects CTA Primary Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.cta?.primaryLabel || ''}
                                            onChange={(e) => updatePageCta('projects', 'primaryLabel', e.target.value)}
                                            placeholder="Start a Project"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects CTA Primary Link</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.cta?.primaryLink || ''}
                                            onChange={(e) => updatePageCta('projects', 'primaryLink', e.target.value)}
                                            placeholder="/book"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects CTA Secondary Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.cta?.secondaryLabel || ''}
                                            onChange={(e) => updatePageCta('projects', 'secondaryLabel', e.target.value)}
                                            placeholder="Contact Us"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Projects CTA Secondary Link</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.projects?.cta?.secondaryLink || ''}
                                            onChange={(e) => updatePageCta('projects', 'secondaryLink', e.target.value)}
                                            placeholder="/#contact"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Testimonials Page Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.testimonials?.badge || ''}
                                            onChange={(e) => updatePageCopy('testimonials', 'badge', e.target.value)}
                                            placeholder="Client Reviews"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Testimonials Page Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.testimonials?.title || ''}
                                            onChange={(e) => updatePageCopy('testimonials', 'title', e.target.value)}
                                            placeholder="What Our Clients Say"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Testimonials Page Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.testimonials?.subtitle || ''}
                                            onChange={(e) => updatePageCopy('testimonials', 'subtitle', e.target.value)}
                                            placeholder="Real feedback..."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Testimonials Clients Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.testimonials?.stats?.clientsLabel || ''}
                                            onChange={(e) => updatePageStats('testimonials', 'clientsLabel', e.target.value)}
                                            placeholder="Happy Clients"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Testimonials Rating Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.testimonials?.stats?.ratingLabel || ''}
                                            onChange={(e) => updatePageStats('testimonials', 'ratingLabel', e.target.value)}
                                            placeholder="Avg Rating"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Testimonials Satisfaction Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.testimonials?.stats?.satisfactionLabel || ''}
                                            onChange={(e) => updatePageStats('testimonials', 'satisfactionLabel', e.target.value)}
                                            placeholder="Satisfaction"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Blog Page Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.blog?.badge || ''}
                                            onChange={(e) => updatePageCopy('blog', 'badge', e.target.value)}
                                            placeholder="Blog"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog Page Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.blog?.title || ''}
                                            onChange={(e) => updatePageCopy('blog', 'title', e.target.value)}
                                            placeholder="Insights & Updates"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog Page Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.blog?.subtitle || ''}
                                            onChange={(e) => updatePageCopy('blog', 'subtitle', e.target.value)}
                                            placeholder="News, guides, and announcements from our team."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Blog Page CTA Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.blog?.ctaLabel || ''}
                                            onChange={(e) => updatePageCopy('blog', 'ctaLabel', e.target.value)}
                                            placeholder="View All Articles"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Team Page Badge</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.staff?.badge || ''}
                                            onChange={(e) => updatePageCopy('staff', 'badge', e.target.value)}
                                            placeholder="Meet the Team"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Team Page Title</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.staff?.title || ''}
                                            onChange={(e) => updatePageCopy('staff', 'title', e.target.value)}
                                            placeholder="Our Team"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Team Page Subtitle</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.staff?.subtitle || ''}
                                            onChange={(e) => updatePageCopy('staff', 'subtitle', e.target.value)}
                                            placeholder="The talented experts..."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Team Members Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.staff?.stats?.teamLabel || ''}
                                            onChange={(e) => updatePageStats('staff', 'teamLabel', e.target.value)}
                                            placeholder="Team Members"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Departments Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.staff?.stats?.departmentsLabel || ''}
                                            onChange={(e) => updatePageStats('staff', 'departmentsLabel', e.target.value)}
                                            placeholder="Departments"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Experience Label</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.staff?.stats?.experienceLabel || ''}
                                            onChange={(e) => updatePageStats('staff', 'experienceLabel', e.target.value)}
                                            placeholder="Years Experience"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Experience Value</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={uiCopy.pages?.staff?.stats?.experienceValue || ''}
                                            onChange={(e) => updatePageStats('staff', 'experienceValue', e.target.value)}
                                            placeholder="5+"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => saveSettings('ui', uiCopy)}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Save UI Copy
                        </button>
                    </div>
                </div>
            )}

            {/* Booking Copy Tab */}
            {activeTab === 'booking' && (
                <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Booking Page Copy
                    </h2>
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Hero Badge</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.hero?.badge || ''}
                                    onChange={(e) => updateBookingNested('hero', 'badge', e.target.value)}
                                    placeholder="Start Your Project"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Hero Title</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.hero?.title || ''}
                                    onChange={(e) => updateBookingNested('hero', 'title', e.target.value)}
                                    placeholder="Request a"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Hero Highlight</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.hero?.highlight || ''}
                                    onChange={(e) => updateBookingNested('hero', 'highlight', e.target.value)}
                                    placeholder="Project"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Success Title</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.success?.title || ''}
                                    onChange={(e) => updateBookingNested('success', 'title', e.target.value)}
                                    placeholder="Booking Submitted!"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Success Message</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.success?.message || ''}
                                    onChange={(e) => updateBookingNested('success', 'message', e.target.value)}
                                    placeholder="Your booking has been received..."
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Label: Next</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.labels?.next || ''}
                                    onChange={(e) => updateBookingNested('labels', 'next', e.target.value)}
                                    placeholder="Next"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Label: Back</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.labels?.back || ''}
                                    onChange={(e) => updateBookingNested('labels', 'back', e.target.value)}
                                    placeholder="Back"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Label: Submit</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.labels?.submit || ''}
                                    onChange={(e) => updateBookingNested('labels', 'submit', e.target.value)}
                                    placeholder="Submit Request"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Label: Submitting</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.labels?.submitting || ''}
                                    onChange={(e) => updateBookingNested('labels', 'submitting', e.target.value)}
                                    placeholder="Submitting..."
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Label: View Status</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.labels?.viewStatus || ''}
                                    onChange={(e) => updateBookingNested('labels', 'viewStatus', e.target.value)}
                                    placeholder="View Status"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Label: Return Home</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.labels?.returnHome || ''}
                                    onChange={(e) => updateBookingNested('labels', 'returnHome', e.target.value)}
                                    placeholder="Return Home"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Booking Steps (one per line: Title|Icon)</label>
                            <textarea
                                className={inputClass}
                                rows={4}
                                value={Array.isArray(bookingSettings.steps) ? bookingSettings.steps.map((s) => `${s.title || ''}|${s.icon || ''}`).join('\n') : ''}
                                onChange={(e) => {
                                    const steps = e.target.value.split('\n').map((line) => {
                                        const [title, icon] = line.split('|');
                                        return { title: (title || '').trim(), icon: (icon || '').trim() };
                                    }).filter((step) => step.title);
                                    updateBooking('steps', steps);
                                }}
                                placeholder="Basic Info|FaUser&#10;Details|FaFileAlt&#10;Files|FaCloudUploadAlt"
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Payment Step Title</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.paymentStep?.title || ''}
                                    onChange={(e) => updateBookingNested('paymentStep', 'title', e.target.value)}
                                    placeholder="Payment"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Payment Step Icon</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={bookingSettings.paymentStep?.icon || ''}
                                    onChange={(e) => updateBookingNested('paymentStep', 'icon', e.target.value)}
                                    placeholder="FaCreditCard"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Project Types (one per line: VALUE|Label|Icon)</label>
                            <textarea
                                className={inputClass}
                                rows={6}
                                value={Array.isArray(bookingSettings.projectTypes) ? bookingSettings.projectTypes.map((t) => `${t.value || ''}|${t.label || ''}|${t.icon || ''}`).join('\n') : ''}
                                onChange={(e) => {
                                    const types = e.target.value.split('\n').map((line) => {
                                        const [value, label, icon] = line.split('|');
                                        return { value: (value || '').trim(), label: (label || '').trim(), icon: (icon || '').trim() };
                                    }).filter((type) => type.value && type.label);
                                    updateBooking('projectTypes', types);
                                }}
                                placeholder="SOFTWARE|Software Development|💻"
                            />
                            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                Values must match backend ProjectType enums.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => saveSettings('booking', bookingSettings)}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Save Booking Copy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiteSettingsAdmin;
