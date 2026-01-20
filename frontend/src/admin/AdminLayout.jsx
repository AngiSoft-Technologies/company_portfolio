import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaUser, FaProjectDiagram, FaCogs, FaServicestack, FaGraduationCap, FaBriefcase, FaAddressBook, FaQuoteRight, FaFileUpload, FaSignOutAlt, FaBars, FaTimes, FaCommentDots, FaHeart, FaStar, FaShareAlt, FaBell, FaEnvelope, FaMoon, FaSun, FaUserCircle, FaArchive, FaCheck, FaTrash } from 'react-icons/fa';
import { apiGet, apiPatch, apiDelete } from '../js/httpClient';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
  { to: '/admin/bookings', label: 'Bookings', icon: <FaBriefcase /> },
  { to: '/admin/staff', label: 'Staff Management', icon: <FaUser /> },
  { to: '/admin/staff-dashboard', label: 'My Dashboard', icon: <FaUserCircle /> },
  { to: '/admin/services', label: 'Services', icon: <FaServicestack /> },
  { to: '/admin/projects', label: 'Projects', icon: <FaProjectDiagram /> },
  { to: '/admin/upload', label: 'File Upload', icon: <FaFileUpload /> },
  { to: '/admin/about', label: 'About', icon: <FaUser /> },
  { to: '/admin/skills', label: 'Skills', icon: <FaCogs /> },
  { to: '/admin/education', label: 'Education', icon: <FaGraduationCap /> },
  { to: '/admin/experience', label: 'Experience', icon: <FaBriefcase /> },
  { to: '/admin/contacts', label: 'Contacts', icon: <FaAddressBook /> },
  { to: '/admin/testimonials', label: 'Testimonials', icon: <FaCommentDots /> },
  { to: '/admin/hobbies', label: 'Hobbies', icon: <FaHeart /> },
  { to: '/admin/interests', label: 'Interests', icon: <FaStar /> },
  { to: '/admin/social-media', label: 'Social Media', icon: <FaShareAlt /> },
  { to: '/admin/quotes', label: 'Quotes', icon: <FaQuoteRight /> },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, text: 'New testimonial submitted!', read: false, time: '1 min ago' },
  { id: 2, text: 'Project "AI Portfolio" updated.', read: false, time: '5 min ago' },
  { id: 3, text: 'New message from John Doe.', read: true, time: '10 min ago' },
];

const AdminLayout = ({ children, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const notifDrawerRef = useRef();
  const msgPopupRef = useRef();
  const [realUsername, setRealUsername] = useState('');

  // Apply theme to root element
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Fetch notifications/messages (polling for real-time)
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      let notifs = [];
      try {
        notifs = await apiGet('/notifications');
      } catch {
        notifs = [];
      }
      let msgs = [];
      try {
        msgs = await apiGet('/admin-messages');
      } catch {
        msgs = [];
      }
      if (isMounted) {
        setNotifications(notifs.filter(n => !n.archived));
        setMessages(msgs.filter(m => !m.archived && !m.read).slice(0, 5));
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s polling
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Fetch real admin username on mount
  useEffect(() => {
    const fetchAdmin = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRealUsername(data.username || 'Admin');
      }
    };
    fetchAdmin();
  }, []);

  // Notification actions
  const markAllNotifsRead = async () => {
    await apiPatch('/notifications/read-all');
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };
  const clearNotifs = async () => {
    await apiDelete('/notifications/clear');
    setNotifications([]);
  };
  const archiveNotif = async id => {
    await apiPatch(`/notifications/${id}/archive`);
    setNotifications(n => n.filter(x => x._id !== id && x.id !== id));
  };
  const markNotifRead = async id => {
    await apiPatch(`/notifications/${id}/read`);
    setNotifications(n => n.map(x => (x._id === id || x.id === id) ? { ...x, read: true } : x));
  };

  // Message actions
  const markAllMsgsRead = async () => {
    await apiPatch('/admin-messages/read-all');
    setMessages([]);
  };
  const archiveMsg = async id => {
    await apiPatch(`/admin-messages/${id}/archive`);
    setMessages(m => m.filter(x => x._id !== id && x.id !== id));
  };

  // Close drawers on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifOpen && notifDrawerRef.current && !notifDrawerRef.current.contains(e.target)) setNotifOpen(false);
      if (msgOpen && msgPopupRef.current && !msgPopupRef.current.contains(e.target)) setMsgOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen, msgOpen]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <div className={`admin-layout ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside
        className={`admin-sidebar${!sidebarOpen ? ' admin-sidebar-collapsed' : ''}`}
      >
        <div className={`admin-sidebar-title${!sidebarOpen ? ' opacity-0 w-0 h-0 overflow-hidden' : ''}`}>Admin Dashboard</div>
        <nav className="admin-nav admin-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? ' admin-nav-link-active' : ''}`
              }
              title={item.label}
            >
              <span className="text-lg">{item.icon}</span>
              <span className={`ml-2 transition-all duration-300${!sidebarOpen ? ' opacity-0 w-0 h-0 overflow-hidden' : ''}`}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="admin-logout-btn"
        >
          <FaSignOutAlt />
          <span className={`transition-all duration-300${!sidebarOpen ? ' opacity-0 w-0 h-0 overflow-hidden' : ''}`}>Logout</span>
        </button>
      </aside>
      {/* Main Content Area */}
      <div className="admin-content">
        {/* Header */}
        <header className="admin-header">
          {/* Sidebar Toggle in header */}
          <button
            className="mb-0 mr-4 text-xl focus:outline-none hover:text-blue-400"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <FaBars />
          </button>
          <div className="admin-actions">
            {/* Theme toggle */}
            <button
              className="admin-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <FaMoon /> : <FaSun />}
            </button>
            {/* Notifications */}
            <div className="relative mx-2">
              <button
                className="text-xl focus:outline-none hover:text-blue-500 relative"
                onClick={() => setNotifOpen((open) => !open)}
                aria-label="Notifications"
              >
                <FaBell />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {/* Drawer */}
              {notifOpen && (
                <div ref={notifDrawerRef} className="fixed top-0 right-0 w-80 max-w-full h-full bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-bold text-lg">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-xl hover:text-red-500"><FaTimes /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-gray-400 text-center mt-8">No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`p-3 rounded shadow flex items-center justify-between ${n.read ? 'bg-gray-100' : 'bg-blue-50'}`}>
                        <div>
                          <div className="font-medium text-gray-800">{n.text}</div>
                          <div className="text-xs text-gray-400">{n.time}</div>
                        </div>
                        <div className="flex flex-col gap-2 ml-2">
                          {!n.read && <button onClick={() => markNotifRead(n.id)} className="text-green-600 hover:text-green-800" title="Mark as read"><FaCheck /></button>}
                          <button onClick={() => archiveNotif(n.id)} className="text-gray-500 hover:text-gray-700" title="Archive"><FaArchive /></button>
                          <button onClick={() => clearNotifs()} className="text-red-500 hover:text-red-700" title="Clear"><FaTrash /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t p-3 flex gap-2">
                    <button onClick={markAllNotifsRead} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Mark all as read</button>
                    <button onClick={clearNotifs} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300">Clear</button>
                  </div>
                </div>
              )}
            </div>
            {/* Messages */}
            <div className="relative mx-2">
              <button
                className="text-xl focus:outline-none hover:text-blue-500 relative"
                onClick={() => setMsgOpen((open) => !open)}
                aria-label="Messages"
              >
                <FaEnvelope />
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 animate-pulse">
                    {messages.length}
                  </span>
                )}
              </button>
              {/* Popup */}
              {msgOpen && (
                <div ref={msgPopupRef} className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white shadow-2xl rounded-lg z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-bold text-lg">Unread Messages</span>
                    <button onClick={() => setMsgOpen(false)} className="text-xl hover:text-red-500"><FaTimes /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-gray-400 text-center mt-8">No unread messages</div>
                    ) : messages.map(m => (
                      <div key={m._id || m.id} className="p-3 rounded shadow bg-blue-50 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{m.senders_name}</div>
                          <div className="text-xs text-gray-400">{m.senders_email}</div>
                          <div className="text-gray-700 mt-1">{m.subject}</div>
                        </div>
                        <div className="flex flex-col gap-2 ml-2">
                          <button onClick={() => archiveMsg(m._id || m.id)} className="text-gray-500 hover:text-gray-700" title="Archive"><FaArchive /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t p-3 flex gap-2">
                    <button onClick={markAllMsgsRead} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Mark all as read</button>
                  </div>
                </div>
              )}
            </div>
            {/* User info */}
            <div className="admin-user-info">
              <FaUserCircle className="text-2xl text-gray-500" />
              <span className="font-medium text-gray-700">{realUsername}</span>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1">{children}</main>
        {/* Footer */}
        <footer className="admin-footer">
          &copy; {new Date().getFullYear()} Angera Silas. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout; 