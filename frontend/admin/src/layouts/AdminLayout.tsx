import { useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AdminThemeContext } from '@/styles/theme';
import { apiFetch } from '@/lib/adminApi';
import { EffectiveAccessProvider, useEffectiveAccess } from '@/lib/permissions';

/**
 * Navigation is permission-driven (plan Phase 1.5): each link names the
 * permission that grants access, and groups with no visible link disappear
 * entirely. A link with no permission is always shown (dashboards, workspace).
 */
type NavLinkSpec = { to: string; label: string; permission?: string };

const NAV_GROUPS: { title: string; links: NavLinkSpec[] }[] = [
  {
    title: 'Overview',
    links: [
      { to: '/', label: 'Dashboard' },
      { to: '/workspace', label: 'My Workspace' },
      { to: '/staff-dashboard', label: 'Staff Dashboard' },
    ],
  },
  {
    title: 'CRM',
    links: [
      { to: '/contacts', label: 'Contacts', permission: 'enquiries.view_all' },
      { to: '/chat', label: 'Chat Conversations', permission: 'chatbot.view_all' },
    ],
  },
  {
    title: 'Sales',
    links: [
      { to: '/opportunities', label: 'Opportunities', permission: 'opportunities.view' },
      { to: '/quotes', label: 'Quotes', permission: 'quotes.view' },
      { to: '/invoices', label: 'Invoices', permission: 'invoices.view' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { to: '/projects', label: 'Projects', permission: 'projects.view' },
      { to: '/client-projects', label: 'Client Projects', permission: 'client_projects.view_all' },
      { to: '/bookings', label: 'Bookings', permission: 'bookings.view_all' },
      { to: '/payments', label: 'Payments', permission: 'payments.view_all' },
    ],
  },
  {
    title: 'Content',
    links: [
      { to: '/blogs', label: 'Blogs', permission: 'publications.create' },
      { to: '/products', label: 'Products', permission: 'products.view' },
      { to: '/services', label: 'Services', permission: 'services.view' },
      { to: '/service-categories', label: 'Service Categories', permission: 'service_categories.view' },
      { to: '/sections', label: 'Home Sections', permission: 'pages.update_home' },
      { to: '/testimonials', label: 'Testimonials', permission: 'reviews.moderate' },
      { to: '/faqs', label: 'FAQs', permission: 'faqs.view' },
      { to: '/industries', label: 'Industries', permission: 'industries.view' },
      { to: '/solutions', label: 'Solutions', permission: 'solutions.view' },
      { to: '/careers', label: 'Careers', permission: 'careers.view' },
      { to: '/pricing', label: 'Pricing', permission: 'services.manage_pricing' },
      { to: '/about', label: 'About Sections', permission: 'pages.update_about' },
    ],
  },
  {
    title: 'People & System',
    links: [
      { to: '/staff', label: 'Staff Management', permission: 'staff.view' },
      { to: '/staff-access', label: 'Staff Access', permission: 'staff.assign_permissions' },
      { to: '/settings/roles', label: 'Roles & Permissions', permission: 'administration.roles' },
      { to: '/ai', label: 'AI Config', permission: 'ai_config.view' },
      { to: '/uploads', label: 'File Uploads', permission: 'media.upload' },
      { to: '/settings', label: 'Site Settings', permission: 'administration.settings' },
      { to: '/system', label: 'System Panel', permission: 'administration.audit' },
    ],
  },
];

function AdminShell() {
  const { mode, toggleMode } = useContext(AdminThemeContext);
  const { can, access } = useEffectiveAccess();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const groups = NAV_GROUPS.map((group) => ({
    title: group.title,
    links: group.links.filter((l) => !l.permission || can(l.permission)),
  })).filter((group) => group.links.length > 0);

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {navOpen ? (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 md:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 max-md:-translate-x-full ${
          navOpen ? 'max-md:translate-x-0' : ''
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'var(--gradient-brand-sweep)' }}
          >
            A
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">AngiSoft Admin</div>
            <div className="text-[11px] text-[var(--text-muted)]">Control Center</div>
          </div>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === '/'}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          {access ? (
            <div className="mb-2 px-3 text-[11px] text-[var(--text-muted)]">
              {access.systemRole}
              {access.departmentId ? ` · dept` : ''}
            </div>
          ) : null}
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-0 flex min-h-screen flex-1 flex-col md:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={navOpen}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] md:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <div className="text-sm text-[var(--text-muted)]">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.replace(/^\//, '')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              View site ↗
            </Link>
            <button
              onClick={toggleMode}
              aria-label="Toggle theme"
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              {mode === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <EffectiveAccessProvider>
      <AdminShell />
    </EffectiveAccessProvider>
  );
}

export default AdminLayout;
