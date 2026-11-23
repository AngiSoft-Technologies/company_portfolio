import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logoutClient } from '../lib/portalSession';

const NAV_ITEMS = [
  { to: '/portal', label: 'Dashboard' },
  { to: '/portal#projects', label: 'Projects' },
  { to: '/portal#billing', label: 'Billing' },
  { to: '/portal#feedback', label: 'Feedback' },
];

export function PortalLayout() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logoutClient();
    } finally {
      navigate('/portal/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm text-[var(--color-white)]">
              A
            </span>
            Client Portal
          </Link>
          <nav aria-label="Client portal sections" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/portal'}
                className={({ isActive }) =>
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
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
