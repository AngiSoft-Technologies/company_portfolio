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

  const isActive = (path) => location.pathname === path;

  const getResponsiveValue = (values) => {
    const w = window.innerWidth;
    if (w < 360) return values[360];
    if (w < 420) return values[420];
    if (w < 475) return values[475];
    if (w < 575) return values[575];
    if (w < 768) return values[768];
    if (w < 900) return values[900];
    if (w < 1024) return values[1024];
    if (w < 1366) return values[1366];
    if (w < 1440) return values[1440];
    if (w < 1920) return values[1920];
    return values[1920];
  };

  const headerPadding = getResponsiveValue({
    360: '0.375rem 0.5rem',
    420: '0.4rem 0.625rem',
    475: '0.5rem 0.75rem',
    575: '0.5rem 0.875rem',
    768: '0.625rem 1rem',
    900: '0.625rem 1.125rem',
    1024: '0.625rem 1.25rem',
    1366: '0.75rem 1.5rem',
    1440: '0.75rem 1.75rem',
    1920: '0.875rem 2rem'
  });

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
        <div 
          className="max-w-full mx-auto flex items-center justify-between px-4"
          style={{ padding: headerPadding }}
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center group flex-shrink-0"
            style={{ gap: getResponsiveValue({ 360: '0.5rem', 420: '0.5rem', 475: '0.625rem', 575: '0.625rem', 768: '0.75rem', 900: '0.75rem', 1024: '0.75rem', 1366: '0.75rem', 1440: '0.875rem', 1920: '1rem' }) }}
          >
            <div
              className="rounded-lg md:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                width: getResponsiveValue({ 360: '1.75rem', 420: '2rem', 475: '2.125rem', 575: '2.125rem', 768: '2.25rem', 900: '2.375rem', 1024: '2.375rem', 1366: '2.5rem', 1440: '2.625rem', 1920: '2.875rem' }),
                height: getResponsiveValue({ 360: '1.75rem', 420: '2rem', 475: '2.125rem', 575: '2.125rem', 768: '2.25rem', 900: '2.375rem', 1024: '2.375rem', 1366: '2.5rem', 1440: '2.625rem', 1920: '2.875rem' }),
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `0 4px 15px ${colors.primary}40`
              }}
            >
              <span 
                className="text-white font-bold transition-colors"
                style={{
                  fontSize: getResponsiveValue({ 360: '0.875rem', 420: '1rem', 475: '1.125rem', 575: '1.125rem', 768: '1.25rem', 900: '1.375rem', 1024: '1.375rem', 1366: '1.5rem', 1440: '1.625rem', 1920: '1.75rem' })
                }}
              >
                A
              </span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span
                className="font-bold transition-colors"
                style={{
                  fontSize: getResponsiveValue({ 360: '0.875rem', 420: '0.875rem', 475: '1rem', 575: '1rem', 768: '1rem', 900: '1.125rem', 1024: '1.125rem', 1366: '1.375rem', 1440: '1.5rem', 1920: '1.75rem' }),
                  color: isScrolled
                    ? colors.primary
                    : '#FFFFFF'
                }}
              >
                AngiSoft
              </span>
              <span
                className="font-medium transition-colors"
                style={{
                  fontSize: getResponsiveValue({ 360: '0.625rem', 420: '0.625rem', 475: '0.7rem', 575: '0.7rem', 768: '0.7rem', 900: '0.75rem', 1024: '0.75rem', 1366: '0.875rem', 1440: '0.9rem', 1920: '1rem' }),
                  marginTop: '0.0625rem',
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
          <nav 
            className="hidden lg:flex items-center flex-1 justify-center"
            style={{ gap: getResponsiveValue({ 360: '1rem', 420: '1rem', 475: '1.15rem', 575: '1.35rem', 768: '1.35rem', 900: '1.50rem', 1024: '1.75rem', 1366: '2rem', 1440: '2.5rem', 1920: '3rem' }) }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative rounded-lg lg:rounded-xl transition-all duration-300 group"
                style={{
                  padding: getResponsiveValue({ 360: '0.2rem 0.3rem', 420: '0.2rem 0.35rem', 475: '0.25rem 0.4rem', 575: '0.25rem 0.45rem', 768: '0.25rem 0.5rem', 900: '0.3125rem 0.5625rem', 1024: '0.3125rem 0.625rem', 1366: '0.375rem 0.75rem', 1440: '0.4375rem 0.875rem', 1920: '0.5rem 1rem' }),
                  fontSize: getResponsiveValue({ 360: '0.75rem', 420: '0.75rem', 475: '0.8rem', 575: '0.875rem', 768: '0.875rem', 900: '0.9rem', 1024: '1rem', 1366: '1.1rem', 1440: '1.125rem', 1920: '1.25rem' }),
                  fontWeight: '500',
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
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-300"
                  style={{
                    width: isActive(link.path) ? '60%' : '0%',
                    height: getResponsiveValue({ 360: '0.125rem', 420: '0.125rem', 475: '0.15rem', 575: '0.15rem', 768: '0.2rem', 900: '0.2rem', 1024: '0.25rem', 1366: '0.25rem', 1440: '0.3rem', 1920: '0.3rem' }),
                    backgroundColor: colors.primary
                  }}
                />
              </Link>
            ))}
          </nav>

          {/* Action Buttons */}
          <div 
            className="flex items-center flex-shrink-0"
            style={{ gap: getResponsiveValue({ 360: '0.5rem', 420: '0.625rem', 475: '0.75rem', 575: '0.875rem', 768: '1rem', 900: '1.125rem', 1024: '1.25rem', 1366: '1.5rem', 1440: '1.75rem', 1920: '2rem' }) }}
          >
            {/* Theme Switcher */}
            <ThemeSwitcher variant="icon" />

            {/* Get Started Button */}
            <div
              className="hidden sm:inline-flex items-center rounded-lg md:rounded-xl border-2 border-white border-opacity-20"
              style={{
                padding: getResponsiveValue({ 360: '0.15rem 0.25rem', 420: '0.15rem 0.275rem', 475: '0.175rem 0.325rem', 575: '0.175rem 0.35rem', 768: '0.1875rem 0.4125rem', 900: '0.2rem 0.45rem', 1024: '0.2rem 0.475rem', 1366: '0.225rem 0.55rem', 1440: '0.25rem 0.6rem', 1920: '0.275rem 0.675rem' }),
                gap: getResponsiveValue({ 360: '0.1rem', 420: '0.1rem', 475: '0.125rem', 575: '0.125rem', 768: '0.125rem', 900: '0.15rem', 1024: '0.15rem', 1366: '0.1875rem', 1440: '0.2rem', 1920: '0.25rem' }),
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `0 4px 20px ${colors.primary}40, inset 0 0 0 1px rgba(255,255,255,0.3)`
              }}
            >
              <Link
                to="/book"
                className="flex items-center text-white transition-all duration-300 hover:-translate-y-0.5 group"
                style={{
                  gap: getResponsiveValue({ 360: '0.1875rem', 420: '0.1875rem', 475: '0.25rem', 575: '0.25rem', 768: '0.25rem', 900: '0.3125rem', 1024: '0.3125rem', 1366: '0.375rem', 1440: '0.4375rem', 1920: '0.5rem' }),
                  fontSize: getResponsiveValue({ 360: '0.65rem', 420: '0.65rem', 475: '0.7rem', 575: '0.75rem', 768: '0.75rem', 900: '0.8rem', 1024: '0.85rem', 1366: '0.95rem', 1440: '1rem', 1920: '1.1rem' }),
                  fontWeight: '600'
                }}
              >
                <span>Get started</span>
                <FaArrowRight 
                  className="transition-transform group-hover:translate-x-1"
                  style={{ fontSize: getResponsiveValue({ 360: '0.5rem', 420: '0.5rem', 475: '0.6rem', 575: '0.6rem', 768: '0.7rem', 900: '0.7rem', 1024: '0.8rem', 1366: '0.8rem', 1440: '0.875rem', 1920: '1rem' }) }}
                />
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                width: getResponsiveValue({ 360: '1.75rem', 420: '2rem', 475: '2.125rem', 575: '2.125rem', 768: '2.125rem', 900: '2.25rem', 1024: '2.25rem', 1366: '2.5rem', 1440: '2.625rem', 1920: '2.875rem' }),
                height: getResponsiveValue({ 360: '1.75rem', 420: '2rem', 475: '2.125rem', 575: '2.125rem', 768: '2.125rem', 900: '2.25rem', 1024: '2.25rem', 1366: '2.5rem', 1440: '2.625rem', 1920: '2.875rem' }),
                backgroundColor: isScrolled
                  ? isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  : 'rgba(255,255,255,0.1)',
                color: isScrolled
                  ? isDark ? '#fff' : '#1e293b'
                  : '#fff'
              }}
            >
              {isSidebarOpen ? <FaTimes size={getResponsiveValue({ 360: 14, 420: 16, 475: 18, 575: 18, 768: 20, 900: 20, 1024: 20, 1366: 22, 1440: 24, 1920: 24 })} /> : <FaBars size={getResponsiveValue({ 360: 14, 420: 16, 475: 18, 575: 18, 768: 20, 900: 20, 1024: 20, 1366: 22, 1440: 24, 1920: 24 })} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={toggleSidebar}
      />

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50 lg:hidden transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
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
            className="flex items-center justify-between"
            style={{ 
              padding: getResponsiveValue({ 360: '0.875rem', 420: '1rem', 475: '1.125rem', 575: '1.25rem', 768: '1.5rem', 900: '1.5rem', 1024: '1.5rem', 1366: '1.5rem', 1440: '1.75rem', 1920: '2rem' }),
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
            }}
          >
            <Link to="/" className="flex items-center" style={{ gap: '0.75rem' }}>
              <div
                className="rounded-lg flex items-center justify-center"
                style={{
                  width: getResponsiveValue({ 360: '2rem', 420: '2rem', 475: '2.25rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                  height: getResponsiveValue({ 360: '2rem', 420: '2rem', 475: '2.25rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                }}
              >
                <span 
                  className="text-white font-bold"
                  style={{ fontSize: getResponsiveValue({ 360: '0.875rem', 420: '0.875rem', 475: '1rem', 575: '1rem', 768: '1.125rem', 900: '1.125rem', 1024: '1.125rem', 1366: '1.25rem', 1440: '1.375rem', 1920: '1.5rem' }) }}
                >
                  A
                </span>
              </div>
              <span
                className="font-bold"
                style={{ 
                  fontSize: getResponsiveValue({ 360: '1rem', 420: '1rem', 475: '1.125rem', 575: '1.125rem', 768: '1.25rem', 900: '1.25rem', 1024: '1.25rem', 1366: '1.375rem', 1440: '1.5rem', 1920: '1.75rem' }),
                  color: isDark ? '#fff' : '#1e293b' 
                }}
              >
                AngiSoft
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              className="rounded-lg flex items-center justify-center"
              style={{
                width: getResponsiveValue({ 360: '2rem', 420: '2rem', 475: '2.25rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                height: getResponsiveValue({ 360: '2rem', 420: '2rem', 475: '2.25rem', 575: '2.25rem', 768: '2.5rem', 900: '2.5rem', 1024: '2.5rem', 1366: '2.75rem', 1440: '3rem', 1920: '3.25rem' }),
                backgroundColor: `${colors.primary}15`,
                color: colors.primary
              }}
            >
              <FaTimes size={getResponsiveValue({ 360: 14, 420: 16, 475: 18, 575: 18, 768: 18, 900: 18, 1024: 18, 1366: 20, 1440: 22, 1920: 24 })} />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto" style={{ padding: getResponsiveValue({ 360: '0.375rem 0.25rem', 420: '0.4375rem 0.3125rem', 475: '0.5rem 0.375rem', 575: '0.5625rem 0.4375rem', 768: '0.625rem 0.5rem', 900: '0.6875rem 0.5625rem', 1024: '0.6875rem 0.5625rem', 1366: '0.75rem 0.625rem', 1440: '0.8125rem 0.6875rem', 1920: '0.875rem 0.75rem' }) }}>
            {navLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center rounded-lg transition-all duration-300"
                  style={{
                    padding: getResponsiveValue({ 360: '0.3125rem 0.4375rem', 420: '0.35rem 0.475rem', 475: '0.375rem 0.5rem', 575: '0.375rem 0.5625rem', 768: '0.4375rem 0.5625rem', 900: '0.4375rem 0.625rem', 1024: '0.4375rem 0.625rem', 1366: '0.5rem 0.6875rem', 1440: '0.5625rem 0.75rem', 1920: '0.625rem 0.875rem' }),
                    marginBottom: getResponsiveValue({ 360: '0.1875rem', 420: '0.2125rem', 475: '0.25rem', 575: '0.25rem', 768: '0.25rem', 900: '0.3125rem', 1024: '0.3125rem', 1366: '0.3125rem', 1440: '0.375rem', 1920: '0.375rem' }),
                    gap: getResponsiveValue({ 360: '0.625rem', 420: '0.75rem', 475: '0.875rem', 575: '0.875rem', 768: '1rem', 900: '1rem', 1024: '1rem', 1366: '1.125rem', 1440: '1.25rem', 1920: '1.5rem' }),
                    backgroundColor: isActive(link.path)
                      ? `${colors.primary}15`
                      : 'transparent',
                    color: isActive(link.path)
                      ? colors.primary
                      : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                    fontSize: getResponsiveValue({ 360: '0.8rem', 420: '0.875rem', 475: '0.9rem', 575: '0.9rem', 768: '1rem', 900: '1rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.125rem', 1920: '1.25rem' })
                  }}
                >
                  <Icon
                    className="text-lg"
                    style={{ 
                      color: isActive(link.path) ? colors.primary : 'inherit',
                      fontSize: getResponsiveValue({ 360: '0.875rem', 420: '1rem', 475: '1.125rem', 575: '1.125rem', 768: '1.125rem', 900: '1.25rem', 1024: '1.25rem', 1366: '1.375rem', 1440: '1.5rem', 1920: '1.625rem' })
                    }}
                  />
                  <span className="font-medium">{link.label}</span>
                  {isActive(link.path) && (
                    <div
                      className="ml-auto rounded-full"
                      style={{ 
                        width: getResponsiveValue({ 360: '0.375rem', 420: '0.4rem', 475: '0.425rem', 575: '0.425rem', 768: '0.45rem', 900: '0.5rem', 1024: '0.5rem', 1366: '0.55rem', 1440: '0.6rem', 1920: '0.625rem' }),
                        height: getResponsiveValue({ 360: '0.375rem', 420: '0.4rem', 475: '0.425rem', 575: '0.425rem', 768: '0.45rem', 900: '0.5rem', 1024: '0.5rem', 1366: '0.55rem', 1440: '0.6rem', 1920: '0.625rem' }),
                        backgroundColor: colors.primary 
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div 
            className="flex flex-col items-center"
            style={{ 
              padding: getResponsiveValue({ 360: '0.875rem', 420: '1rem', 475: '1.125rem', 575: '1.25rem', 768: '1.5rem', 900: '1.5rem', 1024: '1.5rem', 1366: '1.5rem', 1440: '1.75rem', 1920: '2rem' }),
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
            }}
          >
            <Link
              to="/book"
              className="flex items-center justify-center gap-2 w-full rounded-lg md:rounded-xl text-white font-semibold transition-all"
              style={{
                padding: getResponsiveValue({ 360: '0.625rem 0.875rem', 420: '0.75rem 1rem', 475: '0.875rem 1.125rem', 575: '0.875rem 1.125rem', 768: '0.875rem 1rem', 900: '1rem 1.125rem', 1024: '1rem 1.125rem', 1366: '1.125rem 1.25rem', 1440: '1.25rem 1.5rem', 1920: '1.375rem 1.75rem' }),
                fontSize: getResponsiveValue({ 360: '0.8rem', 420: '0.875rem', 475: '0.9rem', 575: '0.9rem', 768: '1rem', 900: '1rem', 1024: '1rem', 1366: '1.05rem', 1440: '1.125rem', 1920: '1.25rem' }),
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              <FaCalendarCheck />
              Get a Quote
            </Link>

            <div className="mt-3 flex items-center justify-center">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Header;
