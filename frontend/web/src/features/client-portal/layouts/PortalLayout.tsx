import { Link, NavLink, Outlet } from 'react-router-dom';

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00AFFF] to-[#0875FF] text-white text-sm">A</span>
            Client Portal
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            {[
              { to: '/portal', label: 'Dashboard' },
              { to: '/portal/booking', label: 'New Booking' },
              { to: '/portal/booking/history', label: 'Bookings' },
              { to: '/portal/booking/lookup', label: 'Lookup' },
            ].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/portal'}
                className={({ isActive }) =>
                  isActive ? 'text-[#0875FF]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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