import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import {
    FaTachometerAlt, FaUser, FaProjectDiagram, FaCogs, FaServicestack,
    FaGraduationCap, FaBriefcase, FaAddressBook, FaQuoteRight, FaFileUpload,
    FaSignOutAlt, FaBars, FaTimes, FaCommentDots, FaHeart, FaStar,
    FaShareAlt, FaBell, FaEnvelope, FaUserCircle, FaArchive, FaCheck,
    FaTrash, FaChevronDown, FaMoon, FaSun, FaSearch, FaGlobe, FaBlog,
    FaRobot
} from 'react-icons/fa';
import { apiGet, apiPatch, apiDelete } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';

const navSections = [
    {
        title: 'Main',
        items: [
            { to: '/admin', label: 'Dashboard', icon: FaTachometerAlt },
            { to: '/admin/bookings', label: 'Bookings', icon: FaBriefcase },
            { to: '/admin/staff-dashboard', label: 'My Dashboard', icon: FaUserCircle },
        ]
    },
    {
        title: 'Management',
        items: [
            { to: '/admin/staff', label: 'Staff', icon: FaUser },
            { to: '/admin/services', label: 'Services', icon: FaServicestack },
            { to: '/admin/service-categories', label: 'Service Categories', icon: FaArchive },
            { to: '/admin/projects', label: 'Projects', icon: FaProjectDiagram },
        ]
    },
    {
        title: 'AI',
        items: [
            { to: '/admin/chat-conversations', label: 'Chatbot Leads', icon: FaRobot },
        ]
    },
    {
        title: 'Content',
        items: [
            { to: '/admin/site-settings', label: 'Site Settings', icon: FaGlobe },
            { to: '/admin/about', label: 'About', icon: FaUser },
            { to: '/admin/blog', label: 'Blog Posts', icon: FaBlog },
            { to: '/admin/testimonials', label: 'Testimonials', icon: FaCommentDots },
            { to: '/admin/quotes', label: 'Quotes', icon: FaQuoteRight },
        ]
    },
    {
        title: 'Profile',
        items: [
            { to: '/admin/skills', label: 'Skills', icon: FaCogs },
            { to: '/admin/education', label: 'Education', icon: FaGraduationCap },
            { to: '/admin/experience', label: 'Experience', icon: FaBriefcase },
        ]
    },
    {
        title: 'Settings',
        items: [
            { to: '/admin/upload', label: 'File Upload', icon: FaFileUpload },
            { to: '/admin/contacts', label: 'Contacts', icon: FaAddressBook },
            { to: '/admin/hobbies', label: 'Hobbies', icon: FaHeart },
            { to: '/admin/interests', label: 'Interests', icon: FaStar },
            { to: '/admin/social-media', label: 'Social Media', icon: FaShareAlt },
        ]
    }
];

const AdminLayout = ({ children }) => {
    const { colors, mode, toggleMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarMobile, setSidebarMobile] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [msgOpen, setMsgOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [messages, setMessages] = useState([]);
    const [realUsername, setRealUsername] = useState('Admin');
    const [expandedSections, setExpandedSections] = useState(['Main', 'Management']);
    
    const notifRef = useRef();
    const msgRef = useRef();
    const profileRef = useRef();

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(mode);
    }, [mode]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const notifs = await apiGet('/notifications');
                setNotifications(Array.isArray(notifs) ? notifs.filter(n => !n.archived) : []);
            } catch {}
            try {
                const msgs = await apiGet('/admin-messages');
                setMessages(Array.isArray(msgs) ? msgs.filter(m => !m.archived && !m.read).slice(0, 5) : []);
            } catch {}
        };
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchAdmin = async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) return;
            try {
                const res = await fetch('/api/admin/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRealUsername(data.username || data.name || 'Admin');
                }
            } catch {}
        };
        fetchAdmin();
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (msgOpen && msgRef.current && !msgRef.current.contains(e.target)) setMsgOpen(false);
            if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifOpen, msgOpen, profileOpen]);

    const markAllNotifsRead = async () => {
        await apiPatch('/notifications/read-all');
        setNotifications(n => n.map(x => ({ ...x, read: true })));
    };

    const archiveNotif = async id => {
        await apiPatch(`/notifications/${id}/archive`);
        setNotifications(n => n.filter(x => x._id !== id && x.id !== id));
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    const toggleSection = (title) => {
        setExpandedSections(prev => 
            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
        );
    };

    const unreadNotifs = notifications.filter(n => !n.read).length;

    return (
        <div 
            className="flex min-h-screen"
            style={{ backgroundColor: colors.backgroundSecondary }}
        >
            {/* Mobile sidebar overlay */}
            {sidebarMobile && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarMobile(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 h-screen z-50 transition-all duration-300 flex flex-col ${
                    sidebarMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } ${sidebarOpen ? 'w-64' : 'w-20'}`}
                style={{ 
                    backgroundColor: colors.surface,
                    borderRight: `1px solid ${colors.border}`
                }}
            >
                {/* Logo */}
                <div 
                    className="h-16 flex items-center justify-between px-4 border-b"
                    style={{ borderColor: colors.border }}
                >
                    {sidebarOpen && (
                        <span 
                            className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent"
                        >
                            Admin Panel
                        </span>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 lg:block hidden"
                        style={{ color: colors.textSecondary }}
                    >
                        <FaBars />
                    </button>
                    <button
                        onClick={() => setSidebarMobile(false)}
                        className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
                        style={{ color: colors.textSecondary }}
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    {navSections.map((section) => (
                        <div key={section.title} className="mb-4">
                            {sidebarOpen && (
                                <button
                                    onClick={() => toggleSection(section.title)}
                                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                                    style={{ color: colors.textMuted || colors.textSecondary }}
                                >
                                    {section.title}
                                    <FaChevronDown 
                                        className={`transition-transform ${expandedSections.includes(section.title) ? 'rotate-180' : ''}`}
                                        size={10}
                                    />
                                </button>
                            )}
                            
                            {(expandedSections.includes(section.title) || !sidebarOpen) && (
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.to || 
                                            (item.to !== '/admin' && location.pathname.startsWith(item.to));
                                        
                                        return (
                                            <NavLink
                                                key={item.to}
                                                to={item.to}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                                    sidebarOpen ? '' : 'justify-center'
                                                }`}
                                                style={{
                                                    backgroundColor: isActive ? `${colors.primary}15` : 'transparent',
                                                    color: isActive ? colors.primary : colors.text
                                                }}
                                                title={item.label}
                                            >
                                                <Icon size={18} />
                                                {sidebarOpen && (
                                                    <span className="font-medium text-sm">{item.label}</span>
                                                )}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Logout Button */}
                <div className="p-3 border-t" style={{ borderColor: colors.border }}>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ${
                            sidebarOpen ? '' : 'justify-center'
                        }`}
                    >
                        <FaSignOutAlt size={18} />
                        {sidebarOpen && <span className="font-medium text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
                sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
            }`}>
                {/* Header */}
                <header 
                    className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6"
                    style={{ 
                        backgroundColor: colors.surface,
                        borderBottom: `1px solid ${colors.border}`
                    }}
                >
                    {/* Left side */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarMobile(true)}
                            className="p-2 rounded-lg lg:hidden"
                            style={{ color: colors.text }}
                        >
                            <FaBars size={20} />
                        </button>

                        {/* Search Bar */}
                        <div 
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl"
                            style={{ 
                                backgroundColor: colors.backgroundSecondary,
                                border: `1px solid ${colors.border}`
                            }}
                        >
                            <FaSearch size={14} style={{ color: colors.textSecondary }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent outline-none text-sm w-48"
                                style={{ color: colors.text }}
                            />
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleMode}
                            className="p-2.5 rounded-xl transition-all"
                            style={{ 
                                backgroundColor: colors.backgroundSecondary,
                                color: colors.text
                            }}
                        >
                            {mode === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
                        </button>

                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setNotifOpen(!notifOpen)}
                                className="p-2.5 rounded-xl transition-all relative"
                                style={{ 
                                    backgroundColor: colors.backgroundSecondary,
                                    color: colors.text
                                }}
                            >
                                <FaBell size={18} />
                                {unreadNotifs > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {unreadNotifs}
                                    </span>
                                )}
                            </button>

                            {notifOpen && (
                                <div 
                                    className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden"
                                    style={{ 
                                        backgroundColor: colors.surface,
                                        border: `1px solid ${colors.border}`
                                    }}
                                >
                                    <div 
                                        className="px-4 py-3 border-b flex items-center justify-between"
                                        style={{ borderColor: colors.border }}
                                    >
                                        <h3 className="font-semibold" style={{ color: colors.text }}>
                                            Notifications
                                        </h3>
                                        {notifications.length > 0 && (
                                            <button 
                                                onClick={markAllNotifsRead}
                                                className="text-xs font-medium"
                                                style={{ color: colors.primary }}
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div 
                                                className="py-8 text-center"
                                                style={{ color: colors.textSecondary }}
                                            >
                                                No notifications
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((n) => (
                                                <div 
                                                    key={n.id || n._id}
                                                    className="px-4 py-3 border-b transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                    style={{ 
                                                        borderColor: colors.border,
                                                        backgroundColor: n.read ? 'transparent' : `${colors.primary}10`
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p 
                                                                className="text-sm"
                                                                style={{ color: colors.text }}
                                                            >
                                                                {n.text || n.message}
                                                            </p>
                                                            <p 
                                                                className="text-xs mt-1"
                                                                style={{ color: colors.textSecondary }}
                                                            >
                                                                {n.time || 'Just now'}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => archiveNotif(n.id || n._id)}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            <FaTimes size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="relative" ref={msgRef}>
                            <button
                                onClick={() => setMsgOpen(!msgOpen)}
                                className="p-2.5 rounded-xl transition-all relative"
                                style={{ 
                                    backgroundColor: colors.backgroundSecondary,
                                    color: colors.text
                                }}
                            >
                                <FaEnvelope size={18} />
                                {messages.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {messages.length}
                                    </span>
                                )}
                            </button>

                            {msgOpen && (
                                <div 
                                    className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden"
                                    style={{ 
                                        backgroundColor: colors.surface,
                                        border: `1px solid ${colors.border}`
                                    }}
                                >
                                    <div 
                                        className="px-4 py-3 border-b"
                                        style={{ borderColor: colors.border }}
                                    >
                                        <h3 className="font-semibold" style={{ color: colors.text }}>
                                            Messages
                                        </h3>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        {messages.length === 0 ? (
                                            <div 
                                                className="py-8 text-center"
                                                style={{ color: colors.textSecondary }}
                                            >
                                                No new messages
                                            </div>
                                        ) : (
                                            messages.map((m) => (
                                                <div 
                                                    key={m._id || m.id}
                                                    className="px-4 py-3 border-b transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                    style={{ borderColor: colors.border }}
                                                >
                                                    <p 
                                                        className="font-medium text-sm"
                                                        style={{ color: colors.text }}
                                                    >
                                                        {m.senders_name}
                                                    </p>
                                                    <p 
                                                        className="text-xs"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        {m.subject}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                                style={{ 
                                    backgroundColor: colors.backgroundSecondary,
                                    color: colors.text
                                }}
                            >
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`
                                    }}
                                >
                                    {realUsername.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden sm:block text-sm font-medium">{realUsername}</span>
                                <FaChevronDown size={12} className="hidden sm:block" />
                            </button>

                            {profileOpen && (
                                <div 
                                    className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl overflow-hidden"
                                    style={{ 
                                        backgroundColor: colors.surface,
                                        border: `1px solid ${colors.border}`
                                    }}
                                >
                                    <div 
                                        className="px-4 py-3 border-b"
                                        style={{ borderColor: colors.border }}
                                    >
                                        <p className="font-semibold" style={{ color: colors.text }}>
                                            {realUsername}
                                        </p>
                                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                                            Administrator
                                        </p>
                                    </div>
                                    <div className="py-2">
                                        <button
                                            onClick={() => navigate('/admin/staff-dashboard')}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                            style={{ color: colors.text }}
                                        >
                                            My Dashboard
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>

                {/* Footer */}
                <footer 
                    className="py-4 px-6 text-center text-sm"
                    style={{ 
                        color: colors.textSecondary,
                        borderTop: `1px solid ${colors.border}`
                    }}
                >
                    &copy; {new Date().getFullYear()} Angera Silas. All rights reserved.
                </footer>
            </div>
        </div>
    );
};

export default AdminLayout;
