// @ts-nocheck
import React, { useState, useEffect } from "react";import { Link, useLocation } from "react-router-dom";import { apiGet } from '@/lib/httpClient';import AngiSoftLogo from '../brand/AngiSoftLogo';import { FaGlobe, FaBars, FaTimes, FaChevronDown, FaSearch, FaArrowLeft, FaUsers, FaSun, FaMoon } from "react-icons/fa";
import { useTheme } from '@/lib/theme';import iconRegistry from '@/lib/marketing/iconRegistry';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import './Header.css';

const localIconRegistry = {...iconRegistry,FaArrowLeft,FaUsers,};

const resolveIcon = (iconName, fallback = FaGlobe) => localIconRegistry[iconName] || fallback;

const normalizeLink = (link) => ({label: link.label,to: link.href || link.to || '/',});

/* ═══════════════════ HEADER ═══════════════════ */const Header = () => {const location = useLocation();
  const { colors, mode, toggleMode } = useTheme();
  const isDark = mode === 'dark';const [scrolled, setScrolled] = useState(false);const [sidebarOpen, setSidebarOpen] = useState(false);const [activeMega, setActiveMega] = useState(null);const [mobileExpanded, setMobileExpanded] = useState(null);const [isMobile, setIsMobile] = useState(false);const [searchOpen, setSearchOpen] = useState(false);const [searchQuery, setSearchQuery] = useState('');const [searchResults, setSearchResults] = useState([]);const [searchLoading, setSearchLoading] = useState(false);const [navigation, setNavigation] = useState(null);const [branding, setBranding] = useState(null);

useEffect(() => {const mq = window.matchMedia('(max-width: 1024px)');const handler = () => setIsMobile(mq.matches);handler();mq.addEventListener('change', handler);return () => mq.removeEventListener('change', handler);}, []);

useEffect(() => {Promise.all([apiGet('/site/navigation').catch(() => null), apiGet('/site/branding').catch(() => null)]).then(([navigationData, brandingData]) => {setNavigation(navigationData);setBranding(brandingData);});}, []);

const megaMenus = navigation?.megaMenus?.length? navigation.megaMenus.map((menu) => {const MenuIcon = resolveIcon(menu.icon, FaGlobe);return {label: menu.label,icon: MenuIcon,items: (menu.items || []).map((item) => ({label: item.label,desc: item.description || item.desc || '',to: item.href || item.to || '/',icon: resolveIcon(item.icon, MenuIcon),})),};}): [];const simpleLinks = (navigation?.simpleLinks || []).map(normalizeLink);const headerCta = navigation?.cta || null;

useEffect(() => {const handle = () => setScrolled(window.scrollY > 20);window.addEventListener("scroll", handle);return () => window.removeEventListener("scroll", handle);}, []);

// Header behaves the way Vercel/Stripe do: fully transparent while it sits over
// the hero image (the hero's navy scrim guarantees contrast, so copy stays
// light), then becomes a frosted glass panel in the CURRENT theme once the page
// scrolls — so it dissolves into the light sections instead of dropping a navy
// bar onto a white page. `panel*` values are for overlays (mega menu, mobile
// drawer, search) which are always theme-coloured, never transparent.
const barInk = scrolled && !isDark ? '#07142B' : '#EAF2FF';
const barInkHover = scrolled && !isDark ? '#003BCE' : '#FFFFFF';
const barInkMuted = scrolled && !isDark ? '#334A6B' : 'rgba(214, 232, 255, 0.7)';
const barAccent = scrolled && !isDark ? '#003BCE' : '#18D8FF';
const panelSurface = isDark ? 'rgba(9, 26, 52, 0.98)' : 'rgba(255, 255, 255, 0.98)';
const panelInk = isDark ? '#EAF2FF' : '#07142B';
const panelInkMuted = isDark ? 'rgba(214, 232, 255, 0.7)' : '#334A6B';
const panelAccent = isDark ? '#18D8FF' : '#003BCE';

useEffect(() => {setSidebarOpen(false);setActiveMega(null);setMobileExpanded(null);setSearchOpen(false);}, [location.pathname]);

  // Search across services, projects, blog posts
  const normalizeList = (response, key) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (key && Array.isArray(response?.[key])) return response[key];
    return [];
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = searchQuery.toLowerCase();
        const [servicesResponse, projectsResponse, blogsResponse] = await Promise.all([
          apiGet('/services').catch(() => []),
          apiGet('/projects').catch(() => []),
          apiGet('/blogs').catch(() => []),
        ]);
        const services = normalizeList(servicesResponse, 'services');
        const projects = normalizeList(projectsResponse, 'projects');
        const blogs = normalizeList(blogsResponse, 'blogs');
        const results = [
          ...services.filter(s => s.published !== false && (s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))).map(s => ({ type: 'Service', title: s.title, to: `/service/${s.slug || s.id}` })),
          ...projects.filter(p => p.published !== false && (p.title?.toLowerCase().includes(q) || p.summary?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))).map(p => ({ type: 'Project', title: p.title, to: `/project/${p.slug || p.id}` })),
          ...blogs.filter(b => b.published !== false && (b.title?.toLowerCase().includes(q) || b.excerpt?.toLowerCase().includes(q))).map(b => ({ type: 'Blog', title: b.title, to: `/blog/${b.slug || b.id}` })),
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

return (<>
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
      background: panelSurface,
      borderLeft: '1px solid var(--border)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      overflowY: 'auto',
      padding: '1.5rem',
      animation: 'slideIn 0.25s ease',
    }}>
      {/* Close button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)} style={{
          width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
          border: '1px solid transparent',
          width: '2.75rem', height: '2.75rem',
          cursor: 'pointer', color: panelInk,
        }}>
          <FaTimes
            className="angi-header-sidebar-close-icon"
            aria-hidden="true"
          />
        </button>
      </div>

      <Link to="/" style={{
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.75rem', borderRadius: '0.625rem',
        fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
        color: location.pathname === '/' ? panelAccent : panelInk,
      }}>Home</Link>

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
                background: isOpen ? 'rgba(8,117,255,0.10)' : 'transparent',
                border: 'none', cursor: 'pointer', color: panelInk, textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <menu.icon style={{ fontSize: '0.875rem', color: '#0875FF' }} />
                {menu.label}
              </span>
              <FaChevronDown style={{
                fontSize: '0.6rem', color: panelInkMuted,
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
                      textDecoration: 'none', color: panelInkMuted,
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
          color: location.pathname === link.to ? panelAccent : panelInk,
        }}>
          {link.label}
        </Link>
      ))}

      {/* Contact button */}
      {headerCta && <Link to={headerCta.href || headerCta.to || '/contact'} style={{
        display: 'block', textAlign: 'center',
        marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
        fontSize: '0.9rem', fontWeight: 600, color: '#fff', textDecoration: 'none',
        background: colors.primary,
      }}>
        {headerCta.label || 'Contact'}
      </Link>}
    </div>
  )}

  <div className="angi-scroll-progress" aria-hidden="true" />

  <header
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      transition: 'background 0.35s var(--ease-standard), box-shadow 0.35s var(--ease-standard), border-color 0.35s var(--ease-standard)',
      // At rest the bar is invisible so the hero image reads edge to edge. The
      // hero keeps a navy scrim in both themes, which is what guarantees the
      // light barInk stays legible. On scroll it frosts into the live theme so
      // it never drops a dark slab onto a light page.
      background: scrolled
        ? (isDark ? 'rgba(7, 20, 43, 0.72)' : 'rgba(255, 255, 255, 0.72)')
        : 'rgba(255, 255, 255, 0)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: scrolled
        ? (isDark ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid rgba(8, 117, 255, 0.14)')
        : '1px solid transparent',
      boxShadow: scrolled
        ? (isDark ? '0 16px 44px rgba(0,0,0,0.38)' : '0 12px 32px rgba(7, 20, 43, 0.08)')
        : 'none',
    }}
  >
    <div style={{
      maxWidth: '1280px', margin: '0 auto',
      padding: '0.75rem 1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* ── Logo ── */}
      <Link to="/" style={{ flexShrink: 0, textDecoration: 'none' }}>
        <div style={{ width: '9rem' }}>
          <AngiSoftLogo size="md" src={branding?.logo ? resolveAssetUrl(branding.logo) : undefined} />
        </div>
      </Link>

      {/* ── Desktop Nav (hidden on mobile) ── */}
      {!isMobile && (
        <nav style={{
          display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '0.125rem',
        }}>
          <Link
            to="/"
            style={{
              padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
              fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none',
              color: location.pathname === '/' ? barAccent : barInk,
            }}
          >Home</Link>
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
                    color: isOpen ? barAccent : barInk,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.color = barInkHover; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.color = barInk; }}
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
                    minWidth: '46rem',
                    maxWidth: 'min(90vw, 64rem)',
                    borderRadius: '1rem',
                    background: panelSurface,
                    border: '1px solid var(--border)',
                    backdropFilter: 'none',
                    boxShadow: isDark ? '0 25px 50px rgba(0,0,0,0.45)' : '0 25px 50px rgba(15,23,42,0.12)',
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      gap: '0.5rem',
                    }}>
                      {menu.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            to={item.to}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                              padding: '0.625rem 0.75rem', borderRadius: '0.75rem',
                              textDecoration: 'none',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(8,117,255,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div style={{
                              width: '1.85rem', height: '1.85rem', borderRadius: '0.5rem',
                              background: 'rgba(8,117,255,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, marginTop: '0.1rem',
                            }}>
                              <Icon style={{ fontSize: '0.8125rem', color: '#0875FF' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontFamily: "'Sora', sans-serif",
                                fontSize: '0.8125rem', fontWeight: 600,
                                color: panelInk, lineHeight: 1.3,
                              }}>
                                {item.label}
                              </div>
                              <div style={{
                                fontSize: '0.7rem',
                                color: panelInkMuted,
                                lineHeight: 1.35, marginTop: '0.0625rem',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}>
                                {item.desc}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
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
                color: location.pathname === link.to ? barAccent : barInk,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { if (location.pathname !== link.to) e.currentTarget.style.color = barInkHover; }}
              onMouseLeave={e => { if (location.pathname !== link.to) e.currentTarget.style.color = barInk; }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      {/* ── Right Side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Contact Button (desktop only) */}
        {!isMobile && headerCta && (
          <Link
            to={headerCta.href || headerCta.to || '/contact'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1.125rem', borderRadius: '0.625rem',
              fontSize: '0.8125rem', fontWeight: 600,
              color: '#fff', textDecoration: 'none',
              background: colors.primary,
              boxShadow: 'none',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {headerCta.label || 'Contact'}
          </Link>
        )}

        <button
          type="button"
          className="angi-header-control angi-header-theme-toggle"
          onClick={toggleMode}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={!isDark}
        >
          {isDark ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
        </button>

        {/* Search Button (after Contact) */}
        <button
          type="button"
          className="angi-header-control angi-header-search-button"
          onClick={() => { setSearchOpen(true); setSearchQuery(''); setSearchResults([]); }}
          aria-label="Search"
        >
          <FaSearch
            className="angi-header-search-icon"
            aria-hidden="true"
          />
        </button>

        {/* Mobile Hamburger (only on mobile) */}
        {isMobile && (
          <button
            type="button"
            className="angi-header-mobile-menu-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            style={{
              width: '2.25rem', height: '2.25rem',
              borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid transparent',
              width: '2.75rem', height: '2.75rem',
              cursor: 'pointer', color: barInk,
            }}
          >
            {sidebarOpen ? (
              <FaTimes
                className="angi-header-mobile-menu-icon"
                aria-hidden="true"
              />
            ) : (
              <FaBars
                className="angi-header-mobile-menu-icon"
                aria-hidden="true"
              />
            )}
          </button>
        )}
      </div>
    </div>
  </header>

  {/* ── Search Overlay ── */}
  {searchOpen && (
    <div
      className="angi-header-search-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: isDark ? 'rgba(7, 20, 43, 0.94)' : 'rgba(242, 246, 253, 0.9)',
        backdropFilter: 'blur(18px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: '8rem', padding: '8rem 1.5rem 2rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) { setSearchOpen(false); setSearchQuery(''); } }}
    >
      {/* Search Input */}
      <div className="angi-header-search-field" style={{
        width: '100%', maxWidth: '640px',
        position: 'relative', marginBottom: '1.5rem',
      }}>
        <FaSearch className="angi-header-search-field-icon" style={{
          position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.35)', fontSize: '1rem',
        }} />
        <input
          autoFocus
          type="text"
          className="angi-header-search-input"
          placeholder="Search services, projects, blog posts..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '1rem 3rem 1rem 3.25rem',
            borderRadius: '1rem',
            fontSize: '1rem',
            fontWeight: 500,
            color: panelInk,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            outline: 'none',
            fontFamily: "'Sora', sans-serif",
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,175,255,0.5)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,175,255,0.2)'}
        />
        <button
          type="button"
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

);};

export default Header;