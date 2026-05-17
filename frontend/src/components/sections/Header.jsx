import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import AngiSoftLogo from '../brand/AngiSoftLogo';
import {
  FaBars, FaTimes, FaArrowRight, FaChevronDown, FaCalendarCheck
} from "react-icons/fa";

const megaMenuItems = [
  {
    label: 'About',
    items: [
      { label: 'About Us', to: '/about' },
      { label: 'Our Team', to: '/staff' },
      { label: 'Careers', to: '/careers' },
    ],
  },
  {
    label: 'Services',
    items: [
      { label: 'All Services', to: '/services' },
      { label: 'Software Development', to: '/services' },
      { label: 'IT Consulting', to: '/services' },
      { label: 'Mobile Apps', to: '/services' },
      { label: 'AI & Automation', to: '/services' },
      { label: 'Cybersecurity', to: '/services' },
    ],
  },
  {
    label: 'Industries',
    items: [
      { label: 'Healthcare', to: '/services' },
      { label: 'Finance', to: '/services' },
      { label: 'Education', to: '/services' },
      { label: 'Real Estate', to: '/services' },
      { label: 'Retail & eCommerce', to: '/services' },
      { label: 'Telecommunications', to: '/services' },
    ],
  },
  {
    label: 'Solutions',
    items: [
      { label: 'All Solutions', to: '/projects' },
      { label: 'Enterprise Applications', to: '/projects' },
      { label: 'Mobile Apps', to: '/projects' },
      { label: 'Data Analytics', to: '/projects' },
      { label: 'AngiMusic Platform', to: '/products' },
    ],
  },
];

const simpleLinks = [
  { label: 'Portfolio', to: '/projects' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

const Header = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMega, setActiveMega] = useState(null);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => { setSidebarOpen(false); setActiveMega(null); }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {activeMega && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)', display: 'none' }} onClick={() => setActiveMega(null)} />
      )}

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(7, 20, 43, 0.96)' : 'linear-gradient(180deg, rgba(7,20,43,0.98) 0%, rgba(7,20,43,0.85) 70%, rgba(7,20,43,0) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(0,175,255,0.1)' : '1px solid transparent',
          boxShadow: scrolled ? '0 16px 44px rgba(0,0,0,0.38)' : 'none',
        }}
      >
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          paddingLeft: '1.5rem', paddingRight: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '0.75rem', paddingBottom: '0.75rem'
        }}>
          <Link to="/" style={{ flexShrink: 0 }}>
            <div style={{ width: '9rem', filter: 'drop-shadow(0 0 14px rgba(0,175,255,0.28))' }}>
              <AngiSoftLogo size="md" />
            </div>
          </Link>

          {/* Desktop Nav - hidden on mobile, flex on md+ */}
          <nav style={{
            display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '0.25rem'
          }}>
            {megaMenuItems.map((menu) => (
              <div key={menu.label} className="relative" onMouseEnter={() => setActiveMega(menu.label)} onMouseLeave={() => setActiveMega(null)}>
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.5rem 1rem', borderRadius: '0.75rem',
                    fontSize: '0.875rem', fontWeight: 500, background: 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: activeMega === menu.label ? 'var(--primary)' : 'rgba(245,247,250,0.9)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {menu.label}
                  <FaChevronDown style={{ fontSize: '0.6rem', transition: 'transform 0.3s', transform: activeMega === menu.label ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {activeMega === menu.label && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-4"
                    style={{
                      width: '14rem', borderRadius: '1rem',
                      background: 'rgba(7, 20, 43, 0.98)',
                      border: '1px solid rgba(0,175,255,0.12)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
                    }}
                  >
                    {menu.items.map((item) => (
                      <Link
                        key={item.label} to={item.to}
                        className="block px-4 py-2.5 rounded-xl"
                        style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(245,247,250,0.8)', textDecoration: 'none', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.target.style.color = 'var(--primary)'; e.target.style.background = 'rgba(8,117,255,0.08)'; }}
                        onMouseLeave={(e) => { e.target.style.color = 'rgba(245,247,250,0.8)'; e.target.style.background = 'transparent'; }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {simpleLinks.map((link) => (
              <Link
                key={link.to + link.label} to={link.to}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.75rem',
                  fontSize: '0.875rem', fontWeight: 500,
                  color: isActive(link.to) ? 'var(--primary)' : 'rgba(245,247,250,0.9)',
                  background: isActive(link.to) ? 'rgba(8,117,255,0.08)' : 'transparent',
                  textDecoration: 'none', transition: 'all 0.3s ease',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <Link to="/book" className="angi-btn-primary" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem', display: 'inline-flex' }}>
              <FaCalendarCheck style={{ fontSize: '0.75rem' }} />
              Contact Us
            </Link>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
