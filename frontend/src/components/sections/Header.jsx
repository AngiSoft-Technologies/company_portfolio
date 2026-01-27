import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeSwitcher from "../ThemeSwitcher";
import { 
  FaBars, 
  FaTimes, 
  FaArrowRight,
  FaHome,
  FaCogs,
  FaFolder,
  FaUsers,
  FaStar,
  FaCalendarCheck,
  FaEnvelope,
  FaBlog,
  FaChevronDown
} from "react-icons/fa";

const Header = () => {
  const { colors, mode } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const isDark = mode === 'dark';

  const navLinks = [
    { path: '/', label: 'Home', icon: FaHome },
    { path: '/services', label: 'Services', icon: FaCogs },
    { path: '/projects', label: 'Projects', icon: FaFolder },
    { path: '/staff', label: 'Team', icon: FaUsers },
    { path: '/testimonials', label: 'Testimonials', icon: FaStar },
    { path: '/book', label: 'Book', icon: FaCalendarCheck },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: isScrolled 
            ? isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'
            : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          borderBottom: isScrolled 
            ? `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` 
            : 'none',
          boxShadow: isScrolled 
            ? isDark ? '0 10px 40px rgba(0,0,0,0.3)' : '0 10px 40px rgba(0,0,0,0.1)'
            : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `0 4px 15px ${colors.primary}40`
              }}
            >
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span 
                className="text-xl font-bold transition-colors"
                style={{ 
                  color: isScrolled 
                    ? colors.primary 
                    : '#FFFFFF' 
                }}
              >
                AngiSoft
              </span>
              <span 
                className="text-xs font-medium -mt-0.5 transition-colors"
                style={{ 
                  color: isScrolled 
                    ? isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                    : 'rgba(255,255,255,0.7)' 
                }}
              >
                Technologies
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group"
                style={{
                  color: isActive(link.path)
                    ? colors.primary
                    : isScrolled 
                      ? isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
                      : 'rgba(255,255,255,0.9)',
                  backgroundColor: isActive(link.path)
                    ? `${colors.primary}15`
                    : 'transparent'
                }}
              >
                {link.label}
                {/* Active Indicator */}
                <span 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300"
                  style={{
                    width: isActive(link.path) ? '60%' : '0%',
                    backgroundColor: colors.primary
                  }}
                />
              </Link>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <ThemeSwitcher variant="icon" />

            {/* Get a Quote Button */}
            <Link
              to="/book"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all duration-300 hover:-translate-y-0.5 group"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              <span>Get a Quote</span>
              <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: isScrolled 
                  ? isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  : 'rgba(255,255,255,0.1)',
                color: isScrolled 
                  ? isDark ? '#fff' : '#1e293b'
                  : '#fff'
              }}
            >
              {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={toggleSidebar}
      />

      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50 lg:hidden transition-transform duration-500 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.2)'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div 
            className="flex items-center justify-between p-6"
            style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}
          >
            <Link to="/" className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                }}
              >
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span 
                className="text-xl font-bold"
                style={{ color: isDark ? '#fff' : '#1e293b' }}
              >
                AngiSoft
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${colors.primary}15`,
                color: colors.primary
              }}
            >
              <FaTimes size={18} />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 py-6 px-4 overflow-y-auto">
            {navLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-4 px-4 py-3.5 mb-2 rounded-xl transition-all duration-300"
                  style={{
                    backgroundColor: isActive(link.path) 
                      ? `${colors.primary}15` 
                      : 'transparent',
                    color: isActive(link.path) 
                      ? colors.primary 
                      : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
                  }}
                >
                  <Icon 
                    className="text-lg"
                    style={{ color: isActive(link.path) ? colors.primary : 'inherit' }}
                  />
                  <span className="font-medium">{link.label}</span>
                  {isActive(link.path) && (
                    <div 
                      className="ml-auto w-2 h-2 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-6" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
            <Link
              to="/book"
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl text-white font-semibold transition-all"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              <FaCalendarCheck />
              Get a Quote
            </Link>
            
            <div className="mt-4 flex items-center justify-center">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Header;
