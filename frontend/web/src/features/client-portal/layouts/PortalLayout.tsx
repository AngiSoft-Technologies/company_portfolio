import { Link, NavLink, Outlet } from 'react-router-dom';

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white text-sm">A</span>
            Client Portal
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            {[
              { to: '/portal', label: 'Dashboard' },
              { to: '/portal#projects', label: 'Projects' },
              { to: '/portal#billing', label: 'Billing' },
              { to: '/portal#feedback', label: 'Feedback' },
            ].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/portal'}
                className={({ isActive }) =>
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default PortalLayout;