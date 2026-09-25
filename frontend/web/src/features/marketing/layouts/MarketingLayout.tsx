import { Link, Outlet, NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeContext } from '@/lib/theme';
import { NAV_LINKS, CONTACT_INFO } from '@/lib/constants';

export function Navbar() {
  const { mode, toggleMode } = useContext(ThemeContext);
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00AFFF] to-[#0875FF] text-white text-sm font-bold">A</span>
          AngiSoft
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-[#0875FF]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMode}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            {mode === 'dark' ? '☀' : '☾'}
          </button>
          <Link to="/portal" className="hidden text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:block">
            Client Portal
          </Link>
          <Link to="/contact" className="rounded-lg bg-[#0875FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B9AFF]">
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00AFFF] to-[#0875FF] text-white text-sm font-bold">A</span>
            AngiSoft Technologies
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Software products and services for African businesses. Built in Nairobi.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Products</h4>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            <li><Link to="/products/angitunes" className="hover:text-[var(--text-primary)]">AngiTunes</Link></li>
            <li><Link to="/products/dukaflow" className="hover:text-[var(--text-primary)]">DukaFlow</Link></li>
            <li><Link to="/products/kejalink" className="hover:text-[var(--text-primary)]">KejaLink</Link></li>
            <li><Link to="/products/petroflow" className="hover:text-[var(--text-primary)]">PetroFlow</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            <li><Link to="/about" className="hover:text-[var(--text-primary)]">About</Link></li>
            <li><Link to="/careers" className="hover:text-[var(--text-primary)]">Careers</Link></li>
            <li><Link to="/blog" className="hover:text-[var(--text-primary)]">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-[var(--text-primary)]">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            <li>{CONTACT_INFO.phone}</li>
            <li>{CONTACT_INFO.email}</li>
            <li>{CONTACT_INFO.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] py-4 text-center text-sm text-[var(--text-muted)]">
        © {new Date().getFullYear()} AngiSoft Technologies. All rights reserved.
      </div>
    </footer>
  );
}

export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default MarketingLayout;