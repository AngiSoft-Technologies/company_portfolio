import { useContext } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AdminThemeContext } from '@/styles/theme';

const NAV_GROUPS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Overview',
    links: [
      { to: '/', label: 'Dashboard' },
      { to: '/staff-dashboard', label: 'Staff Dashboard' },
    ],
  },
  {
    title: 'CRM',
    links: [
      { to: '/contacts', label: 'Contacts' },
      { to: '/chat', label: 'Chat Conversations' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { to: '/projects', label: 'Projects' },
      { to: '/client-projects', label: 'Client Projects' },
      { to: '/bookings', label: 'Bookings' },
      { to: '/payments', label: 'Payments' },
    ],
  },
  {
    title: 'Content',
    links: [
      { to: '/blogs', label: 'Blogs' },
      { to: '/products', label: 'Products' },
      { to: '/services', label: 'Services' },
      { to: '/service-categories', label: 'Service Categories' },
      { to: '/sections', label: 'Home Sections' },
      { to: '/testimonials', label: 'Testimonials' },
      { to: '/faqs', label: 'FAQs' },
      { to: '/industries', label: 'Industries' },
      { to: '/solutions', label: 'Solutions' },
      { to: '/careers', label: 'Careers' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/about', label: 'About Sections' },
    ],
  },
  {
    title: 'People & System',
    links: [
      { to: '/staff', label: 'Staff Management' },
      { to: '/staff-access', label: 'Staff Access' },
      { to: '/ai', label: 'AI Config' },
      { to: '/uploads', label: 'File Uploads' },
      { to: '/settings', label: 'Site Settings' },
      { to: '/system', label: 'System Panel' },
    ],
  },
];

export function AdminLayout() {
  const { mode, toggleMode } = useContext(AdminThemeContext);
  const location = useLocation();

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00AFFF] to-[#0875FF] text-sm font-bold text-white">
            A
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">AngiSoft Admin</div>
            <div className="text-[11px] text-slate-400">Control Center</div>
          </div>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                          ? 'bg-[#0875FF]/10 font-medium text-[#0875FF]'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-sm text-slate-500">
            {location.pathname === '/' ? 'Dashboard' : location.pathname.replace(/^\//, '')}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
              View site ↗
            </Link>
            <button
              onClick={toggleMode}
              aria-label="Toggle theme"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
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

export default AdminLayout;