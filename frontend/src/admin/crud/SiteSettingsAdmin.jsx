import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../js/httpClient';
import { 
    FaHome, 
    FaInfoCircle, 
    FaEnvelope, 
    FaPalette,
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

    useEffect(() => {
        fetchAllSettings();
    }, []);

    const fetchAllSettings = async () => {
        setLoading(true);
        try {
            const [heroData, aboutData, contactData, footerData, brandingData] = await Promise.all([
                apiGet(`${API_BASE}/hero`),
                apiGet(`${API_BASE}/about`),
                apiGet(`${API_BASE}/contact`),
                apiGet(`${API_BASE}/footer`),
                apiGet(`${API_BASE}/branding`)
            ]);
            setHero(heroData || {});
            setAbout(aboutData || {});
            setContact(contactData || {});
            setFooter(footerData || {});
            setBranding(brandingData || {});
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
        { id: 'branding', label: 'Branding', icon: FaPalette }
    ];

    const inputClass = `w-full px-4 py-3 rounded-lg border transition-all focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
        theme === 'dark' 
            ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' 
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
    }`;

    const labelClass = `block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`;

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
                                    placeholder="info@angisofttechnologies.com"
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
                                    placeholder="+254 700 000 000"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Alternative Phone</label>
                                <input
                                    type="tel"
                                    className={inputClass}
                                    value={contact.altPhone || ''}
                                    onChange={(e) => setContact({...contact, altPhone: e.target.value})}
                                    placeholder="+254 711 111 111"
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
        </div>
    );
};

export default SiteSettingsAdmin;
