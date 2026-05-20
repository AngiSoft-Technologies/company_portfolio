import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet } from "../../js/httpClient";
import AngiSoftLogo from '../brand/AngiSoftLogo';
import {
  FaBars, FaTimes, FaChevronDown, FaSearch,
  FaInfoCircle, FaBriefcase, FaGlobe, FaPuzzlePiece, FaCogs,
  FaCode, FaMobileAlt, FaChartLine, FaBrain,
  FaCashRegister, FaServer,
  FaGraduationCap, FaFileAlt, FaAd, FaWifi, FaMusic,
  FaStethoscope, FaStore, FaLandmark, FaBuilding, FaTruck,
  FaReact, FaPython, FaHtml5, FaTerminal,
} from "react-icons/fa";
import { SiFlutter, SiKotlin, SiTailwindcss } from "react-icons/si";

const iconRegistry = {
  FaInfoCircle,
  FaBriefcase,
  FaGraduationCap,
  FaCode,
  FaChartLine,
  FaFileAlt,
  FaLandmark,
  FaAd,
  FaWifi,
  FaMusic,
  FaGlobe,
  FaStethoscope,
  FaStore,
  FaBuilding,
  FaTruck,
  FaPuzzlePiece,
  FaCashRegister,
  FaServer,
  FaMobileAlt,
  FaBrain,
  FaCogs,
  FaReact,
  FaPython,
  FaHtml5,
  FaTerminal,
  SiFlutter,
  SiKotlin,
  SiTailwindcss,
};

const resolveIcon = (iconName, fallback = FaGlobe) => iconRegistry[iconName] || fallback;

const normalizeLink = (link) => ({
  label: link.label,
  to: link.href || link.to || '/',
});

/* ═══════════════════ HEADER ═══════════════════ */
const Header = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMega, setActiveMega] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [navigation, setNavigation] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    apiGet('/site/navigation')
      .then((data) => setNavigation(data))
      .catch(() => {});
  }, []);

  const megaMenus = navigation?.megaMenus?.length
    ? navigation.megaMenus.map((menu) => {
      const MenuIcon = resolveIcon(menu.icon, FaGlobe);
      return {
        label: menu.label,
        icon: MenuIcon,
        items: (menu.items || []).map((item) => ({
          label: item.label,
          desc: item.description || item.desc || '',
          to: item.href || item.to || '/',
          icon: resolveIcon(item.icon, MenuIcon),
        })),
      };
    })
    : [];
  const simpleLinks = (navigation?.simpleLinks || []).map(normalizeLink);
  const headerCta = navigation?.cta || { label: 'Start a Project', href: '/booking' };

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setActiveMega(null);
    setMobileExpanded(null);
    setSearchOpen(false);
  }, [location.pathname]);

  // Search across services, projects, blog posts
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = searchQuery.toLowerCase();
        const [services, projects, blogs] = await Promise.all([
          apiGet('/services').catch(() => []),
          apiGet('/projects').catch(() => []),
          apiGet('/blogs').catch(() => []),
        ]);
        const results = [
          ...services.filter(s => s.published !== false && (s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)))
            .map(s => ({ type: 'Service', title: s.title, to: `/service/${s.slug || s.id}` })),
          ...projects.filter(p => p.published !== false && (p.title?.toLowerCase().includes(q) || p.summary?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)))
            .map(p => ({ type: 'Project', title: p.title, to: `/project/${p.slug || p.id}` })),
          ...blogs.filter(b => b.published !== false && (b.title?.toLowerCase().includes(q) || b.excerpt?.toLowerCase().includes(q)))
            .map(b => ({ type: 'Blog', title: b.title, to: `/blog/${b.slug || b.id}` })),
        ];
        setSearchResults(results.slice(0, 8));
      } catch { setSearchResults([]); }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [searchOpen]);

  return (
    <>
      {/* ── Backdrop (desktop mega menu) ── */}
      {activeMega && !isMobile && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.35)' }}
          onClick={() => setActiveMega(null)}
        />
      )}

      {/* ── Mobile Sidebar Backdrop ── */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      {sidebarOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 60,
          width: '18rem', maxWidth: '85vw',
          background: 'rgba(7, 20, 43, 0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(0,175,255,0.1)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          overflowY: 'auto',
          padding: '1.5rem',
          animation: 'slideIn 0.25s ease',
        }}>
          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <button onClick={() => setSidebarOpen(false)} style={{
              width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', color: '#fff',
            }}>
              <FaTimes />
            </button>
          </div>

          {/* Nav items as accordions */}
          {megaMenus.map((menu) => {
            const isOpen = mobileExpanded === menu.label;
            return (
              <div key={menu.label} style={{ marginBottom: '0.25rem' }}>
                <button
                  onClick={() => setMobileExpanded(isOpen ? null : menu.label)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '0.75rem 0.75rem', borderRadius: '0.625rem',
                    fontSize: '0.9rem', fontWeight: 600,
                    background: isOpen ? 'rgba(8,117,255,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer', color: '#fff', textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <menu.icon style={{ fontSize: '0.875rem', color: '#0875FF' }} />
                    {menu.label}
                  </span>
                  <FaChevronDown style={{
                    fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }} />
                </button>
                {isOpen && (
                  <div style={{ paddingLeft: '1rem', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                    {menu.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.label} to={item.to} style={{
                          display: 'flex', alignItems: 'center', gap: '0.625rem',
                          padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                          textDecoration: 'none', color: 'rgba(255,255,255,0.7)',
                          fontSize: '0.8125rem', transition: 'background 0.2s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,117,255,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Icon style={{ fontSize: '0.75rem', color: '#0875FF', flexShrink: 0 }} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Simple links */}
          {simpleLinks.map((link) => (
            <Link key={link.label} to={link.to} style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.75rem', borderRadius: '0.625rem',
              fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
              color: location.pathname === link.to ? '#0875FF' : '#fff',
            }}>
              {link.label}
            </Link>
          ))}

          {/* Contact button */}
          <Link to={headerCta.href || headerCta.to || '/contact'} style={{
            display: 'block', textAlign: 'center',
            marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
            fontSize: '0.9rem', fontWeight: 600, color: '#fff', textDecoration: 'none',
            background: 'linear-gradient(135deg, #0875FF, #00AFFF)',
          }}>
            {headerCta.label || 'Contact'}
          </Link>
        </div>
      )}

      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          transition: 'all 0.5s ease',
          background: scrolled
            ? 'rgba(7, 20, 43, 0.97)'
            : 'linear-gradient(180deg, rgba(7,20,43,0.98) 0%, rgba(7,20,43,0.88) 70%, rgba(7,20,43,0) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(0,175,255,0.1)' : '1px solid transparent',
          boxShadow: scrolled ? '0 16px 44px rgba(0,0,0,0.38)' : 'none',
        }}
      >
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* ── Logo ── */}
          <Link to="/" style={{ flexShrink: 0, textDecoration: 'none' }}>
            <div style={{ width: '9rem', filter: 'drop-shadow(0 0 14px rgba(0,175,255,0.28))' }}>
              <AngiSoftLogo size="md" />
            </div>
          </Link>

          {/* ── Desktop Nav (hidden on mobile) ── */}
          {!isMobile && (
            <nav style={{
              display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '0.125rem',
            }}>
              {megaMenus.map((menu) => {
                const isOpen = activeMega === menu.label;
                return (
                  <div
                    key={menu.label}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setActiveMega(menu.label)}
                    onMouseLeave={() => setActiveMega(null)}
                  >
                    {/* Trigger */}
                    <button
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
                        fontSize: '0.8125rem', fontWeight: 500,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: isOpen ? '#0875FF' : 'rgba(245,247,250,0.88)',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.color = 'rgba(245,247,250,0.88)'; }}
                    >
                      {menu.label}
                      <FaChevronDown style={{
                        fontSize: '0.55rem',
                        transition: 'transform 0.3s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }} />
                    </button>

                    {/* Mega Dropdown */}
                    {isOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '0.5rem',
                        padding: '1rem',
                        minWidth: '22rem',
                        borderRadius: '1rem',
                        background: 'rgba(7, 20, 43, 0.98)',
                        border: '1px solid rgba(0,175,255,0.12)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.45)',
                      }}>
                        {menu.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.label}
                              to={item.to}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                padding: '0.75rem 0.875rem', borderRadius: '0.75rem',
                                textDecoration: 'none',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(8,117,255,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <div style={{
                                width: '2rem', height: '2rem', borderRadius: '0.5rem',
                                background: 'rgba(8,117,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, marginTop: '0.1rem',
                              }}>
                                <Icon style={{ fontSize: '0.875rem', color: '#0875FF' }} />
                              </div>
                              <div>
                                <div style={{
                                  fontFamily: "'Sora', sans-serif",
                                  fontSize: '0.875rem', fontWeight: 600,
                                  color: '#fff', lineHeight: 1.3,
                                }}>
                                  {item.label}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'rgba(255,255,255,0.45)',
                                  lineHeight: 1.4, marginTop: '0.125rem',
                                }}>
                                  {item.desc}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {simpleLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  style={{
                    padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
                    fontSize: '0.8125rem', fontWeight: 500,
                    textDecoration: 'none',
                    color: location.pathname === link.to ? '#0875FF' : 'rgba(245,247,250,0.88)',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => { if (location.pathname !== link.to) e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { if (location.pathname !== link.to) e.currentTarget.style.color = 'rgba(245,247,250,0.88)'; }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* ── Right Side ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Contact Button (desktop only) */}
            {!isMobile && (
              <Link
                to={headerCta.href || headerCta.to || '/contact'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1.125rem', borderRadius: '0.625rem',
                  fontSize: '0.8125rem', fontWeight: 600,
                  color: '#fff', textDecoration: 'none',
                  background: 'linear-gradient(135deg, #0875FF, #00AFFF)',
                  boxShadow: '0 2px 10px rgba(8,117,255,0.25)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(8,117,255,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(8,117,255,0.25)'; }}
              >
                {headerCta.label || 'Contact'}
              </Link>
            )}

            {/* Search Button (after Contact) */}
            <button
              onClick={() => { setSearchOpen(true); setSearchQuery(''); setSearchResults([]); }}
              aria-label="Search"
              style={{
                width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', color: 'rgba(245,247,250,0.7)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(8,117,255,0.3)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(245,247,250,0.7)'; }}
            >
              <FaSearch style={{ fontSize: '0.8125rem' }} />
            </button>

            {/* Mobile Hamburger (only on mobile) */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Menu"
                style={{
                  width: '2.25rem', height: '2.25rem',
                  borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', color: '#fff',
                }}
              >
                {sidebarOpen ? <FaTimes /> : <FaBars />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Search Overlay ── */}
      {searchOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            background: 'rgba(7, 20, 43, 0.92)',
            backdropFilter: 'blur(20px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: '8rem', padding: '8rem 1.5rem 2rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setSearchOpen(false); setSearchQuery(''); } }}
        >
          {/* Search Input */}
          <div style={{
            width: '100%', maxWidth: '640px',
            position: 'relative', marginBottom: '1.5rem',
          }}>
            <FaSearch style={{
              position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.35)', fontSize: '1rem',
            }} />
            <input
              autoFocus
              type="text"
              placeholder="Search services, projects, blog posts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem 3rem 1rem 3.25rem',
                borderRadius: '1rem',
                fontSize: '1rem',
                fontWeight: 500,
                color: '#fff',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(0,175,255,0.2)',
                outline: 'none',
                fontFamily: "'Sora', sans-serif",
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,175,255,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,175,255,0.2)'}
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              style={{
                position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                fontSize: '0.6875rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}
            >
              ESC
            </button>
          </div>

          {/* Results */}
          <div style={{ width: '100%', maxWidth: '640px', maxHeight: '50vh', overflowY: 'auto' }}>
            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                Searching...
              </div>
            )}
            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                No results found for "{searchQuery}"
              </div>
            )}
            {searchResults.map((r, i) => (
              <Link
                key={i}
                to={r.to}
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem', borderRadius: '0.75rem',
                  textDecoration: 'none', marginBottom: '0.5rem',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,117,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  padding: '0.2rem 0.625rem', borderRadius: '0.375rem',
                  fontSize: '0.6875rem', fontWeight: 600,
                  background: r.type === 'Service' ? 'rgba(8,117,255,0.12)'
                    : r.type === 'Project' ? 'rgba(0,175,255,0.12)'
                    : 'rgba(251,191,36,0.12)',
                  color: r.type === 'Service' ? '#0875FF'
                    : r.type === 'Project' ? '#00AFFF'
                    : '#FBBF24',
                }}>
                  {r.type}
                </span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff' }}>
                  {r.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default Header;
